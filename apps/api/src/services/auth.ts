import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import {
  phoneSchema,
  type JwtPayload,
  type UpdateMyProfileInput,
  type UserRole,
} from '@reservations/shared';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { PasswordResetAttempt } from '../models/PasswordResetAttempt.js';
import { notifyUser, isEmailDeliveryConfigured, sendEmail } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { emailNotice } from './emailBranding.js';
import {
  getPlatformConfig,
  mapPlatformConfig,
  resolveRequireSignupEmailVerification,
} from './platformConfig.js';
import { clampRegistrationRole } from './roleAccess.js';
import { generateUniqueReferralCode } from '../lib/referralCode.js';
import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/** Platform-owned mailboxes are not reliably deliverable; route resets to Support contacts. */
const PLATFORM_OWNED_EMAIL_DOMAIN = '@tablevera.online';
/** Super-admin inbox when Support contacts still points at a platform-owned address. */
const SUPER_ADMIN_SUPPORT_INBOX = 'support.uzeats@gmail.com';
/** Max forgot-password emails per address within the rolling window. */
export const MAX_PASSWORD_RESET_REQUESTS = 3;
const PASSWORD_RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;

export type PasswordResetRequestResult = {
  success: boolean;
  message: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  maxAttempts: number;
  supportEmail: string;
};

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
  phone: string;
  referralCode?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new ConflictError('Email already registered', { field: 'email' });

  const phoneTaken = await User.findOne({ phone: input.phone });
  if (phoneTaken) {
    throw new ConflictError('This phone number is already used by another account', {
      field: 'phone',
    });
  }

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

export type GoogleIdPayload = {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
};

async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdPayload> {
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

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    given_name: payload.given_name,
    family_name: payload.family_name,
  };
}

/**
 * Sign-in / sign-up via Google. Existing email/password accounts are not
 * auto-linked — callers must use {@link linkGoogleAccount} while signed in.
 * Exported for tests that supply a verified payload without OAuth.
 */
export async function completeGoogleSignIn(payload: GoogleIdPayload) {
  const email = payload.email.toLowerCase();
  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email }],
  });

  if (!user) {
    user = await User.create({
      email,
      googleId: payload.sub,
      firstName: payload.given_name ?? 'Guest',
      lastName: payload.family_name ?? '',
      role: 'diner',
      emailVerified: payload.email_verified ?? true,
      referralCode: await generateUniqueReferralCode(payload.given_name ?? 'Guest'),
    });
  } else if (!user.googleId) {
    throw new ConflictError(
      'An account already exists with this email. Sign in with email and password, then link Google from your profile.',
      { field: 'email' },
    );
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function loginWithGoogle(idToken: string) {
  const payload = await verifyGoogleIdToken(idToken);
  return completeGoogleSignIn(payload);
}

/**
 * Explicitly link Google to the signed-in account. Google email must match the
 * profile email and be verified. Exported for tests with a verified payload.
 */
export async function linkGoogleAccount(userId: string, payload: GoogleIdPayload) {
  const user = await User.findById(userId);
  if (!user) throw new AuthenticationError('Authentication required');

  if (!(payload.email_verified ?? false)) {
    throw new ValidationError('Google email is not verified');
  }

  const googleEmail = payload.email.toLowerCase();
  const profileEmail = (user.email ?? '').toLowerCase();
  if (!profileEmail || googleEmail !== profileEmail) {
    throw new ValidationError(
      'Google account email must match your profile email',
      { field: 'email' },
    );
  }

  if (user.googleId) {
    if (user.googleId === payload.sub) return user;
    throw new ValidationError('Google sign-in is already linked to this account');
  }

  const taken = await User.exists({ googleId: payload.sub, _id: { $ne: user._id } });
  if (taken) {
    throw new ConflictError('This Google account is already linked to another user');
  }

  user.googleId = payload.sub;
  if (!user.emailVerified) user.emailVerified = true;
  await user.save();
  return user;
}

export async function linkGoogle(userId: string, idToken: string) {
  const payload = await verifyGoogleIdToken(idToken);
  return linkGoogleAccount(userId, payload);
}

/**
 * Google (and other) diners can sign up without a phone. The first reservation
 * must supply one, and that number becomes the profile phone. Existing profile
 * phones are left unchanged.
 */
export async function attachDinerProfilePhone(
  dinerId: string,
  phone?: string | null,
) {
  const diner = await User.findById(dinerId).select('phone');
  if (!diner) throw new ValidationError('Account not found');
  if (diner.phone?.trim()) return;

  const trimmed = phone?.trim() ?? '';
  if (!trimmed) {
    throw new ValidationError(
      'A phone number is required to complete your reservation',
      { field: 'phone' },
    );
  }

  const parsed = phoneSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new ValidationError('Enter a valid phone number', { field: 'phone' });
  }

  const taken = await User.exists({
    phone: parsed.data,
    _id: { $ne: diner._id },
  });
  if (taken) {
    throw new ValidationError('This phone number is already used by another account', {
      field: 'phone',
    });
  }

  diner.phone = parsed.data;
  await diner.save();
}

