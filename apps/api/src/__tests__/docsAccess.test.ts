import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { DocsAccessRequest } from '../models/DocsAccessRequest.js';
import { getDocsAccessSession, signDocsAccessToken } from '../services/docsAccess.js';
import { consumeDocsOtp, MAX_DOCS_OTP_ATTEMPTS, storeDocsOtp } from '../services/docsOtpStore.js';

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
