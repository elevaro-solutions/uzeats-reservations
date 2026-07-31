/** Show search/filter UI once an owner has this many locations. */
export const MANY_LOCATIONS_THRESHOLD = 6;

export type OwnerRestaurant = {
  id: string;
  name: string;
  status: string;
  cuisine: string;
  address: { city: string; state: string };
  tables?: unknown[];
  shifts?: unknown[];
};

export function restaurantSelectFilterOption(
  input: string,
  option?: { label?: string | number },
): boolean {
  return (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase());
}

export function restaurantSelectLabel(r: {
  name: string;
  address?: { city?: string; state?: string };
}): string {
  const location = [r.address?.city, r.address?.state].filter(Boolean).join(', ');
  return location ? `${r.name} — ${location}` : r.name;
}

export function buildRestaurantSelectOptions(
  restaurants: Array<{
    id: string;
    name: string;
    address?: { city?: string; state?: string };
  }>,
) {
  return restaurants.map((r) => ({
    value: r.id,
    label: restaurantSelectLabel(r),
  }));
}

export function validatedRestaurantId(
  restaurantId: string | undefined,
  restaurantIds: string[],
): string | undefined {
  if (restaurantId && restaurantIds.includes(restaurantId)) return restaurantId;
  return restaurantIds[0];
}
