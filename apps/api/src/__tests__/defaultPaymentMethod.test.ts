import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  confirmDefaultPaymentMethod,
  resolveVenueDefaultPaymentMethodId,
  startDefaultPaymentMethodSetup,
} from '../services/defaultPaymentMethod.js';

async function seed(withSubscription = true) {
  const owner = await User.create({
    email: `card-owner-${Date.now()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Card',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Card Kitchen',
    slug: `card-kitchen-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const sub = withSubscription
    ? await Subscription.create({
        restaurantId: restaurant._id,
        plan: 'core',
        status: 'trialing',
        monthlyPriceCents: 9900,
        networkCoverFeeCents: 100,
        websiteCoverFeeCents: 0,
        autoChargeInvoices: false,
      })
    : null;
  return { owner, restaurant, sub };
}

describe('venue default payment method', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('saves the default card used for auto-charges', async () => {
    const { owner, restaurant, sub } = await seed();
    const restaurantId = restaurant._id.toString();
    expect(await resolveVenueDefaultPaymentMethodId(restaurantId)).toBeNull();

    const setup = await startDefaultPaymentMethodSetup(restaurantId);
    expect(setup.paymentMode).toBe('setup');
    expect(setup.clientSecret).toMatch(/^seti_dev_/);

    const setupIntentId = setup.clientSecret!.split('_secret_')[0];
    await confirmDefaultPaymentMethod({
      restaurantId,
      setupIntentId,
      actorId: owner._id.toString(),
    });

    const updated = await Subscription.findById(sub!._id);
    expect(updated!.preferredPaymentMethodId).toMatch(/^pm_dev_/);
    expect(updated!.autoChargeInvoices).toBe(true);
    expect(updated!.stripeCustomerId).toBeTruthy();
    expect(await resolveVenueDefaultPaymentMethodId(restaurantId)).toBe(
      updated!.preferredPaymentMethodId,
    );
  });

  it('requires a subscription before adding a card', async () => {
    const { restaurant } = await seed(false);
    await expect(startDefaultPaymentMethodSetup(restaurant._id.toString())).rejects.toThrow(
      /Choose a plan/,
    );
  });
});
