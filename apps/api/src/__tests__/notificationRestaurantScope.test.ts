import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Notification } from '../models/Loyalty.js';
import { signAccessToken } from '../services/auth.js';

const NOTIFS = `
  query MyNotifications($restaurantId: ID) {
    myNotifications(limit: 50, restaurantId: $restaurantId) {
      items { id title }
      total
    }
    unreadNotificationCount(restaurantId: $restaurantId)
  }
`;

const OVERVIEW = `
  query MyOwnerOverview($restaurantId: ID) {
    myOwnerOverview(restaurantId: $restaurantId) { unreadNotifications }
  }
`;

const MARK_ALL = `
  mutation MarkAll($restaurantId: ID) {
    markAllNotificationsRead(restaurantId: $restaurantId)
  }
`;

describe('Notifications scoped to the active restaurant', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let restaurantA: string;
  let restaurantB: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await User.create({
      email: 'owner-notif-scope@test.com',
      passwordHash: 'unused',
      firstName: 'Nora',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const base = {
      ownerId: owner._id,
      status: 'approved',
      cuisine: 'Italian',
      priceRange: 2,
      address: { line1: '1 Main', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.9, 40.7] },
    };
    const [a, b] = await Restaurant.create([
      { ...base, name: 'Scope A', slug: 'scope-a' },
      { ...base, name: 'Scope B', slug: 'scope-b' },
    ]);
    restaurantA = a!._id.toString();
    restaurantB = b!._id.toString();

    const notif = (title: string, data?: Record<string, unknown>) => ({
      userId: owner._id,
      channel: 'in_app',
      type: 'new_reservation',
      title,
      body: title,
      data,
    });
    await Notification.create([
      notif('A string id', { restaurantId: restaurantA }),
      notif('A object id', { restaurantId: a!._id }),
      notif('B', { restaurantId: restaurantB }),
      notif('Account level'),
    ]);
  });

  it('counts every unread alert without a restaurant', async () => {
    const res = await graphqlRequest(agent, NOTIFS, {}, ownerToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.unreadNotificationCount).toBe(4);
    expect(res.body.data.myNotifications.total).toBe(4);
  });

  it('keeps only that location plus account-level alerts', async () => {
    const resA = await graphqlRequest(agent, NOTIFS, { restaurantId: restaurantA }, ownerToken);
    expect(resA.body.errors).toBeUndefined();
    expect(resA.body.data.unreadNotificationCount).toBe(3);
    const titlesA = resA.body.data.myNotifications.items.map((n: { title: string }) => n.title);
    expect(titlesA).toEqual(expect.arrayContaining(['A string id', 'A object id', 'Account level']));
    expect(titlesA).not.toContain('B');

    const resB = await graphqlRequest(agent, NOTIFS, { restaurantId: restaurantB }, ownerToken);
    expect(resB.body.data.unreadNotificationCount).toBe(2);

    const overviewB = await graphqlRequest(agent, OVERVIEW, { restaurantId: restaurantB }, ownerToken);
    expect(overviewB.body.errors).toBeUndefined();
    expect(overviewB.body.data.myOwnerOverview.unreadNotifications).toBe(2);
  });

  it('mark all read only clears the selected location', async () => {
    const mark = await graphqlRequest(agent, MARK_ALL, { restaurantId: restaurantB }, ownerToken);
    expect(mark.body.errors).toBeUndefined();

    const resB = await graphqlRequest(agent, NOTIFS, { restaurantId: restaurantB }, ownerToken);
    expect(resB.body.data.unreadNotificationCount).toBe(0);
    const resA = await graphqlRequest(agent, NOTIFS, { restaurantId: restaurantA }, ownerToken);
    expect(resA.body.data.unreadNotificationCount).toBe(2);
  });
});
