import { DISPLAY_LOCALE } from "./constants.js";

const US_TIME: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

/** US date, e.g. 9/18/2026 or Sep 18, 2026 depending on options. */
export function formatUsDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(DISPLAY_LOCALE, options);
}

/** US 12-hour time, e.g. 7:30 PM. */
export function formatUsTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString(DISPLAY_LOCALE, { ...US_TIME, ...options });
}

/** US date + 12-hour time. */
export function formatUsDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleString(DISPLAY_LOCALE, options);
}
