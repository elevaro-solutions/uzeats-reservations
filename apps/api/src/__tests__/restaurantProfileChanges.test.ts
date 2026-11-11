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
      proposed { name description neighborhood amenities photos cuisine }
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
    expect(res.body.data.requestRestaurantProfileChange.proposed.name).toBe('Profile Bistro');
    expect(res.body.data.requestRestaurantProfileChange.proposed.cuisine).toBe('American');

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
    expect(doc?.name).toBe('Profile Bistro');
  });

  const UPDATE_RESTAURANT = `
    mutation UpdateRestaurant($id: ID!, $input: RestaurantInput!, $submitListingForReview: Boolean) {
      updateRestaurant(id: $id, input: $input, submitListingForReview: $submitListingForReview) {
        id name description cuisine menuUrl depositRequired depositAmountCents
      }
    }
  `;

  function inputFrom(
    doc: {
      name: string;
      description?: string | null;
      cuisine: string;
      cuisines?: string[] | null;
      priceRange: number;
      address: { line1: string; line2?: string | null; city: string; state: string; zip: string; country?: string | null };
      location: { coordinates: number[] };
      phone?: string | null;
      website?: string | null;
      menuUrl?: string | null;
      photos?: string[] | null;
      logoUrl?: string | null;
    },
    overrides: Record<string, unknown> = {},
  ) {
    return {
      name: doc.name,
      description: doc.description || undefined,
      cuisine: doc.cuisine,
      cuisines: doc.cuisines?.length ? doc.cuisines : [doc.cuisine],
      priceRange: doc.priceRange,
      address: {
        line1: doc.address.line1,
        line2: doc.address.line2 || undefined,
        city: doc.address.city,
        state: doc.address.state,
        zip: doc.address.zip,
        country: doc.address.country || 'US',
      },
      location: { lng: doc.location.coordinates[0], lat: doc.location.coordinates[1] },
      phone: doc.phone || undefined,
      website: doc.website || undefined,
      menuUrl: doc.menuUrl ?? null,
      photos: doc.photos ?? [],
      logoUrl: doc.logoUrl ?? null,
      ...overrides,
    };
  }

  it('queues owner listing edits and still saves booking settings', async () => {
    const before = await Restaurant.findById(restaurantId);
    expect(before?.status).toBe('approved');
    const res = await graphqlRequest(
      agent,
      UPDATE_RESTAURANT,
      {
        id: restaurantId,
        submitListingForReview: true,
        input: inputFrom(before!, {
          name: 'Renamed Bistro',
          description: 'Queued description',
          cuisine: 'Italian',
          cuisines: ['Italian'],
          depositRequired: true,
          depositAmountCents: 2500,
        }),
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateRestaurant.name).toBe('Profile Bistro');
    expect(res.body.data.updateRestaurant.depositRequired).toBe(true);
    expect(res.body.data.updateRestaurant.depositAmountCents).toBe(2500);

    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.name).toBe('Profile Bistro');
    expect(doc?.cuisine).toBe('American');
    expect(doc?.description).toBe('Updated about copy for diners');
    expect(doc?.amenities).toEqual(['Outdoor Seating']);
    expect(doc?.depositRequired).toBe(true);

    const pending = await RestaurantProfileChangeRequest.findOne({ restaurantId, status: 'pending' });
    expect(pending?.proposed?.name).toBe('Renamed Bistro');
    expect(pending?.proposed?.cuisine).toBe('Italian');
    expect(pending?.proposed?.description).toBe('Queued description');
    expect(pending?.proposed?.amenities).toEqual(['Outdoor Seating']);
  });

  it('keeps a queued name when another update only changes the menu link', async () => {
    const before = await Restaurant.findById(restaurantId);
    const res = await graphqlRequest(
      agent,
      UPDATE_RESTAURANT,
      {
        id: restaurantId,
        input: inputFrom(before!, { menuUrl: 'https://example.com/menu.pdf' }),
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateRestaurant.name).toBe('Profile Bistro');
    expect(res.body.data.updateRestaurant.menuUrl).toBeNull();

    const pending = await RestaurantProfileChangeRequest.findOne({ restaurantId, status: 'pending' });
    expect(pending?.proposed?.name).toBe('Renamed Bistro');
    expect(pending?.proposed?.menuUrl).toBe('https://example.com/menu.pdf');
    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.menuUrl ?? null).toBeNull();
  });

  it('keeps a queued listing name when discovery fields are requested', async () => {
    const res = await graphqlRequest(
      agent,
      REQUEST_PROFILE,
      {
        input: {
          restaurantId,
          profile: { ...profileInput, description: 'Discovery plus listing' },
        },
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.requestRestaurantProfileChange.proposed.name).toBe('Renamed Bistro');
    expect(res.body.data.requestRestaurantProfileChange.proposed.description).toBe(
      'Discovery plus listing',
    );
    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.name).toBe('Profile Bistro');
  });

  it('withdraws the listing request when the owner changes it back', async () => {
    const before = await Restaurant.findById(restaurantId);
    const res = await graphqlRequest(
      agent,
      UPDATE_RESTAURANT,
      {
        id: restaurantId,
        submitListingForReview: true,
        input: inputFrom(before!),
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateRestaurant.name).toBe('Profile Bistro');
    const pending = await RestaurantProfileChangeRequest.findOne({ restaurantId, status: 'pending' });
    expect(pending).toBeNull();
  });

  it('lets an admin publish listing edits immediately', async () => {
    const before = await Restaurant.findById(restaurantId);
    const res = await graphqlRequest(
      agent,
      UPDATE_RESTAURANT,
      {
        id: restaurantId,
        input: inputFrom(before!, { name: 'Admin Rename' }),
      },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateRestaurant.name).toBe('Admin Rename');
    const doc = await Restaurant.findById(restaurantId);
    expect(doc?.name).toBe('Admin Rename');
    await Restaurant.findByIdAndUpdate(restaurantId, { name: 'Profile Bistro' });
  });

  it('applies listing edits immediately while the restaurant is not live yet', async () => {
    await Restaurant.findByIdAndUpdate(restaurantId, { status: 'pending' });
    const before = await Restaurant.findById(restaurantId);
    const res = await graphqlRequest(
      agent,
      UPDATE_RESTAURANT,
      {
        id: restaurantId,
        submitListingForReview: true,
        input: inputFrom(before!, { name: 'Draft Name' }),
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateRestaurant.name).toBe('Draft Name');
    const pending = await RestaurantProfileChangeRequest.findOne({ restaurantId, status: 'pending' });
    expect(pending).toBeNull();
    await Restaurant.findByIdAndUpdate(restaurantId, { status: 'approved', name: 'Profile Bistro' });
  });
});
