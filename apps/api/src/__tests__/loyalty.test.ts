import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { resolveRedeemPoints, depositPointsFromCents, LOYALTY, LOYALTY_EARN_REASONS, visitPointsForTier, RESTAURANT_LOYALTY, resolveRestaurantRedeemPoints } from '@reservations/shared';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { RestaurantLoyaltyTransaction } from '../models/RestaurantLoyalty.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

describe('resolveRedeemPoints', () => {
  it('returns null when no points requested', () => {
    expect(resolveRedeemPoints(0, 5000, 1000)).toBeNull();
    expect(resolveRedeemPoints(undefined, 5000, 1000)).toBeNull();
  });

  it('rejects below minimum redeem', () => {
    expect(() => resolveRedeemPoints(100, 5000, 1000)).toThrow(/Minimum redeem/);
  });

  it('rejects redeem without a deposit', () => {
    expect(() => resolveRedeemPoints(500, 0, 1000)).toThrow(/deposit/);
  });

  it('rejects insufficient balance', () => {
    expect(() => resolveRedeemPoints(500, 5000, 400)).toThrow(/Insufficient/);
  });

  it('caps redemption at deposit value', () => {
    const result = resolveRedeemPoints(1000, 700, 2000);
    expect(result).toEqual({ pointsToRedeem: 700, discountCents: 700 });
  });

  it('accepts valid redemption', () => {
    const result = resolveRedeemPoints(500, 5000, 1000);
    expect(result).toEqual({ pointsToRedeem: 500, discountCents: 500 });
  });
});

describe('resolveRestaurantRedeemPoints', () => {
  it('accepts valid restaurant redemption', () => {
    const result = resolveRestaurantRedeemPoints(
      300,
      5000,
      500,
      RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS,
    );
    expect(result).toEqual({ pointsToRedeem: 300, discountCents: 300 });
  });

  it('rejects below restaurant minimum', () => {
    expect(() =>
      resolveRestaurantRedeemPoints(100, 5000, 500, 200),
    ).toThrow(/Minimum redeem/);
  });
});

describe('depositPointsFromCents', () => {
  it('awards 1 point per dollar by default', () => {
    expect(depositPointsFromCents(3500)).toBe(35);
    expect(depositPointsFromCents(0)).toBe(0);
  });
});

describe('visitPointsForTier', () => {
  it('applies tier multipliers to visit rewards', () => {
    expect(visitPointsForTier(0)).toBe(100);
    expect(visitPointsForTier(5)).toBe(125);
    expect(visitPointsForTier(15)).toBe(150);
  });
});