/**
 * Signed-in account edits. Email and password changes require the current
 * password when the account already has one. Google-linked accounts keep their
 * Google email locked until `unlinkGoogle` (requires a password so the diner
 * is not locked out). Does not revoke refresh tokens (unlike the emailed reset
 * flow) so the diner stays signed in on this device.
 */
export async function updateMyProfile(userId: string, input: UpdateMyProfileInput) {
  const user = await User.findById(userId);
  if (!user) throw new AuthenticationError('Authentication required');

  const nextEmail = input.email?.trim().toLowerCase() || null;
  const emailChanged = Boolean(nextEmail && nextEmail !== (user.email ?? '').toLowerCase());
  const nextPassword = input.newPassword || null;
  const willUnlinkGoogle = Boolean(input.unlinkGoogle);

  if (willUnlinkGoogle) {
    if (!user.googleId) {
      throw new ValidationError('Google sign-in is not linked to this account');
    }
    if (!user.passwordHash && !nextPassword) {
      throw new ValidationError('Add a password before switching to email sign-in', {
        field: 'newPassword',
      });
    }
  }

  if (emailChanged && user.googleId && !willUnlinkGoogle) {
    throw new ValidationError(
      'Email cannot be changed while Google sign-in is linked',
      { field: 'email' },
    );
  }

  if ((emailChanged || nextPassword) && user.passwordHash) {
    if (!input.currentPassword) {
      throw new ValidationError('Enter your current password', { field: 'currentPassword' });
    }
    const matches = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Current password is incorrect', { field: 'currentPassword' });
    }
  }

  if (nextPassword) {
    user.passwordHash = await hashPassword(nextPassword);
  }

  if (willUnlinkGoogle) {
    user.set('googleId', undefined);
  }

  if (emailChanged && nextEmail) {
    const taken = await User.exists({ email: nextEmail, _id: { $ne: user._id } });
    if (taken) throw new ConflictError('Email already registered', { field: 'email' });
    user.email = nextEmail;
    user.emailVerified = false;
  }

  if (input.firstName && input.firstName !== user.firstName) {
    user.firstName = input.firstName;
  }
  if (input.lastName && input.lastName !== (user.lastName ?? '')) {
    user.lastName = input.lastName;
  }
  if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
    const nextAvatar = input.avatarUrl || undefined;
    if (nextAvatar !== (user.avatarUrl ?? undefined)) {
      if (nextAvatar) user.avatarUrl = nextAvatar;
      else user.set('avatarUrl', undefined);
    }
  }

  if (input.phone !== undefined && input.phone !== null) {
    const nextPhone = input.phone || undefined;
    if (nextPhone !== (user.phone ?? undefined)) {
      if (nextPhone) {
        const taken = await User.exists({ phone: nextPhone, _id: { $ne: user._id } });
        if (taken) {
          throw new ConflictError('This phone number is already used by another account', {
            field: 'phone',
          });
        }
        user.phone = nextPhone;
      } else {
        user.set('phone', undefined);
      }
      user.phoneVerified = false;
    }
  }

  if (input.address) {
    user.address = {
      line1: input.address.line1,
      line2: input.address.line2,
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
      country: input.address.country,
    };
  } else if (input.clearAddress) {
    user.set('address', undefined);
  }

  await user.save();

  if (emailChanged) {
    const config = await getPlatformConfig();
    if (resolveRequireSignupEmailVerification(config.requireSignupEmailVerification)) {
      await sendSignupVerificationEmail(user).catch((err) => {
        logger.warn(
          { err, userId: user._id.toString() },
          '[auth] profile email verification failed',
        );
      });
    }
  }

  return user;
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
  'host',
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

/** True for platform-owned addresses (e.g. seed / ops accounts on @tablevera.online). */
export function isPlatformOwnedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(PLATFORM_OWNED_EMAIL_DOMAIN);
}

/**
 * Where to deliver a password-reset email.
 * @tablevera.online accounts redirect to Support contacts (`supportEmail`),
 * falling back to the super-admin inbox when that contact is also platform-owned.
 */
export async function resolvePasswordResetDeliveryEmail(accountEmail: string): Promise<string> {
  const normalized = accountEmail.trim().toLowerCase();
  if (!isPlatformOwnedEmail(normalized)) return normalized;

  const config = mapPlatformConfig(await getPlatformConfig());
  const supportEmail = (config.supportEmail || '').trim().toLowerCase();
  if (supportEmail && !isPlatformOwnedEmail(supportEmail)) {
    return supportEmail;
  }
  return SUPER_ADMIN_SUPPORT_INBOX;
}

