import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  addOneCalendarMonth,
  adminSetSubscriptionPaidPeriodStart,
  computePaidPeriodFromStart,
} from '../services/adminPaidPeriod.js';
import { PLANS } from '../config/plans.js';

describe('computePaidPeriodFromStart', () => {
  const now = new Date('2026-10-29T12:00:00.000Z');
  const existingStart = new Date('2026-10-01T00:00:00.000Z');

  it('keeps trial until a future paid start', () => {
    const paidPeriodStart = new Date('2026-11-15T00:00:00.000Z');
    const result = computePaidPeriodFromStart({
      paidPeriodStart,
      now,
      currentPeriodStart: existingStart,
      status: 'trialing',
    });

    expect(result.paidPeriodHasStarted).toBe(false);
    expect(result.status).toBe('trialing');
    expect(result.trialEndsAt.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodEnd.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodStart.toISOString()).toBe(existingStart.toISOString());
  });

  it('puts an active subscription back on trial when paid start is in the future', () => {
    const paidPeriodStart = new Date('2026-12-01T00:00:00.000Z');
    const result = computePaidPeriodFromStart({
      paidPeriodStart,
      now,
      currentPeriodStart: existingStart,
      status: 'active',
    });

    expect(result.status).toBe('trialing');
    expect(result.trialEndsAt.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodEnd.toISOString()).toBe(paidPeriodStart.toISOString());
  });

  it('starts the paid cycle on a past or current date and ends one calendar month later', () => {
    const paidPeriodStart = new Date('2026-10-01T00:00:00.000Z');
    const result = computePaidPeriodFromStart({
      paidPeriodStart,
      now,
      currentPeriodStart: existingStart,
      status: 'trialing',
    });

    expect(result.paidPeriodHasStarted).toBe(true);
    expect(result.status).toBe('active');
    expect(result.currentPeriodStart.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodEnd.toISOString()).toBe(
      addOneCalendarMonth(paidPeriodStart).toISOString(),
    );
    expect(result.trialEndsAt.toISOString()).toBe(paidPeriodStart.toISOString());
  });

  it('keeps past_due when re-anchoring a paid cycle', () => {
    const paidPeriodStart = new Date('2026-10-15T00:00:00.000Z');
    const result = computePaidPeriodFromStart({
      paidPeriodStart,
      now,
      status: 'past_due',
    });
    expect(result.status).toBe('past_due');
  });
});

async function seedSub(overrides: Record<string, unknown> = {}) {
  const owner = await User.create({
    email: `paid-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'x',
    firstName: 'P',
    lastName: 'O',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Paid Period Kitchen',
    slug: `paid-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const admin = await User.create({
    email: `sa-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'x',
    firstName: 'S',
    lastName: 'A',
    role: 'super_admin',
  });
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'trialing',
    monthlyPriceCents: PLANS.core.monthlyPriceCents,
    networkCoverFeeCents: PLANS.core.networkCoverFeeCents,
    websiteCoverFeeCents: PLANS.core.websiteCoverFeeCents,
    currentPeriodStart: new Date('2026-10-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-10-31T00:00:00.000Z'),
    trialEndsAt: new Date('2026-10-31T00:00:00.000Z'),
    stripeSubscriptionId: `sub_dev_${Date.now()}`,
    ...overrides,
  });
  return { owner, restaurant, admin, sub };
}

describe('adminSetSubscriptionPaidPeriodStart', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('sets a future first-charge date while trialing', async () => {
    const { restaurant, admin } = await seedSub();
    const paidPeriodStart = new Date('2026-11-20T00:00:00.000Z');
    const now = new Date('2026-10-29T12:00:00.000Z');

    const result = await adminSetSubscriptionPaidPeriodStart({
      restaurantId: restaurant._id.toString(),
      paidPeriodStart,
      actorId: admin._id.toString(),
      now,
    });

    expect(result.status).toBe('trialing');
    expect(result.trialEndsAt?.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodEnd?.toISOString()).toBe(paidPeriodStart.toISOString());
  });

  it('ends trial and starts a paid cycle on a past date', async () => {
    const { restaurant, admin } = await seedSub();
    const paidPeriodStart = new Date('2026-10-15T00:00:00.000Z');
    const now = new Date('2026-10-29T12:00:00.000Z');

    const result = await adminSetSubscriptionPaidPeriodStart({
      restaurantId: restaurant._id.toString(),
      paidPeriodStart,
      actorId: admin._id.toString(),
      now,
    });

    expect(result.status).toBe('active');
    expect(result.currentPeriodStart?.toISOString()).toBe(paidPeriodStart.toISOString());
    expect(result.currentPeriodEnd?.toISOString()).toBe(
      addOneCalendarMonth(paidPeriodStart).toISOString(),
    );
  });

  it('moves a pending plan change to the new period end', async () => {
    const oldEnd = new Date('2026-10-31T00:00:00.000Z');
    const { restaurant, admin } = await seedSub({
      status: 'active',
      pendingPlan: 'basic',
      pendingPlanEffectiveAt: oldEnd,
      currentPeriodEnd: oldEnd,
    });
    const paidPeriodStart = new Date('2026-10-01T00:00:00.000Z');
    const now = new Date('2026-10-29T12:00:00.000Z');

    const result = await adminSetSubscriptionPaidPeriodStart({
      restaurantId: restaurant._id.toString(),
      paidPeriodStart,
      actorId: admin._id.toString(),
      now,
    });

    expect(result.pendingPlan).toBe('basic');
    expect(result.pendingPlanEffectiveAt?.toISOString()).toBe(
      addOneCalendarMonth(paidPeriodStart).toISOString(),
    );
  });

  it('rejects cancelled subscriptions', async () => {
    const { restaurant, admin } = await seedSub({ status: 'cancelled' });
    await expect(
      adminSetSubscriptionPaidPeriodStart({
        restaurantId: restaurant._id.toString(),
        paidPeriodStart: new Date('2026-11-01T00:00:00.000Z'),
        actorId: admin._id.toString(),
      }),
    ).rejects.toThrow(/reactivate/i);
  });

  it('rejects restaurants with no subscription', async () => {
    const { restaurant, admin, sub } = await seedSub();
    await sub.deleteOne();
    await expect(
      adminSetSubscriptionPaidPeriodStart({
        restaurantId: restaurant._id.toString(),
        paidPeriodStart: new Date('2026-11-01T00:00:00.000Z'),
        actorId: admin._id.toString(),
      }),
    ).rejects.toThrow(/Assign a package/i);
  });
});
