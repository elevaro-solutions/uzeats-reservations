import { ALL_LOCATIONS_VALUE } from '@/lib/restaurants';

export const ACTIVE_RESTAURANT_STORAGE_KEY = 'activeRestaurantId';

/** Sidebar entries available while every restaurant is selected. */
export const COMBINED_NAV_HREFS = [
  '/overview',
  '/restaurants',
  '/reservations',
  '/waitlist',
  '/billing',
] as const;

export type RestaurantScope =
  | { mode: 'all' }
  | { mode: 'one'; restaurantId: string };

/**
 * Multi-restaurant partners default to every location.
 * A restaurant id in the URL wins over the saved choice.
 * A saved id is used when a link drops the query, then written back onto the URL.
 */
export function resolveRestaurantScope(input: {
  restaurantIds: string[];
  urlRestaurant: string | null;
  stored: string | null;
}): RestaurantScope | null {
  const ids = input.restaurantIds;
  if (ids.length === 0) return null;
  if (ids.length === 1) return { mode: 'one', restaurantId: ids[0]! };

  const fromUrl = input.urlRestaurant;
  if (fromUrl && ids.includes(fromUrl)) return { mode: 'one', restaurantId: fromUrl };
  if (fromUrl === ALL_LOCATIONS_VALUE) return { mode: 'all' };

  const stored = input.stored;
  if (stored && ids.includes(stored)) return { mode: 'one', restaurantId: stored };
  return { mode: 'all' };
}

export function readStoredRestaurantScope(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_RESTAURANT_STORAGE_KEY);
}

export function writeStoredRestaurantScope(value: string) {
  localStorage.setItem(ACTIVE_RESTAURANT_STORAGE_KEY, value);
}

/** Shared across header and page hooks so a click is not overwritten by a stale URL. */
let pendingRestaurantScope: string | null = null;

export function markPendingRestaurantScope(value: string) {
  pendingRestaurantScope = value;
}

export function readPendingRestaurantScope() {
  return pendingRestaurantScope;
}

export function clearPendingRestaurantScope() {
  pendingRestaurantScope = null;
}

/** Combined pages, plus account flows that must stay reachable without a venue. */
export function isAllModeAllowedPath(pathname: string): boolean {
  if (
    pathname === '/overview' ||
    pathname === '/restaurants' ||
    pathname === '/waitlist' ||
    pathname === '/reservations' ||
    pathname.startsWith('/reservations/') ||
    pathname === '/billing' ||
    pathname.startsWith('/billing/')
  ) {
    return true;
  }
  return ['/agreements', '/notifications', '/support', '/release-notes', '/onboarding'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
