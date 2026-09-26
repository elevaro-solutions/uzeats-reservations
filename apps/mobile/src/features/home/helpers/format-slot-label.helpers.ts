import {
  formatRelativeDayLabel,
  formatSlotDateTime,
} from "@/lib/helpers/date-time.helpers";
import { isoDateInTimeZone, PLATFORM_TIMEZONE } from "@reservations/shared";

import type { MyReservation } from "../types";

/** Today / Tomorrow when applicable, otherwise short weekday+date. */
export function formatBookingCardDate(
  iso: string,
  timeZone: string = PLATFORM_TIMEZONE,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatRelativeDayLabel(isoDateInTimeZone(d, timeZone), timeZone);
}

export function formatBookingCardTime(
  iso: string,
  timeZone: string = PLATFORM_TIMEZONE,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatSlotDateTime(iso, timeZone);
}

/** Start–end range; falls back to start only if end is missing/invalid. */
export function formatBookingCardTimeRange(
  slotStart: string,
  slotEnd?: string | null,
  timeZone: string = PLATFORM_TIMEZONE,
): string {
  const start = formatBookingCardTime(slotStart, timeZone);
  if (!slotEnd) return start;
  const endDate = new Date(slotEnd);
  if (Number.isNaN(endDate.getTime())) return start;
  return `${start}–${formatBookingCardTime(slotEnd, timeZone)}`;
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
