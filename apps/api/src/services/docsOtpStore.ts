import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const DOCS_OTP_TTL_SEC = 10 * 60;
/** Wrong guesses allowed per issued code; the code is burned after this. */
export const MAX_DOCS_OTP_ATTEMPTS = 5;
/** Minimum gap between codes emailed to one address. */
export const DOCS_OTP_MIN_INTERVAL_SEC = 60;
/** Codes that may be issued to one address per hour. */
export const DOCS_OTP_MAX_SENDS_PER_HOUR = 5;
const HOUR_SEC = 60 * 60;
const KEY_PREFIX = 'docs_otp:';
const ATTEMPTS_PREFIX = 'docs_otp_attempts:';
const SEND_LOCK_PREFIX = 'docs_otp_send_lock:';
const SEND_COUNT_PREFIX = 'docs_otp_send_count:';

let redis: Redis | null = null;

/** In-memory fallback when ioredis is mocked in tests. */
const memoryStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const memorySends = new Map<string, { nextAllowedAt: number; windowStart: number; count: number }>();

function redisKey(email: string) {
  return `${KEY_PREFIX}${email}`;
}

function attemptsKey(email: string) {
  return `${ATTEMPTS_PREFIX}${email}`;
}

function consumeFromMemory(email: string, code: string): boolean {
  const stored = memoryStore.get(email);
  if (!stored || stored.expiresAt <= Date.now()) return false;
  stored.attempts += 1;
  if (stored.attempts > MAX_DOCS_OTP_ATTEMPTS) {
    memoryStore.delete(email);
    return false;
  }
  if (stored.code !== code) return false;
  memoryStore.delete(email);
  return true;
}

function claimSendFromMemory(email: string, now: number): boolean {
  const state = memorySends.get(email) ?? { nextAllowedAt: 0, windowStart: now, count: 0 };
  if (now - state.windowStart >= HOUR_SEC * 1000) {
    state.windowStart = now;
    state.count = 0;
  }
  if (now < state.nextAllowedAt || state.count >= DOCS_OTP_MAX_SENDS_PER_HOUR) {
    memorySends.set(email, state);
    return false;
  }
  state.count += 1;
  state.nextAllowedAt = now + DOCS_OTP_MIN_INTERVAL_SEC * 1000;
  memorySends.set(email, state);
  return true;
}

/**
 * Reserve a send slot for this email. False when the last code was under a
 * minute ago or five codes were already issued in the current hour.
 * `now` is only honored in tests; production uses Redis TTLs.
 */
export async function claimDocsOtpSend(email: string, now = Date.now()): Promise<boolean> {
  if (env.NODE_ENV === 'test') return claimSendFromMemory(email, now);

  try {
    const client = getRedis();
    const locked = await client.set(
      `${SEND_LOCK_PREFIX}${email}`,
      '1',
      'EX',
      DOCS_OTP_MIN_INTERVAL_SEC,
      'NX',
    );
    if (locked !== 'OK') return false;
    const count = await client.incr(`${SEND_COUNT_PREFIX}${email}`);
    if (count === 1) await client.expire(`${SEND_COUNT_PREFIX}${email}`, HOUR_SEC);
    return count <= DOCS_OTP_MAX_SENDS_PER_HOUR;
  } catch (err) {
    logger.error({ err, email }, '[docsOtpStore] send throttle failed; using memory');
    return claimSendFromMemory(email, now);
  }
}

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }
  return redis;
}

export async function storeDocsOtp(email: string, code: string): Promise<void> {
  const memoryEntry = { code, expiresAt: Date.now() + DOCS_OTP_TTL_SEC * 1000, attempts: 0 };
  if (env.NODE_ENV === 'test') {
    memoryStore.set(email, memoryEntry);
    return;
  }
  try {
    await getRedis()
      .multi()
      .setex(redisKey(email), DOCS_OTP_TTL_SEC, code)
      .del(attemptsKey(email))
      .exec();
  } catch (err) {
    // Single-instance fallback so OTP still works if Redis blips.
    memoryStore.set(email, memoryEntry);
    logger.error({ err, email }, '[docsOtpStore] Redis setex failed; using memory fallback');
  }
}

/**
 * The attempt counter is incremented before the code is compared, so parallel
 * guesses (aliased or batched GraphQL mutations) cannot exceed the cap.
 */
export async function consumeDocsOtp(email: string, code: string): Promise<boolean> {
  if (env.NODE_ENV === 'test') return consumeFromMemory(email, code);

  const key = redisKey(email);
  const counterKey = attemptsKey(email);
  try {
    const client = getRedis();
    const attempts = await client.incr(counterKey);
    if (attempts === 1) await client.expire(counterKey, DOCS_OTP_TTL_SEC);
    if (attempts > MAX_DOCS_OTP_ATTEMPTS) {
      await client.del(key);
      memoryStore.delete(email);
      return false;
    }
    const stored = await client.get(key);
    if (stored && stored === code) {
      await client.del(key, counterKey);
      memoryStore.delete(email);
      return true;
    }
    if (stored) return false;
  } catch (err) {
    logger.error({ err, email }, '[docsOtpStore] Redis get/del failed; checking memory fallback');
  }

  return consumeFromMemory(email, code);
}
