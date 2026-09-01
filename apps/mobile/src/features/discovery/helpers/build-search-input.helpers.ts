import type { DiscoveryFilters } from "@/store";

export type SearchRestaurantsInput = {
  query?: string;
  cuisine?: string;
  priceRange?: number;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  date?: string;
  time?: string;
  partySize?: number;
  minRating?: number;
  wheelchairAccessible?: boolean;
  requireAvailability?: boolean;
  diningStyles?: string[];
  occasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  page?: number;
  limit?: number;
};

/** Full search/filter input used by the Search screen. */
export function buildSearchInput(
  filters: DiscoveryFilters,
  overrides: Partial<SearchRestaurantsInput> = {},
): SearchRestaurantsInput {
  const input: SearchRestaurantsInput = {
    partySize: filters.partySize,
    date: filters.date,
    // Only require open tables when a time is chosen; date/party alone browse the directory.
    requireAvailability: Boolean(filters.time),
    ...overrides,
  };

  if (filters.query.trim()) input.query = filters.query.trim();
  if (filters.cuisine) input.cuisine = filters.cuisine;
  if (filters.priceRange != null) input.priceRange = filters.priceRange;
  if (filters.time) input.time = filters.time;
  if (filters.minRating != null) input.minRating = filters.minRating;
  if (filters.wheelchairAccessible) {
    input.wheelchairAccessible = true;
  }
  if (filters.diningStyles?.length) input.diningStyles = filters.diningStyles;
  if (filters.occasions?.length) input.occasions = filters.occasions;
  if (filters.meals?.length) input.meals = filters.meals;
  if (filters.dietaryTags?.length) input.dietaryTags = filters.dietaryTags;
  if (filters.amenities?.length) input.amenities = filters.amenities;

  applyLocationToInput(filters, input);

  return input;
}

/**
 * Home feed sections only follow the user's location.
 * Search filters (query, cuisine, date, party, rating, etc.) must not affect Home.
 */
export function buildHomeFeedInput(
  filters: Pick<
    DiscoveryFilters,
    "city" | "state" | "nearMe" | "lat" | "lng" | "radiusKm"
  >,
  overrides: Partial<SearchRestaurantsInput> = {},
): SearchRestaurantsInput {
  const input: SearchRestaurantsInput = {
    requireAvailability: false,
    page: 1,
    limit: 10,
    ...overrides,
  };

  applyLocationToInput(filters, input);

  return input;
}

function applyLocationToInput(
  filters: Pick<
    DiscoveryFilters,
    "city" | "state" | "nearMe" | "lat" | "lng" | "radiusKm"
  >,
  input: SearchRestaurantsInput,
): void {
  if (filters.nearMe && filters.lat != null && filters.lng != null) {
    input.lat = filters.lat;
    input.lng = filters.lng;
    input.radiusKm = filters.radiusKm;
    return;
  }

  if (filters.city) {
    input.city = filters.city;
    if (filters.state) input.state = filters.state;
  }
}
