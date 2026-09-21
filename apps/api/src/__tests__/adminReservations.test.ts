import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { signAccessToken } from '../services/auth.js';

const ADMIN_RESERVATIONS = `
  query AdminReservations(
    $restaurantId: ID
    $status: ReservationStatus
    $search: String
    $source: ReservationSource
    $period: ReservationDatePeriod
  ) {
    adminReservations(
      restaurantId: $restaurantId
      status: $status
      search: $search
      source: $source
      period: $period
      limit: 50
      offset: 0
    ) {
      total
      items {
        id
        partySize
        status
        source
        restaurant { id name }
        diner { id firstName lastName email }
      }
    }
  }
`;

describe('Admin reservations list', () => {
  let agent: request.Agent;
  let adminToken: string;
  let dinerToken: string;
  let bistroId: string;
  let tavernId: string;
  let dinerAId: string;
  let dinerBId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'reservations-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const dinerA = await User.create({
      email: 'ada@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Guest',
      role: 'diner',
    });
    dinerAId = dinerA._id.toString();
    dinerToken = signAccessToken({ sub: dinerAId, role: 'diner' });

    const dinerB = await User.create({
      email: 'ben@test.com',
      passwordHash: 'unused',
      firstName: 'Ben',
      lastName: 'Walker',
      role: 'diner',
    });
    dinerBId = dinerB._id.toString();

    const owner = await User.create({
      email: 'reservations-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Seed',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });

    const bistro = await Restaurant.create({
      name: 'Maple Bistro',
      slug: 'maple-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    bistroId = bistro._id.toString();

    const tavern = await Restaurant.create({
      name: 'Harbor Tavern',
      slug: 'harbor-tavern',
      cuisine: 'Seafood',
      priceRange: 3,
      address: { line1: '2 Pier Rd', city: 'Boston', state: 'MA', zip: '02110' },
      location: { type: 'Point', coordinates: [-71.05, 42.36] },
      ownerId: owner._id,
      status: 'approved',
    });
    tavernId = tavern._id.toString();

    await Reservation.create([
      {
        restaurantId: bistroId,
        dinerId: dinerAId,
        tableIds: [],
        partySize: 2,
        slotStart: new Date('2026-09-22T23:00:00Z'),
        slotEnd: new Date('2026-09-23T01:00:00Z'),
        status: 'confirmed',
        source: 'network',
      },
      {
        restaurantId: tavernId,
        dinerId: dinerBId,
        tableIds: [],
        partySize: 4,
        slotStart: new Date('2026-09-23T00:00:00Z'),
        slotEnd: new Date('2026-09-23T02:00:00Z'),
        status: 'pending',
        source: 'phone',
      },
      {
        restaurantId: bistroId,
        dinerId: dinerBId,
        tableIds: [],
        partySize: 3,
        slotStart: new Date('2026-08-01T23:00:00Z'),
        slotEnd: new Date('2026-08-02T01:00:00Z'),
        status: 'completed',
        source: 'walkin',
      },
    ]);
  });

  it('rejects the list from a diner', async () => {
    const res = await graphqlRequest(agent, ADMIN_RESERVATIONS, {}, dinerToken);
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it('lists reservations across restaurants', async () => {
    const res = await graphqlRequest(agent, ADMIN_RESERVATIONS, {}, adminToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminReservations.total).toBe(3);
    const restaurants = res.body.data.adminReservations.items.map(
      (item: { restaurant: { name: string } }) => item.restaurant.name,
    );
    expect(restaurants).toEqual(expect.arrayContaining(['Maple Bistro', 'Harbor Tavern']));
  });

  it('filters by restaurant, status, source, and guest search', async () => {
    const byRestaurant = await graphqlRequest(
      agent,
      ADMIN_RESERVATIONS,
      { restaurantId: bistroId },
      adminToken,
    );
    expect(byRestaurant.body.data.adminReservations.total).toBe(2);
    expect(
      byRestaurant.body.data.adminReservations.items.every(
        (item: { restaurant: { id: string } }) => item.restaurant.id === bistroId,
      ),
    ).toBe(true);

    const byStatus = await graphqlRequest(
      agent,
      ADMIN_RESERVATIONS,
      { status: 'pending' },
      adminToken,
    );
    expect(byStatus.body.data.adminReservations.total).toBe(1);
    expect(byStatus.body.data.adminReservations.items[0].diner.firstName).toBe('Ben');

    const bySource = await graphqlRequest(
      agent,
      ADMIN_RESERVATIONS,
      { source: 'phone' },
      adminToken,
    );
    expect(bySource.body.data.adminReservations.total).toBe(1);

    const byGuest = await graphqlRequest(
      agent,
      ADMIN_RESERVATIONS,
      { search: 'Ada Guest' },
      adminToken,
    );
    expect(byGuest.body.data.adminReservations.total).toBe(1);
    expect(byGuest.body.data.adminReservations.items[0].diner.email).toBe('ada@test.com');

    const byVenueName = await graphqlRequest(
      agent,
      ADMIN_RESERVATIONS,
      { search: 'Harbor' },
      adminToken,
    );
    expect(byVenueName.body.data.adminReservations.total).toBe(1);
    expect(byVenueName.body.data.adminReservations.items[0].restaurant.id).toBe(tavernId);
  });
});
