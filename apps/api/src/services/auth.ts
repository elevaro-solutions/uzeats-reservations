import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import type { JwtPayload, UserRole } from '@reservations/shared';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { notifyUser } from './notifications.js';

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
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
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { refreshTokens: refreshToken },
  });
  return { accessToken, refreshToken };
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: 'diner',
    emailVerified: false,
  });

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function loginWithEmail(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user?.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function loginWithGoogle(idToken: string) {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error('Invalid Google token');

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
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function requestPhoneOtp(phone: string) {
  if (env.AUTH_DEV_OTP || !env.TWILIO_ACCOUNT_SID) {
    otpStore.set(phone, { code: '123456', expiresAt: Date.now() + 10 * 60 * 1000 });
    return { success: true, message: 'Dev OTP: 123456' };
  }

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

  if (env.AUTH_DEV_OTP || !env.TWILIO_ACCOUNT_SID) {
    const stored = otpStore.get(input.phone);
    valid = !!stored && stored.code === input.code && stored.expiresAt > Date.now();
    if (valid) otpStore.delete(input.phone);
  } else {
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
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new Error('Invalid refresh token');
  }
  await User.findByIdAndUpdate(user._id, { $pull: { refreshTokens: refreshToken } });
  return issueTokens(user);
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: refreshToken } });
  } else {
    await User.findByIdAndUpdate(userId, { refreshTokens: [] });
  }
  return true;
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { success: true, message: 'If that email exists, a reset link has been sent.' };
  }

  const token = crypto.randomUUID();
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.CORS_ORIGINS.split(',')[0]}/reset-password?token=${token}`;
  await notifyUser(user._id.toString(), {
    type: 'password_reset',
    title: 'Password Reset Request',
    body: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this message.`,
  });

  return { success: true, message: 'If that email exists, a reset link has been sent.' };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  return { success: true, message: 'Password has been reset successfully.' };
}
