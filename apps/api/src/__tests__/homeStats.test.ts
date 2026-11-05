import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import type request from 'supertest';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { clearHomeStatsCacheMemory } from '../services/homeStats.js';
import { createTestApp, ensurePublicListing, graphqlRequest } from './helpers.js';

const HOME_STATS_QUERY = `
  query HomeStats {
    homeStats { restaurants cities dinersServed averageRating reviewCount computedAt }
  }
`;

const ownerId = new mongoose.Types.ObjectId();
const dinerId = new mongoose.Types.ObjectId();

async function createRestaurant(name: string, city: string, state: string, extra: Record<string, unknown> = {}) {
  return Restaurant.create({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    cuisine: 'Italian',
    priceRange: 2,
    status: 'approved',
    ownerId,
    address: { line1: '1 Main St', city, state, zip: '10001' },
    location: { type: 'Point', coordinates: [-74, 40.7] },
    ...extra,
  });
}

async function createReservation(restaurantId: mongoose.Types.ObjectId, partySize: number, status: string) {
  const slotStart = new Date('2026-01-10T19:00:00Z');
  return Reservation.create({
    restaurantId,
    dinerId,
    tableIds: [],
    partySize,
    slotStart,
    slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
    status,
  });
}

describe('homeStats query', () => {
  let agent: request.Agent;

  beforeAll(async () => {
    const app = await createTestApp();
    agent = app.agent as unknown as request.Agent;
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    clearHomeStatsCacheMemory();
  });

  it('counts only publicly listed restaurants, seated guests, and visible reviews', async () => {
    const nyc = await createRestaurant('Listed NYC', 'New York', 'NY');
    const nyc2 = await createRestaurant('Listed NYC 2', 'new york', 'ny');
    const chicago = await createRestaurant('Listed Chicago', 'Chicago', 'IL');
    const hidden = await createRestaurant('Hidden', 'Boston', 'MA', { visibility: 'hidden' });
    await createRestaurant('No plan', 'Austin', 'TX');
    for (const r of [nyc, nyc2, chicago, hidden]) await ensurePublicListing(r._id.toString());

    const seated = await createReservation(nyc._id, 4, 'completed');
    const seated2 = await createReservation(chicago._id, 2, 'seated');
    await createReservation(nyc._id, 6, 'cancelled');
    await createReservation(nyc._id, 3, 'confirmed');

    await Review.create({ restaurantId: nyc._id, dinerId, reservationId: seated._id, rating: 5 });
    await Review.create({ restaurantId: chicago._id, dinerId, reservationId: seated2._id, rating: 4 });
    await Review.create({
      restaurantId: nyc._id,
      dinerId,
      reservationId: new mongoose.Types.ObjectId(),
      rating: 1,
      hidden: true,
    });

    const res = await graphqlRequest(agent, HOME_STATS_QUERY);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.homeStats).toMatchObject({
      restaurants: 3,
      cities: 2,
      dinersServed: 6,
      averageRating: 4.5,
      reviewCount: 2,
    });
  });

  it('returns null rating when there are no reviews', async () => {
    const res = await graphqlRequest(agent, HOME_STATS_QUERY);
    expect(res.body.data.homeStats).toMatchObject({
      restaurants: 0,
      cities: 0,
      dinersServed: 0,
      averageRating: null,
      reviewCount: 0,
    });
  });

  it('serves cached totals until the cache expires', async () => {
    const first = await graphqlRequest(agent, HOME_STATS_QUERY);
    expect(first.body.data.homeStats.restaurants).toBe(0);

    const r = await createRestaurant('Late joiner', 'Denver', 'CO');
    await ensurePublicListing(r._id.toString());

    const cached = await graphqlRequest(agent, HOME_STATS_QUERY);
    expect(cached.body.data.homeStats.restaurants).toBe(0);
    expect(cached.body.data.homeStats.computedAt).toBe(first.body.data.homeStats.computedAt);

    clearHomeStatsCacheMemory();
    const fresh = await graphqlRequest(agent, HOME_STATS_QUERY);
    expect(fresh.body.data.homeStats.restaurants).toBe(1);
  });
});
