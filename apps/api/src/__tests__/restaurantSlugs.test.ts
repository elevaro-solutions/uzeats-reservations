import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantSlugRequest } from '../models/RestaurantSlugRequest.js';
import { signAccessToken } from '../services/auth.js';

const REQUEST_SLUG = `
  mutation RequestRestaurantSlugChange($input: RequestRestaurantSlugInput!) {
    requestRestaurantSlugChange(input: $input) {
      id status requestedSlug currentSlug
    }
  }
`;

const MY_SLUG_REQUEST = `
  query MyRestaurantSlugRequest($restaurantId: ID!) {
    myRestaurantSlugRequest(restaurantId: $restaurantId) {
      id status requestedSlug
    }
  }
`;

const SLUG_AVAILABLE = `
  query RestaurantSlugAvailable($slug: String!, $excludeRestaurantId: ID) {
    restaurantSlugAvailable(slug: $slug, excludeRestaurantId: $excludeRestaurantId)
  }
`;

const REVIEW_SLUG = `
  mutation ReviewRestaurantSlugRequest($id: ID!, $status: RestaurantSlugRequestStatus!, $notes: String) {
    reviewRestaurantSlugRequest(id: $id, status: $status, notes: $notes) {
      id status requestedSlug
      restaurant { id slug }
    }
  }
`;

const ADMIN_UPDATE = `
  mutation AdminUpdateRestaurant($id: ID!, $input: RestaurantInput!, $slug: String) {
    adminUpdateRestaurant(id: $id, input: $input, slug: $slug) {
      id slug name
    }
  }
`;

const RESTAURANT_BY_SLUG = `
  query RestaurantBySlug($slug: String) {
    restaurant(slug: $slug) { id slug name }
  }
`;

const restaurantInput = {
  name: 'Slug Bistro',
  cuisine: 'American',
  priceRange: 2,
  address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001', country: 'US' },
  location: { lng: -73.99, lat: 40.73 },
};

describe('Restaurant slug updates', () => {
  let agent: request.Agent;
  let adminToken: string;
  let ownerToken: string;
  let staffToken: string;
  let restaurantId: string;
  let otherRestaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'slug-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const owner = await User.create({
      email: 'slug-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const staff = await User.create({
      email: 'slug-staff@test.com',
      passwordHash: 'unused',
      firstName: 'Staff',
      lastName: 'User',
      role: 'staff',
    });
    staffToken = signAccessToken({ sub: staff._id.toString(), role: 'staff' });

    const restaurant = await Restaurant.create({
      name: 'Slug Bistro',
      slug: 'slug-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();
    await User.findByIdAndUpdate(owner._id, { $addToSet: { restaurantIds: restaurant._id } });
    await User.findByIdAndUpdate(staff._id, { $addToSet: { restaurantIds: restaurant._id } });

    const otherOwner = await User.create({
      email: 'slug-other-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Other',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    const other = await Restaurant.create({
      name: 'Taken Place',
      slug: 'taken-place',
      cuisine: 'Italian',
      priceRange: 2,
      address: { line1: '2 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.98, 40.72] },
      ownerId: otherOwner._id,
      status: 'approved',
    });
    otherRestaurantId = other._id.toString();
  });

  it('lets an owner request a slug change', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_SLUG,
      { input: { restaurantId, slug: 'new-slug-bistro', reason: 'Shorter URL' } },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.requestRestaurantSlugChange.status).toBe('pending');
    expect(res.body.data.requestRestaurantSlugChange.requestedSlug).toBe('new-slug-bistro');

    const mine = await graphqlRequest(agent, MY_SLUG_REQUEST, { restaurantId }, ownerToken);
    expect(mine.body.data.myRestaurantSlugRequest.requestedSlug).toBe('new-slug-bistro');
  });

  it('blocks staff from requesting a slug change', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_SLUG,
      { input: { restaurantId, slug: 'staff-slug' } },
      staffToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/only restaurant owners/i);
  });

  it('rejects a slug that is already taken', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_SLUG,
      { input: { restaurantId, slug: 'taken-place' } },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/already in use/i);
  });

  it('reports slug availability', async () => {
    const taken = await graphqlRequest(
      agent,
      SLUG_AVAILABLE,
      { slug: 'taken-place', excludeRestaurantId: restaurantId },
      ownerToken,
    );
    expect(taken.body.data.restaurantSlugAvailable).toBe(false);

    const free = await graphqlRequest(
      agent,
      SLUG_AVAILABLE,
      { slug: 'brand-new-place', excludeRestaurantId: restaurantId },
      ownerToken,
    );
    expect(free.body.data.restaurantSlugAvailable).toBe(true);
  });

  it('lets an admin approve a request and keeps the old slug as a redirect', async () => {
    const pending = await RestaurantSlugRequest.findOne({
      restaurantId,
      status: 'pending',
    });
    expect(pending).toBeTruthy();

    const res = await graphqlRequest(
      agent,
      REVIEW_SLUG,
      { id: pending!._id.toString(), status: 'approved' },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.reviewRestaurantSlugRequest.status).toBe('approved');
    expect(res.body.data.reviewRestaurantSlugRequest.restaurant.slug).toBe('new-slug-bistro');

    const byOld = await graphqlRequest(agent, RESTAURANT_BY_SLUG, { slug: 'slug-bistro' });
    expect(byOld.body.data.restaurant.slug).toBe('new-slug-bistro');
    expect(byOld.body.data.restaurant.id).toBe(restaurantId);
  });

  it('lets an admin set a slug directly', async () => {
    const res = await graphqlRequest(
      agent,
      ADMIN_UPDATE,
      { id: restaurantId, input: restaurantInput, slug: 'admin-set-slug' },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminUpdateRestaurant.slug).toBe('admin-set-slug');

    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.previousSlugs).toEqual(expect.arrayContaining(['slug-bistro', 'new-slug-bistro']));
  });

  it('does not let a diner-less owner steal another restaurant slug via previousSlugs', async () => {
    const res = await graphqlRequest(
      agent,
      ADMIN_UPDATE,
      { id: otherRestaurantId, input: { ...restaurantInput, name: 'Taken Place', cuisine: 'Italian' }, slug: 'admin-set-slug' },
      adminToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/already in use/i);
  });
});
