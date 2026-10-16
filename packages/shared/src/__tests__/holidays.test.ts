import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLATFORM_HOLIDAYS,
  holidayAppliesToRestaurant,
  platformHolidaySelectOptions,
  resolveHolidayDate,
} from '../holidays.js';

describe('holidays', () => {
  it('resolves fixed-date holidays', () => {
    const christmas = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'christmas_day')!;
    expect(resolveHolidayDate(christmas, 2026)).toBe('2026-12-25');
  });

  it('resolves US floating holidays for 2026', () => {
    const thanksgiving = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'thanksgiving')!;
    const memorial = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'memorial_day')!;
    const labor = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'labor_day')!;
    const mlk = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'mlk_day')!;
    expect(resolveHolidayDate(thanksgiving, 2026)).toBe('2026-11-26');
    expect(resolveHolidayDate(memorial, 2026)).toBe('2026-05-25');
    expect(resolveHolidayDate(labor, 2026)).toBe('2026-09-07');
    expect(resolveHolidayDate(mlk, 2026)).toBe('2026-01-19');
  });

  it('applies platform majors by default and honors opt-out/in', () => {
    const christmas = { key: 'christmas_day', defaultEnabled: true };
    const mlk = { key: 'mlk_day', defaultEnabled: false };

    expect(holidayAppliesToRestaurant({ holiday: christmas })).toBe(true);
    expect(
      holidayAppliesToRestaurant({
        holiday: christmas,
        holidayOptOutKeys: ['christmas_day'],
      }),
    ).toBe(false);
    expect(holidayAppliesToRestaurant({ holiday: mlk })).toBe(false);
    expect(
      holidayAppliesToRestaurant({
        holiday: mlk,
        holidayOptInKeys: ['mlk_day'],
      }),
    ).toBe(true);
    expect(
      holidayAppliesToRestaurant({
        holiday: christmas,
        applyPlatformHolidays: false,
      }),
    ).toBe(false);
  });

  it('formats select options as Name (key)', () => {
    const options = platformHolidaySelectOptions([
      { key: 'christmas_day', name: 'Christmas Day', defaultEnabled: true },
    ]);
    expect(options).toEqual([
      {
        value: 'christmas_day',
        label: 'Christmas Day (christmas_day)',
        defaultEnabled: true,
      },
    ]);
  });
});
