import { describe, expect, it } from 'vitest';
import { eachCalendarDate } from '../timezone.js';

describe('eachCalendarDate', () => {
  it('returns a single day when start and end match', () => {
    expect(eachCalendarDate('2026-10-16', '2026-10-16')).toEqual(['2026-10-16']);
  });

  it('includes both ends', () => {
    expect(eachCalendarDate('2026-10-16', '2026-10-18')).toEqual([
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('crosses a month boundary', () => {
    expect(eachCalendarDate('2026-10-31', '2026-11-01')).toEqual(['2026-10-31', '2026-11-01']);
  });

  it('rejects an inverted range', () => {
    expect(() => eachCalendarDate('2026-10-18', '2026-10-16')).toThrow(/End date/);
  });

  it('rejects ranges over the cap', () => {
    expect(() => eachCalendarDate('2026-01-01', '2026-06-01', 10)).toThrow(/cannot exceed 10/);
  });
});
