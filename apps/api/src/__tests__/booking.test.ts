import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { User } from '../models/User.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

describe('Booking Flow (E2E)', () => {
  let agent: request.Agent;
  let server: any;

  let dinerToken: string;
  let dinerId: string;
  let ownerToken: string;
  let ownerId: string;
  let adminToken: string;
  let restaurantId: string;
  let tableId: string;
  let shiftId: string;
  let reservationId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;
    server = app.server;
  });

  it('should register a diner user', async () => {
    const result = await registerUser(agent, {
      email: 'diner@test.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Diner',
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
    expect(result.user.role).toBe('diner');
    dinerToken = result.accessToken;
    dinerId = result.user.id;
  });

  it('should register a restaurant owner', async () => {
    const result = await registerUser(agent, {
      email: 'owner@test.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Owner',
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
    ownerToken = result.accessToken;
    ownerId = result.user.id;

    await User.findByIdAndUpdate(ownerId, { role: 'restaurant_owner' });
    const loginRes = await graphqlRequest(
      agent,
      `mutation Login($input: LoginInput!) { login(input: $input) { accessToken user { id role } } }`,
      { input: { email: 'owner@test.com', password: 'Password123!' } },
    );
    ownerToken = loginRes.body.data.login.accessToken;
    expect(loginRes.body.data.login.user.role).toBe('restaurant_owner');
  });

  it('should create a restaurant', async () => {
    const res = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) {
        createRestaurant(input: $input) { id name slug status cuisine }
      }`,
      {
        input: {
          name: 'Test Bistro',
          cuisine: 'Italian',
          priceRange: 2,
          address: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
          },
          location: { lng: -73.935242, lat: 40.73061 },
        },
      },
      ownerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const restaurant = res.body.data.createRestaurant;
    expect(restaurant.name).toBe('Test Bistro');
    expect(restaurant.status).toBe('pending');
    restaurantId = restaurant.id;
  });

  it('should approve restaurant via admin', async () => {
    const adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });

    const { signAccessToken } = await import('../services/auth.js');
    adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    const res = await graphqlRequest(
      agent,
      `mutation SetStatus($id: ID!, $status: RestaurantStatus!) {
        setRestaurantStatus(id: $id, status: $status) { id status }
      }`,
      { id: restaurantId, status: 'approved' },
      adminToken,
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.setRestaurantStatus.status).toBe('approved');
  });

  it('should create tables for the restaurant', async () => {
    const res = await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id name minCapacity maxCapacity }
      }`,
      {
        restaurantId,
        input: {
          name: 'Table 1',
          minCapacity: 2,
          maxCapacity: 4,
        },
      },
      ownerToken,
    );

    expect(res.body.errors).toBeUndefined();
    tableId = res.body.data.createTable.id;
    expect(res.body.data.createTable.name).toBe('Table 1');
  });

  it('should create a shift for the restaurant', async () => {
    const res = await graphqlRequest(
      agent,
      `mutation CreateShift($restaurantId: ID!, $input: ShiftInput!) {
        createShift(restaurantId: $restaurantId, input: $input) { id name daysOfWeek startTime endTime }
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

    expect(res.body.errors).toBeUndefined();
    shiftId = res.body.data.createShift.id;
  });

  it('should find the restaurant via search', async () => {
    const res = await graphqlRequest(
      agent,
      `query Search($input: SearchRestaurantsInput!) {
        searchRestaurants(input: $input) { items { id name } total }
      }`,
      { input: { query: 'Bistro' } },
    );

    expect(res.body.errors).toBeUndefined();
    const results = res.body.data.searchRestaurants;
    expect(results.total).toBeGreaterThanOrEqual(1);
    expect(results.items.some((r: any) => r.id === restaurantId)).toBe(true);
  });

  it('should check availability', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) {
          time available remainingTables
        }
      }`,
      { restaurantId, date: dateStr, partySize: 2 },
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const slots = res.body.data.availability;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s: any) => s.available)).toBe(true);
  });

  it('should create a reservation', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();
    tomorrow.setHours(18, 0, 0, 0);

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation { id status partySize restaurantId }
          clientSecret
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: tomorrow.toISOString(),
          occasion: 'date',
          guestNotes: 'Window seat preferred',
        },
      },
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const payload = res.body.data.createReservation;
    expect(payload.reservation.status).toMatch(/pending|confirmed/);
    expect(payload.reservation.partySize).toBe(2);
    reservationId = payload.reservation.id;
  });

  it('should fail double-booking when table is full', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const diner2 = await registerUser(agent, {
      email: 'diner2@test.com',
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Diner',
    });

    const res = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) {
          reservation { id status }
        }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: tomorrow.toISOString(),
        },
      },
      diner2.accessToken,
    );

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/no tables available/i);
  });

  it('should cancel a reservation', async () => {
    const res = await graphqlRequest(
      agent,
      `mutation CancelReservation($id: ID!, $status: ReservationStatus!, $reason: String) {
        updateReservationStatus(id: $id, status: $status, reason: $reason) { id status }
      }`,
      { id: reservationId, status: 'cancelled', reason: 'Change of plans' },
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReservationStatus.status).toBe('cancelled');
  });

  it('should create a review after a completed visit', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(19, 0, 0, 0);

    const resCreate = await graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) { reservation { id status } }
      }`,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: tomorrow.toISOString(),
        },
      },
      dinerToken,
    );
    const newResId = resCreate.body.data.createReservation.reservation.id;

    const STATUS_MUTATION = `mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
      updateReservationStatus(id: $id, status: $status) { id status }
    }`;

    await graphqlRequest(agent, STATUS_MUTATION, { id: newResId, status: 'confirmed' }, ownerToken);
    await graphqlRequest(agent, STATUS_MUTATION, { id: newResId, status: 'seated' }, ownerToken);
    await graphqlRequest(agent, STATUS_MUTATION, { id: newResId, status: 'completed' }, ownerToken);

    const reviewRes = await graphqlRequest(
      agent,
      `mutation CreateReview($input: ReviewInput!) {
        createReview(input: $input) { id rating comment }
      }`,
      { input: { reservationId: newResId, rating: 5, comment: 'Amazing food!' } },
      dinerToken,
    );

    expect(reviewRes.body.errors).toBeUndefined();
    expect(reviewRes.body.data.createReview.rating).toBe(5);
    expect(reviewRes.body.data.createReview.comment).toBe('Amazing food!');
  });

  it('should have earned loyalty points', async () => {
    const res = await graphqlRequest(
      agent,
      `query { myLoyalty { type points description } }`,
      {},
      dinerToken,
    );

    expect(res.body.errors).toBeUndefined();
    const transactions = res.body.data.myLoyalty;
    const earnTx = transactions.find((t: any) => t.type === 'earn');
    if (earnTx) {
      expect(earnTx.points).toBeGreaterThan(0);
    }
  });
});
