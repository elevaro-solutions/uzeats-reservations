import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDateRange,
  calendarDayRange,
  reservationPeriodSlotRange,
  resolveReservationSlotStartFilter,
  weekStartSunday,
} from '../services/reservationListFilter.js';

const TZ = 'America/New_York';
/** Friday 18 Sep 2026, 4:00 PM EDT */
const NOW = new Date('2026-09-18T20:00:00.000Z');

describe('reservation list date filters', () => {
  it('shifts YYYY-MM-DD without timezone math', () => {
    expect(addCalendarDays('2026-09-18', -1)).toBe('2026-09-17');
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('uses restaurant-local midnight, not the API host clock', () => {
    const range = calendarDayRange('2026-09-18', TZ);
    expect(range.$gte?.toISOString()).toBe('2026-09-18T04:00:00.000Z');
    expect(range.$lt?.toISOString()).toBe('2026-09-19T04:00:00.000Z');
  });

  it('includes both ends of a custom date range', () => {
    const range = calendarDateRange('2026-09-01', '2026-09-03', TZ);
    expect(range.$gte?.toISOString()).toBe('2026-09-01T04:00:00.000Z');
    expect(range.$lt?.toISOString()).toBe('2026-09-04T04:00:00.000Z');
  });

  it('resolves startDate/endDate when period is absent', () => {
    const range = resolveReservationSlotStartFilter(
      { startDate: '2026-09-10', endDate: '2026-09-12' },
      TZ,
      NOW,
    );
    expect(range?.$gte?.toISOString()).toBe('2026-09-10T04:00:00.000Z');
    expect(range?.$lt?.toISOString()).toBe('2026-09-13T04:00:00.000Z');
  });

  it('starts US restaurant weeks on Sunday', () => {
    expect(weekStartSunday('2026-09-18', TZ)).toBe('2026-09-13');
  });

  it('maps today / yesterday / last week / upcoming around restaurant-local now', () => {
    const today = reservationPeriodSlotRange('today', TZ, NOW);
    expect(today?.$gte?.toISOString()).toBe('2026-09-18T04:00:00.000Z');
    expect(today?.$lt?.toISOString()).toBe('2026-09-19T04:00:00.000Z');

    const yesterday = reservationPeriodSlotRange('yesterday', TZ, NOW);
    expect(yesterday?.$gte?.toISOString()).toBe('2026-09-17T04:00:00.000Z');
    expect(yesterday?.$lt?.toISOString()).toBe('2026-09-18T04:00:00.000Z');

    const lastWeek = reservationPeriodSlotRange('last_week', TZ, NOW);
    expect(lastWeek?.$gte?.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(lastWeek?.$lt?.toISOString()).toBe('2026-09-13T04:00:00.000Z');

    const upcoming = reservationPeriodSlotRange('upcoming', TZ, NOW);
    expect(upcoming).toEqual({ $gte: NOW });

    expect(reservationPeriodSlotRange('all', TZ, NOW)).toBeUndefined();
  });
});
