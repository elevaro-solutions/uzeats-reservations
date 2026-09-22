import {
  formatRelativeDayLabel,
  toIsoDate,
} from "@/lib/helpers/date-time.helpers";

import type { ReservationListItem } from "../components/reservation-card.component";

export type RangeKey = "today" | "upcoming" | "past";

export type ListRow =
  | { type: "header"; id: string; label: string }
  | { type: "reservation"; id: string; reservation: ReservationListItem };

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function filterReservationsForRange(
  items: ReservationListItem[],
  range: RangeKey,
): ReservationListItem[] {
  const start = startOfToday();
  const end = endOfToday();

  const filtered = items.filter((item) => {
    const slot = new Date(item.slotStart).getTime();
    if (range === "today" && (slot < start || slot > end)) return false;
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
    const dayIso = toIsoDate(new Date(reservation.slotStart));
    if (dayIso !== lastDay) {
      lastDay = dayIso;
      rows.push({
        type: "header",
        id: `day-${dayIso}`,
        label: formatRelativeDayLabel(dayIso),
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
