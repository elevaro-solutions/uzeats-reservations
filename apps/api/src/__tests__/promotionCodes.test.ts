import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { Promotion } from '../models/Marketing.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

describe('Promotion codes at booking', () => {
  let agent: request.Agent;
  let dinerToken: string;
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
      email: 'promo-diner@test.com',
      password: 'Password123!',
      firstName: 'Promo',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const owner = await registerUser(agent, {
      email: 'promo-owner@test.com',
      password: 'Password123!',
      firstName: 'Promo',
      lastName: 'Owner',
    });
    ownerToken = owner.accessToken;
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });

    const adminUser = await User.create({
      email: 'promo-admin@test.com',
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
          name: 'Promo Bistro',
          cuisine: 'American',
          priceRange: 2,
          address: { line1: '9 Code St', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.95, lat: 40.75 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;

    await graphqlRequest(
      agent,
      `mutation SetStatus($id: ID!, $status: RestaurantStatus!) {
        setRestaurantStatus(id: $id, status: $status) { id }
      }`,
      { id: restaurantId, status: 'approved' },
      adminToken,
    );

    await Restaurant.findByIdAndUpdate(restaurantId, {
      depositRequired: true,
      depositAmountCents: 2000,
    });

    await Promotion.create({
      restaurantId,
      title: 'Summer 20% off',
      description: 'Deposit discount',
      discountPercent: 20,
      code: 'SUMMER20',
      active: true,
    });

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      { restaurantId, input: { name: 'P1', minCapacity: 2, maxCapacity: 4 } },
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
    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: tomorrow.toISOString().split('T')[0], partySize: 2 },
      dinerToken,
    );
    slotStart = availRes.body.data.availability.find((s: { available: boolean }) => s.available).time;
  });

  it('applies promotion code discount to deposit', async () => {
    const validateRes = await graphqlRequest(
      agent,
      `query Validate($restaurantId: ID!, $code: String!, $slotStart: DateTime!, $depositCents: Int!) {
        validatePromotion(
          restaurantId: $restaurantId
          code: $code
          slotStart: $slotStart
          depositCents: $depositCents
        ) {
          valid
          discountCents
          discountedDepositCents
        }
      }`,
      { restaurantId, code: 'summer20', slotStart, depositCents: 4000 },
      dinerToken,
    );
    expect(validateRes.body.data.validatePromotion.valid).toBe(true);
    expect(validateRes.body.data.validatePromotion.discountCents).toBe(800);

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation {
            id
            depositAmountCents
            promoDiscountCents
          }
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart,
          promoCode: 'SUMMER20',
        },
      },
      dinerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const reservation = res.body.data.createReservation.reservation;
    expect(reservation.promoDiscountCents).toBe(800);
    expect(reservation.depositAmountCents).toBe(3200);

    const promo = await Promotion.findOne({ restaurantId, code: 'SUMMER20' });
    expect(promo?.redemptions).toBe(1);
  });

  it('applies fixed-amount promotion discount', async () => {
    await Promotion.create({
      restaurantId,
      title: '$5 off',
      discountAmountCents: 500,
      code: 'FLAT5',
      active: true,
    });

    const validateRes = await graphqlRequest(
      agent,
      `query Validate($restaurantId: ID!, $code: String!, $slotStart: DateTime!, $depositCents: Int!) {
        validatePromotion(
          restaurantId: $restaurantId
          code: $code
          slotStart: $slotStart
          depositCents: $depositCents
        ) {
          valid
          discountCents
          discountedDepositCents
        }
      }`,
      { restaurantId, code: 'FLAT5', slotStart, depositCents: 2000 },
      dinerToken,
    );
    expect(validateRes.body.data.validatePromotion.valid).toBe(true);
    expect(validateRes.body.data.validatePromotion.discountCents).toBe(500);
    expect(validateRes.body.data.validatePromotion.discountedDepositCents).toBe(1500);
  });

  it('rejects promotion when max redemptions reached', async () => {
    await Promotion.create({
      restaurantId,
      title: 'One-time',
      discountPercent: 10,
      code: 'ONCE10',
      maxRedemptions: 1,
      redemptions: 1,
      active: true,
    });

    const validateRes = await graphqlRequest(
      agent,
      `query Validate($restaurantId: ID!, $code: String!, $slotStart: DateTime!, $depositCents: Int!) {
        validatePromotion(
          restaurantId: $restaurantId
          code: $code
          slotStart: $slotStart
          depositCents: $depositCents
        ) {
          valid
          message
        }
      }`,
      { restaurantId, code: 'ONCE10', slotStart, depositCents: 2000 },
      dinerToken,
    );
    expect(validateRes.body.data.validatePromotion.valid).toBe(false);
    expect(validateRes.body.data.validatePromotion.message).toMatch(/redemption limit/i);
  });

  it('auto-applies best public promotion when no code is entered', async () => {
    await Promotion.create({
      restaurantId,
      title: 'Weeknight 10% off',
      discountPercent: 10,
      active: true,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available
        }
      }`,
      { restaurantId, date: tomorrow.toISOString().split('T')[0], partySize: 2 },
      dinerToken,
    );
    const openSlot = availRes.body.data.availability.find(
      (s: { time: string; available: boolean }) => s.available && s.time !== slotStart,
    )?.time;
    expect(openSlot).toBeTruthy();

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation {
            id
            depositAmountCents
            promoDiscountCents
          }
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: openSlot,
        },
      },
      dinerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const reservation = res.body.data.createReservation.reservation;
    expect(reservation.promoDiscountCents).toBe(400);
    expect(reservation.depositAmountCents).toBe(3600);
  });
});
