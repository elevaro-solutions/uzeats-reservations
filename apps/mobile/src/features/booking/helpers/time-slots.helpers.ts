import {
  formatSlotDateTime,
  parseIsoDate,
  toIsoDate,
  todayIsoDate,
} from "@/lib/helpers/date-time.helpers";

import type { AvailabilitySlot, BookingShift } from "../types";

export { todayIsoDate, tomorrowIsoDate } from "@/lib/helpers/date-time.helpers";

export const BOOKING_MAX_DAYS_AHEAD = 90;

export type ShiftSlotGroup = {
  id: string;
  name: string;
  slots: AvailabilitySlot[];
};

/** Build a local Date for YYYY-MM-DD + HH:mm (same convention as API availability). */
function dateAtLocal(dateIso: string, hm: string): Date {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(`${dateIso}T00:00:00`);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/**
 * Group availability slots under the restaurant's real shifts for `dateIso`
 * (YYYY-MM-DD). Slot start must fall in [startTime, endTime).
 *
 * Matching uses absolute instants vs local wall-clock windows on `dateIso`,
 * aligned with how the API builds slots (`dateAt` + server-local setHours).
 * Accurate when the client timezone matches the API host (or restaurant TZ
 * once that exists on the model).
 */
export function groupSlotsByShift(
  slots: AvailabilitySlot[],
  shifts: BookingShift[],
  dateIso: string,
): ShiftSlotGroup[] {
  const day = parseIsoDate(dateIso) ?? new Date(`${dateIso}T12:00:00`);
  const dayOfWeek = day.getDay();

  const dayShifts = shifts
    .filter(
      (s) =>
        s.active !== false &&
        Array.isArray(s.daysOfWeek) &&
        s.daysOfWeek.includes(dayOfWeek),
    )
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (dayShifts.length === 0) {
    return slots.length > 0
      ? [{ id: "available", name: "Available", slots: [...slots].sort((a, b) => a.time.localeCompare(b.time)) }]
      : [];
  }

  const groups: ShiftSlotGroup[] = dayShifts.map((s) => ({
    id: s.id,
    name: s.name,
    slots: [],
  }));
  const unmatched: AvailabilitySlot[] = [];

  for (const slot of slots) {
    const slotMs = new Date(slot.time).getTime();
    if (!Number.isFinite(slotMs)) {
      unmatched.push(slot);
      continue;
    }
    const matchIndex = dayShifts.findIndex((s) => {
      const start = dateAtLocal(dateIso, s.startTime).getTime();
      const end = dateAtLocal(dateIso, s.endTime).getTime();
      return slotMs >= start && slotMs < end;
    });
    if (matchIndex >= 0) {
      groups[matchIndex]!.slots.push(slot);
    } else {
      unmatched.push(slot);
    }
  }

  const result = groups
    .map((g) => ({
      ...g,
      slots: g.slots.sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .filter((g) => g.slots.length > 0);

  if (unmatched.length > 0) {
    result.push({
      id: "other",
      name: "Other",
      slots: unmatched.sort((a, b) => a.time.localeCompare(b.time)),
    });
  }

  return result;
}

export function formatSlotTime(time: string): string {
  return formatSlotDateTime(time);
}

export function formatSlotDateLong(time: string): string {
  return new Date(time).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function findNearbyAvailableSlots(
  slots: AvailabilitySlot[],
  referenceTime: string,
  maxResults = 3,
): AvailabilitySlot[] {
  const refMs = new Date(referenceTime).getTime();
  return slots
    .filter((s) => s.available)
    .map((s) => ({
      slot: s,
      distance: Math.abs(new Date(s.time).getTime() - refMs),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map(({ slot }) => slot);
}

/** Shared empty list so memos don't allocate a new `[]` when availability is missing. */
export const EMPTY_AVAILABILITY_SLOTS: AvailabilitySlot[] = [];

/** Keep only slots whose start is strictly after `now`. */
export function filterFutureSlots(
  slots: AvailabilitySlot[],
  now: number = Date.now(),
): AvailabilitySlot[] {
  return slots.filter((s) => {
    const t = new Date(s.time).getTime();
    return Number.isFinite(t) && t > now;
  });
}

/**
 * Past + min-advance filter for the booking UI.
 * `minAdvanceHours` comes from Restaurant.bookingWindow (0 when unset).
 */
export function filterBookableSlots(
  slots: AvailabilitySlot[],
  minAdvanceHours = 0,
  now: number = Date.now(),
): AvailabilitySlot[] {
  const minMs = now + Math.max(0, minAdvanceHours) * 3_600_000;
  return slots.filter((s) => {
    const t = new Date(s.time).getTime();
    return Number.isFinite(t) && t > minMs;
  });
}

export function maxBookableIsoDate(
  maxAdvanceDays: number = BOOKING_MAX_DAYS_AHEAD,
): string {
  const days = Math.max(1, maxAdvanceDays);
  const dates = buildDateRange(todayIsoDate(), days);
  return dates[dates.length - 1]!;
}

export function clampBookingDate(
  iso: string,
  maxAdvanceDays: number = BOOKING_MAX_DAYS_AHEAD,
): string {
  const today = todayIsoDate();
  const max = maxBookableIsoDate(maxAdvanceDays);
  if (iso < today) return today;
  if (iso > max) return max;
  return iso;
}

export function getBookableDaysInMonth(
  year: number,
  month: number,
  maxAdvanceDays: number = BOOKING_MAX_DAYS_AHEAD,
): string[] {
  const today = todayIsoDate();
  const max = maxBookableIsoDate(maxAdvanceDays);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days: string[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const iso = toIsoDate(new Date(year, month, day));
    if (iso >= today && iso <= max) {
      days.push(iso);
    }
  }

  return days;
}

export function buildDateRange(startIso: string, count: number): string[] {
  const [y, m, d] = startIso.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(toIsoDate(date));
  }
  return dates;
}

export function shortReservationRef(id: string): string {
  return id.slice(-8).toUpperCase();
}
