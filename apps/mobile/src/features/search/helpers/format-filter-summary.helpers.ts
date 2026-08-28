import { formatDisplayDate, formatDisplayTime } from "@/lib/helpers/date-time.helpers";

import { formatPriceRangeChip } from "../../discovery/helpers/format-price-range.helpers";

export function formatFilterDateSummary(iso: string): string {
  return formatDisplayDate(iso);
}

export function formatFilterTimeSummary(time?: string): string {
  return formatDisplayTime(time);
}

export function formatFilterPartySummary(partySize: number): string {
  if (partySize === 1) return "1 guest";
  return `${partySize} guests`;
}

export function formatFilterPriceSummary(priceRange: number): string {
  return formatPriceRangeChip(priceRange);
}

export function formatFilterRatingSummary(minRating: number): string {
  return `${minRating}+ ★`;
}

export function formatFilterDistanceSummary(radiusKm: number): string {
  const rounded = Number.isInteger(radiusKm) ? radiusKm : radiusKm.toFixed(1);
  return `Within ${rounded} km`;
}
