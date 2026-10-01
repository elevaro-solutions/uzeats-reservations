import {
  isoDateInTimeZone,
  PLATFORM_TIMEZONE,
} from "@reservations/shared";

import { formatRelativeDayLabel } from "@/lib/helpers/date-time.helpers";

import type { ReservationListItem } from "../components/reservation-card.component";

export type RangeKey = "today" | "upcoming" | "past";

export type ListRow =
  | { type: "header"; id: string; label: string }
  | { type: "reservation"; id: string; reservation: ReservationListItem };

/** Sort server-period results; filtering is done by API `period`. */
export function sortReservationsForRange(
  items: ReservationListItem[],
  range: RangeKey,
): ReservationListItem[] {
  return [...items].sort((a, b) => {
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
