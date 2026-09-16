import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { signAccessToken } from '../services/auth.js';

const CREATE_USER = `
  mutation AdminCreateUser($input: AdminCreateUserInput!) {
    adminCreateUser(input: $input) {
      id email firstName lastName role restaurantIds
    }
  }
`;

const ADMIN_USER = `
  query AdminUser($id: ID!) {
    adminUser(id: $id) {
      id email role firstName lastName restaurantIds
    }
  }
`;

const ADMIN_USERS = `
  query AdminUsers($role: UserRole, $roles: [UserRole!]) {
    adminUsers(role: $role, roles: $roles, limit: 50, offset: 0) {
      total
      items { id role email }
    }
  }
`;

const ADMIN_USER_RESTAURANTS = `
  query AdminUserRestaurants($userId: ID!) {
    adminUserRestaurants(userId: $userId) {
      id name ownerId
    }
  }
`;

const ADMIN_USER_RESERVATIONS = `
  query AdminUserReservations($userId: ID!) {
    adminUserReservations(userId: $userId, limit: 10, offset: 0) {
      total
      items { id partySize status }
    }
  }
`;

describe('Admin managed accounts', () => {
  let agent: request.Agent;
  let adminToken: string;
  let dinerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const adminUser = await User.create({
      email: 'accounts-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    const diner = await User.create({
      email: 'accounts-existing-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Existing',
      lastName: 'Diner',
      role: 'diner',
    });
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const owner = await User.create({
      email: 'accounts-seed-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Seed',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    const restaurant = await Restaurant.create({
      name: 'Accounts Bistro',
      slug: 'accounts-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();
  });

  it('rejects account creation from a diner', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'blocked-diner@test.com',
          password: 'Password123!',
          firstName: 'Nope',
          lastName: 'Diner',
          role: 'diner',
        },
      },
      dinerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it('creates a diner account', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'new-diner@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Diner',
          role: 'diner',
        },
      },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminCreateUser.role).toBe('diner');
    expect(res.body.data.adminCreateUser.restaurantIds).toEqual([]);
  });

  it('creates an owner account', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'new-owner@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Owner',
          role: 'restaurant_owner',
          restaurantIds: [restaurantId],
        },
      },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminCreateUser.role).toBe('restaurant_owner');
    expect(res.body.data.adminCreateUser.restaurantIds).toContain(restaurantId);
  });

  it('requires a restaurant when creating staff', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'staff-no-venue@test.com',
          password: 'Password123!',
          firstName: 'No',
          lastName: 'Venue',
          role: 'staff',
        },
      },
      adminToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/restaurant/i);
  });

  it('creates a staff account with venue access', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'new-staff@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Staff',
          role: 'staff',
          restaurantIds: [restaurantId],
        },
      },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminCreateUser.role).toBe('staff');
    expect(res.body.data.adminCreateUser.restaurantIds).toContain(restaurantId);
  });

  it('rejects creating an admin via adminCreateUser', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE_USER,
      {
        input: {
          email: 'sneaky-admin@test.com',
          password: 'Password123!',
          firstName: 'Sneaky',
          lastName: 'Admin',
          role: 'admin',
        },
      },
      adminToken,
    );
    expect(res.body.errors).toBeDefined();
  });

  it('lists diners separately from staff and owners', async () => {
    const [diners, staff, owners] = await Promise.all([
      graphqlRequest(agent, ADMIN_USERS, { role: 'diner' }, adminToken),
      graphqlRequest(agent, ADMIN_USERS, { role: 'staff' }, adminToken),
      graphqlRequest(agent, ADMIN_USERS, { role: 'restaurant_owner' }, adminToken),
    ]);
    expect(diners.body.data.adminUsers.items.every((u: { role: string }) => u.role === 'diner')).toBe(
      true,
    );
    expect(staff.body.data.adminUsers.items.every((u: { role: string }) => u.role === 'staff')).toBe(
      true,
    );
    expect(
      owners.body.data.adminUsers.items.every((u: { role: string }) => u.role === 'restaurant_owner'),
    ).toBe(true);
  });

  it('loads account detail, restaurants, and reservations', async () => {
    const diner = await User.findOne({ email: 'new-diner@test.com' });
    expect(diner).toBeTruthy();

    await Reservation.create({
      restaurantId,
      dinerId: diner!._id,
      tableIds: [],
      partySize: 2,
      slotStart: new Date('2026-09-20T19:00:00Z'),
      slotEnd: new Date('2026-09-20T21:00:00Z'),
      status: 'confirmed',
    });

    const detail = await graphqlRequest(
      agent,
      ADMIN_USER,
      { id: diner!._id.toString() },
      adminToken,
    );
    expect(detail.body.data.adminUser.email).toBe('new-diner@test.com');

    const reservations = await graphqlRequest(
      agent,
      ADMIN_USER_RESERVATIONS,
      { userId: diner!._id.toString() },
      adminToken,
    );
    expect(reservations.body.data.adminUserReservations.total).toBe(1);
    expect(reservations.body.data.adminUserReservations.items[0].partySize).toBe(2);

    const owner = await User.findOne({ email: 'accounts-seed-owner@test.com' });
    const venues = await graphqlRequest(
      agent,
      ADMIN_USER_RESTAURANTS,
      { userId: owner!._id.toString() },
      adminToken,
    );
    expect(venues.body.data.adminUserRestaurants.some((r: { id: string }) => r.id === restaurantId)).toBe(
      true,
    );
  });
});
