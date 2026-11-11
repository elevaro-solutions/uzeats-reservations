import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { ValidationError } from '../lib/errors.js';
import { withBillingErrors } from '../services/billingErrors.js';
import { changeRestaurantPlan } from '../services/planChange.js';
import * as stripeService from '../services/stripe.js';

vi.mock('../services/stripe.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/stripe.js')>();
  return {
    ...actual,
    updateStripeSubscription: vi.fn(),
    stripeCustomerExists: vi.fn(),
  };
});

async function seedSubscription(fields: Record<string, unknown>) {
  const owner = await User.create({
    email: `billing-err-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Billing',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Billing Kitchen',
    slug: `billing-kitchen-${Date.now()}-${Math.random()}`,
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

describe('withBillingErrors', () => {
  it('passes readable app errors through unchanged', async () => {
    await expect(
      withBillingErrors('change the plan', {}, async () => {
        throw new ValidationError('Pick a plan');
      }),
    ).rejects.toThrow('Pick a plan');
  });

  it('turns unexpected errors into a billing error the client can show', async () => {
    await expect(
      withBillingErrors('start the subscription', {}, async () => {
        throw new TypeError("Cannot read properties of undefined (reading 'equals')");
      }),
    ).rejects.toMatchObject({
      code: 'BILLING_FAILED',
      message: 'Could not start the subscription. Please try again or contact support.',
    });
  });
});

describe('changeRestaurantPlan with a Stripe subscription that no longer exists', () => {
  it('detaches the orphan id and still upgrades', async () => {
    vi.mocked(stripeService.updateStripeSubscription).mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: "No such subscription: 'sub_orphan_upgrade'",
      }),
    );
    const restaurantId = await seedSubscription({ stripeSubscriptionId: 'sub_orphan_upgrade' });

    const result = await changeRestaurantPlan({
      restaurantId,
      plan: 'core',
      actorId: new mongoose.Types.ObjectId().toString(),
    });

    expect(result.subscription.plan).toBe('core');
    const saved = await Subscription.findOne({ restaurantId }).lean();
    expect(saved?.plan).toBe('core');
    expect(saved?.stripeSubscriptionId).toBeUndefined();
  });
});
