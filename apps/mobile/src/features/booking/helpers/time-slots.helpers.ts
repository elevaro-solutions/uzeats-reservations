import { toIsoDate } from "@/lib/helpers/date-time.helpers";

import type { AvailabilitySlot } from "../types";

export const BOOKING_MAX_DAYS_AHEAD = 90;

export type TimeOfDayGroup = "morning" | "day" | "evening";

export type GroupedSlots = {
  morning: AvailabilitySlot[];
  day: AvailabilitySlot[];
  evening: AvailabilitySlot[];
};

function getSlotMinutes(time: string): number {
  const d = new Date(time);
  return d.getHours() * 60 + d.getMinutes();
}

function timeOfDayGroup(time: string): TimeOfDayGroup {
  const mins = getSlotMinutes(time);
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "day";
  return "evening";
}

export function groupSlotsByTimeOfDay(slots: AvailabilitySlot[]): GroupedSlots {
  const grouped: GroupedSlots = { morning: [], day: [], evening: [] };
  for (const slot of slots) {
    grouped[timeOfDayGroup(slot.time)].push(slot);
  }
  for (const key of Object.keys(grouped) as TimeOfDayGroup[]) {
    grouped[key].sort((a, b) => a.time.localeCompare(b.time));
  }
  return grouped;
}

export function formatSlotTime(time: string): string {
  return new Date(time).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSlotTime24(time: string): string {
  const date = new Date(time);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getOperatingHoursLabel(slots: AvailabilitySlot[]): string | null {
  if (slots.length === 0) return null;

  const sorted = [...slots].sort((a, b) => a.time.localeCompare(b.time));
  const start = formatSlotTime24(sorted[0]!.time);
  const end = formatSlotTime24(sorted[sorted.length - 1]!.time);

  return `Hours: ${start} – ${end}`;
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

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function maxBookableIsoDate(): string {
  const dates = buildDateRange(todayIsoDate(), BOOKING_MAX_DAYS_AHEAD);
  return dates[dates.length - 1]!;
}

export function clampBookingDate(iso: string): string {
  const today = todayIsoDate();
  const max = maxBookableIsoDate();
  if (iso < today) return today;
  if (iso > max) return max;
  return iso;
}

export function isDateBookable(iso: string): boolean {
  const today = todayIsoDate();
  const max = maxBookableIsoDate();
  return iso >= today && iso <= max;
}

export function getBookableDaysInMonth(
  year: number,
  month: number,
): string[] {
  const today = todayIsoDate();
  const max = maxBookableIsoDate();
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
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

export function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shortReservationRef(id: string): string {
  return id.slice(-8).toUpperCase();
}
