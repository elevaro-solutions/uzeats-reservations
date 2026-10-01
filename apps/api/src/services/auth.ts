import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import type { JwtPayload, UserRole } from '@reservations/shared';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { notifyUser, isEmailDeliveryConfigured, sendEmail } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { emailNotice } from './emailBranding.js';
import { getPlatformConfig, resolveRequireSignupEmailVerification } from './platformConfig.js';
import { clampRegistrationRole } from './roleAccess.js';
import { generateUniqueReferralCode } from '../lib/referralCode.js';
import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/** Demo emails that were renamed; login must accept every address in a group. */
const DEMO_EMAIL_EQUIVALENTS: string[][] = [
  ['a@tablevera.local', 'admin@tablevera.local', 'admin@reservations.local'],
  ['owner@tablevera.local', 'owner@reservations.local'],
  ['staff@tablevera.local', 'staff@reservations.local'],
  ['diner@tablevera.local', 'diner@reservations.local'],
  ['diner2@tablevera.local', 'diner2@reservations.local'],
];

function demoEmailCandidates(email: string): string[] {
  const lower = email.toLowerCase();
  const group = DEMO_EMAIL_EQUIVALENTS.find((emails) => emails.includes(lower));
  return group ?? [lower];
}

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hex digest for opaque tokens stored at rest (refresh, reset, API keys). */
export function hashOpaqueToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: JwtPayload, expiresIn?: string) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: expiresIn ?? env.JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

/** Max concurrent refresh sessions per user (devices / logins). */
const MAX_REFRESH_TOKENS = 10;
/** Window where a just-rotated refresh token may be presented again. */
const REFRESH_REUSE_GRACE_MS = 30_000;

export async function issueTokens(user: {
  _id: { toString(): string };
  role: UserRole;
  email?: string | null;
}) {
  const payload: JwtPayload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email ?? undefined,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = hashOpaqueToken(refreshToken);
  const doc = await User.findById(user._id).select('refreshTokens');
  const existing = (doc?.refreshTokens ?? []) as string[];
  const next = [...existing.filter((t) => t !== tokenHash), tokenHash].slice(
    -MAX_REFRESH_TOKENS,
  );
  await User.findByIdAndUpdate(user._id, { refreshTokens: next });
  return { accessToken, refreshToken };
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  referralCode?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new ConflictError('Email already registered', { field: 'email' });

  const config = await getPlatformConfig();
  if (config.allowPublicRegistration === false) {
    throw new ForbiddenError('Public registration is currently disabled');
  }

  let referredByUserId = undefined;
  if (input.referralCode?.trim()) {
    const referrer = await User.findOne({
      referralCode: input.referralCode.trim().toUpperCase(),
    });
    if (!referrer) throw new ValidationError('Invalid referral code', { field: 'referralCode' });
    referredByUserId = referrer._id;
  }

  const requireEmailVerification = resolveRequireSignupEmailVerification(
    config.requireSignupEmailVerification,
  );

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: clampRegistrationRole(config.defaultSignupRole, 'diner'),
    emailVerified: !requireEmailVerification,
    referralCode: await generateUniqueReferralCode(input.firstName),
    referredByUserId,
  });

  if (requireEmailVerification) {
    const sent = await sendSignupVerificationEmail(user).catch((err) => {
      logger.warn({ err, userId: user._id.toString() }, '[auth] signup verification email failed');
      return null;
    });
    const tokens = await issueTokens(user);
    return { user, devCode: sent?.devCode ?? null, ...tokens };
  }

  const tokens = await issueTokens(user);
  return { user, devCode: null as string | null, ...tokens };
}

export async function loginWithEmail(email: string, password: string) {
  const user = await User.findOne({ email: { $in: demoEmailCandidates(email) } });
  if (!user) throw new AuthenticationError('Invalid credentials', { field: 'password' });
  if (!user.passwordHash) {
    throw new AuthenticationError(
      user.googleId ? 'This account uses Google sign-in' : 'Invalid credentials',
      { field: user.googleId ? 'email' : 'password' },
    );
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthenticationError('Invalid credentials', { field: 'password' });
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function loginWithGoogle(idToken: string) {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AuthenticationError('Invalid Google token');
  }

  if (!payload?.sub || !payload.email) {
    throw new AuthenticationError('Invalid Google token');
  }

  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
  });

  if (!user) {
    user = await User.create({
      email: payload.email.toLowerCase(),
      googleId: payload.sub,
      firstName: payload.given_name ?? 'Guest',
      lastName: payload.family_name ?? '',
      role: 'diner',
      emailVerified: payload.email_verified ?? true,
      referralCode: await generateUniqueReferralCode(payload.given_name ?? 'Guest'),
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

const otpStore = new Map<string, { code: string; expiresAt: number }>();

/** Dev OTP is only for non-production when AUTH_DEV_OTP=true — never when Twilio is merely unset. */
function useDevOtp(): boolean {
  return Boolean(env.AUTH_DEV_OTP) && env.NODE_ENV !== 'production';
}

function assertTwilioConfigured() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Phone authentication is not configured');
  }
}

export async function requestPhoneOtp(phone: string) {
  if (useDevOtp()) {
    otpStore.set(phone, { code: '123456', expiresAt: Date.now() + 10 * 60 * 1000 });
    return { success: true, message: 'Dev OTP: 123456' };
  }

  assertTwilioConfigured();
  const twilio = await import('twilio');
  const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID).verifications.create({
    to: phone,
    channel: 'sms',
  });
  return { success: true, message: 'OTP sent' };
}