describe('Loyalty Phase 1 (E2E)', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let dinerId: string;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let reservationId: string;
  let slotStart: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'loyalty-diner@test.com',
      password: 'Password123!',
      firstName: 'Loyal',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;
    dinerId = diner.user.id;
    await User.findByIdAndUpdate(dinerId, { loyaltyPoints: 1000 });

    const owner = await registerUser(agent, {
      email: 'loyalty-owner@test.com',
      password: 'Password123!',
      firstName: 'Owner',
      lastName: 'Test',
    });
    ownerToken = owner.accessToken;
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });

    const adminUser = await User.create({
      email: 'loyalty-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    const { signAccessToken } = await import('../services/auth.js');
    adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    const restaurantRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) {
        createRestaurant(input: $input) { id }
      }`,
      {
        input: {
          name: 'Loyalty Bistro',
          cuisine: 'French',
          priceRange: 3,
          address: { line1: '1 Points Ave', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.93, lat: 40.73 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;

    await graphqlRequest(
      agent,
      `mutation SetStatus($id: ID!, $status: RestaurantStatus!) {
        setRestaurantStatus(id: $id, status: $status) { id status }
      }`,
      { id: restaurantId, status: 'approved' },
      adminToken,
    );

    await Restaurant.findByIdAndUpdate(restaurantId, {
      depositRequired: true,
      depositAmountCents: 2000,
    });

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      {
        restaurantId,
        input: { name: 'T1', minCapacity: 2, maxCapacity: 4 },
      },
      ownerToken,
    );

    await graphqlRequest(
      agent,
      `mutation CreateShift($restaurantId: ID!, $input: ShiftInput!) {
        createShift(restaurantId: $restaurantId, input: $input) { id }
      }`,
      {
        restaurantId,
        input: {
          name: 'Dinner',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: '17:00',
          endTime: '23:00',
          slotIntervalMinutes: 30,
          turnTimeMinutes: 90,
        },
      },
      ownerToken,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );
    const slot = availRes.body.data.availability.find((s: { available: boolean }) => s.available);
    slotStart = slot.time;
  });

  it('applies loyalty discount to deposit and deducts points', async () => {
    const before = await User.findById(dinerId);
    expect(before?.loyaltyPoints).toBe(1000);

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation { id depositAmountCents loyaltyPointsRedeemed status }
          clientSecret
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart,
          redeemPoints: 500,
        },
      },
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const payload = res.body.data.createReservation;
    expect(payload.reservation.depositAmountCents).toBe(3500);
    expect(payload.reservation.loyaltyPointsRedeemed).toBe(500);
    expect(payload.reservation.status).toBe('confirmed');
    expect(payload.clientSecret).toBeNull();
    reservationId = payload.reservation.id;

    const after = await User.findById(dinerId);
    const depositEarn = depositPointsFromCents(3500);
    expect(after?.loyaltyPoints).toBe(1000 - 500 + depositEarn + LOYALTY.FIRST_BOOKING_BONUS_POINTS);

    const redeemTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'redeem',
      points: -500,
    });
    expect(redeemTx).toBeTruthy();

    const depositTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'earn',
      description: LOYALTY_EARN_REASONS.DEPOSIT_PAYMENT,
    });
    expect(depositTx?.points).toBe(depositEarn);

    const firstBookingTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'earn',
      description: LOYALTY_EARN_REASONS.FIRST_BOOKING,
    });
    expect(firstBookingTx?.points).toBe(LOYALTY.FIRST_BOOKING_BONUS_POINTS);
  });

  it('refunds redeemed points when reservation is cancelled', async () => {
    const cancelRes = await graphqlRequest(
      agent,
      `mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
        updateReservationStatus(id: $id, status: $status) { id status }
      }`,
      { id: reservationId, status: 'cancelled' },
      dinerToken,
    );
    expect(cancelRes.body.errors).toBeUndefined();

    const after = await User.findById(dinerId);
    const depositEarn = depositPointsFromCents(3500);
    expect(after?.loyaltyPoints).toBe(1000 + LOYALTY.FIRST_BOOKING_BONUS_POINTS);

    const refundTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'earn',
      points: 500,
      description: /cancelled/i,
    });
    expect(refundTx).toBeTruthy();

    const depositReversal = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'adjust',
      points: -depositEarn,
      description: /Deposit points reversed/i,
    });
    expect(depositReversal).toBeTruthy();
  });

  it('records admin loyalty adjustments in the ledger', async () => {
    const beforeAdmin = await User.findById(dinerId);
    const res = await graphqlRequest(
      agent,
      `mutation AdminUpdateUser($userId: ID!, $input: AdminUserInput!) {
        adminUpdateUser(userId: $userId, input: $input) { id loyaltyPoints }
      }`,
      { userId: dinerId, input: { loyaltyPoints: 1200 } },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminUpdateUser.loyaltyPoints).toBe(1200);

    const adjustTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      type: 'adjust',
      points: 1200 - (beforeAdmin?.loyaltyPoints ?? 0),
    });
    expect(adjustTx).toBeTruthy();
    expect(adjustTx?.description).toMatch(/Admin set balance/);
  });

  it('rejects redeem below minimum on booking', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );
    const slot = availRes.body.data.availability.find((s: { available: boolean }) => s.available);

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) { reservation { id } }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: slot.time,
          redeemPoints: 100,
        },
      },
      dinerToken,
    );

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/Minimum redeem/);
  });

  it('awards review points after a completed visit', async () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    const dateStr = dayAfter.toISOString().split('T')[0];

    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );
    const slot = availRes.body.data.availability.find((s: { available: boolean }) => s.available);

    const bookRes = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) { reservation { id } }
      }`,
      {
        input: { restaurantId, partySize: 2, slotStart: slot.time },
      },
      dinerToken,
    );
    expect(bookRes.body.errors).toBeUndefined();
    const reviewResId = bookRes.body.data.createReservation.reservation.id;

    const STATUS_MUTATION = `mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
      updateReservationStatus(id: $id, status: $status) { id status }
    }`;
    await graphqlRequest(agent, STATUS_MUTATION, { id: reviewResId, status: 'seated' }, ownerToken);
    await graphqlRequest(agent, STATUS_MUTATION, { id: reviewResId, status: 'completed' }, ownerToken);

    const beforeReview = await User.findById(dinerId);
    const reviewRes = await graphqlRequest(
      agent,
      `mutation CreateReview($input: ReviewInput!) {
        createReview(input: $input) { id rating }
      }`,
      { input: { reservationId: reviewResId, rating: 5, comment: 'Great!' } },
      dinerToken,
    );
    expect(reviewRes.body.errors).toBeUndefined();

    const afterReview = await User.findById(dinerId);
    expect(afterReview!.loyaltyPoints - beforeReview!.loyaltyPoints).toBe(LOYALTY.POINTS_PER_REVIEW);

    const reviewTx = await LoyaltyTransaction.findOne({
      userId: dinerId,
      reservationId: reviewResId,
      type: 'earn',
      description: LOYALTY_EARN_REASONS.REVIEW,
    });
    expect(reviewTx?.points).toBe(LOYALTY.POINTS_PER_REVIEW);
  });
});

