import { describe, expect, it } from 'vitest';
import {
  annualBillingAppliesToPlan,
  getAnnualSavingsPercentFromSettings,
  normalizeAnnualBillingSettings,
} from '../annualBilling.js';

describe('annualBilling', () => {
  it('normalizes defaults and clamps discount bounds', () => {
    expect(normalizeAnnualBillingSettings(null).enabled).toBe(true);
    expect(normalizeAnnualBillingSettings({ freeMonths: 99 }).freeMonths).toBe(11);
    expect(normalizeAnnualBillingSettings({ freeMonths: 0 }).freeMonths).toBe(1);
    expect(normalizeAnnualBillingSettings({ discountPercent: 0 }).discountPercent).toBe(1);
    expect(normalizeAnnualBillingSettings({ discountPercent: 120 }).discountPercent).toBe(99);
  });

  it('scopes annual billing to selected plans', () => {
    const settings = normalizeAnnualBillingSettings({
      scope: 'selected',
      planKeys: ['core'],
    });
    expect(annualBillingAppliesToPlan('core', settings)).toBe(true);
    expect(annualBillingAppliesToPlan('basic', settings)).toBe(false);
    expect(
      annualBillingAppliesToPlan('basic', normalizeAnnualBillingSettings({ enabled: false })),
    ).toBe(false);
  });

  it('computes savings percent from free months or percent-off', () => {
    expect(
      getAnnualSavingsPercentFromSettings(
        normalizeAnnualBillingSettings({ discountType: 'months_free', freeMonths: 2 }),
      ),
    ).toBe(17);
    expect(
      getAnnualSavingsPercentFromSettings(
        normalizeAnnualBillingSettings({
          discountType: 'percent_off',
          discountPercent: 20,
        }),
      ),
    ).toBe(20);
  });
});
