import {
  normalizeRestaurantCuisines,
  restaurantProfileChangeSchema,
  type RestaurantInput,
  type RestaurantProfileChange,
} from '@reservations/shared';

export type RestaurantProfileSource = {
  name?: string | null;
  description?: string | null;
  cuisine?: string | null;
  cuisines?: string[] | null;
  priceRange?: number | null;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
    neighborhood?: string | null;
  } | null;
  location?: { coordinates?: number[] | null; lat?: number | null; lng?: number | null } | null;
  categoryIds?: string[] | null;
  landmarkIds?: string[] | null;
  diningStyles?: string[] | null;
  discoveryOccasions?: string[] | null;
  meals?: string[] | null;
  dietaryTags?: string[] | null;
  amenities?: string[] | null;
  wheelchairAccessible?: boolean | null;
  faq?: Array<{ question: string; answer: string }> | null;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }> | null;
  termsAndConditions?: string | null;
  photos?: string[] | null;
  logoUrl?: string | null;
};

/** Guest-facing fields a partner edit must not publish on a live restaurant. */
export const PUBLIC_LISTING_DB_KEYS = [
  'name',
  'description',
  'cuisine',
  'cuisines',
  'priceRange',
  'phone',
  'website',
  'menuUrl',
  'photos',
  'logoUrl',
  'address',
  'location',
  'categoryIds',
  'landmarkIds',
  'diningStyles',
  'discoveryOccasions',
  'meals',
  'dietaryTags',
  'amenities',
  'wheelchairAccessible',
  'faq',
  'featuredIn',
  'termsAndConditions',
] as const;

