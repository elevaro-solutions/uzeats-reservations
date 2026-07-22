import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { GiftCard } from '../models/GiftCard.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

describe('Gift cards at booking', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let slotStart: string;
  let giftCardCode: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'gift-diner@test.com',
      password: 'Password123!',
      firstName: 'Gift',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const owner = await registerUser(agent, {
      email: 'gift-owner@test.com',
      password: 'Password123!',
      firstName: 'Gift',
      lastName: 'Owner',
    });
    ownerToken = owner.accessToken;
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });

    const adminUser = await User.create({
      email: 'gift-admin@test.com',
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
          name: 'Gift Bistro',
          cuisine: 'American',
          priceRange: 2,
          address: { line1: '9 Gift St', city: 'NYC', state: 'NY', zip: '10001' },
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

    const issueRes = await graphqlRequest(
      agent,
      `mutation Issue($restaurantId: ID!, $input: IssueGiftCardInput!) {
        issueGiftCard(restaurantId: $restaurantId, input: $input) {
          code
          balanceCents
        }
      }`,
      { restaurantId, input: { balanceCents: 1500 } },
      ownerToken,
    );
    giftCardCode = issueRes.body.data.issueGiftCard.code;

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      { restaurantId, input: { name: 'G1', minCapacity: 2, maxCapacity: 4 } },
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

  it('redeems gift card balance against deposit', async () => {
    const validateRes = await graphqlRequest(
      agent,
      `query Validate($restaurantId: ID!, $code: String!, $depositCents: Int!) {
        validateGiftCard(restaurantId: $restaurantId, code: $code, depositCents: $depositCents) {
          valid
          discountCents
          discountedDepositCents
        }
      }`,
      { restaurantId, code: giftCardCode, depositCents: 4000 },
      dinerToken,
    );
    expect(validateRes.body.data.validateGiftCard.valid).toBe(true);
    expect(validateRes.body.data.validateGiftCard.discountCents).toBe(1500);

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation {
            id
            depositAmountCents
            giftCardDiscountCents
          }
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart,
          giftCardCode,
        },
      },
      dinerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const reservation = res.body.data.createReservation.reservation;
    expect(reservation.giftCardDiscountCents).toBe(1500);
    expect(reservation.depositAmountCents).toBe(2500);

    const card = await GiftCard.findOne({ restaurantId, code: giftCardCode });
    expect(card?.balanceCents).toBe(0);
  });
});
