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
