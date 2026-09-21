import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantProfileChangeRequest } from '../models/RestaurantProfileChangeRequest.js';
import { signAccessToken } from '../services/auth.js';

const REQUEST_PROFILE = `
  mutation RequestRestaurantProfileChange($input: RequestRestaurantProfileChangeInput!) {
    requestRestaurantProfileChange(input: $input) {
      id status reason
      proposed { description neighborhood amenities photos }
    }
  }
`;

const MY_PROFILE_REQUEST = `
  query MyRestaurantProfileChangeRequest($restaurantId: ID!) {
    myRestaurantProfileChangeRequest(restaurantId: $restaurantId) {
      id status proposed { description }
    }
  }
`;

const REVIEW_PROFILE = `
  mutation ReviewRestaurantProfileChangeRequest(
    $id: ID!
    $status: RestaurantProfileChangeRequestStatus!
    $notes: String
  ) {
    reviewRestaurantProfileChangeRequest(id: $id, status: $status, notes: $notes) {
      id status
      restaurant { id description amenities address { neighborhood } }
    }
  }
`;

const profileInput = {
  description: 'Updated about copy for diners',
  neighborhood: 'SoHo',
  amenities: ['Outdoor Seating'],
  wheelchairAccessible: true,
  photos: [],
};

describe('Restaurant public profile change requests', () => {
  let agent: request.Agent;
  let adminToken: string;
  let ownerToken: string;
  let dinerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'profile-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const owner = await User.create({
      email: 'profile-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const diner = await User.create({
      email: 'profile-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Diner',
      lastName: 'User',
      role: 'diner',
    });
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const restaurant = await Restaurant.create({
      name: 'Profile Bistro',
      slug: 'profile-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();
    await User.findByIdAndUpdate(owner._id, { $addToSet: { restaurantIds: restaurant._id } });
  });

  it('lets an owner request a public profile change', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_PROFILE,
      { input: { restaurantId, profile: profileInput, reason: 'New patio' } },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.requestRestaurantProfileChange.status).toBe('pending');
    expect(res.body.data.requestRestaurantProfileChange.proposed.description).toBe(
      'Updated about copy for diners',
    );

    const mine = await graphqlRequest(agent, MY_PROFILE_REQUEST, { restaurantId }, ownerToken);
    expect(mine.body.data.myRestaurantProfileChangeRequest.proposed.description).toBe(
      'Updated about copy for diners',
    );
  });

  it('rejects a no-op profile request', async () => {
    const restaurant = await Restaurant.findById(restaurantId);
    const res = await graphqlRequest(
      agent,
      REQUEST_PROFILE,
      {
        input: {
          restaurantId,
          profile: {
            description: restaurant?.description ?? '',
            neighborhood: restaurant?.address?.neighborhood ?? '',
            photos: restaurant?.photos ?? [],
          },
        },
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/no public profile changes/i);
  });

  it('blocks a diner from requesting a profile change', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_PROFILE,
      { input: { restaurantId, profile: profileInput } },
      dinerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/access|forbidden/i);
  });

  it('lets an admin approve a request and applies the live profile', async () => {
    const pending = await RestaurantProfileChangeRequest.findOne({
      restaurantId,
      status: 'pending',
    });
    expect(pending).toBeTruthy();

    const res = await graphqlRequest(
      agent,
      REVIEW_PROFILE,
      { id: pending!._id.toString(), status: 'approved' },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.reviewRestaurantProfileChangeRequest.status).toBe('approved');
    expect(res.body.data.reviewRestaurantProfileChangeRequest.restaurant.address.neighborhood).toBe(
      'SoHo',
    );

    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.description).toBe('Updated about copy for diners');
    expect(doc?.address.neighborhood).toBe('SoHo');
    expect(doc?.amenities).toEqual(['Outdoor Seating']);
    expect(doc?.wheelchairAccessible).toBe(true);
  });
});