const DISCOVERY_DEFAULTS: Record<string, unknown> = {
  description: '',
  neighborhood: '',
  categoryIds: [],
  landmarkIds: [],
  diningStyles: [],
  discoveryOccasions: [],
  meals: [],
  dietaryTags: [],
  amenities: [],
  wheelchairAccessible: false,
  faq: [],
  featuredIn: [],
  termsAndConditions: '',
  photos: [],
  logoUrl: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function roundCoord(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

function readLocation(restaurant: RestaurantProfileSource) {
  const point = restaurant.location;
  if (point && Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
    return { lng: Number(point.coordinates[0]), lat: Number(point.coordinates[1]) };
  }
  return { lng: Number(point?.lng ?? 0), lat: Number(point?.lat ?? 0) };
}

export function restaurantProfileSnapshot(restaurant: RestaurantProfileSource): RestaurantProfileChange {
  const cuisines = normalizeRestaurantCuisines({
    cuisine: restaurant.cuisine,
    cuisines: restaurant.cuisines,
  });
  return restaurantProfileChangeSchema.parse({
    name: restaurant.name?.trim() || 'Restaurant',
    description: restaurant.description ?? '',
    cuisine: cuisines.cuisine || 'Other',
    cuisines: cuisines.cuisines.length > 0 ? cuisines.cuisines : ['Other'],
    priceRange: restaurant.priceRange && restaurant.priceRange >= 1 ? restaurant.priceRange : 2,
    phone: restaurant.phone ?? null,
    website: restaurant.website ?? null,
    menuUrl: restaurant.menuUrl ?? null,
    address: {
      line1: restaurant.address?.line1 || 'Unknown',
      line2: restaurant.address?.line2 ?? '',
      city: restaurant.address?.city || 'Unknown',
      state: restaurant.address?.state || 'NY',
      zip: restaurant.address?.zip || '10000',
      country: restaurant.address?.country || 'US',
    },
    location: readLocation(restaurant),
    neighborhood: restaurant.address?.neighborhood ?? '',
    categoryIds: restaurant.categoryIds ?? [],
    landmarkIds: restaurant.landmarkIds ?? [],
    diningStyles: restaurant.diningStyles ?? [],
    discoveryOccasions: restaurant.discoveryOccasions ?? [],
    meals: restaurant.meals ?? [],
    dietaryTags: restaurant.dietaryTags ?? [],
    amenities: restaurant.amenities ?? [],
    wheelchairAccessible: restaurant.wheelchairAccessible ?? false,
    faq: (restaurant.faq ?? []).map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    featuredIn: (restaurant.featuredIn ?? []).map((item) => ({
      title: item.title,
      description: item.description ?? undefined,
      url: item.url ?? undefined,
      logoUrl: item.logoUrl ?? undefined,
    })),
    termsAndConditions: restaurant.termsAndConditions ?? '',
    photos: restaurant.photos ?? [],
    logoUrl: restaurant.logoUrl ?? null,
  });
}

export function fallbackProfileChange(): RestaurantProfileChange {
  return restaurantProfileSnapshot({});
}

export function profileChangeToDbSet(profile: RestaurantProfileChange) {
  const cuisines = normalizeRestaurantCuisines(profile);
  return {
    name: profile.name,
    description: profile.description ?? '',
    cuisine: cuisines.cuisine,
    cuisines: cuisines.cuisines,
    priceRange: profile.priceRange,
    phone: profile.phone ?? null,
    website: profile.website ?? null,
    menuUrl: profile.menuUrl ?? null,
    categoryIds: profile.categoryIds,
    landmarkIds: profile.landmarkIds,
    diningStyles: profile.diningStyles,
    discoveryOccasions: profile.discoveryOccasions,
    meals: profile.meals,
    dietaryTags: profile.dietaryTags,
    amenities: profile.amenities,
    wheelchairAccessible: profile.wheelchairAccessible,
    faq: profile.faq,
    featuredIn: profile.featuredIn,
    termsAndConditions: profile.termsAndConditions ?? '',
    photos: profile.photos,
    logoUrl: profile.logoUrl ?? null,
    address: {
      line1: profile.address.line1,
      line2: profile.address.line2 ?? '',
      city: profile.address.city,
      state: profile.address.state,
      zip: profile.address.zip,
      country: profile.address.country || 'US',
      neighborhood: profile.neighborhood ?? '',
    },
    location: {
      type: 'Point' as const,
      coordinates: [profile.location.lng, profile.location.lat],
    },
  };
}

export function profileChangesEqual(a: RestaurantProfileChange, b: RestaurantProfileChange) {
  return JSON.stringify(normalizeProfileChange(a)) === JSON.stringify(normalizeProfileChange(b));
}

export function mergeProfileChange(base: RestaurantProfileChange, raw: unknown): RestaurantProfileChange {
  const patch = asRecord(raw);
  const next: Record<string, unknown> = {
    ...base,
    address: { ...base.address },
    location: { ...base.location },
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || key === 'address' || key === 'location' || key === 'cuisine' || key === 'cuisines') {
      continue;
    }
    next[key] = value === null && key === 'description' ? '' : value;
  }

  if (patch.address && typeof patch.address === 'object') {
    const address = patch.address as Record<string, unknown>;
    next.address = {
      ...base.address,
      ...(address.line1 !== undefined ? { line1: address.line1 } : {}),
      ...(address.line2 !== undefined ? { line2: address.line2 ?? '' } : {}),
      ...(address.city !== undefined ? { city: address.city } : {}),
      ...(address.state !== undefined ? { state: address.state } : {}),
      ...(address.zip !== undefined ? { zip: address.zip } : {}),
      ...(address.country !== undefined ? { country: address.country || 'US' } : {}),
    };
    if (address.neighborhood !== undefined && patch.neighborhood === undefined) {
      next.neighborhood = address.neighborhood ?? '';
    }
  }

  if (patch.location && typeof patch.location === 'object') {
    const location = patch.location as Record<string, unknown>;
    next.location = {
      lng: typeof location.lng === 'number' ? location.lng : base.location.lng,
      lat: typeof location.lat === 'number' ? location.lat : base.location.lat,
    };
  }

  if (patch.cuisines !== undefined || patch.cuisine !== undefined) {
    const normalized = normalizeRestaurantCuisines({
      cuisine: typeof patch.cuisine === 'string' ? patch.cuisine : undefined,
      cuisines: Array.isArray(patch.cuisines) ? (patch.cuisines as string[]) : undefined,
    });
    if (normalized.cuisine) {
      next.cuisine = normalized.cuisine;
      next.cuisines = normalized.cuisines;
    }
  }

  return restaurantProfileChangeSchema.parse(next);
}

/**
 * Public profile form: replace discovery fields (omitted ones clear) and keep
 * listing fields the form does not edit, including a pending name or cuisine.
 */
export function proposalFromProfileRequest(
  live: RestaurantProfileChange,
  pendingStored: unknown | null,
  rawProfile: unknown,
) {
  const base = pendingStored ? mergeProfileChange(live, pendingStored) : live;
  const overlay: Record<string, unknown> = { ...DISCOVERY_DEFAULTS };
  for (const [key, value] of Object.entries(asRecord(rawProfile))) {
    if (value !== undefined) overlay[key] = value;
  }
  return mergeProfileChange(base, overlay);
}

function desiredListingFromInput(
  input: RestaurantInput,
  raw: Record<string, unknown>,
  mode: 'delta' | 'replace',
) {
  const include = (key: string) => mode === 'replace' || Object.prototype.hasOwnProperty.call(raw, key);
  const listing: Record<string, unknown> = {};
  if (include('name')) listing.name = input.name;
  if (include('description')) listing.description = input.description ?? '';
  if (include('priceRange')) listing.priceRange = input.priceRange;
  if (include('phone')) listing.phone = input.phone ?? null;
  if (include('website')) listing.website = input.website ?? null;
  if (include('menuUrl')) listing.menuUrl = input.menuUrl ?? null;
  if (include('photos')) listing.photos = input.photos ?? [];
  if (include('logoUrl')) listing.logoUrl = input.logoUrl ?? null;
  if (include('address')) {
    listing.address = {
      line1: input.address.line1,
      line2: input.address.line2 ?? '',
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
      country: input.address.country || 'US',
    };
  }
  if (include('location')) {
    listing.location = { lat: input.location.lat, lng: input.location.lng };
  }
  if (
    mode === 'replace' ||
    Object.prototype.hasOwnProperty.call(raw, 'cuisine') ||
    Object.prototype.hasOwnProperty.call(raw, 'cuisines')
  ) {
    listing.cuisine = input.cuisine;
    listing.cuisines = input.cuisines;
  }
  return listing;
}

/** Listing keys to merge onto the pending request. `replace` is the restaurant profile editor. */
export function listingPatchFromRestaurantUpdate(opts: {
  live: RestaurantProfileChange;
  input: RestaurantInput;
  raw: Record<string, unknown>;
  mode: 'delta' | 'replace';
}) {
  const desired = desiredListingFromInput(opts.input, opts.raw, opts.mode);
  if (opts.mode === 'replace') {
    if (!Object.prototype.hasOwnProperty.call(opts.raw, 'description')) desired.description = '';
    if (!Object.prototype.hasOwnProperty.call(opts.raw, 'phone')) desired.phone = null;
    if (!Object.prototype.hasOwnProperty.call(opts.raw, 'website')) desired.website = null;
    return desired;
  }

  const patch: Record<string, unknown> = {};
  const cuisineKeys = new Set(['cuisine', 'cuisines']);
  for (const [key, value] of Object.entries(desired)) {
    if (cuisineKeys.has(key)) continue;
    const next = mergeProfileChange(opts.live, { [key]: value });
    if (!profileChangesEqual(opts.live, next)) patch[key] = value;
  }
  if (desired.cuisine !== undefined || desired.cuisines !== undefined) {
    const next = mergeProfileChange(opts.live, {
      cuisine: desired.cuisine,
      cuisines: desired.cuisines,
    });
    if (!profileChangesEqual(opts.live, next)) {
      patch.cuisine = desired.cuisine;
      patch.cuisines = desired.cuisines;
    }
  }
  return patch;
}

export function omitPublicListingFields<T extends Record<string, unknown>>(db: T) {
  const next = { ...db };
  for (const key of PUBLIC_LISTING_DB_KEYS) delete next[key];
  return next;
}

const DISCOVERY_DB_KEYS = [
  'categoryIds',
  'landmarkIds',
  'diningStyles',
  'discoveryOccasions',
  'meals',
  'dietaryTags',
  'amenities',
  'wheelchairAccessible',
  'faq',
  'featuredIn',
  'termsAndConditions',
] as const;

/** Drop discovery tags the client did not send so a listing save cannot clear them. */
export function omitUnsentDiscoveryFields<T extends Record<string, unknown>>(
  db: T,
  raw: Record<string, unknown>,
) {
  const next = { ...db };
  for (const key of DISCOVERY_DB_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) delete next[key];
  }
  return next;
}

