import type { DiscoveryFilters } from "@/store";

export type DiscoveryIndexEntry = {
  slug: string;
  label: string;
  count: number;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
};

export type ScopedDiscoveryIndexData = {
  cuisines: DiscoveryIndexEntry[];
  occasions: DiscoveryIndexEntry[];
  meals: DiscoveryIndexEntry[];
  diningStyles: DiscoveryIndexEntry[];
  dietaryTags: DiscoveryIndexEntry[];
  amenities: DiscoveryIndexEntry[];
};

export type SearchSuggestion = {
  id: string;
  name: string;
  cuisine: string;
  photoUrl?: string | null;
  addressLine: string;
};

export type TrendingSearchKind =
  | "QUERY"
  | "CUISINE"
  | "OCCASION"
  | "MEAL"
  | "DINING_STYLE"
  | "DIETARY"
  | "AMENITY";

export type TrendingSearchTerm = {
  term: string;
  kind: TrendingSearchKind;
  count: number;
};

export type RecentSearchEntry = {
  id: string;
  label: string;
  query?: string | null;
  cuisine?: string | null;
  diningStyles: string[];
  occasions: string[];
  meals: string[];
  dietaryTags: string[];
  amenities: string[];
  city?: string | null;
  state?: string | null;
  searchedAt: string;
};

export type RecordSearchPayload = {
  query?: string;
  cuisine?: string;
  diningStyles?: string[];
  occasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  city?: string;
  state?: string;
  restaurantId?: string;
};

export type SearchMode = "idle" | "suggestions" | "results";

export function buildDiscoveryIndexInput(
  discovery: Pick<
    DiscoveryFilters,
    "city" | "state" | "nearMe" | "lat" | "lng" | "radiusKm"
  >,
) {
  if (discovery.nearMe && discovery.lat != null && discovery.lng != null) {
    return {
      lat: discovery.lat,
      lng: discovery.lng,
      radiusKm: discovery.radiusKm,
    };
  }
  return {
    city: discovery.city,
    state: discovery.state,
  };
}

export function buildRecordSearchInput(
  discovery: DiscoveryFilters,
  extras: RecordSearchPayload = {},
): RecordSearchPayload {
  return {
    query: discovery.query.trim() || undefined,
    cuisine: discovery.cuisine,
    diningStyles: discovery.diningStyles,
    occasions: discovery.occasions,
    meals: discovery.meals,
    dietaryTags: discovery.dietaryTags,
    amenities: discovery.amenities,
    city: discovery.nearMe ? undefined : discovery.city,
    state: discovery.nearMe ? undefined : discovery.state,
    ...extras,
  };
}

export function hasActiveSearchFilters(discovery: DiscoveryFilters): boolean {
  return Boolean(
    discovery.query.trim() ||
      discovery.cuisine ||
      discovery.diningStyles?.length ||
      discovery.occasions?.length ||
      discovery.meals?.length ||
      discovery.dietaryTags?.length ||
      discovery.amenities?.length ||
      discovery.priceRange ||
      discovery.minRating ||
      discovery.wheelchairAccessible ||
      discovery.nearMe,
  );
}

export function applyRecentSearchEntry(
  entry: RecentSearchEntry,
): Partial<DiscoveryFilters> {
  return {
    query: entry.query ?? "",
    cuisine: entry.cuisine ?? undefined,
    diningStyles: entry.diningStyles.length ? entry.diningStyles : undefined,
    occasions: entry.occasions.length ? entry.occasions : undefined,
    meals: entry.meals.length ? entry.meals : undefined,
    dietaryTags: entry.dietaryTags.length ? entry.dietaryTags : undefined,
    amenities: entry.amenities.length ? entry.amenities : undefined,
  };
}

export function applyTrendingTerm(
  term: TrendingSearchTerm,
): Partial<DiscoveryFilters> {
  const base = clearBrowseFilters();

  switch (term.kind) {
    case "QUERY":
      return { ...base, query: term.term };
    case "CUISINE":
      return { ...base, cuisine: term.term };
    case "OCCASION":
      return { ...base, occasions: [term.term] };
    case "MEAL":
      return { ...base, meals: [term.term] };
    case "DINING_STYLE":
      return { ...base, diningStyles: [term.term] };
    case "DIETARY":
      return { ...base, dietaryTags: [term.term] };
    case "AMENITY":
      return { ...base, amenities: [term.term] };
    default:
      return { ...base, query: term.term };
  }
}

/** Clears text + facet browse filters while keeping date/party/location. */
export function clearBrowseFilters(): Partial<DiscoveryFilters> {
  return {
    query: "",
    cuisine: undefined,
    diningStyles: undefined,
    occasions: undefined,
    meals: undefined,
    dietaryTags: undefined,
    amenities: undefined,
  };
}