describe('Restaurant loyalty (E2E)', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let dinerId: string;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let slotStart: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'rest-loyalty-diner@test.com',
      password: 'Password123!',
      firstName: 'Rest',
      lastName: 'Guest',
    });
    dinerToken = diner.accessToken;
    dinerId = diner.user.id;

    const owner = await registerUser(agent, {
      email: 'rest-loyalty-owner@test.com',
      password: 'Password123!',
      firstName: 'Rest',
      lastName: 'Owner',
    });
    ownerToken = owner.accessToken;
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });

    const adminUser = await User.create({
      email: 'rest-loyalty-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    const { signAccessToken } = await import('../services/auth.js');
    adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    const restaurantRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) {
        createRestaurant(input: $input) { id }
      }`,
      {
        input: {
          name: 'Venue Rewards',
          cuisine: 'Italian',
          priceRange: 2,
          address: { line1: '2 Loyalty Ln', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.94, lat: 40.74 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;

    await graphqlRequest(
      agent,
      `mutation SetStatus($id: ID!, $status: RestaurantStatus!) {
        setRestaurantStatus(id: $id, status: $status) { id status }
      }`,
      { id: restaurantId, status: 'approved' },
      adminToken,
    );

    await Restaurant.findByIdAndUpdate(restaurantId, {
      depositRequired: true,
      depositAmountCents: 2500,
      loyaltyEnabled: true,
      loyaltyPointsPerVisit: 75,
      loyaltyMinRedeemPoints: 200,
    });

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      {
        restaurantId,
        input: { name: 'R1', minCapacity: 2, maxCapacity: 4 },
      },
      ownerToken,
    );

    await graphqlRequest(
      agent,
      `mutation CreateShift($restaurantId: ID!, $input: ShiftInput!) {
        createShift(restaurantId: $restaurantId, input: $input) { id }
      }`,
      {
        restaurantId,
        input: {
          name: 'All day',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: '11:00',
          endTime: '23:00',
          slotIntervalMinutes: 30,
          turnTimeMinutes: 90,
        },
      },
      ownerToken,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );
    slotStart = availRes.body.data.availability.find((s: { available: boolean }) => s.available).time;

    await GuestProfile.create({
      restaurantId,
      dinerId,
      loyaltyPoints: 400,
    });
  });

  it('redeems restaurant points against deposit', async () => {
    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation {
            id
            depositAmountCents
            restaurantLoyaltyPointsRedeemed
          }
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart,
          redeemRestaurantPoints: 300,
        },
      },
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const reservation = res.body.data.createReservation.reservation;
    expect(reservation.depositAmountCents).toBe(4700);
    expect(reservation.restaurantLoyaltyPointsRedeemed).toBe(300);

    const profile = await GuestProfile.findOne({ restaurantId, dinerId });
    expect(profile?.loyaltyPoints).toBe(100);

    const balanceRes = await graphqlRequest(
      agent,
      `query Balance($restaurantId: ID!) {
        myRestaurantLoyaltyBalance(restaurantId: $restaurantId)
      }`,
      { restaurantId },
      dinerToken,
    );
    expect(balanceRes.body.data.myRestaurantLoyaltyBalance).toBe(100);
  });

  it('awards restaurant points on completed visit', async () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dateStr = dayAfter.toISOString().split('T')[0];

    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );
    const slot = availRes.body.data.availability.find((s: { available: boolean }) => s.available);

    const bookRes = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) { reservation { id } }
      }`,
      {
        input: { restaurantId, partySize: 2, slotStart: slot.time },
      },
      dinerToken,
    );
    const resId = bookRes.body.data.createReservation.reservation.id;

    const STATUS = `mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
      updateReservationStatus(id: $id, status: $status) { id restaurantLoyaltyPointsEarned }
    }`;
    await graphqlRequest(agent, STATUS, { id: resId, status: 'seated' }, ownerToken);
    const completeRes = await graphqlRequest(
      agent,
      STATUS,
      { id: resId, status: 'completed' },
      ownerToken,
    );
    expect(completeRes.body.data.updateReservationStatus.restaurantLoyaltyPointsEarned).toBe(75);

    const profile = await GuestProfile.findOne({ restaurantId, dinerId });
    expect(profile?.loyaltyPoints).toBe(175);

    const earnTx = await RestaurantLoyaltyTransaction.findOne({
      restaurantId,
      dinerId,
      reservationId: resId,
      type: 'earn',
      points: 75,
    });
    expect(earnTx).toBeTruthy();
  });
});

