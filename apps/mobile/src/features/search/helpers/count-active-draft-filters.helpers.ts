import type { DiscoveryFilters } from "@/store";

import { DEFAULT_DRAFT_FILTER_FIELDS } from "./filter-draft.helpers";

export function countActiveDraftFilters(
  draft: Pick<
    DiscoveryFilters,
    | "cuisine"
    | "priceRange"
    | "minRating"
    | "wheelchairAccessible"
    | "diningStyles"
    | "occasions"
    | "meals"
    | "dietaryTags"
    | "amenities"
  >,
): number {
  let count = 0;
  if (draft.cuisine) count += 1;
  if (draft.priceRange != null) count += 1;
  if (draft.minRating != null) count += 1;
  if (draft.wheelchairAccessible) count += 1;
  count += draft.diningStyles?.length ?? 0;
  count += draft.occasions?.length ?? 0;
  count += draft.meals?.length ?? 0;
  count += draft.dietaryTags?.length ?? 0;
  count += draft.amenities?.length ?? 0;
  return count;
}

export function hasDraftBrowseFilters(
  draft: Parameters<typeof countActiveDraftFilters>[0],
): boolean {
  return countActiveDraftFilters(draft) > 0;
}

export function getDefaultDraftBrowseFilters(): typeof DEFAULT_DRAFT_FILTER_FIELDS {
  return { ...DEFAULT_DRAFT_FILTER_FIELDS };
}
