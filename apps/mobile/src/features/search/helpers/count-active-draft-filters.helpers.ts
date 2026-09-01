import type { DraftBrowseFilters } from "./filter-draft.helpers";

export function countActiveDraftFilters(draft: DraftBrowseFilters): number {
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
