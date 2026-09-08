import type { RestaurantShift } from "../types";

/** Prefer today's active shifts; show earliest open → latest close. */
export function formatShortHours(
  shifts: RestaurantShift[] | null | undefined,
): string | null {
  const active = (shifts ?? []).filter((s) => s.active);
  if (active.length === 0) return null;

  const today = new Date().getDay();
  const todayShifts = active.filter((s) => s.daysOfWeek.includes(today));
  const pool = todayShifts.length > 0 ? todayShifts : active;

  const starts = pool.map((s) => s.startTime).sort();
  const ends = pool.map((s) => s.endTime).sort();
  const start = starts[0];
  const end = ends[ends.length - 1];
  if (!start || !end) return null;

  return `${start} – ${end}`;
}
