import { DISPLAY_LOCALE } from './constants.js';

/** Resolve a US restaurant's IANA timezone from address (state + ZIP), with lng fallback. */

const STATE_TIMEZONES: Record<string, string> = {
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DC: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  IA: 'America/Chicago',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  MA: 'America/New_York',
  MD: 'America/New_York',
  ME: 'America/New_York',
  MI: 'America/Detroit',
  MN: 'America/Chicago',
  MO: 'America/Chicago',
  MS: 'America/Chicago',
  MT: 'America/Denver',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  NE: 'America/Chicago',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NV: 'America/Los_Angeles',
  NY: 'America/New_York',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  PR: 'America/Puerto_Rico',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VA: 'America/New_York',
  VI: 'America/St_Thomas',
  VT: 'America/New_York',
  WA: 'America/Los_Angeles',
  WI: 'America/Chicago',
  WV: 'America/New_York',
  WY: 'America/Denver',
};

/** 3-digit ZIP prefixes that sit in a different zone than the state default. */
const ZIP3_OVERRIDES: Record<string, string> = {
  // Florida panhandle — Central
  '324': 'America/Chicago',
  '325': 'America/Chicago',
  // Indiana northwest / southwest — Central
  '463': 'America/Chicago',
  '464': 'America/Chicago',
  '476': 'America/Chicago',
  '477': 'America/Chicago',
  // Kentucky west — Central
  '420': 'America/Chicago',
  '421': 'America/Chicago',
  '422': 'America/Chicago',
  '423': 'America/Chicago',
  '424': 'America/Chicago',
  '427': 'America/Chicago',
  // Tennessee east — Eastern
  '376': 'America/New_York',
  '377': 'America/New_York',
  '378': 'America/New_York',
  '379': 'America/New_York',
  // Texas west / El Paso — Mountain
  '797': 'America/Denver',
  '798': 'America/Denver',
  '799': 'America/Denver',
  // North Dakota west — Mountain
  '586': 'America/Denver',
  '587': 'America/Denver',
  '588': 'America/Denver',
  // South Dakota west — Mountain
  '576': 'America/Denver',
  '577': 'America/Denver',
  // Nebraska west — Mountain
  '690': 'America/Denver',
  '691': 'America/Denver',
  '692': 'America/Denver',
  '693': 'America/Denver',
  // Kansas west — Mountain
  '677': 'America/Denver',
  '678': 'America/Denver',
  '679': 'America/Denver',
  // Idaho north — Pacific
  '838': 'America/Los_Angeles',
  // Oregon east — Mountain
  '978': 'America/Boise',
  '979': 'America/Boise',
  // Michigan UP west — Central
  '498': 'America/Chicago',
  '499': 'America/Chicago',
};

const DEFAULT_TIMEZONE = 'America/New_York';

/** Cross-restaurant / discovery calendar day when no single venue zone applies. */
export const PLATFORM_TIMEZONE = DEFAULT_TIMEZONE;

export type AddressTimeZoneInput = {
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  lng?: number | null;
};

export function timezoneFromAddress(address: AddressTimeZoneInput): string {
  const country = (address.country ?? 'US').trim().toUpperCase();
  if (country && country !== 'US' && country !== 'USA' && country !== 'UNITED STATES') {
    return timezoneFromLongitude(address.lng) ?? DEFAULT_TIMEZONE;
  }

  const zip3 = (address.zip ?? '').replace(/\D/g, '').slice(0, 3);
  if (zip3 && ZIP3_OVERRIDES[zip3]) return ZIP3_OVERRIDES[zip3]!;

  const state = (address.state ?? '').trim().toUpperCase();
  if (state && STATE_TIMEZONES[state]) return STATE_TIMEZONES[state]!;

  return timezoneFromLongitude(address.lng) ?? DEFAULT_TIMEZONE;
}

export type RestaurantTimeZoneInput = {
  address?: {
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  } | null;
  location?: {
    coordinates?: number[] | null;
    lng?: number | null;
    lat?: number | null;
  } | null;
};

/** IANA zone from restaurant address, falling back to GeoJSON / GraphQL coordinates. */
export function restaurantTimeZone(restaurant: RestaurantTimeZoneInput): string {
  const lng = restaurant.location?.lng ?? restaurant.location?.coordinates?.[0] ?? null;
  return timezoneFromAddress({
    state: restaurant.address?.state,
    zip: restaurant.address?.zip,
    country: restaurant.address?.country,
    lng,
  });
}

