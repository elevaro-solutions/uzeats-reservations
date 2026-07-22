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