function normalizeProfileChange(profile: RestaurantProfileChange) {
  const cuisines = normalizeRestaurantCuisines(profile);
  return {
    name: profile.name.trim(),
    description: profile.description?.trim() ?? '',
    cuisine: cuisines.cuisine,
    cuisines: cuisines.cuisines,
    priceRange: profile.priceRange,
    phone: profile.phone?.trim() || null,
    website: profile.website?.trim() || null,
    menuUrl: profile.menuUrl?.trim() || null,
    address: {
      line1: profile.address.line1.trim(),
      line2: profile.address.line2?.trim() ?? '',
      city: profile.address.city.trim(),
      state: profile.address.state.trim(),
      zip: profile.address.zip.trim(),
      country: (profile.address.country || 'US').trim(),
    },
    location: {
      lat: roundCoord(profile.location.lat),
      lng: roundCoord(profile.location.lng),
    },
    neighborhood: profile.neighborhood?.trim() ?? '',
    categoryIds: profile.categoryIds,
    landmarkIds: profile.landmarkIds,
    diningStyles: profile.diningStyles,
    discoveryOccasions: profile.discoveryOccasions,
    meals: profile.meals,
    dietaryTags: profile.dietaryTags,
    amenities: profile.amenities,
    wheelchairAccessible: profile.wheelchairAccessible,
    faq: profile.faq.map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    })),
    featuredIn: profile.featuredIn.map((item) => ({
      title: item.title.trim(),
      description: item.description?.trim() ?? '',
      url: item.url ?? '',
      logoUrl: item.logoUrl ?? '',
    })),
    termsAndConditions: profile.termsAndConditions?.trim() ?? '',
    photos: profile.photos,
    logoUrl: profile.logoUrl ?? null,
  };
}
