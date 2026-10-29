import { describe, expect, it } from 'vitest';
import { PLANS } from '../config/plans.js';
import {
  evaluatePlanChange,
  immediatePlanChangeChargeCents,
  planDirection,
} from '../services/planChangePolicy.js';

const fromCore = {
  key: 'core',
  name: 'Core',
  monthlyPriceCents: PLANS.core.monthlyPriceCents,
  networkCoverFeeCents: PLANS.core.networkCoverFeeCents,
  websiteCoverFeeCents: PLANS.core.websiteCoverFeeCents,
  features: PLANS.core.features,
};

const toPro = {
  key: 'pro',
  name: 'Pro',
  monthlyPriceCents: PLANS.pro.monthlyPriceCents,
  networkCoverFeeCents: PLANS.pro.networkCoverFeeCents,
  websiteCoverFeeCents: PLANS.pro.websiteCoverFeeCents,
  features: PLANS.pro.features,
};

const toBasic = {
  key: 'basic',
  name: 'Basic',
  monthlyPriceCents: PLANS.basic.monthlyPriceCents,
  networkCoverFeeCents: PLANS.basic.networkCoverFeeCents,
  websiteCoverFeeCents: PLANS.basic.websiteCoverFeeCents,
  features: PLANS.basic.features,
};

const periodStart = new Date('2026-08-01T00:00:00.000Z');
const periodEnd = new Date('2026-09-01T00:00:00.000Z');

function sub(overrides: Record<string, unknown> = {}) {
  return {
    plan: 'core',
    status: 'active',
    monthlyPriceCents: PLANS.core.monthlyPriceCents,
    networkCoverFeeCents: PLANS.core.networkCoverFeeCents,
    websiteCoverFeeCents: PLANS.core.websiteCoverFeeCents,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    trialEndsAt: null,
    pendingPlan: null,
    lastPaidPlanChangeAt: null,
    ...overrides,
  };
}

describe('planDirection', () => {
  it('classifies upgrades and downgrades by price', () => {
    expect(planDirection(9900, 19900)).toBe('upgrade');
    expect(planDirection(19900, 4900)).toBe('downgrade');
    expect(planDirection(9900, 9900)).toBe('same');
  });
});

describe('immediatePlanChangeChargeCents', () => {
  it('charges the full new monthly price', () => {
    expect(immediatePlanChangeChargeCents(19900)).toBe(19900);
    expect(immediatePlanChangeChargeCents(0)).toBe(0);
  });
});

describe('evaluatePlanChange', () => {
  it('applies upgrades immediately with the full new monthly price', () => {
    const decision = evaluatePlanChange({
      subscription: sub(),
      fromPlan: fromCore,
      toPlan: toPro,
      now: new Date('2026-08-16T00:00:00.000Z'),
    });
    expect(decision.allowed).toBe(true);
    expect(decision.immediate).toBe(true);
    expect(decision.proratedChargeCents).toBe(PLANS.pro.monthlyPriceCents);
    expect(decision.featuresGained.length).toBeGreaterThan(0);
  });

  it('charges the full new monthly price on an immediate downgrade', () => {
    const decision = evaluatePlanChange({
      subscription: sub(),
      fromPlan: fromCore,
      toPlan: toBasic,
      now: new Date('2026-08-16T00:00:00.000Z'),
      forceImmediate: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.immediate).toBe(true);
    expect(decision.proratedChargeCents).toBe(PLANS.basic.monthlyPriceCents);
  });

  it('lets an upgrade wait until period end when forceImmediate is false', () => {
    const decision = evaluatePlanChange({
      subscription: sub(),
      fromPlan: fromCore,
      toPlan: toPro,
      now: new Date('2026-08-16T00:00:00.000Z'),
      forceImmediate: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.immediate).toBe(false);
    expect(decision.effectiveAt).toEqual(periodEnd);
    expect(decision.proratedChargeCents).toBe(0);
  });

  it('schedules downgrades for period end and lists lost features', () => {
    const decision = evaluatePlanChange({
      subscription: sub(),
      fromPlan: fromCore,
      toPlan: toBasic,
      now: new Date('2026-08-16T00:00:00.000Z'),
    });
    expect(decision.allowed).toBe(true);
    expect(decision.immediate).toBe(false);
    expect(decision.effectiveAt).toEqual(periodEnd);
    expect(decision.proratedChargeCents).toBe(0);
    expect(decision.featuresLost.length).toBeGreaterThan(0);
  });

  it('blocks downgrades during trial', () => {
    const decision = evaluatePlanChange({
      subscription: sub({ status: 'trialing', trialEndsAt: new Date('2026-08-20T00:00:00.000Z') }),
      fromPlan: fromCore,
      toPlan: toBasic,
      now: new Date('2026-08-16T00:00:00.000Z'),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedReason).toMatch(/trial/i);
  });

  it('blocks changes when past due', () => {
    const decision = evaluatePlanChange({
      subscription: sub({ status: 'past_due' }),
      fromPlan: fromCore,
      toPlan: toPro,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedReason).toMatch(/payment/i);
  });

  it('blocks changePlan on cancelled subscriptions (re-subscribe via createSubscription instead)', () => {
    const decision = evaluatePlanChange({
      subscription: sub({ status: 'cancelled' }),
      fromPlan: fromCore,
      toPlan: toPro,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedReason).toMatch(/cancelled/i);
  });

  it('allows only one paid upgrade per billing period', () => {
    const decision = evaluatePlanChange({
      subscription: sub({ lastPaidPlanChangeAt: new Date('2026-08-05T00:00:00.000Z') }),
      fromPlan: fromCore,
      toPlan: toPro,
      now: new Date('2026-08-16T00:00:00.000Z'),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedReason).toMatch(/one paid upgrade/i);
  });
});
