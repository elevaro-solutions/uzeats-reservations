import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDayRange,
  clampDateIsoToToday,
  formatDateTimeInTimeZone,
  formatHm12,
  formatBookingHours,
  formatOpeningHoursLines,
  formatTimeInTimeZone,
  hmInTimeZone,
  isPastCalendarDay,
  isoDateInTimeZone,
  restaurantTimeZone,
  timezoneFromAddress,
  todayIsoInTimeZone,
  weekdayInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';

describe('timezoneFromAddress', () => {
  it('maps US states to IANA zones', () => {
    expect(timezoneFromAddress({ state: 'NY', zip: '10013' })).toBe('America/New_York');
    expect(timezoneFromAddress({ state: 'CA', zip: '90001' })).toBe('America/Los_Angeles');
    expect(timezoneFromAddress({ state: 'IL', zip: '60601' })).toBe('America/Chicago');
    expect(timezoneFromAddress({ state: 'AZ', zip: '85001' })).toBe('America/Phoenix');
  });

  it('uses ZIP overrides for split states', () => {
    expect(timezoneFromAddress({ state: 'FL', zip: '32501' })).toBe('America/Chicago');
    expect(timezoneFromAddress({ state: 'FL', zip: '33101' })).toBe('America/New_York');
    expect(timezoneFromAddress({ state: 'TX', zip: '79901' })).toBe('America/Denver');
  });

  it('falls back to longitude when address is missing', () => {
    expect(timezoneFromAddress({ lng: -74.0 })).toBe('America/New_York');
    expect(timezoneFromAddress({ lng: -87.6 })).toBe('America/Chicago');
    expect(timezoneFromAddress({ lng: -118.24 })).toBe('America/Los_Angeles');
  });
});

describe('restaurantTimeZone', () => {
  it('reads GeoJSON coordinates when address is absent', () => {
    expect(restaurantTimeZone({ location: { coordinates: [-118.24, 34.05] } })).toBe(
      'America/Los_Angeles',
    );
  });

  it('reads GraphQL lng/lat when address is absent', () => {
    expect(restaurantTimeZone({ location: { lng: -74.0, lat: 40.73 } })).toBe('America/New_York');
  });

  it('prefers US address over coordinates', () => {
    expect(
      restaurantTimeZone({
        address: { state: 'CA', zip: '90001' },
        location: { coordinates: [-74.0, 40.73] },
      }),
    ).toBe('America/Los_Angeles');
  });
});

describe('zoned wall clock', () => {
  it('treats 5:00 PM Eastern as 21:00 UTC during EDT', () => {
    const utc = zonedWallClockToUtc('2026-09-16', '17:00', 'America/New_York');
    expect(utc.toISOString()).toBe('2026-09-16T21:00:00.000Z');
    expect(hmInTimeZone(utc, 'America/New_York')).toBe('17:00');
    expect(formatHm12('17:00')).toBe('5:00 PM');
  });

  it('formats opening hours in 12-hour local time without a timezone suffix', () => {
    const lines = formatOpeningHoursLines(
      [{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:00', endTime: '22:00', active: true }],
      'America/New_York',
      new Date('2026-09-16T16:00:00.000Z'),
    );
    expect(lines[0]).toBe('Mon–Fri 11:00 AM–10:00 PM');
  });

  it('formats reservation windows in 12-hour local time without a timezone suffix', () => {
    const label = formatBookingHours(
      [{ daysOfWeek: [1, 2, 3, 4, 5, 6, 0], startTime: '17:00', endTime: '22:00', active: true }],
      'America/New_York',
      new Date('2026-09-16T16:00:00.000Z'),
    );
    expect(label).toBe('5:00 PM–10:00 PM');
  });

  it('resolves weekday in the restaurant zone, not the host zone', () => {
    const wednesdayUtc = new Date('2026-09-16T04:00:00.000Z');
    expect(isoDateInTimeZone(wednesdayUtc, 'America/Los_Angeles')).toBe('2026-09-15');
    expect(weekdayInTimeZone(wednesdayUtc, 'America/Los_Angeles')).toBe(2);
  });
});

describe('formatTimeInTimeZone', () => {
  it('returns empty string for null, undefined, or invalid input', () => {
    expect(formatTimeInTimeZone(null, 'America/New_York')).toBe('');
    expect(formatTimeInTimeZone(undefined, 'America/New_York')).toBe('');
    expect(formatTimeInTimeZone('', 'America/New_York')).toBe('');
    expect(formatTimeInTimeZone('not-a-date', 'America/New_York')).toBe('');
  });
});

describe('formatDateTimeInTimeZone', () => {
  it('formats the same UTC instant in restaurant-local time, not the host zone', () => {
    const utc = new Date('2026-09-16T21:00:00.000Z');
    expect(formatDateTimeInTimeZone(utc, 'America/New_York')).toMatch(/Sep 16, 2026, 5:00 PM/);
    expect(formatDateTimeInTimeZone(utc, 'America/Los_Angeles')).toMatch(/Sep 16, 2026, 2:00 PM/);
    expect(formatDateTimeInTimeZone(null, 'America/New_York')).toBe('');
  });
});

describe('calendar day helpers', () => {
  // Sep 25 2026 20:00 CDT = Sep 26 01:00 UTC = Sep 26 06:00 Asia/Tashkent
  const eveningCentral = new Date('2026-09-26T01:00:00.000Z');

  it('todayIsoInTimeZone differs between Chicago and Tashkent for the same instant', () => {
    expect(todayIsoInTimeZone('America/Chicago', eveningCentral)).toBe('2026-09-25');
    expect(todayIsoInTimeZone('Asia/Tashkent', eveningCentral)).toBe('2026-09-26');
  });

  it('isPastCalendarDay uses restaurant today, not browser today', () => {
    expect(isPastCalendarDay('2026-09-25', 'America/Chicago', eveningCentral)).toBe(false);
    expect(isPastCalendarDay('2026-09-24', 'America/Chicago', eveningCentral)).toBe(true);
    expect(isPastCalendarDay('2026-09-25', 'Asia/Tashkent', eveningCentral)).toBe(true);
  });

  it('clampDateIsoToToday lifts past days to restaurant today', () => {
    expect(clampDateIsoToToday('2026-09-24', 'America/Chicago', eveningCentral)).toBe(
      '2026-09-25',
    );
    expect(clampDateIsoToToday('2026-09-26', 'America/Chicago', eveningCentral)).toBe(
      '2026-09-26',
    );
  });

  it('addCalendarDays crosses month boundaries', () => {
    expect(addCalendarDays('2026-09-18', 1)).toBe('2026-09-19');
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('calendarDayRange is exclusive end in restaurant zone', () => {
    const range = calendarDayRange('2026-09-25', 'America/Chicago');
    expect(range.$gte.toISOString()).toBe('2026-09-25T05:00:00.000Z'); // CDT UTC-5
    expect(range.$lt.toISOString()).toBe('2026-09-26T05:00:00.000Z');
  });
});
