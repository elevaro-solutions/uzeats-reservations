import { PRICE_RANGES } from "@reservations/shared";

export type PriceRangeOption = {
  value: (typeof PRICE_RANGES)[number];
  short: string;
  label: string;
};

export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
  { value: 1, short: "$", label: "Budget" },
  { value: 2, short: "$$", label: "Moderate" },
  { value: 3, short: "$$$", label: "Upscale" },
  { value: 4, short: "$$$$", label: "Fine dining" },
];

export function formatPriceRange(priceRange: number): string {
  const n = Math.min(4, Math.max(1, Math.round(priceRange)));
  return "$".repeat(n);
}

export function formatPriceRangeLabel(priceRange: number): string {
  return formatPriceRangeChip(priceRange);
}

export function formatPriceRangeChip(priceRange: number): string {
  const option = PRICE_RANGE_OPTIONS.find((item) => item.value === priceRange);
  if (!option) return formatPriceRange(priceRange);
  return option.label;
}
