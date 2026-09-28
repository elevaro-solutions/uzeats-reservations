import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';
import { signAccessToken } from '../services/auth.js';

const DELETE = `
  mutation DeleteReview($reviewId: ID!) {
    deleteReview(reviewId: $reviewId)
  }
`;

describe('deleteReview', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let otherDinerToken: string;
  let adminToken: string;
  let superAdminToken: string;
  let dinerId: mongoose.Types.ObjectId;
  let restaurantId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const diner = await User.create({
      email: 'diner-delete-review@test.com',
      passwordHash: 'unused',
      firstName: 'Dan',
      lastName: 'Diner',
      role: 'diner',
    });
    dinerId = diner._id;
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const otherDiner = await User.create({
      email: 'other-diner-delete-review@test.com',
      passwordHash: 'unused',
      firstName: 'Other',
      lastName: 'Diner',
      role: 'diner',
    });
    otherDinerToken = signAccessToken({
      sub: otherDiner._id.toString(),
      role: 'diner',
    });

    const admin = await User.create({
      email: 'admin-delete-review@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const superAdmin = await User.create({
      email: 'super-delete-review@test.com',
      passwordHash: 'unused',
      firstName: 'Sue',
      lastName: 'Super',
      role: 'super_admin',
    });
    superAdminToken = signAccessToken({
      sub: superAdmin._id.toString(),
      role: 'super_admin',
    });

    const restaurant = await Restaurant.create({
      name: 'Delete Review Bistro',
      slug: 'delete-review-bistro',
      ownerId: admin._id,
      status: 'approved',
      cuisine: 'Italian',
      priceRange: 2,
      averageRating: 4,
      reviewCount: 1,
      address: { line1: '1 Main', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.9, 40.7] },
    });
    restaurantId = restaurant._id;
  });

  async function seedReview(rating = 5) {
    const reservation = await Reservation.create({
      restaurantId,
      dinerId,
      tableIds: [],
      partySize: 2,
      slotStart: new Date(Date.now() - 86400000),
      slotEnd: new Date(Date.now() - 82800000),
      status: 'completed',
      source: 'network',
    });
    const review = await Review.create({
      restaurantId,
      dinerId,
      reservationId: reservation._id,
      rating,
      comment: 'Solid meal',
    });
    await Restaurant.findByIdAndUpdate(restaurantId, {
      averageRating: rating,
      reviewCount: 1,
    });
    return review._id.toString();
  }

  it('lets the review creator delete their own review and resets restaurant stats', async () => {
    const reviewId = await seedReview(5);
    const res = await graphqlRequest(agent, DELETE, { reviewId }, dinerToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.deleteReview).toBe(true);
    expect(await Review.findById(reviewId)).toBeNull();

    const restaurant = await Restaurant.findById(restaurantId);
    expect(restaurant?.reviewCount).toBe(0);
    expect(restaurant?.averageRating).toBe(0);
  });

  it('rejects delete from another diner', async () => {
    const reviewId = await seedReview(4);
    const res = await graphqlRequest(agent, DELETE, { reviewId }, otherDinerToken);
    expect(res.body.errors).toBeDefined();
    expect(await Review.findById(reviewId)).toBeTruthy();
  });

  it('rejects delete from a regular platform admin', async () => {
    const reviewId = await seedReview(3);
    const res = await graphqlRequest(agent, DELETE, { reviewId }, adminToken);
    expect(res.body.errors).toBeDefined();
    expect(await Review.findById(reviewId)).toBeTruthy();
  });

  it('lets a super admin delete any review', async () => {
    const reviewId = await seedReview(2);
    const res = await graphqlRequest(agent, DELETE, { reviewId }, superAdminToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.deleteReview).toBe(true);
    expect(await Review.findById(reviewId)).toBeNull();
  });
});
