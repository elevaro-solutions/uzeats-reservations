import {
  isoDateInTimeZone,
  weekdayInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';

export const RESERVATION_DATE_PERIODS = [
  'today',
  'yesterday',
  'tomorrow',
  'this_week',
  'last_week',
  'this_month',
  'upcoming',
  'past',
  'all',
] as const;

/** Calendar periods for cross-restaurant admin lists (no single venue zone). */
export const PLATFORM_RESERVATION_LIST_TIMEZONE = 'America/New_York';

export type ReservationDatePeriod = (typeof RESERVATION_DATE_PERIODS)[number];

export type SlotStartRange = { $gte?: Date; $lt?: Date };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isReservationDatePeriod(value: unknown): value is ReservationDatePeriod {
  return (
    typeof value === 'string' &&
    (RESERVATION_DATE_PERIODS as readonly string[]).includes(value)
  );
}

export function addCalendarDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

/** Inclusive calendar day in the restaurant zone → exclusive UTC range. */
export function calendarDayRange(dateIso: string, timeZone: string): SlotStartRange {
  const next = addCalendarDays(dateIso, 1);
  return {
    $gte: zonedWallClockToUtc(dateIso, '00:00', timeZone),
    $lt: zonedWallClockToUtc(next, '00:00', timeZone),
  };
}

/**
 * Inclusive calendar date range in the restaurant zone → exclusive UTC range.
 * Both ends are YYYY-MM-DD; end day is included.
 */
export function calendarDateRange(
  startIso: string,
  endIso: string,
  timeZone: string,
): SlotStartRange {
  if (startIso > endIso) {
    throw new Error('startDate must be on or before endDate');
  }
  const next = addCalendarDays(endIso, 1);
  return {
    $gte: zonedWallClockToUtc(startIso, '00:00', timeZone),
    $lt: zonedWallClockToUtc(next, '00:00', timeZone),
  };
}

/** Resolve slotStart filter from period, single date, or inclusive start/end dates. */
export function resolveReservationSlotStartFilter(
  args: {
    period?: string | null;
    date?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  },
  timeZone: string,
  now: Date = new Date(),
): SlotStartRange | undefined {
  const period = isReservationDatePeriod(args.period) ? args.period : undefined;
  if (period && period !== 'all') {
    return reservationPeriodSlotRange(period, timeZone, now);
  }

  const startDate = parseIsoDate(args.startDate ?? undefined);
  const endDate = parseIsoDate(args.endDate ?? undefined);
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      throw new Error('Both startDate and endDate are required for a custom range');
    }
    return calendarDateRange(startDate, endDate, timeZone);
  }

  const date = parseIsoDate(args.date ?? undefined);
  if (date) return calendarDayRange(date, timeZone);
  return undefined;
}

/** Sunday-start week containing `dateIso` (US restaurant week). */
export function weekStartSunday(dateIso: string, timeZone: string): string {
  const noon = zonedWallClockToUtc(dateIso, '12:00', timeZone);
  const dow = weekdayInTimeZone(noon, timeZone);
  return addCalendarDays(dateIso, -dow);
}

function monthStart(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function nextMonthStart(dateIso: string): string {
  const [year, month] = dateIso.split('-').map(Number);
  if ((month ?? 1) === 12) return `${(year ?? 1970) + 1}-01-01`;
  return `${year}-${String((month ?? 1) + 1).padStart(2, '0')}-01`;
}

export function reservationPeriodSlotRange(
  period: ReservationDatePeriod,
  timeZone: string,
  now: Date = new Date(),
): SlotStartRange | undefined {
  if (period === 'all') return undefined;
  if (period === 'upcoming') return { $gte: now };
  if (period === 'past') return { $lt: now };

  const today = isoDateInTimeZone(now, timeZone);

  if (period === 'today') return calendarDayRange(today, timeZone);
  if (period === 'yesterday') return calendarDayRange(addCalendarDays(today, -1), timeZone);
  if (period === 'tomorrow') return calendarDayRange(addCalendarDays(today, 1), timeZone);

  if (period === 'this_week') {
    const start = weekStartSunday(today, timeZone);
    return {
      $gte: zonedWallClockToUtc(start, '00:00', timeZone),
      $lt: zonedWallClockToUtc(addCalendarDays(start, 7), '00:00', timeZone),
    };
  }

  if (period === 'last_week') {
    const thisStart = weekStartSunday(today, timeZone);
    const start = addCalendarDays(thisStart, -7);
    return {
      $gte: zonedWallClockToUtc(start, '00:00', timeZone),
      $lt: zonedWallClockToUtc(thisStart, '00:00', timeZone),
    };
  }

  if (period === 'this_month') {
    const start = monthStart(today);
    return {
      $gte: zonedWallClockToUtc(start, '00:00', timeZone),
      $lt: zonedWallClockToUtc(nextMonthStart(today), '00:00', timeZone),
    };
  }

  return undefined;
}

export function parseIsoDate(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  return value;
}
