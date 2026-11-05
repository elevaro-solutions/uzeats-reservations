import { env } from '../config/env.js';
import { getSharedRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { publiclyListedRestaurantIds } from './publicListing.js';

/** Public, unauthenticated aggregates — recompute at most once a day. */
export const HOME_STATS_CACHE_TTL_SEC = 24 * 60 * 60;
const CACHE_KEY = 'home-stats:v1';

export type HomeStats = {
  restaurants: number;
  cities: number;
  dinersServed: number;
  averageRating: number | null;
  reviewCount: number;
  computedAt: string;
};

let memoryEntry: { stats: HomeStats; expiresAt: number } | null = null;

async function computeHomeStats(): Promise<HomeStats> {
  const listedIds = await publiclyListedRestaurantIds();
  const listedMatch = { status: 'approved', _id: { $in: listedIds } };

  const [restaurants, cityRows, dinerRows, ratingRows] = await Promise.all([
    Restaurant.countDocuments(listedMatch),
    Restaurant.aggregate([
      { $match: listedMatch },
      { $group: { _id: { city: { $toLower: '$address.city' }, state: { $toLower: '$address.state' } } } },
      { $count: 'count' },
    ]),
    Reservation.aggregate([
      { $match: { status: { $in: ['seated', 'completed'] } } },
      { $group: { _id: null, guests: { $sum: '$partySize' } } },
    ]),
    Review.aggregate([
      { $match: { hidden: { $ne: true } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const reviewCount = ratingRows[0]?.count ?? 0;
  const avg = ratingRows[0]?.avg;
  return {
    restaurants,
    cities: cityRows[0]?.count ?? 0,
    dinersServed: dinerRows[0]?.guests ?? 0,
    averageRating: reviewCount > 0 && typeof avg === 'number' ? Math.round(avg * 10) / 10 : null,
    reviewCount,
    computedAt: new Date().toISOString(),
  };
}

function readMemory(): HomeStats | null {
  if (!memoryEntry || memoryEntry.expiresAt <= Date.now()) return null;
  return memoryEntry.stats;
}

function writeMemory(stats: HomeStats) {
  memoryEntry = { stats, expiresAt: Date.now() + HOME_STATS_CACHE_TTL_SEC * 1000 };
}

export async function getHomeStats(): Promise<HomeStats> {
  if (env.NODE_ENV === 'test') {
    const cached = readMemory();
    if (cached) return cached;
    const stats = await computeHomeStats();
    writeMemory(stats);
    return stats;
  }

  try {
    const raw = await getSharedRedis().get(CACHE_KEY);
    if (raw) return JSON.parse(raw) as HomeStats;
  } catch (err) {
    logger.error({ err }, '[homeStats] cache get failed');
    const cached = readMemory();
    if (cached) return cached;
  }

  const stats = await computeHomeStats();
  writeMemory(stats);
  try {
    await getSharedRedis().setex(CACHE_KEY, HOME_STATS_CACHE_TTL_SEC, JSON.stringify(stats));
  } catch (err) {
    logger.error({ err }, '[homeStats] cache set failed; memory fallback');
  }
  return stats;
}

/** Test helper — clear in-memory cache. */
export function clearHomeStatsCacheMemory(): void {
  memoryEntry = null;
}
