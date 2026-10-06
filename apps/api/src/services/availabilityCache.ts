import type { AvailabilitySlot } from '@reservations/shared';
import { env } from '../config/env.js';
import { getSharedRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/** Short TTL — discovery cards reuse; booking still refetches often enough to stay fresh. */
export const AVAILABILITY_CACHE_TTL_SEC = 45;
const KEY_PREFIX = 'avail:v1:';

const memoryStore = new Map<string, { slots: AvailabilitySlot[]; expiresAt: number }>();

export function availabilityCacheKey(
  restaurantId: string,
  date: string,
  partySize: number,
  privateDiningSpaceId?: string | null,
): string {
  const space = privateDiningSpaceId?.trim() || '-';
  return `${KEY_PREFIX}${restaurantId}:${date}:${partySize}:${space}`;
}

export async function getCachedAvailability(
  restaurantId: string,
  date: string,
  partySize: number,
  privateDiningSpaceId?: string | null,
): Promise<AvailabilitySlot[] | null> {
  const key = availabilityCacheKey(restaurantId, date, partySize, privateDiningSpaceId);

  if (env.NODE_ENV === 'test') {
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.slots;
  }

  try {
    const raw = await getSharedRedis().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as AvailabilitySlot[];
  } catch (err) {
    logger.error({ err, key }, '[availabilityCache] get failed');
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.slots;
  }
}

export async function setCachedAvailability(
  restaurantId: string,
  date: string,
  partySize: number,
  slots: AvailabilitySlot[],
  privateDiningSpaceId?: string | null,
): Promise<void> {
  const key = availabilityCacheKey(
    restaurantId,
    date,
    partySize,
    privateDiningSpaceId,
  );
  const expiresAt = Date.now() + AVAILABILITY_CACHE_TTL_SEC * 1000;

  if (env.NODE_ENV === 'test') {
    memoryStore.set(key, { slots, expiresAt });
    return;
  }

  try {
    await getSharedRedis().setex(key, AVAILABILITY_CACHE_TTL_SEC, JSON.stringify(slots));
  } catch (err) {
    memoryStore.set(key, { slots, expiresAt });
    logger.error({ err, key }, '[availabilityCache] setex failed; memory fallback');
  }
}

/** Test helper — clear in-memory fallback. */
export function clearAvailabilityCacheMemory(): void {
  memoryStore.clear();
}
