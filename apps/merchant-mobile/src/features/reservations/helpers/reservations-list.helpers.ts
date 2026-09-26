import {
  calendarDayRange,
  isoDateInTimeZone,
  PLATFORM_TIMEZONE,
  todayIsoInTimeZone,
} from "@reservations/shared";

import { formatRelativeDayLabel } from "@/lib/helpers/date-time.helpers";

import type { ReservationListItem } from "../components/reservation-card.component";

export type RangeKey = "today" | "upcoming" | "past";

export type ListRow =
  | { type: "header"; id: string; label: string }
  | { type: "reservation"; id: string; reservation: ReservationListItem };

export function filterReservationsForRange(
  items: ReservationListItem[],
  range: RangeKey,
  timeZone: string = PLATFORM_TIMEZONE,
): ReservationListItem[] {
  const todayIso = todayIsoInTimeZone(timeZone);
  const { $gte: dayStart, $lt: dayEnd } = calendarDayRange(todayIso, timeZone);
  const start = dayStart.getTime();
  const end = dayEnd.getTime();

  const filtered = items.filter((item) => {
    const slot = new Date(item.slotStart).getTime();
    if (range === "today" && (slot < start || slot >= end)) return false;
    if (range === "upcoming" && slot < start) return false;
    if (range === "past" && slot >= start) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const diff =
      new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
    return range === "past" ? -diff : diff;
  });
}

export function buildListRows(
  items: ReservationListItem[],
  range: RangeKey,
  timeZone: string = PLATFORM_TIMEZONE,
): ListRow[] {
  if (range === "today") {
    return items.map((reservation) => ({
      type: "reservation" as const,
      id: reservation.id,
      reservation,
    }));
  }

  const rows: ListRow[] = [];
  let lastDay: string | null = null;

  for (const reservation of items) {
    const dayIso = isoDateInTimeZone(new Date(reservation.slotStart), timeZone);
    if (dayIso !== lastDay) {
      lastDay = dayIso;
      rows.push({
        type: "header",
        id: `day-${dayIso}`,
        label: formatRelativeDayLabel(dayIso, timeZone),
      });
    }
    rows.push({
      type: "reservation",
      id: reservation.id,
      reservation,
    });
  }

  return rows;
}
