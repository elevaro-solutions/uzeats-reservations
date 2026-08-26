import type { RestaurantShift } from "../types";

/** Prefer today's active shift; otherwise the first active shift. */
export function formatShortHours(
  shifts: RestaurantShift[] | null | undefined,
): string | null {
  const active = (shifts ?? []).filter((s) => s.active);
  if (active.length === 0) return null;

  const today = new Date().getDay();
  const todayShift =
    active.find((s) => s.daysOfWeek.includes(today)) ?? active[0];

  return `${todayShift.startTime} – ${todayShift.endTime}`;
}
