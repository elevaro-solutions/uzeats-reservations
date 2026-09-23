import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { signAccessToken } from '../services/auth.js';
import { PLANS } from '../config/plans.js';

const INVITE_MANAGER = `
  mutation InviteManager(
    $email: String!
    $firstName: String!
    $lastName: String!
    $restaurantIds: [ID!]!
    $role: UserRole
  ) {
    inviteManager(
      email: $email
      firstName: $firstName
      lastName: $lastName
      restaurantIds: $restaurantIds
      role: $role
    ) {
      email
      inviteUrl
      user { id role restaurantIds }
    }
  }
`;

const MANAGER_SEATS = `
  query Seats($restaurantId: ID!) {
    restaurantManagerSeats(restaurantId: $restaurantId) {
      planKey limit used pending remaining
    }
  }
`;

const PLANS_QUERY = `
  query Plans {
    plans { key managerSeats }
  }
`;

describe('Manager seats from packages', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'mgr-seats-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const owner = await User.create({
      email: 'mgr-seats-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const restaurant = await Restaurant.create({
      name: 'Seats Bistro',
      slug: 'seats-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Seat St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();

    await Subscription.create({
      restaurantId: restaurant._id,
      plan: 'basic',
      status: 'active',
      monthlyPriceCents: PLANS.basic.monthlyPriceCents,
      networkCoverFeeCents: PLANS.basic.networkCoverFeeCents,
      websiteCoverFeeCents: PLANS.basic.websiteCoverFeeCents,
      features: { ...PLANS.basic.features },
    });
  });

  it('exposes managerSeats on every plan (≥1)', async () => {
    const res = await graphqlRequest(agent, PLANS_QUERY);
    expect(res.body.errors).toBeUndefined();
    const plans = res.body.data.plans as { key: string; managerSeats: number }[];
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.managerSeats).toBeGreaterThanOrEqual(1);
    }
    const basic = plans.find((p) => p.key === 'basic');
    expect(basic?.managerSeats).toBe(1);
  });

  it('reports seat usage for the restaurant package', async () => {
    const res = await graphqlRequest(agent, MANAGER_SEATS, { restaurantId }, ownerToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.restaurantManagerSeats).toMatchObject({
      planKey: 'basic',
      limit: 1,
      used: 0,
      pending: 0,
      remaining: 1,
    });
  });

  it('lets the owner invite a manager within the seat limit', async () => {
    const res = await graphqlRequest(
      agent,
      INVITE_MANAGER,
      {
        email: 'mgr-one@test.com',
        firstName: 'Mgr',
        lastName: 'One',
        restaurantIds: [restaurantId],
        role: 'manager',
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.inviteManager.user.role).toBe('manager');

    const seats = await graphqlRequest(agent, MANAGER_SEATS, { restaurantId }, ownerToken);
    expect(seats.body.data.restaurantManagerSeats).toMatchObject({
      used: 1,
      remaining: 0,
    });
  });

  it('blocks a second manager invite on Basic (1 seat)', async () => {
    const res = await graphqlRequest(
      agent,
      INVITE_MANAGER,
      {
        email: 'mgr-two@test.com',
        firstName: 'Mgr',
        lastName: 'Two',
        restaurantIds: [restaurantId],
        role: 'manager',
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/manager seat/i);
  });

  it('blocks owners from inviting restaurant_owner role', async () => {
    // Upgrade seats first so seat limit is not the failure mode
    await Subscription.updateOne({ restaurantId }, { plan: 'pro' });
    const res = await graphqlRequest(
      agent,
      INVITE_MANAGER,
      {
        email: 'co-owner@test.com',
        firstName: 'Co',
        lastName: 'Owner',
        restaurantIds: [restaurantId],
        role: 'restaurant_owner',
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/only invite managers/i);
    await Subscription.updateOne({ restaurantId }, { plan: 'basic' });
  });

  it('lets admins invite after upgrade unlocks seats', async () => {
    await Subscription.updateOne({ restaurantId }, { plan: 'core' });
    const res = await graphqlRequest(
      agent,
      INVITE_MANAGER,
      {
        email: 'mgr-core@test.com',
        firstName: 'Mgr',
        lastName: 'Core',
        restaurantIds: [restaurantId],
        role: 'manager',
      },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();

    const seats = await graphqlRequest(agent, MANAGER_SEATS, { restaurantId }, ownerToken);
    expect(seats.body.data.restaurantManagerSeats.limit).toBe(3);
    expect(seats.body.data.restaurantManagerSeats.used).toBe(2);
    expect(seats.body.data.restaurantManagerSeats.remaining).toBe(1);
  });

  it('acceptManagerInvite sets password and marks invite accepted', async () => {
    await Subscription.updateOne({ restaurantId }, { plan: 'pro' });
    const inviteRes = await graphqlRequest(
      agent,
      INVITE_MANAGER,
      {
        email: 'mgr-accept@test.com',
        firstName: 'Accept',
        lastName: 'Me',
        restaurantIds: [restaurantId],
        role: 'manager',
      },
      ownerToken,
    );
    expect(inviteRes.body.errors).toBeUndefined();
    const inviteUrl = inviteRes.body.data.inviteManager.inviteUrl as string;
    expect(inviteUrl).toMatch(/\/accept-invite\?token=/);
    const token = new URL(inviteUrl).searchParams.get('token')!;

    const preview = await graphqlRequest(agent, `
      query ($token: String!) {
        managerInviteByToken(token: $token) {
          email status needsPassword roleLabel restaurantName
        }
      }
    `, { token });
    expect(preview.body.errors).toBeUndefined();
    expect(preview.body.data.managerInviteByToken).toMatchObject({
      email: 'mgr-accept@test.com',
      status: 'pending',
      needsPassword: true,
      roleLabel: 'Manager',
    });

    const accept = await graphqlRequest(agent, `
      mutation ($token: String!, $password: String!) {
        acceptManagerInvite(token: $token, password: $password) {
          user { id email role }
        }
      }
    `, { token, password: 'Password123!' });
    expect(accept.body.errors).toBeUndefined();
    expect(accept.body.data.acceptManagerInvite.user.role).toBe('manager');

    const preview2 = await graphqlRequest(agent, `
      query ($token: String!) {
        managerInviteByToken(token: $token) { status needsPassword }
      }
    `, { token });
    expect(preview2.body.data.managerInviteByToken).toMatchObject({
      status: 'accepted',
      needsPassword: false,
    });
  });
});
