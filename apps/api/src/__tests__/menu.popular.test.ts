import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { User } from '../models/User.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';
import { signAccessToken } from '../services/auth.js';

const UPSERT_MENU = `
  mutation UpsertMenu($restaurantId: ID!, $input: MenuInput!) {
    upsertMenu(restaurantId: $restaurantId, input: $input) {
      id
      sections {
        name
        items { name popular available }
      }
    }
  }
`;

const RESTAURANT_MENU = `
  query Restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      menu {
        sections {
          name
          items { name popular }
        }
      }
    }
  }
`;

const ITEM = (name: string, popular: boolean) => ({
  name,
  description: '',
  priceCents: 1000,
  dietary: [],
  available: true,
  popular,
});

describe('Popular menu items', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let managerToken: string;
  let adminToken: string;
  let dinerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await registerUser(agent, {
      email: 'menu-owner@test.com',
      password: 'Password123!',
      firstName: 'Menu',
      lastName: 'Owner',
    });
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });
    ownerToken = signAccessToken({ sub: owner.user.id, role: 'restaurant_owner' });

    const diner = await registerUser(agent, {
      email: 'menu-diner@test.com',
      password: 'Password123!',
      firstName: 'Menu',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const adminUser = await User.create({
      email: 'menu-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    const createRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) {
        createRestaurant(input: $input) { id }
      }`,
      {
        input: {
          name: 'Popular Menu Bistro',
          cuisine: 'Italian',
          priceRange: 2,
          address: { line1: '1 Menu St', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.95, lat: 40.75 },
        },
      },
      ownerToken,
    );
    expect(createRes.body.errors).toBeUndefined();
    restaurantId = createRes.body.data.createRestaurant.id;

    const staff = await User.create({
      email: 'menu-staff@test.com',
      passwordHash: 'unused',
      firstName: 'Menu',
      lastName: 'Staff',
      role: 'manager',
      restaurantIds: [restaurantId],
    });
    managerToken = signAccessToken({ sub: staff._id.toString(), role: 'manager' });
  });

  it('lets the owner mark popular dishes', async () => {
    const res = await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: {
          sections: [
            {
              name: 'Mains',
              items: [ITEM('Pasta', true), ITEM('Steak', true), ITEM('Salad', false)],
            },
          ],
        },
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.upsertMenu.sections[0].items;
    expect(items.filter((i: { popular: boolean }) => i.popular).map((i: { name: string }) => i.name)).toEqual([
      'Pasta',
      'Steak',
    ]);
  });

  it('lets staff and admins update popular dishes', async () => {
    const staffRes = await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: {
          sections: [{ name: 'Mains', items: [ITEM('Pasta', true), ITEM('Risotto', false)] }],
        },
      },
      managerToken,
    );
    expect(staffRes.body.errors).toBeUndefined();
    expect(staffRes.body.data.upsertMenu.sections[0].items[0].popular).toBe(true);

    const adminRes = await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: {
          sections: [{ name: 'Mains', items: [ITEM('Tiramisu', true)] }],
        },
      },
      adminToken,
    );
    expect(adminRes.body.errors).toBeUndefined();
    expect(adminRes.body.data.upsertMenu.sections[0].items[0].name).toBe('Tiramisu');
  });

  it('rejects more than 10 popular dishes', async () => {
    const res = await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: {
          sections: [
            {
              name: 'Mains',
              items: Array.from({ length: 11 }, (_, i) => ITEM(`Dish ${i + 1}`, true)),
            },
          ],
        },
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/up to 10 popular dishes/i);
  });

  it('returns popular flags on the public restaurant query', async () => {
    await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: {
          sections: [{ name: 'Mains', items: [ITEM('Bruschetta', true), ITEM('Gelato', false)] }],
        },
      },
      ownerToken,
    );
    const res = await graphqlRequest(agent, RESTAURANT_MENU, { id: restaurantId });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.restaurant.menu.sections[0].items;
    expect(items).toEqual([
      { name: 'Bruschetta', popular: true },
      { name: 'Gelato', popular: false },
    ]);
  });

  it('forbids diners from upserting the menu', async () => {
    const res = await graphqlRequest(
      agent,
      UPSERT_MENU,
      {
        restaurantId,
        input: { sections: [{ name: 'Mains', items: [ITEM('Stolen', true)] }] },
      },
      dinerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden|restaurant not found/i);
  });
});
