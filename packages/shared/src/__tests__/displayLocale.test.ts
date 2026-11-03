import { describe, expect, it } from 'vitest';
import { formatUtcBillingPeriod, formatUtcCalendarDate } from '../displayLocale.js';

describe('formatUtcCalendarDate', () => {
  it('keeps the UTC calendar day (does not shift to the previous local day)', () => {
    expect(formatUtcCalendarDate('2026-11-01T00:00:00.000Z')).toBe('Nov 1, 2026');
    expect(formatUtcCalendarDate('2026-12-01T00:00:00.000Z')).toBe('Dec 1, 2026');
  });
});

describe('formatUtcBillingPeriod', () => {
  it('formats YYYY-MM as a UTC month label', () => {
    expect(formatUtcBillingPeriod('2026-10')).toBe('October 2026');
    expect(formatUtcBillingPeriod('2026-11')).toBe('November 2026');
  });

  it('strips stored suffixes such as virtual-room', () => {
    expect(formatUtcBillingPeriod('2026-10~virtual-room')).toBe('October 2026');
  });
});
