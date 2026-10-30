import { describe, expect, it } from 'vitest';
import { computeExtendedBillingPeriod } from '../services/adminAssignPackage.js';

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