function timezoneFromLongitude(lng?: number | null): string | null {
  if (lng == null || !Number.isFinite(lng)) return null;
  if (lng > -75) return 'America/New_York';
  if (lng > -90) return 'America/Chicago';
  if (lng > -105) return 'America/Denver';
  if (lng > -125) return 'America/Los_Angeles';
  if (lng > -150) return 'America/Anchorage';
  return 'Pacific/Honolulu';
}

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
  };
}

/** Convert restaurant-local wall clock (YYYY-MM-DD + HH:mm) to a UTC Date. */
export function zonedWallClockToUtc(dateIso: string, hm: string, timeZone: string): Date {
  const [year = 1970, month = 1, day = 1] = dateIso.split('-').map(Number);
  const [hour = 0, minute = 0] = hm.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = desired;
  for (let i = 0; i < 4; i += 1) {
    const p = tzParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = desired - asUtc;
    if (diff === 0) return new Date(utc);
    utc += diff;
  }
  return new Date(utc);
}

export function isoDateInTimeZone(date: Date, timeZone: string): string {
  const p = tzParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Today's calendar date (YYYY-MM-DD) in an IANA zone. */
export function todayIsoInTimeZone(timeZone: string, now: Date = new Date()): string {
  return isoDateInTimeZone(now, timeZone);
}

/** Add/subtract whole calendar days on a YYYY-MM-DD string (zone-agnostic arithmetic). */
export function addCalendarDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

/** True when `dateIso` is strictly before today's calendar day in `timeZone`. */
export function isPastCalendarDay(
  dateIso: string,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return dateIso < todayIsoInTimeZone(timeZone, now);
}

/** Clamp a YYYY-MM-DD to today when it falls in the past in `timeZone`. */
export function clampDateIsoToToday(
  dateIso: string,
  timeZone: string,
  now: Date = new Date(),
): string {
  const today = todayIsoInTimeZone(timeZone, now);
  return dateIso < today ? today : dateIso;
}

export type CalendarDayRange = { $gte: Date; $lt: Date };

/** Inclusive calendar day in a zone → exclusive UTC range. */
export function calendarDayRange(dateIso: string, timeZone: string): CalendarDayRange {
  const next = addCalendarDays(dateIso, 1);
  return {
    $gte: zonedWallClockToUtc(dateIso, '00:00', timeZone),
    $lt: zonedWallClockToUtc(next, '00:00', timeZone),
  };
}

/**
 * Inclusive calendar date range in a zone → exclusive UTC range.
 * Both ends are YYYY-MM-DD; end day is included.
 */
export function calendarDateRange(
  startIso: string,
  endIso: string,
  timeZone: string,
): CalendarDayRange {
  if (startIso > endIso) {
    throw new Error('startDate must be on or before endDate');
  }
  const next = addCalendarDays(endIso, 1);
  return {
    $gte: zonedWallClockToUtc(startIso, '00:00', timeZone),
    $lt: zonedWallClockToUtc(next, '00:00', timeZone),
  };
}

export function weekdayInTimeZone(date: Date, timeZone: string): number {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[tzParts(date, timeZone).weekday] ?? date.getUTCDay();
}

export function hmInTimeZone(date: Date, timeZone: string): string {
  const p = tzParts(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function timeZoneAbbr(timeZone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(at);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}

export function timeZoneLabel(timeZone: string, at: Date = new Date()): string {
  return timeZoneAbbr(timeZone, at);
}

/** `17:00` → `5:00 PM` (already restaurant-local wall clock). */
export function formatHm12(hm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return hm;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return hm;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatHmRange12(startTime: string, endTime: string): string {
  return `${formatHm12(startTime)}–${formatHm12(endTime)}`;
}

function toValidDate(iso: string | Date | null | undefined): Date | null {
  if (iso == null || iso === '') return null;
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return date;
}

export function formatTimeInTimeZone(
  iso: string | Date | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
): string {
  const date = toValidDate(iso);
  if (!date) return '';
  return date.toLocaleTimeString(DISPLAY_LOCALE, { timeZone, ...options });
}

/** US date + 12-hour time in a restaurant IANA zone, e.g. `Sep 16, 2026, 5:00 PM EDT`. */
export function formatDateTimeInTimeZone(
  iso: string | Date | null | undefined,
  timeZone: string,
): string {
  const date = toValidDate(iso);
  if (!date) return '';
  return date.toLocaleString(DISPLAY_LOCALE, {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function minutesInTimeZone(iso: string | Date | null | undefined, timeZone: string): number {
  const date = toValidDate(iso);
  if (!date) return 0;
  const p = tzParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

export type ShiftHoursInput = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active?: boolean;
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatDayRange(days: number[]): string {
  if (days.length === 1) return DAY_SHORT[days[0]!]!;
  let contiguous = true;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] !== days[i - 1]! + 1) {
      contiguous = false;
      break;
    }
  }
  if (contiguous) {
    return `${DAY_SHORT[days[0]!]!}–${DAY_SHORT[days[days.length - 1]!]!}`;
  }
  return days.map((d) => DAY_SHORT[d]!).join(', ');
}

/** Human-readable lines like "Mon–Fri 11:00 AM–10:00 PM". */
export function formatOpeningHoursLines(
  shifts: ShiftHoursInput[],
  timeZone?: string,
  at: Date = new Date(),
): string[] {
  const active = shifts.filter((s) => s.active !== false);
  if (!active.length) return [];

  const lines: string[] = [];
  for (const shift of active) {
    const days = [...new Set(shift.daysOfWeek)]
      .filter((d) => d >= 0 && d <= 6)
      .sort((a, b) => a - b);
    if (!days.length) continue;
    lines.push(`${formatDayRange(days)} ${formatHm12(shift.startTime)}–${formatHm12(shift.endTime)}`);
  }
  return lines;
}

/** Today's earliest open → latest close in restaurant local time. */
export function formatShortHours(
  shifts: ShiftHoursInput[],
  timeZone?: string,
  at: Date = new Date(),
): string | null {
  const active = shifts.filter((s) => s.active !== false);
  if (!active.length) return null;
  const today = timeZone ? weekdayInTimeZone(at, timeZone) : at.getDay();
  const todayShifts = active.filter((s) => s.daysOfWeek.includes(today));
  const pool = todayShifts.length > 0 ? todayShifts : active;
  const starts = pool.map((s) => s.startTime).sort();
  const ends = pool.map((s) => s.endTime).sort();
  const start = starts[0];
  const end = ends[ends.length - 1];
  if (!start || !end) return null;
  return formatHmRange12(start, end);
}

export type HoursStatus = {
  open: boolean;
  label: string;
};

export function hoursStatus(
  shifts: ShiftHoursInput[],
  timeZone: string,
  at: Date = new Date(),
): HoursStatus | null {
  const active = shifts.filter((s) => s.active !== false);
  if (!active.length) return null;
  const dow = weekdayInTimeZone(at, timeZone);
  const hm = hmInTimeZone(at, timeZone);
  const tz = timeZoneLabel(timeZone, at);
  const today = active
    .filter((s) => s.daysOfWeek.includes(dow))
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!today.length) {
    return { open: false, label: `Closed today · ${tz}` };
  }

  const openShift = today.find((s) => s.startTime <= hm && hm < s.endTime);
  if (openShift) {
    return { open: true, label: `Open until ${formatHm12(openShift.endTime)} ${tz}` };
  }

  const upcoming = today.find((s) => s.startTime > hm);
  if (upcoming) {
    return { open: false, label: `Opens at ${formatHm12(upcoming.startTime)} ${tz}` };
  }

  return { open: false, label: `Closed · ${tz}` };
}

/** Bookable window for a calendar date (or today) from shifts. */
export function formatBookingHours(
  shifts: ShiftHoursInput[],
  timeZone?: string,
  at: Date = new Date(),
): string | null {
  const active = shifts.filter((s) => s.active !== false);
  if (!active.length) return null;
  const today = timeZone ? weekdayInTimeZone(at, timeZone) : at.getDay();
  const todayShifts = active
    .filter((s) => s.daysOfWeek.includes(today))
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const pool = todayShifts.length > 0 ? todayShifts : active;
  const windows = pool.map((s) => `${formatHm12(s.startTime)}–${formatHm12(s.endTime)}`);
  const unique = [...new Set(windows)];
  return unique.join(', ');
}
