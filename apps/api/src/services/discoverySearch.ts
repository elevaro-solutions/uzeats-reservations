import type { Types } from 'mongoose';
import type { AvailabilitySlot, SearchRestaurantsInput } from '@reservations/shared';
import {
  getAvailabilityForRestaurants,
  previewAvailableSlotTimes,
} from './availability.js';
import { listActiveCategoryDefs } from './discoveryTaxonomy.js';

type RestaurantLike = { _id: Types.ObjectId | { toString(): string } };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendAndClause(filter: Record<string, unknown>, clause: Record<string, unknown>) {
  if (filter.$and) {
    (filter.$and as Record<string, unknown>[]).push(clause);
    return;
  }
  const { $and: _ignored, ...rest } = filter;
  Object.keys(filter).forEach((key) => delete filter[key]);
  Object.assign(filter, { $and: [{ ...rest }, clause] });
}

function buildCategoryOrClause(
  categoryIds: string[],
  categories: Array<{ id: string; cuisine?: string; query?: string }>,
): Record<string, unknown> | null {
  const matched = categories.filter((c) => categoryIds.includes(c.id));
  if (matched.length === 0) return null;

  const ids = matched.map((c) => c.id);
  const or: Record<string, unknown>[] = [{ categoryIds: { $in: ids } }];
  for (const category of matched) {
    if (category.cuisine) or.push({ cuisine: category.cuisine });
    if (category.query) {
      const pattern = new RegExp(escapeRegex(category.query), 'i');
      or.push({
        $or: [{ name: pattern }, { cuisine: pattern }, { description: pattern }],
      });
    }
  }
  return { $or: or };
}

export async function buildDiscoverySearchFilter(
  input: SearchRestaurantsInput,
): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = { status: 'approved' };

  if (input.query) {
    const q = input.query.trim();
    if (q) {
      // Multi-word → text index. Single token → regex so prefix/substring UX works
      // ("sam" → Samarkand). applyGeoToFilter demotes $text when $near is attached.
      if (/\s/.test(q)) {
        filter.$text = { $search: q };
      } else {
        const pattern = new RegExp(escapeRegex(q), 'i');
        filter.$or = [
          { name: pattern },
          { cuisine: pattern },
          { description: pattern },
          { 'address.city': pattern },
          { 'address.neighborhood': pattern },
        ];
      }
    }
  }

  const cuisineValues = [
    ...(input.cuisines ?? []),
    ...(input.cuisine ? [input.cuisine] : []),
  ];
  const uniqueCuisines = [...new Set(cuisineValues)];
  if (uniqueCuisines.length === 1) filter.cuisine = uniqueCuisines[0];
  else if (uniqueCuisines.length > 1) filter.cuisine = { $in: uniqueCuisines };

  if (input.priceRange) filter.priceRange = input.priceRange;
  if (input.city) filter['address.city'] = new RegExp(`^${escapeRegex(input.city)}$`, 'i');
  if (input.state) filter['address.state'] = new RegExp(`^${escapeRegex(input.state)}$`, 'i');
  if (input.neighborhood) {
    filter['address.neighborhood'] = new RegExp(`^${escapeRegex(input.neighborhood)}$`, 'i');
  }
  if (input.occasions?.length) filter.discoveryOccasions = { $in: input.occasions };
  if (input.diningStyles?.length) filter.diningStyles = { $in: input.diningStyles };
  if (input.meals?.length) filter.meals = { $in: input.meals };
  if (input.dietaryTags?.length) filter.dietaryTags = { $in: input.dietaryTags };
  if (input.amenities?.length) filter.amenities = { $in: input.amenities };
  if (input.minRating != null) filter.averageRating = { $gte: input.minRating };

  if (input.categoryIds?.length) {
    const categories = await listActiveCategoryDefs();
    const categoryClause = buildCategoryOrClause(input.categoryIds, categories);
    if (categoryClause) appendAndClause(filter, categoryClause);
  }

  if (input.wheelchairAccessible) {
    const accessibilityClause = {
      $or: [{ wheelchairAccessible: true }, { amenities: 'Wheelchair Accessible' }],
    };
    if (filter.$or) {
      const textOr = filter.$or;
      delete filter.$or;
      appendAndClause(filter, { $or: textOr });
    }
    appendAndClause(filter, accessibilityClause);
  }

  return filter;
}

