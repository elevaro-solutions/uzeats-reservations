import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { getFeatures } from '../services/plans.js';
import { changeRestaurantPlan } from '../services/planChange.js';
import {
  finalizeCancelAtPeriodEndIfDue,
  isPaidThrough,
  reactivateSubscription,
  scheduleSubscriptionCancel,
  subscriptionGrantsEntitlements,
} from '../services/subscriptionLifecycle.js';
import { evaluatePlanChange } from '../services/planChangePolicy.js';
import { restaurantIsPubliclyListed } from '../services/publicListing.js';
import { PLANS } from '../config/plans.js';

async function seedSub(overrides: Record<string, unknown> = {}) {
  const owner = await User.create({
    email: `life-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'x',
    firstName: 'L',
    lastName: 'O',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Lifecycle Kitchen',
    slug: `life-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const periodEnd = new Date('2026-11-01T00:00:00.000Z');
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    currentPeriodStart: new Date('2026-10-01T00:00:00.000Z'),
    currentPeriodEnd: periodEnd,
    stripeSubscriptionId: `sub_dev_${Date.now()}`,
    ...overrides,
  });
  return { owner, restaurant, sub, periodEnd };
}

describe('subscription cancel-at-period-end', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('schedules soft cancel and keeps entitlements until period end', async () => {
    const { owner, restaurant, periodEnd } = await seedSub();
    const sub = await scheduleSubscriptionCancel({
      restaurantId: restaurant._id.toString(),
      actorId: owner._id.toString(),
    });
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(sub.status).toBe('active');
    expect(isPaidThrough(sub, new Date('2026-10-15T00:00:00.000Z'))).toBe(true);
    expect(subscriptionGrantsEntitlements(sub, new Date('2026-10-15T00:00:00.000Z'))).toBe(true);
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(true);

    const features = await getFeatures(restaurant._id.toString());
    expect(features.floorPlans).toBe(true);

    const finalized = await finalizeCancelAtPeriodEndIfDue(
      sub,
      new Date(periodEnd.getTime() + 1000),
    );
    expect(finalized.status).toBe('cancelled');
    expect(finalized.cancelAtPeriodEnd).toBe(false);
    expect(subscriptionGrantsEntitlements(finalized, new Date(periodEnd.getTime() + 1000))).toBe(
      false,
    );
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(false);
  });

  it('reactivates a soft-cancelled subscription', async () => {
    const { owner, restaurant } = await seedSub({ cancelAtPeriodEnd: true });
    const sub = await reactivateSubscription({
      restaurantId: restaurant._id.toString(),
      actorId: owner._id.toString(),
    });
    expect(sub.cancelAtPeriodEnd).toBe(false);
    expect(sub.status).toBe('active');
  });

  it('immediate cancel ends access now', async () => {
    const { owner, restaurant } = await seedSub();
    const sub = await scheduleSubscriptionCancel({
      restaurantId: restaurant._id.toString(),
      actorId: owner._id.toString(),
      immediate: true,
    });
    expect(sub.status).toBe('cancelled');
    expect(sub.cancelAtPeriodEnd).toBe(false);
    expect(subscriptionGrantsEntitlements(sub)).toBe(false);
  });

  it('forceImmediate applies a downgrade right away in policy', () => {
    const decision = evaluatePlanChange({
      subscription: {
        plan: 'pro',
        status: 'active',
        monthlyPriceCents: PLANS.pro.monthlyPriceCents,
        networkCoverFeeCents: PLANS.pro.networkCoverFeeCents,
        websiteCoverFeeCents: PLANS.pro.websiteCoverFeeCents,
        currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
      },
      fromPlan: {
        key: 'pro',
        name: 'Pro',
        monthlyPriceCents: PLANS.pro.monthlyPriceCents,
        networkCoverFeeCents: PLANS.pro.networkCoverFeeCents,
        websiteCoverFeeCents: PLANS.pro.websiteCoverFeeCents,
        features: PLANS.pro.features as any,
      },
      toPlan: {
        key: 'core',
        name: 'Core',
        monthlyPriceCents: PLANS.core.monthlyPriceCents,
        networkCoverFeeCents: PLANS.core.networkCoverFeeCents,
        websiteCoverFeeCents: PLANS.core.websiteCoverFeeCents,
        features: PLANS.core.features as any,
      },
      forceImmediate: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.immediate).toBe(true);
    expect(decision.direction).toBe('downgrade');
  });

  it('upgrade while soft-cancelled starts the new plan immediately and clears cancel', async () => {
    const { owner, restaurant } = await seedSub({ cancelAtPeriodEnd: true, plan: 'core' });
    const result = await changeRestaurantPlan({
      restaurantId: restaurant._id.toString(),
      plan: 'pro',
      actorId: owner._id.toString(),
    });
    expect(result.subscription.plan).toBe('pro');
    expect(result.subscription.cancelAtPeriodEnd).toBe(false);
    expect(result.subscription.status).not.toBe('cancelled');
    const stored = await Subscription.findById(result.subscription._id);
    expect(stored!.plan).toBe('pro');
    expect(stored!.cancelAtPeriodEnd).toBe(false);
  });

  it('immediate switch charges the full new monthly price and starts a new period', async () => {
    const { owner, restaurant, periodEnd } = await seedSub({ plan: 'core' });
    const before = Date.now();
    const result = await changeRestaurantPlan({
      restaurantId: restaurant._id.toString(),
      plan: 'pro',
      actorId: owner._id.toString(),
      forceImmediate: true,
    });
    expect(result.amountDueCents).toBe(PLANS.pro.monthlyPriceCents);
    expect(result.subscription.amountDueCents).toBe(PLANS.pro.monthlyPriceCents);
    expect(result.subscription.currentPeriodStart!.getTime()).toBeGreaterThanOrEqual(before);
    expect(
      result.subscription.currentPeriodEnd!.getTime() -
        result.subscription.currentPeriodStart!.getTime(),
    ).toBeGreaterThan(27 * 86_400_000);
    expect(result.subscription.currentPeriodEnd!.getTime()).not.toBe(periodEnd.getTime());
    expect(result.subscription.monthlyPriceCents).toBe(PLANS.pro.monthlyPriceCents);
  });

  it('forceImmediate downgrade applies before period end and clears a scheduled cancel', async () => {
    const { owner, restaurant } = await seedSub({
      cancelAtPeriodEnd: true,
      plan: 'pro',
      monthlyPriceCents: 19900,
    });
    const result = await changeRestaurantPlan({
      restaurantId: restaurant._id.toString(),
      plan: 'core',
      actorId: owner._id.toString(),
      forceImmediate: true,
    });
    expect(result.subscription.plan).toBe('core');
    expect(result.subscription.cancelAtPeriodEnd).toBe(false);
    expect(result.subscription.pendingPlan ?? null).toBeFalsy();
  });

  it('downgrade without forceImmediate stays on the current plan until period end', async () => {
    const { owner, restaurant } = await seedSub({ plan: 'pro', monthlyPriceCents: 19900 });
    const result = await changeRestaurantPlan({
      restaurantId: restaurant._id.toString(),
      plan: 'core',
      actorId: owner._id.toString(),
    });
    expect(result.subscription.plan).toBe('pro');
    expect(result.subscription.pendingPlan).toBe('core');
    expect(result.subscription.pendingPlanEffectiveAt).toEqual(new Date('2026-11-01T00:00:00.000Z'));
  });

  it('choosing the same plan while soft-cancelled resumes renewal', async () => {
    const { owner, restaurant } = await seedSub({ cancelAtPeriodEnd: true });
    const result = await changeRestaurantPlan({
      restaurantId: restaurant._id.toString(),
      plan: 'core',
      actorId: owner._id.toString(),
    });
    expect(result.subscription.plan).toBe('core');
    expect(result.subscription.cancelAtPeriodEnd).toBe(false);
    expect(result.clientSecret).toBeNull();
  });
});
