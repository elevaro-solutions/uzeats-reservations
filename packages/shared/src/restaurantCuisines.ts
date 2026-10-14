/** Max cuisines a restaurant listing can declare. */
export const MAX_RESTAURANT_CUISINES = 8;

/**
 * Normalize primary `cuisine` + `cuisines[]` into a de-duped list.
 * Primary is always the first entry (for legacy single-cuisine consumers).
 */
export function normalizeRestaurantCuisines(input: {
  cuisine?: string | null;
  cuisines?: readonly string[] | null;
}): { cuisine: string; cuisines: string[] } {
  const seen = new Set<string>();
  const list: string[] = [];
  const push = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const value = raw.trim();
    if (value.length < 2 || value.length > 60 || seen.has(value)) return;
    seen.add(value);
    list.push(value);
  };
  for (const item of input.cuisines ?? []) push(item);
  if (list.length === 0) push(input.cuisine);
  const cuisines = list.slice(0, MAX_RESTAURANT_CUISINES);
  return { cuisine: cuisines[0] ?? '', cuisines };
}

/** Form / UI helper: prefer stored array, else wrap legacy primary. */
export function restaurantCuisinesForForm(restaurant: {
  cuisine?: string | null;
  cuisines?: readonly string[] | null;
}): string[] {
  return normalizeRestaurantCuisines(restaurant).cuisines;
}
