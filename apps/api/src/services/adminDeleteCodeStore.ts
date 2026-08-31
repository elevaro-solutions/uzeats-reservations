import { Redis } from 'ioredis';
import { env } from '../config/env.js';

const DELETE_CODE_TTL_SEC = 10 * 60;
const KEY_PREFIX = 'admin_delete_code:';

let redis: Redis | null = null;

/** In-memory fallback when ioredis is mocked in tests. */
const memoryStore = new Map<string, { code: string; expiresAt: number }>();

function codeKey(adminId: string, userId: string) {
  return `${KEY_PREFIX}${adminId}:${userId}`;
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

export async function storeAdminDeleteCode(
  adminId: string,
  userId: string,
  code: string,
): Promise<void> {
  const key = codeKey(adminId, userId);
  if (env.NODE_ENV === 'test') {
    memoryStore.set(key, { code, expiresAt: Date.now() + DELETE_CODE_TTL_SEC * 1000 });
    return;
  }
  await getRedis().setex(key, DELETE_CODE_TTL_SEC, code);
}

export async function consumeAdminDeleteCode(
  adminId: string,
  userId: string,
  code: string,
): Promise<boolean> {
  const key = codeKey(adminId, userId);
  if (env.NODE_ENV === 'test') {
    const stored = memoryStore.get(key);
    if (!stored || stored.code !== code || stored.expiresAt <= Date.now()) return false;
    memoryStore.delete(key);
    return true;
  }

  const client = getRedis();
  const stored = await client.get(key);
  if (!stored || stored !== code) return false;
  await client.del(key);
  return true;
}

export async function clearAdminDeleteCode(adminId: string, userId: string): Promise<void> {
  const key = codeKey(adminId, userId);
  if (env.NODE_ENV === 'test') {
    memoryStore.delete(key);
    return;
  }
  await getRedis().del(key);
}
