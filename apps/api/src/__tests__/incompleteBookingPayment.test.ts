import { describe, it, expect, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';
import { expireAbandonedIncompleteBookings } from '../services/reservations.js';
import { BOOKING_CARD_HOLD_MINUTES } from '@reservations/shared';

vi.mock('../services/stripe.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/stripe.js')>();
  return {
    ...actual,
    createCardGuaranteeSetupIntent: vi.fn(async () => ({
      id: 'seti_hold_1',
      client_secret: 'seti_hold_1_secret_xx',
      isStub: false as const,
    })),
    describeBookingIntent: vi.fn(async () => ({
      kind: 'setup' as const,
      status: 'requires_payment_method',
      paymentMethodId: null,
    })),
    cancelBookingIntent: vi.fn(async () => undefined),
  };
});

describe('Incomplete card-hold bookings are not placed', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let ownerToken: string;
  let restaurantId: string;
  let slotStart: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'hold-diner@test.com',
      password: 'Password123!',
      firstName: 'Hold',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const owner = await registerUser(agent, {
      email: 'hold-owner@test.com',
      password: 'Password123!',
      firstName: 'Hold',
      lastName: 'Owner',
    });
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });
    const { signAccessToken } = await import('../services/auth.js');
    ownerToken = signAccessToken({ sub: owner.user.id, role: 'restaurant_owner' });

    const restaurantRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) { createRestaurant(input: $input) { id } }`,
      {
        input: {
          name: 'Hold Bistro',
          cuisine: 'American',
          priceRange: 2,
          address: { line1: '1 Hold St', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.95, lat: 40.75 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;
    await Restaurant.findByIdAndUpdate(restaurantId, {
      status: 'approved',
      depositRequired: true,
      depositAmountCents: 2500,
      depositPolicy: 'card_guarantee',
    });

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      { restaurantId, input: { name: 'H1', minCapacity: 2, maxCapacity: 4 } },
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

    const day = new Date();
    day.setDate(day.getDate() + 3);
    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) { time available }
      }`,
      { restaurantId, date: day.toISOString().split('T')[0], partySize: 2 },
      dinerToken,
    );
    slotStart = availRes.body.data.availability.find((s: { available: boolean }) => s.available).time;
  });

  async function book() {
    return graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          clientSecret
          reservation { id status cardGuaranteeStatus }
        }
      }`,
      { input: { restaurantId, partySize: 2, slotStart } },
      dinerToken,
    );
  }

  it('returns a client secret and does not list the hold as a reservation', async () => {
    const res = await book();
    expect(res.body.errors).toBeUndefined();
    const { reservation, clientSecret } = res.body.data.createReservation;
    expect(clientSecret).toMatch(/^seti_/);
    expect(reservation.status).toBe('pending');
    expect(reservation.cardGuaranteeStatus).toBe('requires_card');

    const mine = await graphqlRequest(
      agent,
      `query { myReservations { id } }`,
      {},
      dinerToken,
    );
    expect(mine.body.data.myReservations.map((r: { id: string }) => r.id)).not.toContain(
      reservation.id,
    );

    const staff = await graphqlRequest(
      agent,
      `query RestaurantReservations($restaurantId: ID!) {
        restaurantReservations(restaurantId: $restaurantId) { items { id } }
      }`,
      { restaurantId },
      ownerToken,
    );
    expect(
      staff.body.data.restaurantReservations.items.map((r: { id: string }) => r.id),
    ).not.toContain(reservation.id);

    await graphqlRequest(
      agent,
      `mutation Abandon($id: ID!) { abandonIncompleteBooking(id: $id) }`,
      { id: reservation.id },
      dinerToken,
    );
    expect(await Reservation.findById(reservation.id)).toBeNull();
  });

  it('lets the diner book again after abandoning the card form', async () => {
    const first = await book();
    const id = first.body.data.createReservation.reservation.id;
    const abandon = await graphqlRequest(
      agent,
      `mutation Abandon($id: ID!) { abandonIncompleteBooking(id: $id) }`,
      { id },
      dinerToken,
    );
    expect(abandon.body.errors).toBeUndefined();
    expect(abandon.body.data.abandonIncompleteBooking).toBe(true);

    const second = await book();
    expect(second.body.errors).toBeUndefined();
    expect(second.body.data.createReservation.reservation.id).not.toBe(id);

    await graphqlRequest(
      agent,
      `mutation Abandon($id: ID!) { abandonIncompleteBooking(id: $id) }`,
      { id: second.body.data.createReservation.reservation.id },
      dinerToken,
    );
  });

  it('expires stale card holds so the table is released', async () => {
    const res = await book();
    const id = res.body.data.createReservation.reservation.id;
    await Reservation.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          createdAt: new Date(Date.now() - (BOOKING_CARD_HOLD_MINUTES + 1) * 60_000),
        },
      },
    );

    const result = await expireAbandonedIncompleteBookings();
    expect(result.expired).toBeGreaterThanOrEqual(1);
    expect(await Reservation.findById(id)).toBeNull();
  });
});
