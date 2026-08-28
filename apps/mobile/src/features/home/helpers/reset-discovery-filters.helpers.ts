import type { DiningStyleTile } from "@/features/discovery";
import type { DiscoveryFilters } from "@/store";

/** Browse facet fields cleared when opening Search from Home or applying a browse shortcut. */
const CLEARED_BROWSE_FACETS = {
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

/** Builds discovery store updates when navigating from Home into Search. */
export function buildOpenSearchDiscoveryUpdate(params?: {
  cuisine?: string;
  diningStyle?: DiningStyleTile;
  minRating?: number;
}): Partial<DiscoveryFilters> {
  if (params?.diningStyle?.filter) {
    return {
      query: "",
      ...CLEARED_BROWSE_FACETS,
      ...params.diningStyle.filter,
    };
  }
  if (params?.cuisine) {
    return {
      query: "",
      ...CLEARED_BROWSE_FACETS,
      cuisine: params.cuisine,
    };
  }
  if (params?.minRating != null) {
    return {
      query: "",
      ...CLEARED_BROWSE_FACETS,
      minRating: params.minRating,
    };
  }
  return {
    query: "",
    ...CLEARED_BROWSE_FACETS,
  };
}
