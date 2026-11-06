import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const DOCS_OTP_TTL_SEC = 10 * 60;
/** Wrong guesses allowed per issued code; the code is burned after this. */
export const MAX_DOCS_OTP_ATTEMPTS = 5;
const KEY_PREFIX = 'docs_otp:';
const ATTEMPTS_PREFIX = 'docs_otp_attempts:';

let redis: Redis | null = null;

/** In-memory fallback when ioredis is mocked in tests. */
const memoryStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

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
