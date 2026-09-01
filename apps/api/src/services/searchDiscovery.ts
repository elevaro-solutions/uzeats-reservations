import {
  citySlug,
  cuisineSlug,
  discoverySlug,
  neighborhoodSlug,
  type DiscoveryIndexInput,
  type RecordSearchInput,
  type SearchSuggestionsInput,
  type TrendingSearchesInput,
} from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { SearchEvent } from '../models/SearchEvent.js';
import { UserSearchHistory } from '../models/UserSearchHistory.js';

const RECENT_SEARCH_CAP = 20;
const TRENDING_WINDOW_DAYS = 30;

export type DiscoveryIndexEntry = {
  slug: string;
  label: string;
  count: number;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
};

export type DiscoveryIndexResult = {
  cities: DiscoveryIndexEntry[];
  neighborhoods: DiscoveryIndexEntry[];
  cuisines: DiscoveryIndexEntry[];
  occasions: DiscoveryIndexEntry[];
  meals: DiscoveryIndexEntry[];
  diningStyles: DiscoveryIndexEntry[];
  dietaryTags: DiscoveryIndexEntry[];
  amenities: DiscoveryIndexEntry[];
};

export type SearchSuggestionResult = {
  id: string;
  name: string;
  cuisine: string;
  photoUrl: string | null;
  addressLine: string;
};

export type TrendingSearchKind =
  | 'QUERY'
  | 'CUISINE'
  | 'OCCASION'
  | 'MEAL'
  | 'DINING_STYLE'
  | 'DIETARY'
  | 'AMENITY';

export type TrendingSearchTerm = {
  term: string;
  kind: TrendingSearchKind;
  count: number;
};