/** Convert `$text` to regex `$or` — required when the query also uses `$near`. */
export function demoteTextSearchToRegex(filter: Record<string, unknown>): void {
  const text = filter.$text as { $search?: string } | undefined;
  if (!text?.$search) return;
  const pattern = new RegExp(escapeRegex(text.$search.trim()), 'i');
  delete filter.$text;
  const textOr = {
    $or: [
      { name: pattern },
      { cuisine: pattern },
      { description: pattern },
      { 'address.city': pattern },
      { 'address.neighborhood': pattern },
    ],
  };
  appendAndClause(filter, textOr);
}

export function applyGeoToFilter(
  filter: Record<string, unknown>,
  input: SearchRestaurantsInput,
): { filter: Record<string, unknown>; countFilter: Record<string, unknown>; usingGeo: boolean } {
  const usingGeo = input.lat != null && input.lng != null;
  const landmarkIds = [...new Set((input.landmarkIds ?? []).map((id) => id.trim()).filter(Boolean))];

  const cloneFilter = (): Record<string, unknown> => ({
    ...filter,
    ...(Array.isArray(filter.$and) ? { $and: [...(filter.$and as unknown[])] } : {}),
  });

  if (usingGeo) {
    const coordinates = [input.lng!, input.lat!];
    const maxDistanceMeters = (input.radiusKm ?? 25) * 1000;
    const geoWithin = {
      $geoWithin: {
        $centerSphere: [coordinates, maxDistanceMeters / 6_378_100],
      },
    };

    if (landmarkIds.length) {
      // Tagged landmarks OR nearby — $near cannot sit inside $or.
      // $text is fine with $geoWithin / $or; keep it.
      const clause = {
        $or: [{ landmarkIds: { $in: landmarkIds } }, { location: geoWithin }],
      };
      appendAndClause(filter, clause);
      const countFilter = cloneFilter();
      return { filter, countFilter, usingGeo };
    }

    // $text + $near is illegal in MongoDB — fall back to regex before attaching $near.
    demoteTextSearchToRegex(filter);
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistanceMeters,
      },
    };
    const countFilter = cloneFilter();
    countFilter.location = geoWithin;
    return { filter, countFilter, usingGeo };
  }

  if (landmarkIds.length) {
    filter.landmarkIds = { $in: landmarkIds };
  }
  return { filter, countFilter: cloneFilter(), usingGeo };
}

function slotMatchesTime(isoTime: string, timeHm?: string): boolean {
  if (!timeHm) return true;
  const d = new Date(isoTime);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return hm === timeHm;
}

export type AvailabilityFilterResult<T extends RestaurantLike> = {
  restaurants: T[];
  slotsByRestaurantId: Map<string, AvailabilitySlot[]>;
};

/**
 * Filter restaurants that have at least one open slot on the date.
 * Loads availability once for the whole candidate set (batched Mongo reads).
 * Preserves input order.
 */
export async function filterByAvailability<T extends RestaurantLike>(
  restaurants: T[],
  date: string,
  partySize: number,
  time?: string,
): Promise<AvailabilityFilterResult<T>> {
  const slotsByRestaurantId = await getAvailabilityForRestaurants({
    restaurantIds: restaurants.map((r) => r._id.toString()),
    date,
    partySize,
  });

  const filtered = restaurants.filter((restaurant) => {
    const slots = slotsByRestaurantId.get(restaurant._id.toString()) ?? [];
    return slots.some((s) => s.available && slotMatchesTime(s.time, time));
  });

  return { restaurants: filtered, slotsByRestaurantId };
}

export async function restaurantIdsWithAvailability(
  restaurantIds: string[],
  date: string,
  partySize: number,
  time?: string,
): Promise<Set<string>> {
  const slotsByRestaurantId = await getAvailabilityForRestaurants({
    restaurantIds,
    date,
    partySize,
  });
  const available = new Set<string>();
  for (const id of restaurantIds) {
    const slots = slotsByRestaurantId.get(id) ?? [];
    if (slots.some((s) => s.available && slotMatchesTime(s.time, time))) {
      available.add(id);
    }
  }
  return available;
}

export function availableSlotTimesForRestaurant(
  slotsByRestaurantId: Map<string, AvailabilitySlot[]>,
  restaurantId: string,
  time?: string,
  limit = 4,
): string[] {
  const slots = slotsByRestaurantId.get(restaurantId) ?? [];
  const matching = time
    ? slots.filter((s) => s.available && slotMatchesTime(s.time, time))
    : slots;
  return previewAvailableSlotTimes(matching, limit);
}
