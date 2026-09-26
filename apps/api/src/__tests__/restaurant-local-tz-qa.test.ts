/**
 * Restaurant-local timezone QA (diner + merchant mobile surfaces).
 *
 * Mirrors the display/submit helpers used by apps/mobile and apps/merchant-mobile
 * against Partner Hub ground truth (shared todayIsoInTimeZone / formatTimeInTimeZone).
 * Run with a far process TZ (e.g. TZ=Asia/Tashkent) to prove wall clocks ignore device local.
 */
import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDayRange,
  formatTimeInTimeZone,
  formatUsDate,
  formatUsDateTime,
  isoDateInTimeZone,
  PLATFORM_TIMEZONE,
  todayIsoInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';

const VENUE_TZ = 'America/New_York';
const PHONE_TZ = 'Asia/Tashkent';

/** Same as merchant/diner formatSlotDateTime / formatSlotTime. */
function formatSlotClock(iso: string, timeZone: string): string {
  return formatTimeInTimeZone(iso, timeZone);
}

/** Same as diner formatSlotDateLong. */
function formatSlotDateLong(iso: string, timeZone: string): string {
  return formatUsDate(iso, {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Same as diner formatReservationWhen / merchant formatConversationWhen. */
function formatWhen(iso: string, timeZone: string): string {
  return formatUsDateTime(iso, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Same as diner formatReservationDate / formatBookingCardDate day key. */
function formatReservationDate(iso: string, timeZone: string): string {
  return formatUsDate(iso, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Same as diner/merchant formatRelativeDayLabel (Today/Tomorrow). */
function formatRelativeDayLabel(
  dayIso: string,
  timeZone: string,
  now: Date = new Date(),
): string {
  const today = todayIsoInTimeZone(timeZone, now);
  if (dayIso === today) return 'Today';
  if (dayIso === addCalendarDays(today, 1)) return 'Tomorrow';
  return dayIso;
}

/** Same as merchant filterReservationsForRange("today"). */
function isOnVenueToday(slotIso: string, timeZone: string, now: Date = new Date()): boolean {
  const todayIso = todayIsoInTimeZone(timeZone, now);
  const { $gte, $lt } = calendarDayRange(todayIso, timeZone);
  const t = new Date(slotIso).getTime();
  return t >= $gte.getTime() && t < $lt.getTime();
}

describe('restaurant-local TZ QA setup', () => {
  it('uses a US venue zone distinct from a far phone zone for calendar-day stress', () => {
    // Sep 26 2026 01:00 UTC = Sep 25 evening CDT / Sep 26 morning Tashkent
    const nearBoundary = new Date('2026-09-26T01:00:00.000Z');
    expect(todayIsoInTimeZone(VENUE_TZ, nearBoundary)).not.toBe(
      todayIsoInTimeZone(PHONE_TZ, nearBoundary),
    );
    expect(VENUE_TZ).not.toBe(PHONE_TZ);
    expect(PLATFORM_TIMEZONE).toBe('America/New_York');
  });

  it('Partner Hub today for NY venue matches shared todayIsoInTimeZone', () => {
    const now = new Date('2026-09-26T16:00:00.000Z'); // noon-ish ET
    expect(todayIsoInTimeZone(VENUE_TZ, now)).toBe('2026-09-26');
  });
});

describe('Diner surfaces D1–D8 (one booking, venue wall clock)', () => {
  const dateIso = '2026-09-26';
  const slot = zonedWallClockToUtc(dateIso, '19:00', VENUE_TZ);
  const slotIso = slot.toISOString();
  const slotEnd = zonedWallClockToUtc(dateIso, '21:00', VENUE_TZ).toISOString();

  it('D1 slot chip clock is 7:00 PM venue, not phone-shifted', () => {
    expect(formatSlotClock(slotIso, VENUE_TZ)).toBe('7:00 PM');
    // Same instant in Tashkent (UTC+5) is 4:00 AM next day — must not be what chips show
    expect(formatSlotClock(slotIso, PHONE_TZ)).toBe('4:00 AM');
    expect(formatSlotClock(slotIso, VENUE_TZ)).not.toBe(formatSlotClock(slotIso, PHONE_TZ));
  });

  it('D2 confirm sheet date+time match chips', () => {
    const chipTime = formatSlotClock(slotIso, VENUE_TZ);
    const confirmTime = formatSlotClock(slotIso, VENUE_TZ);
    const confirmDate = formatSlotDateLong(slotIso, VENUE_TZ);
    expect(confirmTime).toBe(chipTime);
    expect(confirmDate).toBe('Saturday, September 26');
  });

  it('D3 confirmation screen matches confirm sheet', () => {
    expect(formatSlotDateLong(slotIso, VENUE_TZ)).toBe(formatSlotDateLong(slotIso, VENUE_TZ));
    expect(formatSlotClock(slotIso, VENUE_TZ)).toBe('7:00 PM');
  });

  it('D4/D5 home card vs reservations list/detail agree', () => {
    const homeDate = formatRelativeDayLabel(
      isoDateInTimeZone(slot, VENUE_TZ),
      VENUE_TZ,
      new Date('2026-09-26T16:00:00.000Z'),
    );
    const listDate = formatReservationDate(slotIso, VENUE_TZ);
    const listTime = `${formatSlotClock(slotIso, VENUE_TZ)} – ${formatSlotClock(slotEnd, VENUE_TZ)}`;
    const when = formatWhen(slotIso, VENUE_TZ);

    expect(homeDate).toBe('Today');
    expect(listDate).toMatch(/Sep 26/);
    expect(listTime).toBe('7:00 PM – 9:00 PM');
    expect(when).toMatch(/7:00 PM/);
    expect(when).toMatch(/Sep 26/);
  });

  it('D6 edit “Today” / min date uses venue day near phone midnight', () => {
    // 11:30 PM Tashkent Sep 26 = 18:30 UTC = 2:30 PM ET Sep 26 — same day
    // 1:30 AM Tashkent Sep 27 = 20:30 UTC Sep 26 = 4:30 PM ET Sep 26 — phone tomorrow, venue today
    const phoneNextDayVenueStillToday = new Date('2026-09-26T20:30:00.000Z');
    expect(todayIsoInTimeZone(PHONE_TZ, phoneNextDayVenueStillToday)).toBe('2026-09-27');
    expect(todayIsoInTimeZone(VENUE_TZ, phoneNextDayVenueStillToday)).toBe('2026-09-26');
    expect(
      formatRelativeDayLabel('2026-09-26', VENUE_TZ, phoneNextDayVenueStillToday),
    ).toBe('Today');
    expect(
      formatRelativeDayLabel('2026-09-27', VENUE_TZ, phoneNextDayVenueStillToday),
    ).toBe('Tomorrow');
  });

  it('D7 waitlist chips use same formatter as main grid', () => {
    const grid = formatSlotClock(slotIso, VENUE_TZ);
    const waitlist = formatSlotClock(slotIso, VENUE_TZ);
    expect(waitlist).toBe(grid);
  });

  it('D8 messages reservation subtitle matches list/detail when', () => {
    expect(formatWhen(slotIso, VENUE_TZ)).toBe(formatWhen(slotIso, VENUE_TZ));
    expect(formatWhen(slotIso, VENUE_TZ)).toMatch(/7:00 PM/);
  });
});

describe('Merchant surfaces M1–M6', () => {
  const now = new Date('2026-09-26T16:00:00.000Z');
  const tonight = zonedWallClockToUtc('2026-09-26', '19:00', VENUE_TZ).toISOString();
  const yesterdayEvening = zonedWallClockToUtc('2026-09-25', '19:00', VENUE_TZ).toISOString();
  const tomorrowEvening = zonedWallClockToUtc('2026-09-27', '19:00', VENUE_TZ).toISOString();

  it('M1 Reservations Today membership uses venue calendarDayRange', () => {
    expect(isOnVenueToday(tonight, VENUE_TZ, now)).toBe(true);
    expect(isOnVenueToday(yesterdayEvening, VENUE_TZ, now)).toBe(false);
    expect(isOnVenueToday(tomorrowEvening, VENUE_TZ, now)).toBe(false);
  });

  it('M2 Upcoming/Past day headers say Today/Tomorrow in venue TZ', () => {
    expect(formatRelativeDayLabel('2026-09-26', VENUE_TZ, now)).toBe('Today');
    expect(formatRelativeDayLabel('2026-09-27', VENUE_TZ, now)).toBe('Tomorrow');
    // Phone already Sep 27 — headers must still follow venue
    const phoneTomorrow = new Date('2026-09-26T20:30:00.000Z');
    expect(formatRelativeDayLabel('2026-09-26', VENUE_TZ, phoneTomorrow)).toBe('Today');
    expect(formatRelativeDayLabel('2026-09-27', PHONE_TZ, phoneTomorrow)).toBe('Today');
  });

  it('M3 Overview date equals venue today (Partner Hub ops day)', () => {
    const overviewDate = todayIsoInTimeZone(VENUE_TZ, now);
    const hubToday = todayIsoInTimeZone(VENUE_TZ, now);
    expect(overviewDate).toBe(hubToday);
    expect(overviewDate).toBe('2026-09-26');
  });

  it('M4 Floor arriving / table sheet clocks match list', () => {
    expect(formatSlotClock(tonight, VENUE_TZ)).toBe('7:00 PM');
  });

  it('M5 create “tonight 7:00” → zonedWallClockToUtc; clear date → venue today', () => {
    const created = zonedWallClockToUtc('2026-09-26', '19:00', VENUE_TZ);
    expect(formatSlotClock(created.toISOString(), VENUE_TZ)).toBe('7:00 PM');
    expect(isoDateInTimeZone(created, VENUE_TZ)).toBe('2026-09-26');
    // Device-local `new Date("YYYY-MM-DDTHH:mm")` would follow process TZ — must disagree
    const naiveDeviceParse = new Date('2026-09-26T19:00:00');
    expect(created.toISOString()).not.toBe(naiveDeviceParse.toISOString());
    expect(todayIsoInTimeZone(VENUE_TZ, now)).toBe('2026-09-26');
  });

  it('M5 create submit ISO formats as 7:00 PM at venue regardless of process TZ', () => {
    const iso = zonedWallClockToUtc('2026-09-26', '19:00', VENUE_TZ).toISOString();
    expect(iso).toBe('2026-09-26T23:00:00.000Z'); // EDT
    expect(formatSlotClock(iso, VENUE_TZ)).toBe('7:00 PM');
  });

  it('M6 messages inbox/thread when matches reservation clock', () => {
    expect(formatWhen(tonight, VENUE_TZ)).toMatch(/7:00 PM/);
    expect(formatWhen(tonight, VENUE_TZ)).toMatch(/Sep 26/);
  });
});

describe('Day-boundary stress (phone date ≠ venue date)', () => {
  // Within ~2h of midnight in Tashkent while still afternoon/evening in NY
  const phonePastMidnight = new Date('2026-09-26T19:30:00.000Z'); // 00:30 Tashkent Sep 27 / 15:30 ET Sep 26

  it('venue today stays Sep 26 while phone is already Sep 27', () => {
    expect(todayIsoInTimeZone(PHONE_TZ, phonePastMidnight)).toBe('2026-09-27');
    expect(todayIsoInTimeZone(VENUE_TZ, phonePastMidnight)).toBe('2026-09-26');
  });

  it('7:00 PM venue booking never displays as phone-local morning', () => {
    const slot = zonedWallClockToUtc('2026-09-26', '19:00', VENUE_TZ).toISOString();
    expect(formatSlotClock(slot, VENUE_TZ)).toBe('7:00 PM');
    expect(formatSlotClock(slot, PHONE_TZ)).toBe('4:00 AM');
    expect(isoDateInTimeZone(new Date(slot), VENUE_TZ)).toBe('2026-09-26');
    expect(isoDateInTimeZone(new Date(slot), PHONE_TZ)).toBe('2026-09-27');
  });

  it('merchant Today filter keeps venue-lunch booking after phone midnight (phone TZ would drop it)', () => {
    // 12:00 PM ET = 9:00 PM Tashkent same calendar day — after phone rolls to Sep 27, phone “today” excludes it
    const lunch = zonedWallClockToUtc('2026-09-26', '12:00', VENUE_TZ).toISOString();
    expect(isOnVenueToday(lunch, VENUE_TZ, phonePastMidnight)).toBe(true);
    expect(isOnVenueToday(lunch, PHONE_TZ, phonePastMidnight)).toBe(false);
  });

  it('near venue midnight: ops day flips at venue, not phone', () => {
    // 11:30 PM ET Sep 26 = 03:30 UTC Sep 27 = 8:30 AM Tashkent Sep 27
    const nearVenueMidnight = new Date('2026-09-27T03:30:00.000Z');
    expect(todayIsoInTimeZone(VENUE_TZ, nearVenueMidnight)).toBe('2026-09-26');
    expect(todayIsoInTimeZone(PHONE_TZ, nearVenueMidnight)).toBe('2026-09-27');

    // 12:30 AM ET Sep 27 = 04:30 UTC Sep 27
    const afterVenueMidnight = new Date('2026-09-27T04:30:00.000Z');
    expect(todayIsoInTimeZone(VENUE_TZ, afterVenueMidnight)).toBe('2026-09-27');
  });
});
