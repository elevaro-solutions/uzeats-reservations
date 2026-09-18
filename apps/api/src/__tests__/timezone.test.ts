import { describe, expect, it } from 'vitest';
import {
  formatDateTimeInTimeZone,
  formatHm12,
  formatOpeningHoursLines,
  formatTimeInTimeZone,
  hmInTimeZone,
  isoDateInTimeZone,
  restaurantTimeZone,
  timezoneFromAddress,
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

  it('formats opening hours in 12-hour local time with TZ', () => {
    const lines = formatOpeningHoursLines(
      [{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:00', endTime: '22:00', active: true }],
      'America/New_York',
      new Date('2026-09-16T16:00:00.000Z'),
    );
    expect(lines[0]).toMatch(/Mon–Fri 11:00 AM–10:00 PM ED?T/);
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