export async function verifyPhoneOtp(input: {
  phone: string;
  code: string;
  firstName?: string;
  lastName?: string;
}) {
  let valid = false;

  if (useDevOtp()) {
    const stored = otpStore.get(input.phone);
    valid = !!stored && stored.code === input.code && stored.expiresAt > Date.now();
    if (valid) otpStore.delete(input.phone);
  } else {
    assertTwilioConfigured();
    const twilio = await import('twilio');
    const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const check = await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: input.phone, code: input.code });
    valid = check.status === 'approved';
  }

  if (!valid) throw new Error('Invalid or expired OTP');

  let user = await User.findOne({ phone: input.phone });
  if (!user) {
    user = await User.create({
      phone: input.phone,
      firstName: input.firstName ?? 'Guest',
      lastName: input.lastName ?? '',
      role: 'diner',
      phoneVerified: true,
      referralCode: await generateUniqueReferralCode(input.firstName ?? 'Guest'),
    });
  } else {
    user.phoneVerified = true;
    await user.save();
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user) {
    throw new Error('Invalid refresh token');
  }
  const tokenHash = hashOpaqueToken(refreshToken);
  // Accept hashed tokens; also accept legacy plaintext entries until they rotate out.
  const stored = user.refreshTokens ?? [];
  const hasToken = stored.includes(tokenHash) || stored.includes(refreshToken);
  const grace = user.refreshTokenGrace as
    | { hash?: string; expiresAt?: Date | string }
    | null
    | undefined;
  const graceExpiresAt = grace?.expiresAt ? new Date(grace.expiresAt).getTime() : 0;
  const inGrace =
    !!grace?.hash && grace.hash === tokenHash && graceExpiresAt > Date.now();

  if (!hasToken && !inGrace) {
    throw new Error('Invalid refresh token');
  }

  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { $in: [tokenHash, refreshToken] } },
    $set: {
      refreshTokenGrace: {
        hash: tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_REUSE_GRACE_MS),
      },
    },
  });
  return issueTokens(user);
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    const tokenHash = hashOpaqueToken(refreshToken);
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { $in: [tokenHash, refreshToken] } },
      $unset: { refreshTokenGrace: 1 },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      refreshTokens: [],
      $unset: { refreshTokenGrace: 1 },
    });
  }
  return true;
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function passwordResetBaseUrl(app: 'web' | 'dashboard') {
  if (app === 'dashboard') {
    return stripTrailingSlash(
      env.DASHBOARD_APP_URL ||
        env.CORS_ORIGINS.split(',')[1]?.trim() ||
        'http://localhost:3001',
    );
  }
  return stripTrailingSlash(
    env.WEB_APP_URL || env.CORS_ORIGINS.split(',')[0]?.trim() || 'http://localhost:3000',
  );
}

const PARTNER_ROLES = new Set<UserRole>([
  'restaurant_owner',
  'manager',
  'admin',
  'account_manager',
  'super_admin',
]);

function passwordResetAppForRole(role: UserRole): 'web' | 'dashboard' {
  return PARTNER_ROLES.has(role) ? 'dashboard' : 'web';
}

const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;

function useDevEmailOtp(): boolean {
  return Boolean(env.AUTH_DEV_OTP) && env.NODE_ENV !== 'production';
}

