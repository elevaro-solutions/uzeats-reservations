import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';

const REVIEWS = `
  query RestaurantReviews($restaurantId: ID!, $limit: Int, $sort: ReviewSort) {
    restaurantReviews(restaurantId: $restaurantId, limit: $limit, sort: $sort) {
      total
      items { id rating comment createdAt }
    }
  }
`;

describe('restaurantReviews sort', () => {
  let agent: request.Agent;
  let restaurantId: string;
  let ids: { low: string; mid: string; high: string };

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const diner = await User.create({
      email: 'sort-reviews-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Sam',
      lastName: 'Sorter',
      role: 'diner',
    });

    const restaurant = await Restaurant.create({
      name: 'Sort Reviews Cafe',
      slug: 'sort-reviews-cafe',
      ownerId: diner._id,
      status: 'approved',
      cuisine: 'American',
      priceRange: 2,
      averageRating: 3,
      reviewCount: 3,
      address: { line1: '1 Main', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.9, 40.7] },
    });
    restaurantId = restaurant._id.toString();

    const base = Date.now() - 3 * 86400000;
    const make = async (rating: number, dayOffset: number, comment: string) => {
      const reservation = await Reservation.create({
        restaurantId: restaurant._id,
        dinerId: diner._id,
        tableIds: [],
        partySize: 2,
        slotStart: new Date(base + dayOffset * 86400000),
        slotEnd: new Date(base + dayOffset * 86400000 + 3600000),
        status: 'completed',
        source: 'network',
      });
      const review = await Review.create({
        restaurantId: restaurant._id,
        dinerId: diner._id,
        reservationId: reservation._id,
        rating,
        comment,
        createdAt: new Date(base + dayOffset * 86400000 + 7200000),
      });
      return review._id.toString();
    };

    const low = await make(2, 0, 'low-oldest');
    const mid = await make(3, 1, 'mid');
    const high = await make(5, 2, 'high-newest');
    ids = { low, mid, high };
  });

  it('defaults to newest', async () => {
    const res = await graphqlRequest(agent, REVIEWS, { restaurantId, limit: 5 });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.restaurantReviews.items;
    expect(items.map((r: { id: string }) => r.id)).toEqual([ids.high, ids.mid, ids.low]);
  });

  it('sorts oldest first', async () => {
    const res = await graphqlRequest(agent, REVIEWS, {
      restaurantId,
      limit: 5,
      sort: 'oldest',
    });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.restaurantReviews.items;
    expect(items.map((r: { id: string }) => r.id)).toEqual([ids.low, ids.mid, ids.high]);
  });

  it('sorts highest rated first', async () => {
    const res = await graphqlRequest(agent, REVIEWS, {
      restaurantId,
      limit: 5,
      sort: 'highest',
    });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.restaurantReviews.items;
    expect(items.map((r: { rating: number }) => r.rating)).toEqual([5, 3, 2]);
  });

  it('sorts lowest rated first', async () => {
    const res = await graphqlRequest(agent, REVIEWS, {
      restaurantId,
      limit: 5,
      sort: 'lowest',
    });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.restaurantReviews.items;
    expect(items.map((r: { rating: number }) => r.rating)).toEqual([2, 3, 5]);
  });

  it('honors limit for profile preview', async () => {
    const res = await graphqlRequest(agent, REVIEWS, {
      restaurantId,
      limit: 2,
      sort: 'newest',
    });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.restaurantReviews.total).toBe(3);
    expect(res.body.data.restaurantReviews.items).toHaveLength(2);
  });
});
