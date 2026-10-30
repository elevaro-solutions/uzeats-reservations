import { describe, expect, it } from 'vitest';
import {
  addPlanDuration,
  durationToLegacyMonths,
  formatPlanDuration,
  formatPlanPriceSuffix,
  isStandardMonthlyDuration,
  normalizePlanDuration,
  resolveInvoiceDuration,
  toStripeRecurring,
} from '../planDuration.js';

describe('normalizePlanDuration', () => {
  it('defaults to 1 month', () => {
    expect(normalizePlanDuration()).toEqual({ durationUnit: 'month', durationCount: 1 });
    expect(normalizePlanDuration({})).toEqual({ durationUnit: 'month', durationCount: 1 });
  });

  it('clamps count by unit', () => {
    expect(normalizePlanDuration({ durationUnit: 'day', durationCount: 0 })).toEqual({
      durationUnit: 'day',
      durationCount: 1,
    });
    expect(normalizePlanDuration({ durationUnit: 'day', durationCount: 400 })).toEqual({
      durationUnit: 'day',
      durationCount: 365,
    });
    expect(normalizePlanDuration({ durationUnit: 'week', durationCount: 80 })).toEqual({
      durationUnit: 'week',
      durationCount: 52,
    });
    expect(normalizePlanDuration({ durationUnit: 'month', durationCount: 40 })).toEqual({
      durationUnit: 'month',
      durationCount: 36,
    });
    expect(normalizePlanDuration({ durationUnit: 'year', durationCount: 9 })).toEqual({
      durationUnit: 'year',
      durationCount: 5,
    });
  });
});

describe('formatPlanDuration', () => {
  it('pluralizes labels', () => {
    expect(formatPlanDuration('day', 1)).toBe('1 day');
    expect(formatPlanDuration('day', 14)).toBe('14 days');
    expect(formatPlanDuration('week', 1)).toBe('1 week');
    expect(formatPlanDuration('week', 2)).toBe('2 weeks');
    expect(formatPlanDuration('month', 1)).toBe('1 month');
    expect(formatPlanDuration('month', 3)).toBe('3 months');
    expect(formatPlanDuration('year', 1)).toBe('1 year');
    expect(formatPlanDuration('year', 2)).toBe('2 years');
  });

  it('uses a compact price suffix', () => {
    expect(formatPlanPriceSuffix('month', 1)).toBe(' / month');
    expect(formatPlanPriceSuffix('month', 3)).toBe(' / 3 months');
    expect(formatPlanPriceSuffix('day', 1)).toBe(' / day');
    expect(formatPlanPriceSuffix('day', 14)).toBe(' / 14 days');
    expect(formatPlanPriceSuffix('week', 1)).toBe(' / week');
    expect(formatPlanPriceSuffix('week', 2)).toBe(' / 2 weeks');
    expect(formatPlanPriceSuffix('year', 1)).toBe(' / year');
  });
});

describe('addPlanDuration', () => {
  it('adds calendar months, days, weeks, and years', () => {
    const monthStart = new Date('2026-02-01T00:00:00.000Z');
    const monthExpected = new Date(monthStart.getTime());
    monthExpected.setMonth(monthExpected.getMonth() + 3);
    expect(addPlanDuration(monthStart, 'month', 3).toISOString()).toBe(monthExpected.toISOString());
    expect(addPlanDuration(new Date('2026-08-15T12:00:00.000Z'), 'day', 14).toISOString()).toBe(
      '2026-08-29T12:00:00.000Z',
    );
    expect(addPlanDuration(new Date('2026-08-15T12:00:00.000Z'), 'week', 2).toISOString()).toBe(
      '2026-08-29T12:00:00.000Z',
    );
    const yearStart = new Date('2026-02-01T00:00:00.000Z');
    const yearExpected = new Date(yearStart.getTime());
    yearExpected.setFullYear(yearExpected.getFullYear() + 1);
    expect(addPlanDuration(yearStart, 'year', 1).toISOString()).toBe(yearExpected.toISOString());
  });
});

describe('toStripeRecurring', () => {
  it('clamps to Stripe’s 1-year interval maximum', () => {
    expect(toStripeRecurring('day', 14)).toEqual({ interval: 'day', interval_count: 14 });
    expect(toStripeRecurring('week', 2)).toEqual({ interval: 'week', interval_count: 2 });
    expect(toStripeRecurring('week', 80)).toEqual({ interval: 'week', interval_count: 52 });
    expect(toStripeRecurring('month', 3)).toEqual({ interval: 'month', interval_count: 3 });
    expect(toStripeRecurring('month', 24)).toEqual({ interval: 'month', interval_count: 12 });
    expect(toStripeRecurring('year', 2)).toEqual({ interval: 'year', interval_count: 1 });
  });
});

describe('invoice duration helpers', () => {
  it('maps month/year to legacy months and leaves days/weeks unmapped', () => {
    expect(durationToLegacyMonths('month', 3)).toBe(3);
    expect(durationToLegacyMonths('year', 2)).toBe(24);
    expect(durationToLegacyMonths('day', 14)).toBeNull();
    expect(durationToLegacyMonths('week', 2)).toBeNull();
  });

  it('resolves invoice duration from new fields or legacy months', () => {
    expect(resolveInvoiceDuration({ packageDurationUnit: 'day', packageDurationCount: 14 })).toEqual({
      durationUnit: 'day',
      durationCount: 14,
    });
    expect(resolveInvoiceDuration({ packageDurationMonths: 6 })).toEqual({
      durationUnit: 'month',
      durationCount: 6,
    });
    expect(resolveInvoiceDuration({})).toBeNull();
  });

  it('treats only 1 month as the standard monthly cycle', () => {
    expect(isStandardMonthlyDuration('month', 1)).toBe(true);
    expect(isStandardMonthlyDuration('month', 3)).toBe(false);
    expect(isStandardMonthlyDuration('year', 1)).toBe(false);
  });
});
