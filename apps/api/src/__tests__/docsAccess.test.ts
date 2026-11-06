import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '../lib/errors.js';
import { DocsAccessRequest } from '../models/DocsAccessRequest.js';
import {
  DOCS_OTP_PUBLIC_MESSAGE,
  DOCS_REQUEST_PUBLIC_MESSAGE,
  adminSendDocsAccessOtp,
  checkDocsAccessEmail,
  getDocsAccessSession,
  requestDocsAccess,
  requestDocsAccessOtp,
  signDocsAccessToken,
  verifyDocsAccessOtp,
} from '../services/docsAccess.js';
import {
  claimDocsOtpSend,
  consumeDocsOtp,
  DOCS_OTP_MAX_SENDS_PER_HOUR,
  DOCS_OTP_MIN_INTERVAL_SEC,
  MAX_DOCS_OTP_ATTEMPTS,
  storeDocsOtp,
} from '../services/docsOtpStore.js';

const requestInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: 'Analytical',
  reason: 'Need the integration notes for a partner build.',
};

function requestWithCookie(cookie?: string) {
  return { headers: cookie ? { cookie } : {} } as unknown as Request;
}

describe('docs access OTP', () => {
  it('accepts the issued code once', async () => {
    await storeDocsOtp('reader@example.com', '482917');
    await expect(consumeDocsOtp('reader@example.com', '482917')).resolves.toBe(true);
    await expect(consumeDocsOtp('reader@example.com', '482917')).resolves.toBe(false);
  });

  it('burns the code after too many wrong guesses', async () => {
    await storeDocsOtp('guess@example.com', '482917');
    for (let i = 0; i < MAX_DOCS_OTP_ATTEMPTS; i += 1) {
      await expect(consumeDocsOtp('guess@example.com', '000000')).resolves.toBe(false);
    }
    await expect(consumeDocsOtp('guess@example.com', '482917')).resolves.toBe(false);
  });

  it('caps parallel guesses against one code', async () => {
    await storeDocsOtp('burst@example.com', '482917');
    const guesses = Array.from({ length: 50 }, (_, i) =>
      consumeDocsOtp('burst@example.com', String(100000 + i)),
    );
    guesses.push(consumeDocsOtp('burst@example.com', '482917'));
    const results = await Promise.all(guesses);
    expect(results.every((ok) => ok === false)).toBe(true);
  });

  it('resets the attempt count when a new code is issued', async () => {
    await storeDocsOtp('retry@example.com', '111111');
    for (let i = 0; i < MAX_DOCS_OTP_ATTEMPTS; i += 1) {
      await consumeDocsOtp('retry@example.com', '000000');
    }
    await storeDocsOtp('retry@example.com', '222222');
    await expect(consumeDocsOtp('retry@example.com', '222222')).resolves.toBe(true);
  });

  it('allows one code per minute and five per hour for an email', async () => {
    const email = 'throttle@example.com';
    const start = Date.UTC(2026, 10, 6, 12, 0, 0);
    for (let i = 0; i < DOCS_OTP_MAX_SENDS_PER_HOUR; i += 1) {
      const at = start + i * (DOCS_OTP_MIN_INTERVAL_SEC + 1) * 1000;
      await expect(claimDocsOtpSend(email, at)).resolves.toBe(true);
      await expect(claimDocsOtpSend(email, at + 1000)).resolves.toBe(false);
    }
    const sixth = start + DOCS_OTP_MAX_SENDS_PER_HOUR * (DOCS_OTP_MIN_INTERVAL_SEC + 1) * 1000;
    await expect(claimDocsOtpSend(email, sixth)).resolves.toBe(false);
    await expect(claimDocsOtpSend(email, start + 60 * 60 * 1000)).resolves.toBe(true);
  });
});

