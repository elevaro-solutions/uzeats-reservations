import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN_HIGHLIGHTS, PLANS } from '../config/plans.js';
import { assemblePlans, normalizePlanOrder, orderPlans, visiblePlans } from '../services/platformConfig.js';

describe('plan catalog', () => {
  it('hides deleted built-in packages from the catalog but keeps them resolvable', () => {
    const all = assemblePlans({
      basic: { monthlyPriceCents: 3900, name: 'Starter' },
      launch: { name: 'Launch', monthlyPriceCents: 7900 },
    });

    expect(all.map((plan) => plan.key)).toEqual(['basic', 'core', 'pro', 'launch']);
    expect(all.find((plan) => plan.key === 'basic')).toMatchObject({
      name: 'Starter',
      monthlyPriceCents: 3900,
      isCustom: false,
    });

    const catalog = visiblePlans(all, new Set(['basic']));
    expect(catalog.map((plan) => plan.key)).toEqual(['core', 'pro', 'launch']);
    expect(all.find((plan) => plan.key === 'basic')?.features).toEqual(PLANS.basic.features);
  });

  it('keeps pricing-hidden packages in the catalog (admins assign; GraphQL strips for non-admins)', () => {
    const all = assemblePlans({
      launch: { name: 'Launch', monthlyPriceCents: 7900, visibleOnPricing: false },
    });
    const catalog = visiblePlans(all, new Set());
    expect(catalog.find((plan) => plan.key === 'launch')).toMatchObject({
      name: 'Launch',
      visibleOnPricing: false,
    });
  });

  it('applies a saved package order and appends unknown keys', () => {
    const plans = assemblePlans({
      launch: { name: 'Launch', monthlyPriceCents: 7900 },
    });
    expect(orderPlans(plans, ['pro', 'launch', 'basic']).map((plan) => plan.key)).toEqual([
      'pro',
      'launch',
      'basic',
      'core',
    ]);
    expect(normalizePlanOrder(['basic', 'core', 'pro'], ['pro', 'missing', 'basic'])).toEqual([
      'pro',
      'basic',
      'core',
    ]);
  });

  it('uses saved includes lines and falls back to defaults when unset', () => {
    const plans = assemblePlans({
      basic: { highlights: ['  Custom line  ', 'Custom line', ''] },
      launch: { name: 'Launch', monthlyPriceCents: 7900, highlights: [] },
    });
    expect(plans.find((plan) => plan.key === 'basic')?.highlights).toEqual(['Custom line']);
    expect(plans.find((plan) => plan.key === 'core')?.highlights).toEqual(DEFAULT_PLAN_HIGHLIGHTS.core);
    expect(plans.find((plan) => plan.key === 'launch')?.highlights).toEqual([]);
  });
});