export type RecentSearchEntry = {
  id: string;
  label: string;
  query: string | null;
  cuisine: string | null;
  diningStyles: string[];
  occasions: string[];
  meals: string[];
  dietaryTags: string[];
  amenities: string[];
  city: string | null;
  state: string | null;
  searchedAt: Date;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildApprovedScopeMatch(input?: DiscoveryIndexInput | null): Record<string, unknown> {
  const match: Record<string, unknown> = { status: 'approved' };

  if (input?.city?.trim()) {
    match['address.city'] = new RegExp(`^${escapeRegex(input.city.trim())}$`, 'i');
  }
  if (input?.state?.trim()) {
    match['address.state'] = new RegExp(`^${escapeRegex(input.state.trim())}$`, 'i');
  }
  if (input?.lat != null && input?.lng != null) {
    const maxDistanceMeters = (input.radiusKm ?? 25) * 1000;
    match.location = {
      $geoWithin: {
        $centerSphere: [[input.lng, input.lat], maxDistanceMeters / 6_378_100],
      },
    };
  }

  return match;
}

function mapArrayFieldRows(
  rows: Array<{ _id: string; count: number }>,
  slugFn: (label: string) => string,
): DiscoveryIndexEntry[] {
  return rows.map((row) => ({
    slug: slugFn(row._id),
    label: row._id,
    count: row.count,
    city: null,
    state: null,
    neighborhood: null,
    lat: null,
    lng: null,
  }));
}

async function aggregateArrayField(
  approved: Record<string, unknown>,
  field: string,
  slugFn: (label: string) => string,
): Promise<DiscoveryIndexEntry[]> {
  const rows = await Restaurant.aggregate([
    { $match: { ...approved, [field]: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gte: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return mapArrayFieldRows(rows, slugFn);
}

export async function getDiscoveryIndex(
  input?: DiscoveryIndexInput | null,
): Promise<DiscoveryIndexResult> {
  const approved = buildApprovedScopeMatch(input);

  const [
    cityRows,
    neighborhoodRows,
    cuisineRows,
    occasionRows,
    mealRows,
    diningStyleRows,
    dietaryTagRows,
    amenityRows,
  ] = await Promise.all([
    Restaurant.aggregate([
      { $match: approved },
      {
        $group: {
          _id: { city: '$address.city', state: '$address.state' },
          count: { $sum: 1 },
          lng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
          lat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
        },
      },
      { $match: { count: { $gte: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Restaurant.aggregate([
      { $match: { ...approved, 'address.neighborhood': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: {
            neighborhood: '$address.neighborhood',
            city: '$address.city',
            state: '$address.state',
          },
          count: { $sum: 1 },
          lng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
          lat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
        },
      },
      { $match: { count: { $gte: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Restaurant.aggregate([
      { $match: approved },
      { $group: { _id: '$cuisine', count: { $sum: 1 } } },
      { $match: { count: { $gte: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Restaurant.aggregate([
      { $match: { ...approved, discoveryOccasions: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$discoveryOccasions' },
      { $group: { _id: '$discoveryOccasions', count: { $sum: 1 } } },
      { $match: { count: { $gte: 1 } } },
      { $sort: { count: -1 } },
    ]),
    aggregateArrayField(approved, 'meals', discoverySlug),
    aggregateArrayField(approved, 'diningStyles', discoverySlug),
    aggregateArrayField(approved, 'dietaryTags', discoverySlug),
    aggregateArrayField(approved, 'amenities', discoverySlug),
  ]);

  return {
    cities: cityRows.map(
      (row: {
        _id: { city: string; state: string };
        count: number;
        lat?: number;
        lng?: number;
      }) => ({
        slug: citySlug(row._id.city, row._id.state),
        label: `${row._id.city}, ${row._id.state}`,
        count: row.count,
        city: row._id.city,
        state: row._id.state,
        neighborhood: null,
        lat: row.lat ?? null,
        lng: row.lng ?? null,
      }),
    ),
    neighborhoods: neighborhoodRows.map(
      (row: {
        _id: { neighborhood: string; city: string; state: string };
        count: number;
        lat?: number;
        lng?: number;
      }) => ({
        slug: neighborhoodSlug(row._id.neighborhood, row._id.city, row._id.state),
        label: `${row._id.neighborhood}, ${row._id.city}`,
        count: row.count,
        city: row._id.city,
        state: row._id.state,
        neighborhood: row._id.neighborhood,
        lat: row.lat ?? null,
        lng: row.lng ?? null,
      }),
    ),
    cuisines: cuisineRows.map((row: { _id: string; count: number }) => ({
      slug: cuisineSlug(row._id),
      label: row._id,
      count: row.count,
      city: null,
      state: null,
      neighborhood: null,
      lat: null,
      lng: null,
    })),
    occasions: occasionRows.map((row: { _id: string; count: number }) => ({
      slug: discoverySlug(row._id),
      label: row._id,
      count: row.count,
      city: null,
      state: null,
      neighborhood: null,
      lat: null,
      lng: null,
    })),
    meals: mealRows,
    diningStyles: diningStyleRows,
    dietaryTags: dietaryTagRows,
    amenities: amenityRows,
  };
}

function formatAddressLine(address?: {
  line1?: string;
  city?: string;
  state?: string;
  neighborhood?: string | null;
}): string {
  if (!address) return '';
  const parts = [
    address.neighborhood,
    address.city,
    address.state,
    address.line1,
  ].filter(Boolean);
  return parts.join(', ');
}

export async function searchRestaurantSuggestions(
  input: SearchSuggestionsInput,
): Promise<SearchSuggestionResult[]> {
  const filter = buildApprovedScopeMatch(input);
  const q = input.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (q) {
    const pattern = new RegExp(q, 'i');
    filter.$or = [
      { name: pattern },
      { cuisine: pattern },
      { 'address.city': pattern },
      { 'address.neighborhood': pattern },
    ];
  }

  const docs = await Restaurant.find(filter)
    .sort({ featured: -1, averageRating: -1 })
    .limit(input.limit)
    .select('name cuisine photos address')
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    cuisine: doc.cuisine,
    photoUrl: doc.photos?.[0] ?? null,
    addressLine: formatAddressLine(doc.address),
  }));
}

function scopeKey(
  input?: DiscoveryIndexInput | TrendingSearchesInput | RecordSearchInput | null,
) {
  return {
    city: input?.city?.trim() || undefined,
    state: input?.state?.trim() || undefined,
  };
}

async function getTrendingFromEvents(
  input: TrendingSearchesInput,
): Promise<TrendingSearchTerm[]> {
  const since = new Date();
  since.setDate(since.getDate() - TRENDING_WINDOW_DAYS);

  const match: Record<string, unknown> = { createdAt: { $gte: since } };
  const { city, state } = scopeKey(input);
  if (city) match.city = city;
  if (state) match.state = state;

  const rows = await SearchEvent.aggregate([
    { $match: match },
    { $group: { _id: { term: '$term', kind: '$kind' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: input.limit },
  ]);

  return rows.map((row: { _id: { term: string; kind: TrendingSearchKind }; count: number }) => ({
    term: row._id.term,
    kind: row._id.kind,
    count: row.count,
  }));
}

async function getTrendingFallback(
  input: TrendingSearchesInput,
): Promise<TrendingSearchTerm[]> {
  const index = await getDiscoveryIndex(input);
  const terms: TrendingSearchTerm[] = [];

  for (const cuisine of index.cuisines.slice(0, Math.ceil(input.limit / 2))) {
    terms.push({ term: cuisine.label, kind: 'CUISINE', count: cuisine.count });
  }
  for (const occasion of index.occasions.slice(0, Math.floor(input.limit / 2))) {
    terms.push({ term: occasion.label, kind: 'OCCASION', count: occasion.count });
  }

  return terms.slice(0, input.limit);
}

export async function getTrendingSearches(
  input: TrendingSearchesInput,
): Promise<TrendingSearchTerm[]> {
  const fromEvents = await getTrendingFromEvents(input);
  if (fromEvents.length > 0) return fromEvents;
  return getTrendingFallback(input);
}

function buildDedupeKey(input: RecordSearchInput, label: string): string {
  return JSON.stringify({
    label,
    query: input.query?.trim().toLowerCase() || null,
    cuisine: input.cuisine?.trim().toLowerCase() || null,
    diningStyles: [...(input.diningStyles ?? [])].sort(),
    occasions: [...(input.occasions ?? [])].sort(),
    meals: [...(input.meals ?? [])].sort(),
    dietaryTags: [...(input.dietaryTags ?? [])].sort(),
    amenities: [...(input.amenities ?? [])].sort(),
    restaurantId: input.restaurantId ?? null,
  });
}

async function deriveSearchMeta(input: RecordSearchInput): Promise<{
  term: string;
  kind: TrendingSearchKind;
  label: string;
}> {
  if (input.restaurantId) {
    const restaurant = await Restaurant.findById(input.restaurantId).select('name').lean();
    const name = restaurant?.name ?? input.query?.trim() ?? 'Restaurant';
    return { term: name, kind: 'QUERY', label: name };
  }
  if (input.query?.trim()) {
    const q = input.query.trim();
    return { term: q, kind: 'QUERY', label: q };
  }
  if (input.cuisine) {
    return { term: input.cuisine, kind: 'CUISINE', label: input.cuisine };
  }
  if (input.diningStyles?.length) {
    const term = input.diningStyles[0]!;
    return { term, kind: 'DINING_STYLE', label: term };
  }
  if (input.occasions?.length) {
    const term = input.occasions[0]!;
    return { term, kind: 'OCCASION', label: term };
  }
  if (input.meals?.length) {
    const term = input.meals[0]!;
    return { term, kind: 'MEAL', label: term };
  }
  if (input.dietaryTags?.length) {
    const term = input.dietaryTags[0]!;
    return { term, kind: 'DIETARY', label: term };
  }
  if (input.amenities?.length) {
    const term = input.amenities[0]!;
    return { term, kind: 'AMENITY', label: term };
  }
  return { term: 'Restaurants', kind: 'QUERY', label: 'Restaurants' };
}

export async function recordSearch(
  input: RecordSearchInput,
  userId?: string | null,
): Promise<boolean> {
  const meta = await deriveSearchMeta(input);
  const { city, state } = scopeKey(input);

  await SearchEvent.create({
    term: meta.term,
    kind: meta.kind,
    city,
    state,
    userId: userId ?? undefined,
  });

  if (!userId) return true;

  const dedupeKey = buildDedupeKey(input, meta.label);
  const now = new Date();

  await UserSearchHistory.findOneAndUpdate(
    { userId, dedupeKey },
    {
      $set: {
        label: meta.label,
        query: input.query?.trim() || undefined,
        cuisine: input.cuisine?.trim() || undefined,
        diningStyles: input.diningStyles ?? [],
        occasions: input.occasions ?? [],
        meals: input.meals ?? [],
        dietaryTags: input.dietaryTags ?? [],
        amenities: input.amenities ?? [],
        city,
        state,
        restaurantId: input.restaurantId ?? undefined,
        searchedAt: now,
      },
    },
    { upsert: true },
  );

  const entries = await UserSearchHistory.find({ userId })
    .sort({ searchedAt: -1 })
    .select('_id')
    .lean();

  if (entries.length > RECENT_SEARCH_CAP) {
    const staleIds = entries.slice(RECENT_SEARCH_CAP).map((entry) => entry._id);
    await UserSearchHistory.deleteMany({ _id: { $in: staleIds } });
  }

  return true;
}

export async function getMyRecentSearches(
  userId: string,
  limit = 8,
): Promise<RecentSearchEntry[]> {
  const docs = await UserSearchHistory.find({ userId })
    .sort({ searchedAt: -1 })
    .limit(Math.min(limit, RECENT_SEARCH_CAP))
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    label: doc.label,
    query: doc.query ?? null,
    cuisine: doc.cuisine ?? null,
    diningStyles: doc.diningStyles ?? [],
    occasions: doc.occasions ?? [],
    meals: doc.meals ?? [],
    dietaryTags: doc.dietaryTags ?? [],
    amenities: doc.amenities ?? [],
    city: doc.city ?? null,
    state: doc.state ?? null,
    searchedAt: doc.searchedAt,
  }));
}

export async function clearRecentSearch(userId: string, id: string): Promise<boolean> {
  const res = await UserSearchHistory.deleteOne({ _id: id, userId });
  return res.deletedCount > 0;
}

export async function clearRecentSearches(userId: string): Promise<boolean> {
  await UserSearchHistory.deleteMany({ userId });
  return true;
}
