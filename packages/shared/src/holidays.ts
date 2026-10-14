/**
 * Platform holiday catalog defaults (US-centric majors).
 * `dateRule` is MM-DD for recurring fixed-date holidays.
 * Floating holidays use `computeDate` year → YYYY-MM-DD.
 */

export type PlatformHolidayDef = {
  key: string;
  name: string;
  /** Fixed calendar day as MM-DD when recurring. */
  dateRule?: string;
  recurring: boolean;
  /**
   * When true, this is a major holiday restaurants inherit for review.
   * Default product behavior: stay open until an owner approves closing
   * (`requireHolidayApproval`, default true). Auto-close only when a restaurant
   * turns approval off.
   */
  defaultEnabled: boolean;
  /** Optional year-specific compute for floating holidays (e.g. Thanksgiving). */
  floating?: 'thanksgiving_us' | 'memorial_day_us' | 'labor_day_us' | 'mlk_day_us';
};

export const DEFAULT_PLATFORM_HOLIDAYS: PlatformHolidayDef[] = [
  { key: 'new_years_day', name: "New Year's Day", dateRule: '01-01', recurring: true, defaultEnabled: true },
  {
    key: 'mlk_day',
    name: 'Martin Luther King Jr. Day',
    recurring: true,
    defaultEnabled: false,
    floating: 'mlk_day_us',
  },
  {
    key: 'memorial_day',
    name: 'Memorial Day',
    recurring: true,
    defaultEnabled: true,
    floating: 'memorial_day_us',
  },
  { key: 'juneteenth', name: 'Juneteenth', dateRule: '06-19', recurring: true, defaultEnabled: false },
  { key: 'independence_day', name: 'Independence Day', dateRule: '07-04', recurring: true, defaultEnabled: true },
  {
    key: 'labor_day',
    name: 'Labor Day',
    recurring: true,
    defaultEnabled: true,
    floating: 'labor_day_us',
  },
  {
    key: 'thanksgiving',
    name: 'Thanksgiving',
    recurring: true,
    defaultEnabled: true,
    floating: 'thanksgiving_us',
  },
  { key: 'christmas_eve', name: 'Christmas Eve', dateRule: '12-24', recurring: true, defaultEnabled: false },
  { key: 'christmas_day', name: 'Christmas Day', dateRule: '12-25', recurring: true, defaultEnabled: true },
  { key: 'new_years_eve', name: "New Year's Eve", dateRule: '12-31', recurring: true, defaultEnabled: false },
];

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): string {
  // monthIndex 0-based; weekday 0=Sun … 6=Sat; n is 1-based occurrence
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    if (d.getUTCMonth() !== monthIndex) break;
    if (d.getUTCDay() === weekday) {
      count += 1;
      if (count === n) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  throw new Error(`Could not resolve nth weekday for ${year}-${monthIndex}-${weekday}-${n}`);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): string {
  for (let day = 31; day >= 1; day--) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    if (d.getUTCMonth() !== monthIndex) continue;
    if (d.getUTCDay() === weekday) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  throw new Error(`Could not resolve last weekday for ${year}-${monthIndex}-${weekday}`);
}

export function resolveHolidayDate(holiday: PlatformHolidayDef, year: number): string | null {
  if (holiday.floating === 'thanksgiving_us') {
    return nthWeekdayOfMonth(year, 10, 4, 4); // 4th Thursday of November
  }
  if (holiday.floating === 'memorial_day_us') {
    return lastWeekdayOfMonth(year, 4, 1); // last Monday of May
  }
  if (holiday.floating === 'labor_day_us') {
    return nthWeekdayOfMonth(year, 8, 1, 1); // 1st Monday of September
  }
  if (holiday.floating === 'mlk_day_us') {
    return nthWeekdayOfMonth(year, 0, 1, 3); // 3rd Monday of January
  }
  if (holiday.dateRule && /^\d{2}-\d{2}$/.test(holiday.dateRule)) {
    return `${year}-${holiday.dateRule}`;
  }
  if (holiday.dateRule && /^\d{4}-\d{2}-\d{2}$/.test(holiday.dateRule)) {
    return holiday.dateRule;
  }
  return null;
}

export function holidayAppliesToRestaurant(params: {
  holiday: Pick<PlatformHolidayDef, 'key' | 'defaultEnabled'>;
  applyPlatformHolidays?: boolean | null;
  holidayOptOutKeys?: string[] | null;
  holidayOptInKeys?: string[] | null;
}): boolean {
  const apply = params.applyPlatformHolidays !== false;
  if (!apply) return false;
  const key = params.holiday.key;
  if ((params.holidayOptOutKeys ?? []).includes(key)) return false;
  if ((params.holidayOptInKeys ?? []).includes(key)) return true;
  return Boolean(params.holiday.defaultEnabled);
}

/** Select options for partner/admin UIs: "Christmas Day (christmas_day)". */
export function platformHolidaySelectOptions(
  holidays: Array<Pick<PlatformHolidayDef, 'key' | 'name' | 'defaultEnabled'>> = DEFAULT_PLATFORM_HOLIDAYS,
): Array<{ value: string; label: string; defaultEnabled: boolean }> {
  return holidays.map((h) => ({
    value: h.key,
    label: `${h.name} (${h.key})`,
    defaultEnabled: Boolean(h.defaultEnabled),
  }));
}