describe('docs access enumeration and request spam', () => {
  it('does not reveal whether an email is approved, pending, or denied', async () => {
    await DocsAccessRequest.create({ email: 'approved-probe@example.com', status: 'approved' });
    await DocsAccessRequest.create({ email: 'pending-probe@example.com', status: 'pending' });
    await DocsAccessRequest.create({ email: 'denied-probe@example.com', status: 'denied' });

    await expect(checkDocsAccessEmail('approved-probe@example.com')).resolves.toEqual({
      approved: false,
      pending: false,
      denied: false,
    });
    await expect(checkDocsAccessEmail('pending-probe@example.com')).resolves.toEqual({
      approved: false,
      pending: false,
      denied: false,
    });
    await expect(checkDocsAccessEmail('nobody@example.com')).resolves.toEqual({
      approved: false,
      pending: false,
      denied: false,
    });
  });

  it('uses the same acknowledgement for every access request outcome', async () => {
    const first = await requestDocsAccess({ email: 'new-docs@example.com', ...requestInput });
    const pending = await requestDocsAccess({ email: 'new-docs@example.com', ...requestInput });
    await DocsAccessRequest.create({ email: 'already-in@example.com', status: 'approved' });
    const approved = await requestDocsAccess({
      email: 'already-in@example.com',
      ...requestInput,
    });
    await DocsAccessRequest.create({ email: 'turned-away@example.com', status: 'denied' });
    const denied = await requestDocsAccess({
      email: 'turned-away@example.com',
      ...requestInput,
    });

    for (const result of [first, pending, approved, denied]) {
      expect(result).toEqual({ success: true, message: DOCS_REQUEST_PUBLIC_MESSAGE });
    }
    await expect(DocsAccessRequest.countDocuments({ email: 'new-docs@example.com' })).resolves.toBe(1);
    await expect(
      DocsAccessRequest.findOne({ email: 'turned-away@example.com' }),
    ).resolves.toMatchObject({ status: 'denied' });
    await expect(
      DocsAccessRequest.findOne({ email: 'already-in@example.com' }),
    ).resolves.toMatchObject({ status: 'approved' });
  });

  it('lets a denied email request again after the cooldown', async () => {
    const doc = await DocsAccessRequest.create({
      email: 'retry-docs@example.com',
      status: 'denied',
    });
    await DocsAccessRequest.collection.updateOne(
      { _id: doc._id },
      { $set: { updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } },
    );

    await expect(
      requestDocsAccess({ email: 'retry-docs@example.com', ...requestInput }),
    ).resolves.toEqual({ success: true, message: DOCS_REQUEST_PUBLIC_MESSAGE });
    await expect(
      DocsAccessRequest.findById(doc._id),
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('sends a code only for approved emails and keeps the public reply identical', async () => {
    await expect(requestDocsAccessOtp('stranger@example.com')).resolves.toEqual({
      success: true,
      message: DOCS_OTP_PUBLIC_MESSAGE,
    });

    await DocsAccessRequest.create({ email: 'reader-otp@example.com', status: 'approved' });
    await expect(requestDocsAccessOtp('reader-otp@example.com')).resolves.toEqual({
      success: true,
      message: 'Dev OTP: 123456',
    });
    await expect(consumeDocsOtp('reader-otp@example.com', '123456')).resolves.toBe(true);

    await expect(requestDocsAccessOtp('reader-otp@example.com')).resolves.toEqual({
      success: true,
      message: DOCS_OTP_PUBLIC_MESSAGE,
    });
    await expect(adminSendDocsAccessOtp('reader-otp@example.com')).resolves.toEqual({
      success: false,
      message: 'Please wait before sending another code to this email.',
    });
    await expect(adminSendDocsAccessOtp('stranger@example.com')).resolves.toEqual({
      success: false,
      message: 'This email does not have docs access yet.',
    });
  });

  it('does not say an unknown email was revoked', async () => {
    const res = {} as Response;
    await expect(verifyDocsAccessOtp('missing@example.com', '123456', res)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('docs access session (nginx verify)', () => {
  it('grants an approved email with a valid cookie', async () => {
    await DocsAccessRequest.create({ email: 'approved@example.com', status: 'approved' });
    const token = signDocsAccessToken('approved@example.com');
    await expect(
      getDocsAccessSession(requestWithCookie(`tv_docs_access=${token}`)),
    ).resolves.toEqual({ granted: true, email: 'approved@example.com' });
  });

  it('denies a missing, forged, or revoked session', async () => {
    await expect(getDocsAccessSession(requestWithCookie())).resolves.toMatchObject({
      granted: false,
    });
    await expect(
      getDocsAccessSession(requestWithCookie('tv_docs_access=not-a-jwt')),
    ).resolves.toMatchObject({ granted: false });

    await DocsAccessRequest.create({ email: 'revoked@example.com', status: 'denied' });
    const token = signDocsAccessToken('revoked@example.com');
    await expect(
      getDocsAccessSession(requestWithCookie(`tv_docs_access=${token}`)),
    ).resolves.toMatchObject({ granted: false });
  });
});
