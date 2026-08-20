import { Redis } from 'ioredis';
import { env } from '../config/env.js';

const DOCS_OTP_TTL_SEC = 10 * 60;
const KEY_PREFIX = 'docs_otp:';

let redis: Redis | null = null;

/** In-memory fallback when ioredis is mocked in tests. */
const memoryStore = new Map<string, { code: string; expiresAt: number }>();

function redisKey(email: string) {
  return `${KEY_PREFIX}${email}`;
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
  if (env.NODE_ENV === 'test') {
    memoryStore.set(email, { code, expiresAt: Date.now() + DOCS_OTP_TTL_SEC * 1000 });
    return;
  }
  await getRedis().setex(redisKey(email), DOCS_OTP_TTL_SEC, code);
}

export async function consumeDocsOtp(email: string, code: string): Promise<boolean> {
  if (env.NODE_ENV === 'test') {
    const stored = memoryStore.get(email);
    if (!stored || stored.code !== code || stored.expiresAt <= Date.now()) return false;
    memoryStore.delete(email);
    return true;
  }

  const key = redisKey(email);
  const client = getRedis();
  const stored = await client.get(key);
  if (!stored || stored !== code) return false;
  await client.del(key);
  return true;
}
