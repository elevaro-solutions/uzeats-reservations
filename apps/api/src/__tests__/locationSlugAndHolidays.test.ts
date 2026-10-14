import {
  buildLocationRestaurantSlugBase,
  DEFAULT_PLATFORM_HOLIDAYS,
  holidayAppliesToRestaurant,
  resolveHolidayDate,
  resolveNoShowMarkingMode,
} from '@reservations/shared';

describe('buildLocationRestaurantSlugBase', () => {
  it('includes neighborhood or city and state', () => {
    expect(
      buildLocationRestaurantSlugBase('Sushi Place', {
        neighborhood: 'Mission',
        city: 'San Francisco',
        state: 'CA',
      }),
    ).toBe('sushi-place-mission-ca');
  });

  it('falls back to name when address is missing', () => {
    expect(buildLocationRestaurantSlugBase('Bistro Uno')).toBe('bistro-uno');
  });
});

describe('resolveNoShowMarkingMode', () => {
  it('prefers table then area then restaurant then platform', () => {
    expect(resolveNoShowMarkingMode([null, null, null, 'auto'])).toBe('auto');
    expect(resolveNoShowMarkingMode(['manual_only', 'auto', 'auto', 'auto'])).toBe('manual_only');
    expect(resolveNoShowMarkingMode([null, 'auto', 'manual_only'])).toBe('auto');
  });
});

describe('holidays', () => {
  it('resolves Thanksgiving as 4th Thursday of November', () => {
    const thanksgiving = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'thanksgiving')!;
    expect(resolveHolidayDate(thanksgiving, 2026)).toBe('2026-11-26');
  });

  it('respects restaurant opt-out / opt-in', () => {
    const christmas = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'christmas_day')!;
    expect(
      holidayAppliesToRestaurant({
        holiday: christmas,
        applyPlatformHolidays: true,
        holidayOptOutKeys: ['christmas_day'],
      }),
    ).toBe(false);
    const juneteenth = DEFAULT_PLATFORM_HOLIDAYS.find((h) => h.key === 'juneteenth')!;
    expect(
      holidayAppliesToRestaurant({
        holiday: juneteenth,
        applyPlatformHolidays: true,
        holidayOptInKeys: ['juneteenth'],
      }),
    ).toBe(true);
  });

  it('majors are defaultEnabled so they enter the approval queue', () => {
    const majors = DEFAULT_PLATFORM_HOLIDAYS.filter((h) => h.defaultEnabled);
    expect(majors.map((h) => h.key)).toEqual(
      expect.arrayContaining([
        'new_years_day',
        'memorial_day',
        'independence_day',
        'labor_day',
        'thanksgiving',
        'christmas_day',
      ]),
    );
  });
});
