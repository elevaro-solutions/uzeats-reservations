/** Show search/filter UI once an owner has this many locations. */
export const MANY_LOCATIONS_THRESHOLD = 6;

/** Opens the partner "Add restaurant" create flow on My restaurants. */
export const ADD_RESTAURANT_HREF = '/restaurants?create=1';

/** Partner Hub path with `?restaurant=` so DashShell can switch the active venue. */
export function restaurantHref(path: string, id: string) {
  return `${path}?restaurant=${encodeURIComponent(id)}`;
}

export function isInactiveRestaurant(status: string) {
  return status === 'rejected' || status === 'suspended';
}

export type OwnerRestaurant = {
  id: string;
  name: string;
  status: string;
  cuisine: string;
  address: { city: string; state: string };
  tables?: unknown[];
  shifts?: unknown[];
  tableCount?: number;
  shiftCount?: number;
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

export const ALL_LOCATIONS_VALUE = 'all';

export function buildRestaurantSelectOptions(
  restaurants: Array<{
    id: string;
    name: string;
    address?: { city?: string; state?: string };
  }>,
  opts?: { includeAllLocations?: boolean },
) {
  const options = restaurants.map((r) => ({
    value: r.id,
    label: restaurantSelectLabel(r),
  }));
  if (opts?.includeAllLocations && restaurants.length > 1) {
    return [{ value: ALL_LOCATIONS_VALUE, label: 'All locations' }, ...options];
  }
  return options;
}

export function validatedRestaurantId(
  restaurantId: string | undefined,
  restaurantIds: string[],
): string | undefined {
  if (restaurantId && restaurantIds.includes(restaurantId)) return restaurantId;
  return restaurantIds[0];
}
