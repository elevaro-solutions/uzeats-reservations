import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  adminAssignRestaurantPackage,
  computeExtendedBillingPeriod,
} from '../services/adminAssignPackage.js';
import * as stripeService from '../services/stripe.js';

vi.mock('../services/stripe.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/stripe.js')>();
  return {
    ...actual,
    updateStripeSubscription: vi.fn(),
    stripeCustomerExists: vi.fn(),
  };
});

function resourceMissingError(id: string) {
  return new Stripe.errors.StripeInvalidRequestError({
    type: 'invalid_request_error',
    code: 'resource_missing',
    message: `No such subscription: '${id}'`,
  });
}

async function seedSubscription(fields: Record<string, unknown>) {
  const owner = await User.create({
    email: `assign-owner-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Assign',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Assign Kitchen',
    slug: `assign-kitchen-${Date.now()}-${Math.random()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'basic',
    status: 'active',
    monthlyPriceCents: 0,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    ...fields,
  });
  return restaurant._id.toString();
}

describe('adminAssignRestaurantPackage with a Stripe subscription missing in the active mode', () => {
  const actorId = new mongoose.Types.ObjectId().toString();

  it('applies the package and detaches the orphan id, keeping a live customer', async () => {
    vi.mocked(stripeService.updateStripeSubscription).mockRejectedValueOnce(
      resourceMissingError('sub_orphan_1'),
    );
    vi.mocked(stripeService.stripeCustomerExists).mockResolvedValueOnce(true);
    const restaurantId = await seedSubscription({
      stripeSubscriptionId: 'sub_orphan_1',
      stripeCustomerId: 'cus_live_1',
      preferredPaymentMethodId: 'pm_live_1',
    });

    const sub = await adminAssignRestaurantPackage({ restaurantId, plan: 'core', actorId });

    expect(sub.plan).toBe('core');
    const saved = await Subscription.findOne({ restaurantId }).lean();
    expect(saved?.plan).toBe('core');
    expect(saved?.stripeSubscriptionId).toBeUndefined();
    expect(saved?.stripeCustomerId).toBe('cus_live_1');
    expect(saved?.preferredPaymentMethodId).toBe('pm_live_1');
  });

  it('also clears the customer and saved card when the customer is missing too', async () => {
    vi.mocked(stripeService.updateStripeSubscription).mockRejectedValueOnce(
      resourceMissingError('sub_orphan_2'),
    );
    vi.mocked(stripeService.stripeCustomerExists).mockResolvedValueOnce(false);
    const restaurantId = await seedSubscription({
      stripeSubscriptionId: 'sub_orphan_2',
      stripeCustomerId: 'cus_test_2',
      preferredPaymentMethodId: 'pm_test_2',
    });

    await adminAssignRestaurantPackage({ restaurantId, plan: 'core', actorId });

    const saved = await Subscription.findOne({ restaurantId }).lean();
    expect(saved?.plan).toBe('core');
    expect(saved?.stripeSubscriptionId).toBeUndefined();
    expect(saved?.stripeCustomerId).toBeUndefined();
    expect(saved?.preferredPaymentMethodId).toBeUndefined();
  });

  it('still surfaces other Stripe errors', async () => {
    vi.mocked(stripeService.updateStripeSubscription).mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        code: 'parameter_invalid_integer',
        message: 'Invalid integer',
      }),
    );
    const restaurantId = await seedSubscription({ stripeSubscriptionId: 'sub_live_3' });

    await expect(
      adminAssignRestaurantPackage({ restaurantId, plan: 'core', actorId }),
    ).rejects.toThrow('Invalid integer');
    const saved = await Subscription.findOne({ restaurantId }).lean();
    expect(saved?.plan).toBe('basic');
    expect(saved?.stripeSubscriptionId).toBe('sub_live_3');
  });
});

describe('computeExtendedBillingPeriod', () => {
  it('extends from current period end when still active', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    const currentPeriodStart = new Date('2026-08-01T00:00:00.000Z');
    const currentPeriodEnd = new Date('2026-09-01T00:00:00.000Z');

    const result = computeExtendedBillingPeriod({
      now,
      currentPeriodStart,
      currentPeriodEnd,
    });

    expect(result.extendedFrom.toISOString()).toBe(currentPeriodEnd.toISOString());
    expect(result.currentPeriodStart.toISOString()).toBe(currentPeriodStart.toISOString());
    const expectedEnd = new Date(currentPeriodEnd.getTime());
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);
    expect(result.currentPeriodEnd.toISOString()).toBe(expectedEnd.toISOString());
  });

  it('starts a fresh period from now when expired', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const currentPeriodStart = new Date('2026-08-01T00:00:00.000Z');
    const currentPeriodEnd = new Date('2026-09-01T00:00:00.000Z');

    const result = computeExtendedBillingPeriod({
      now,
      currentPeriodStart,
      currentPeriodEnd,
    });

    expect(result.extendedFrom.toISOString()).toBe(now.toISOString());
    expect(result.currentPeriodStart.toISOString()).toBe(now.toISOString());
    const expectedEnd = new Date(now.getTime());
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);
    expect(result.currentPeriodEnd.toISOString()).toBe(expectedEnd.toISOString());
  });

  it('defaults to one calendar month when no period exists', () => {
    const now = new Date('2026-08-26T00:00:00.000Z');
    const result = computeExtendedBillingPeriod({ now });
    expect(result.currentPeriodStart.toISOString()).toBe(now.toISOString());
    const expectedEnd = new Date(now.getTime());
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);
    expect(result.currentPeriodEnd.toISOString()).toBe(expectedEnd.toISOString());
  });

  it('uses the assigned package duration (days, weeks, months, years)', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    const days = computeExtendedBillingPeriod({
      now,
      durationUnit: 'day',
      durationCount: 14,
    });
    expect(days.currentPeriodEnd.toISOString()).toBe('2026-08-29T12:00:00.000Z');

    const weeks = computeExtendedBillingPeriod({
      now,
      durationUnit: 'week',
      durationCount: 2,
    });
    expect(weeks.currentPeriodEnd.toISOString()).toBe('2026-08-29T12:00:00.000Z');

    const months = computeExtendedBillingPeriod({
      now,
      durationUnit: 'month',
      durationCount: 3,
    });
    const expectedMonths = new Date(now.getTime());
    expectedMonths.setMonth(expectedMonths.getMonth() + 3);
    expect(months.currentPeriodEnd.toISOString()).toBe(expectedMonths.toISOString());

    const years = computeExtendedBillingPeriod({
      now,
      durationUnit: 'year',
      durationCount: 1,
    });
    const expectedYears = new Date(now.getTime());
    expectedYears.setFullYear(expectedYears.getFullYear() + 1);
    expect(years.currentPeriodEnd.toISOString()).toBe(expectedYears.toISOString());
  });
});
