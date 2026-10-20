import {
  isoDateInTimeZone,
  PLATFORM_TIMEZONE,
} from "@reservations/shared";

import { formatRelativeDayLabel } from "@/lib/helpers/date-time.helpers";
import { chunkItems } from "@/lib/use-grid-columns";

import type { ReservationListItem } from "../components/reservation-card.component";

export type RangeKey = "today" | "upcoming" | "past";

export type ListRow =
  | { type: "header"; id: string; label: string }
  | { type: "row"; id: string; reservations: ReservationListItem[] };

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

function pushChunkedRows(
  rows: ListRow[],
  items: ReservationListItem[],
  columns: number,
  idPrefix: string,
) {
  chunkItems(items, columns).forEach((reservations, index) => {
    rows.push({
      type: "row",
      id: `${idPrefix}-row-${index}-${reservations[0]?.id ?? index}`,
      reservations,
    });
  });
}

export function buildListRows(
  items: ReservationListItem[],
  range: RangeKey,
  timeZone: string = PLATFORM_TIMEZONE,
  columns: number = 1,
): ListRow[] {
  const cols = Math.max(1, columns);

  if (range === "today") {
    const rows: ListRow[] = [];
    pushChunkedRows(rows, items, cols, "today");
    return rows;
  }

  const rows: ListRow[] = [];
  let lastDay: string | null = null;
  let dayItems: ReservationListItem[] = [];

  function flushDay() {
    if (lastDay == null || dayItems.length === 0) return;
    pushChunkedRows(rows, dayItems, cols, `day-${lastDay}`);
    dayItems = [];
  }

  for (const reservation of items) {
    const dayIso = isoDateInTimeZone(new Date(reservation.slotStart), timeZone);
    if (dayIso !== lastDay) {
      flushDay();
      lastDay = dayIso;
      rows.push({
        type: "header",
        id: `day-${dayIso}`,
        label: formatRelativeDayLabel(dayIso, timeZone),
      });
    }
    dayItems.push(reservation);
  }
  flushDay();

  return rows;
}
