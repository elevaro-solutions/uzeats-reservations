import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let shared: Redis | null = null;

/** Process-wide Redis client (BullMQ/OTP/availability/health share this). */
export function getSharedRedis(): Redis {
  if (!shared) {
    shared = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    shared.on('error', (err) => {
      logger.error({ err }, '[redis] shared client error');
    });
  }
  return shared;
}

export async function pingSharedRedis(): Promise<boolean> {
  if (env.NODE_ENV === 'test') return true;
  try {
    const pong = await getSharedRedis().ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
