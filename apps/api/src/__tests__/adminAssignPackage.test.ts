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
    expect(result.currentPeriodEnd.toISOString()).toBe('2026-10-02T00:00:00.000Z');
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
    expect(result.currentPeriodEnd.getTime() - now.getTime()).toBe(
      currentPeriodEnd.getTime() - currentPeriodStart.getTime(),
    );
  });

  it('defaults to ~30 days when no period exists', () => {
    const now = new Date('2026-08-26T00:00:00.000Z');
    const result = computeExtendedBillingPeriod({ now });
    expect(result.currentPeriodStart.toISOString()).toBe(now.toISOString());
    expect(result.currentPeriodEnd.getTime() - now.getTime()).toBe(30 * 86_400_000);
  });
});
