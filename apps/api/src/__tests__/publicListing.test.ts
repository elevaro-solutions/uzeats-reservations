import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  publiclyListedRestaurantIds,
  restaurantIsPubliclyListed,
  restaurantIsPubliclyViewable,
} from '../services/publicListing.js';

async function seedRestaurant(overrides: Record<string, unknown> = {}) {
  const owner = await User.create({
    email: `list-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'x',
    firstName: 'L',
    lastName: 'O',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Listing Kitchen',
    slug: `list-${Date.now()}-${Math.random()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
    ...overrides,
  });
  await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'trialing',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000),
    trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
    stripeSubscriptionId: `sub_dev_${Date.now()}`,
  });
  return restaurant;
}

describe('restaurant listing visibility', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('keeps a trial restaurant in search and on the public page', async () => {
    const restaurant = await seedRestaurant();
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(true);
    const ids = (await publiclyListedRestaurantIds()).map((id) => id.toString());
    expect(ids).toContain(restaurant._id.toString());
  });

  it('hides a restaurant marked not visible or inactive', async () => {
    const hidden = await seedRestaurant({ visibility: 'hidden' });
    const inactive = await seedRestaurant({ activity: 'inactive' });
    const open = await seedRestaurant();

    expect(await restaurantIsPubliclyListed(hidden._id.toString())).toBe(false);
    expect(await restaurantIsPubliclyListed(inactive._id.toString())).toBe(false);
    expect(await restaurantIsPubliclyViewable(hidden._id.toString())).toBe(false);
    expect(await restaurantIsPubliclyViewable(inactive._id.toString())).toBe(true);
    expect(await restaurantIsPubliclyListed(open._id.toString())).toBe(true);

    const ids = (await publiclyListedRestaurantIds()).map((id) => id.toString());
    expect(ids).not.toContain(hidden._id.toString());
    expect(ids).not.toContain(inactive._id.toString());
    expect(ids).toContain(open._id.toString());
  });

  it('treats restaurants saved before the flags as visible and active', async () => {
    const restaurant = await seedRestaurant();
    await Restaurant.collection.updateOne(
      { _id: restaurant._id },
      { $unset: { visibility: '', activity: '' } },
    );
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(true);
    const ids = (await publiclyListedRestaurantIds()).map((id) => id.toString());
    expect(ids).toContain(restaurant._id.toString());
  });
});