function generateEmailVerificationCode() {
  if (useDevEmailOtp()) return '123456';
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createEmailVerificationCode(userId: string) {
  const code = generateEmailVerificationCode();
  await User.findByIdAndUpdate(userId, {
    emailVerificationToken: hashOpaqueToken(code),
    emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });
  return { code };
}

export async function sendSignupVerificationEmail(user: {
  _id: { toString(): string };
  email?: string | null;
  firstName?: string | null;
}) {
  if (!user.email) {
    return {
      success: false,
      message: 'This account has no email address to verify.',
      emailed: false,
      devCode: null as string | null,
    };
  }

  const { code } = await createEmailVerificationCode(user._id.toString());
  const rendered = await renderEmailTemplate('email_verification', {
    firstName: user.firstName || 'there',
    code,
  });

  let emailed = false;
  if (isEmailDeliveryConfigured()) {
    try {
      await sendEmail(user.email, rendered.subject, rendered.bodyText, {
        htmlBody: rendered.bodyHtml,
      });
      emailed = true;
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      logger.warn(
        { err, email: user.email },
        '[auth] verification email send failed; exposing code for local use',
      );
    }
  } else if (env.NODE_ENV === 'production') {
    throw new Error('Email delivery is not configured — set SENDGRID_API_KEY on the API server.');
  } else {
    logger.info({ email: user.email, code }, '[auth] email verification code (dev, no SendGrid)');
  }

  const exposeDevCode =
    env.NODE_ENV !== 'production' && (!emailed || useDevEmailOtp());

  return {
    success: true,
    message: emailed
      ? `Verification code sent to ${user.email}`
      : env.NODE_ENV === 'production'
        ? `Verification code sent to ${user.email}`
        : `Verification email is not configured locally. Use the code shown for ${user.email}.`,
    emailed,
    devCode: exposeDevCode ? code : null,
  };
}

export async function resendVerificationEmail(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AuthenticationError('Authentication required');
  if (!user.email) {
    return {
      success: false,
      message: 'This account has no email address to verify.',
      emailed: false,
      devCode: null as string | null,
    };
  }
  if (user.emailVerified) {
    return {
      success: true,
      message: 'Your email is already verified.',
      emailed: false,
      devCode: null as string | null,
    };
  }

  const required = await (async () => {
    const config = await getPlatformConfig();
    return resolveRequireSignupEmailVerification(config.requireSignupEmailVerification);
  })();
  if (!required) {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return {
      success: true,
      message: 'Email verification is not required. Your account is ready.',
      emailed: false,
      devCode: null as string | null,
    };
  }

  return sendSignupVerificationEmail(user);
}

export async function verifyEmailCode(userId: string, rawCode: string) {
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new ValidationError('Enter the 6-digit code from your email');
  }

  const user = await User.findById(userId);
  if (!user) throw new AuthenticationError('Authentication required');
  if (user.emailVerified) {
    return { success: true, message: 'Email verified successfully.' };
  }
  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    throw new ValidationError('No verification code pending — request a new code');
  }
  if (user.emailVerificationExpires.getTime() <= Date.now()) {
    throw new ValidationError('Invalid or expired verification code');
  }

  const codeHash = hashOpaqueToken(code);
  const valid =
    user.emailVerificationToken === codeHash ||
    // Legacy plaintext codes until they expire.
    user.emailVerificationToken === code;
  if (!valid) {
    throw new ValidationError('Invalid or expired verification code');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return { success: true, message: 'Email verified successfully.' };
}

export async function userNeedsEmailVerification(user: {
  email?: string | null;
  emailVerified?: boolean | null;
}): Promise<boolean> {
  if (!user.email || user.emailVerified) return false;
  const config = await getPlatformConfig();
  return resolveRequireSignupEmailVerification(config.requireSignupEmailVerification);
}

async function createPasswordResetToken(userId: string, app: 'web' | 'dashboard') {
  const token = crypto.randomUUID();
  await User.findByIdAndUpdate(userId, {
    passwordResetToken: hashOpaqueToken(token),
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { token, resetUrl: `${passwordResetBaseUrl(app)}/reset-password?token=${token}` };
}

async function sendPasswordResetEmail(
  user: { _id: { toString(): string }; firstName?: string | null },
  resetUrl: string,
  adminInitiated = false,
) {
  const rendered = await renderEmailTemplate('password_reset', {
    firstName: user.firstName || 'there',
    resetUrl,
  });
  const bodyText = adminInitiated
    ? `A platform admin started a password reset for your account.\n\n${rendered.bodyText}`
    : rendered.bodyText;
  const htmlBody = adminInitiated
    ? `${emailNotice('A platform admin started a password reset for your account.')}${rendered.bodyHtml}`
    : rendered.bodyHtml;

  await notifyUser(user._id.toString(), {
    type: 'password_reset',
    title: rendered.subject,
    body: bodyText,
    htmlBody,
  });
}

export async function requestPasswordReset(email: string, app?: 'web' | 'dashboard') {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { success: true, message: 'If that email exists, a reset link has been sent.' };
  }
  if (!user.email) {
    return { success: true, message: 'If that email exists, a reset link has been sent.' };
  }

  const resetApp = app ?? passwordResetAppForRole(user.role);
  const { resetUrl } = await createPasswordResetToken(user._id.toString(), resetApp);
  await sendPasswordResetEmail(user, resetUrl);

  return { success: true, message: 'If that email exists, a reset link has been sent.' };
}

/** Admin support tool: create a reset link, optionally email it, always return the URL. */
export async function adminCreatePasswordReset(input: {
  userId: string;
  sendEmail?: boolean;
}) {
  const user = await User.findById(input.userId);
  if (!user) throw new Error('User not found');
  if (!user.email) throw new Error('User has no email address');

  const resetApp = passwordResetAppForRole(user.role);
  const { resetUrl } = await createPasswordResetToken(user._id.toString(), resetApp);
  let emailed = false;

  if (input.sendEmail !== false) {
    await sendPasswordResetEmail(user, resetUrl, true);
    emailed = true;
  }

  return {
    success: true,
    message: emailed
      ? `Password reset email sent to ${user.email}`
      : 'Password reset link generated (not emailed)',
    resetUrl,
    emailed,
    email: user.email,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashOpaqueToken(token);
  let user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });
  // Legacy plaintext tokens until they expire.
  if (!user) {
    user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
  }
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  user.refreshTokenGrace = undefined;
  await user.save();

  return { success: true, message: 'Password has been reset successfully.' };
}