async function sendPasswordResetEmail(
  user: {
    _id: { toString(): string };
    email?: string | null;
    firstName?: string | null;
  },
  resetUrl: string,
  adminInitiated = false,
): Promise<{ deliveredTo: string }> {
  const accountEmail = (user.email || '').trim().toLowerCase();
  const deliveredTo = accountEmail
    ? await resolvePasswordResetDeliveryEmail(accountEmail)
    : accountEmail;
  const redirected =
    Boolean(accountEmail) &&
    Boolean(deliveredTo) &&
    deliveredTo !== accountEmail;

  const rendered = await renderEmailTemplate('password_reset', {
    firstName: user.firstName || 'there',
    resetUrl,
  });

  const notices: string[] = [];
  if (adminInitiated) {
    notices.push('A platform admin started a password reset for your account.');
  }
  if (redirected) {
    notices.push(
      `Password reset for ${accountEmail} was sent to the platform support inbox.`,
    );
  }

  const noticePrefix = notices.length ? `${notices.join('\n')}\n\n` : '';
  const bodyText = `${noticePrefix}${rendered.bodyText}`;
  const htmlBody = notices.length
    ? `${notices.map((n) => emailNotice(n)).join('')}${rendered.bodyHtml}`
    : rendered.bodyHtml;

  if (redirected) {
    await sendEmail(deliveredTo, rendered.subject, bodyText, { htmlBody });
    logger.info(
      { accountEmail, deliveredTo },
      '[auth] password reset redirected to support inbox',
    );
    return { deliveredTo };
  }

  await notifyUser(user._id.toString(), {
    type: 'password_reset',
    title: rendered.subject,
    body: bodyText,
    htmlBody,
  });
  return { deliveredTo: accountEmail };
}

async function resolveSupportContactEmail() {
  const config = mapPlatformConfig(await getPlatformConfig());
  const supportEmail = (config.supportEmail || '').trim().toLowerCase();
  if (supportEmail && !isPlatformOwnedEmail(supportEmail)) {
    return supportEmail;
  }
  return SUPER_ADMIN_SUPPORT_INBOX;
}

async function consumePasswordResetAttempt(email: string): Promise<{
  allowed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
}> {
  const now = new Date();
  const existing = await PasswordResetAttempt.findOne({ email });
  const windowExpired =
    !existing ||
    now.getTime() - existing.windowStartedAt.getTime() >= PASSWORD_RESET_REQUEST_WINDOW_MS;

  if (windowExpired) {
    const doc = await PasswordResetAttempt.findOneAndUpdate(
      { email },
      { $set: { count: 1, windowStartedAt: now } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return {
      allowed: true,
      attemptsUsed: doc?.count ?? 1,
      attemptsRemaining: MAX_PASSWORD_RESET_REQUESTS - 1,
    };
  }

  if (existing.count >= MAX_PASSWORD_RESET_REQUESTS) {
    return {
      allowed: false,
      attemptsUsed: existing.count,
      attemptsRemaining: 0,
    };
  }

  const doc = await PasswordResetAttempt.findOneAndUpdate(
    { email, count: { $lt: MAX_PASSWORD_RESET_REQUESTS } },
    { $inc: { count: 1 } },
    { new: true },
  );
  if (!doc) {
    return {
      allowed: false,
      attemptsUsed: MAX_PASSWORD_RESET_REQUESTS,
      attemptsRemaining: 0,
    };
  }

  return {
    allowed: true,
    attemptsUsed: doc.count,
    attemptsRemaining: Math.max(0, MAX_PASSWORD_RESET_REQUESTS - doc.count),
  };
}

function passwordResetLimitMessage(supportEmail: string) {
  return `You've reached the limit of ${MAX_PASSWORD_RESET_REQUESTS} password reset emails. If you still need help, contact support at ${supportEmail}.`;
}

export async function requestPasswordReset(
  email: string,
  app?: 'web' | 'dashboard',
): Promise<PasswordResetRequestResult> {
  const normalized = email.trim().toLowerCase();
  const supportEmail = await resolveSupportContactEmail();
  const attempt = await consumePasswordResetAttempt(normalized);

  if (!attempt.allowed) {
    return {
      success: true,
      message: passwordResetLimitMessage(supportEmail),
      attemptsUsed: attempt.attemptsUsed,
      attemptsRemaining: 0,
      maxAttempts: MAX_PASSWORD_RESET_REQUESTS,
      supportEmail,
    };
  }

  const user = await User.findOne({ email: normalized });
  if (user?.email) {
    const resetApp = app ?? passwordResetAppForRole(user.role);
    const { resetUrl } = await createPasswordResetToken(user._id.toString(), resetApp);
    await sendPasswordResetEmail(user, resetUrl);
  }

  const remainingHint =
    attempt.attemptsRemaining > 0
      ? ` You can resend ${attempt.attemptsRemaining} more time${attempt.attemptsRemaining === 1 ? '' : 's'}.`
      : ` If you don't receive it, contact support at ${supportEmail}.`;

  return {
    success: true,
    message: `If that email exists, a reset link has been sent.${remainingHint}`,
    attemptsUsed: attempt.attemptsUsed,
    attemptsRemaining: attempt.attemptsRemaining,
    maxAttempts: MAX_PASSWORD_RESET_REQUESTS,
    supportEmail,
  };
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
  let deliveredTo = user.email;

  if (input.sendEmail !== false) {
    ({ deliveredTo } = await sendPasswordResetEmail(user, resetUrl, true));
    emailed = true;
  }

  return {
    success: true,
    message: emailed
      ? `Password reset email sent to ${deliveredTo}`
      : 'Password reset link generated (not emailed)',
    resetUrl,
    emailed,
    email: deliveredTo,
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
