import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { deleteMyRestaurant } from '../services/deleteMyRestaurant.js';
import { assertRestaurantClearOfPlatformDebt } from '../services/restaurantDebt.js';

async function seedOwnerVenue(opts?: { withOpenInvoice?: boolean; pastDue?: boolean }) {
  const owner = await User.create({
    email: `del-owner-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash: 'unused',
    firstName: 'Del',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Delete Me Bistro',
    slug: `delete-me-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  owner.restaurantIds = [restaurant._id];
  await owner.save();

  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: opts?.pastDue ? 'past_due' : 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    amountDueCents: opts?.pastDue ? 9900 : 0,
  });

  let invoice = null;
  if (opts?.withOpenInvoice) {
    invoice = await Invoice.create({
      number: `INV-DEL-${Date.now()}`,
      restaurantId: restaurant._id,
      subscriptionId: sub._id,
      status: 'pending',
      billingPeriod: '2026-10',
      currency: 'usd',
      subtotalCents: 2500,
      totalCents: 2500,
      lines: [{ description: 'Plan', quantity: 1, unitAmountCents: 2500, amountCents: 2500 }],
      dueDate: new Date('2026-10-01T00:00:00Z'),
      payToken: `tok_del_${Date.now()}`,
    });
  }

  return { owner, restaurant, sub, invoice };
}

describe('deleteMyRestaurant / platform debt', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('blocks deletion when an unpaid invoice exists', async () => {
    const { owner, restaurant } = await seedOwnerVenue({ withOpenInvoice: true });

    await expect(
      deleteMyRestaurant({
        restaurantId: restaurant._id.toString(),
        actorId: owner._id.toString(),
      }),
    ).rejects.toThrow(/Settle outstanding platform balance/);

    expect(await Restaurant.findById(restaurant._id)).toBeTruthy();
  });

  it('blocks deletion when subscription is past_due', async () => {
    const { owner, restaurant } = await seedOwnerVenue({ pastDue: true });

    await expect(
      assertRestaurantClearOfPlatformDebt(restaurant._id.toString()),
    ).rejects.toThrow(/Settle outstanding platform balance/);

    await expect(
      deleteMyRestaurant({
        restaurantId: restaurant._id.toString(),
        actorId: owner._id.toString(),
      }),
    ).rejects.toThrow(/Settle outstanding platform balance/);
  });

  it('rejects non-owners', async () => {
    const { restaurant } = await seedOwnerVenue();
    const other = await User.create({
      email: `other-${Date.now()}@test.com`,
      passwordHash: 'unused',
      firstName: 'Other',
      lastName: 'User',
      role: 'restaurant_owner',
    });

    await expect(
      deleteMyRestaurant({
        restaurantId: restaurant._id.toString(),
        actorId: other._id.toString(),
      }),
    ).rejects.toThrow(/Only the restaurant owner/);
  });

  it('deletes the venue when there is no platform debt', async () => {
    const { owner, restaurant, sub } = await seedOwnerVenue();

    const result = await deleteMyRestaurant({
      restaurantId: restaurant._id.toString(),
      actorId: owner._id.toString(),
    });

    expect(result.success).toBe(true);
    expect(result.deletedRestaurantId).toBe(restaurant._id.toString());
    expect(await Restaurant.findById(restaurant._id)).toBeNull();
    expect(await Subscription.findById(sub._id)).toBeNull();

    const refreshedOwner = await User.findById(owner._id);
    expect(refreshedOwner).toBeTruthy();
    expect(refreshedOwner!.restaurantIds?.map(String) ?? []).not.toContain(
      restaurant._id.toString(),
    );
  });
});
