import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { User } from '../models/User.js';
import { SearchEvent } from '../models/SearchEvent.js';
import { UserSearchHistory } from '../models/UserSearchHistory.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

const DISCOVERY_INDEX_QUERY = `
  query DiscoveryIndex($input: DiscoveryIndexInput) {
    discoveryIndex(input: $input) {
      cities { label count }
      cuisines { label count }
      occasions { label count }
      meals { label count }
      diningStyles { label count }
      dietaryTags { label count }
      amenities { label count }
    }
  }
`;

const SEARCH_SUGGESTIONS_QUERY = `
  query SearchSuggestions($input: SearchSuggestionsInput!) {
    searchSuggestions(input: $input) {
      id
      name
      addressLine
    }
  }
`;

const TRENDING_QUERY = `
  query Trending($input: TrendingSearchesInput!) {
    trendingSearches(input: $input) {
      term
      kind
      count
    }
  }
`;

const RECENT_QUERY = `
  query Recent($limit: Int) {
    myRecentSearches(limit: $limit) {
      id
      label
      query
    }
  }
`;

const RECORD_SEARCH = `
  mutation RecordSearch($input: RecordSearchInput!) {
    recordSearch(input: $input)
  }
`;

describe('Search discovery API', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'search-diner@test.com',
      password: 'Password123!',
      firstName: 'Search',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const owner = await registerUser(agent, {
      email: 'search-owner@test.com',
      password: 'Password123!',
      firstName: 'Search',
      lastName: 'Owner',
    });
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });
    const loginRes = await graphqlRequest(
      agent,
      `mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }`,
      { input: { email: 'search-owner@test.com', password: 'Password123!' } },
    );
    const ownerToken = loginRes.body.data.login.accessToken;

    const createRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) {
        createRestaurant(input: $input) { id name }
      }`,
      {
        input: {
          name: 'Peshin Osh Bistro',
          cuisine: 'Uzbek',
          priceRange: 2,
          address: {
            line1: '133 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
          },
          location: { lat: 40.7128, lng: -74.006 },
          meals: ['Lunch', 'Dinner'],
          diningStyles: ['Casual'],
          dietaryTags: ['Halal'],
          amenities: ['Outdoor Seating'],
          discoveryOccasions: ['Family Dinner'],
        },
      },
      ownerToken,
    );
    restaurantId = createRes.body.data.createRestaurant.id;

    const adminUser = await User.create({
      email: 'search-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Search',
      lastName: 'Admin',
      role: 'admin',
    });
    const { signAccessToken } = await import('../services/auth.js');
    const adminToken = signAccessToken({ sub: adminUser._id.toString(), role: 'admin' });

    await graphqlRequest(
      agent,
      `mutation SetStatus($id: ID!, $status: RestaurantStatus!) {
        setRestaurantStatus(id: $id, status: $status) { id status }
      }`,
      { id: restaurantId, status: 'approved' },
      adminToken,
    );
  });

  it('returns discovery index with new browse fields', async () => {
    const res = await graphqlRequest(agent, DISCOVERY_INDEX_QUERY);
    expect(res.body.errors).toBeUndefined();
    const index = res.body.data.discoveryIndex;
    expect(index.cuisines.length).toBeGreaterThan(0);
    expect(index.meals.length).toBeGreaterThan(0);
    expect(index.diningStyles.length).toBeGreaterThan(0);
    expect(index.dietaryTags.length).toBeGreaterThan(0);
    expect(index.amenities.length).toBeGreaterThan(0);
  });

  it('scopes discovery index by city', async () => {
    const res = await graphqlRequest(agent, DISCOVERY_INDEX_QUERY, {
      input: { city: 'New York', state: 'NY' },
    });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.discoveryIndex.cuisines.some((c: { label: string }) => c.label === 'Uzbek')).toBe(true);
  });

  it('returns search suggestions without availability filtering', async () => {
    const res = await graphqlRequest(agent, SEARCH_SUGGESTIONS_QUERY, {
      input: { query: 'Peshin', city: 'New York', state: 'NY', limit: 5 },
    });
    expect(res.body.errors).toBeUndefined();
    const items = res.body.data.searchSuggestions;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name).toContain('Peshin');
  });

  it('returns trending fallback when no events exist', async () => {
    const res = await graphqlRequest(agent, TRENDING_QUERY, {
      input: { city: 'New York', state: 'NY', limit: 4 },
    });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.trendingSearches.length).toBeGreaterThan(0);
  });

  it('records search and returns recent entries for authenticated user', async () => {
    await graphqlRequest(
      agent,
      RECORD_SEARCH,
      { input: { query: 'osh', city: 'New York', state: 'NY' } },
      dinerToken,
    );
    await graphqlRequest(
      agent,
      RECORD_SEARCH,
      { input: { query: 'osh', city: 'New York', state: 'NY' } },
      dinerToken,
    );
    await graphqlRequest(
      agent,
      RECORD_SEARCH,
      { input: { cuisine: 'Uzbek', city: 'New York', state: 'NY' } },
      dinerToken,
    );

    const res = await graphqlRequest(agent, RECENT_QUERY, { limit: 8 }, dinerToken);
    expect(res.body.errors).toBeUndefined();
    const recent = res.body.data.myRecentSearches;
    expect(recent.length).toBe(2);
    expect(recent[0].label).toBeTruthy();
  });

  it('returns empty recent searches for guests', async () => {
    const res = await graphqlRequest(agent, RECENT_QUERY, { limit: 8 });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.myRecentSearches).toEqual([]);
  });

  it('aggregates trending from search events', async () => {
    await SearchEvent.deleteMany({});
    await SearchEvent.create([
      { term: 'pizza', kind: 'QUERY', city: 'New York', state: 'NY' },
      { term: 'pizza', kind: 'QUERY', city: 'New York', state: 'NY' },
      { term: 'Uzbek', kind: 'CUISINE', city: 'New York', state: 'NY' },
    ]);

    const res = await graphqlRequest(agent, TRENDING_QUERY, {
      input: { city: 'New York', state: 'NY', limit: 5 },
    });
    expect(res.body.errors).toBeUndefined();
    const trending = res.body.data.trendingSearches;
    expect(trending[0].term).toBe('pizza');
    expect(trending[0].count).toBe(2);
  });

  it('does not change searchRestaurants behavior', async () => {
    const res = await graphqlRequest(
      agent,
      `query Search($input: SearchRestaurantsInput!) {
        searchRestaurants(input: $input) { items { id name } total }
      }`,
      { input: { query: 'Peshin' } },
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.searchRestaurants.total).toBeGreaterThanOrEqual(1);
  });

  it('matches restaurant name prefixes with substring query', async () => {
    const res = await graphqlRequest(
      agent,
      `query Search($input: SearchRestaurantsInput!) {
        searchRestaurants(input: $input) { items { id name } total }
      }`,
      { input: { query: 'sam', city: 'New York' } },
    );
    expect(res.body.errors).toBeUndefined();
    const names: string[] = res.body.data.searchRestaurants.items.map(
      (item: { name: string }) => item.name,
    );
    expect(names.some((name) => /samarkand/i.test(name))).toBe(true);
  });

  it('caps recent search history entries', async () => {
    await UserSearchHistory.deleteMany({});
    for (let i = 0; i < 25; i += 1) {
      await graphqlRequest(
        agent,
        RECORD_SEARCH,
        { input: { query: `term-${i}`, city: 'New York', state: 'NY' } },
        dinerToken,
      );
    }
    const count = await UserSearchHistory.countDocuments({});
    expect(count).toBeLessThanOrEqual(20);
  });
});
