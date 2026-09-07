import {
  formatRelativeDayLabel,
  formatSlotDateTime,
  toIsoDate,
} from "@/lib/helpers/date-time.helpers";

import type { MyReservation } from "../types";

/** Today / Tomorrow when applicable, otherwise short weekday+date. */
export function formatBookingCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatRelativeDayLabel(toIsoDate(d));
}

export function formatBookingCardTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatSlotDateTime(iso);
}

/** Start–end range; falls back to start only if end is missing/invalid. */
export function formatBookingCardTimeRange(
  slotStart: string,
  slotEnd?: string | null,
): string {
  const start = formatBookingCardTime(slotStart);
  if (!slotEnd) return start;
  const endDate = new Date(slotEnd);
  if (Number.isNaN(endDate.getTime())) return start;
  return `${start}–${formatBookingCardTime(slotEnd)}`;
}

export function formatBookingCardAddress(
  address: MyReservation["restaurant"]["address"],
): string | null {
  if (!address) return null;
  const line1 = address.line1?.trim() || "";
  const neighborhood = address.neighborhood?.trim() || "";
  const city = address.city?.trim() || "";
  const state = address.state?.trim() || "";

  if (line1 && neighborhood) return `${line1}, ${neighborhood}`;
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  if (neighborhood) return neighborhood;
  if (line1) return line1;
  const locality = [city, state].filter(Boolean).join(", ");
  return locality || null;
}
