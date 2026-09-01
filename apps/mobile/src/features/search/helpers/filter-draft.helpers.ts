import { TIME_PRESETS } from "@/lib/helpers/date-time.helpers";
import type { DiscoveryFilters } from "@/store";

/** Browse facet fields reset by "Clear all" in the filters modal. */
export const DEFAULT_DRAFT_FILTER_FIELDS = {
  cuisine: undefined,
  priceRange: undefined,
  minRating: undefined,
  wheelchairAccessible: undefined,
  diningStyles: undefined,
  occasions: undefined,
  meals: undefined,
  dietaryTags: undefined,
  amenities: undefined,
} as const satisfies Partial<DiscoveryFilters>;

export type DraftBrowseFilters = Pick<
  DiscoveryFilters,
  keyof typeof DEFAULT_DRAFT_FILTER_FIELDS
>;

export function toggleValue(
  list: string[] | undefined,
  value: string,
): string[] {
  const current = list ?? [];
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

export function isPresetTime(time?: string): boolean {
  if (!time) return true;
  return TIME_PRESETS.some((preset) => preset.value === time);
}