describe('FIFO loyalty buckets', () => {
  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('consumes oldest earn bucket first on redeem', async () => {
    const user = await User.create({
      email: 'fifo@test.com',
      passwordHash: 'x',
      firstName: 'Fifo',
      lastName: 'Tester',
      role: 'diner',
      loyaltyPoints: 1000,
    });

    const old = await LoyaltyTransaction.create({
      userId: user._id,
      type: 'earn',
      points: 600,
      remainingPoints: 600,
      description: 'Older bucket',
      createdAt: new Date('2024-01-01'),
    });
    const newer = await LoyaltyTransaction.create({
      userId: user._id,
      type: 'earn',
      points: 400,
      remainingPoints: 400,
      description: 'Newer bucket',
      createdAt: new Date('2024-06-01'),
    });

    const { redeemPoints } = await import('../services/loyalty.js');
    await redeemPoints(user._id.toString(), 500);

    const oldAfter = await LoyaltyTransaction.findById(old._id);
    const newAfter = await LoyaltyTransaction.findById(newer._id);
    expect(oldAfter?.remainingPoints).toBe(100);
    expect(newAfter?.remainingPoints).toBe(400);

    const updated = await User.findById(user._id);
    expect(updated?.loyaltyPoints).toBe(500);
  });

  it('expires only buckets past expiresAt', async () => {
    const user = await User.create({
      email: 'expire-fifo@test.com',
      passwordHash: 'x',
      firstName: 'Expire',
      lastName: 'Fifo',
      role: 'diner',
      loyaltyPoints: 500,
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await LoyaltyTransaction.create({
      userId: user._id,
      type: 'earn',
      points: 300,
      remainingPoints: 300,
      expiresAt: yesterday,
      description: 'Stale bucket',
    });
    await LoyaltyTransaction.create({
      userId: user._id,
      type: 'earn',
      points: 200,
      remainingPoints: 200,
      expiresAt: nextYear,
      description: 'Fresh bucket',
    });

    const { expireFifoPointBuckets } = await import('../lib/loyaltyBuckets.js');
    const result = await expireFifoPointBuckets();
    expect(result.expiredPoints).toBe(300);

    const updated = await User.findById(user._id);
    expect(updated?.loyaltyPoints).toBe(200);
  });
});
