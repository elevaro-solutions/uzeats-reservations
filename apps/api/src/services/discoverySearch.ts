import type { Types } from 'mongoose';
import type { SearchRestaurantsInput } from '@reservations/shared';
import { RESTAURANT_DISCOVERY_CATEGORIES } from '@reservations/shared';
import { getAvailability } from './availability.js';

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

function buildCategoryOrClause(categoryIds: string[]): Record<string, unknown> | null {
  const categories = RESTAURANT_DISCOVERY_CATEGORIES.filter((c) => categoryIds.includes(c.id));
  if (categories.length === 0) return null;

  const or: Record<string, unknown>[] = [];
  for (const category of categories) {
    if ('cuisine' in category) or.push({ cuisine: category.cuisine });
    if ('query' in category) {
      const pattern = new RegExp(escapeRegex(category.query), 'i');
      or.push({
        $or: [{ name: pattern }, { cuisine: pattern }, { description: pattern }],
      });
    }
  }
  return or.length ? { $or: or } : null;
}

export function buildDiscoverySearchFilter(
  input: SearchRestaurantsInput,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: 'approved' };
  const usingGeo = input.lat != null && input.lng != null;

  if (input.query) {
    if (usingGeo) {
      const q = input.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (q) {
        const pattern = new RegExp(q, 'i');
        filter.$or = [
          { name: pattern },
          { cuisine: pattern },
          { description: pattern },
          { 'address.city': pattern },
          { 'address.neighborhood': pattern },
        ];
      }
    } else {
      filter.$text = { $search: input.query };
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
  if (input.neighborhood) {
    filter['address.neighborhood'] = new RegExp(`^${escapeRegex(input.neighborhood)}$`, 'i');
  }
  if (input.occasions?.length) filter.discoveryOccasions = { $in: input.occasions };
  if (input.diningStyles?.length) filter.diningStyles = { $in: input.diningStyles };
  if (input.meals?.length) filter.meals = { $in: input.meals };
  if (input.dietaryTags?.length) filter.dietaryTags = { $in: input.dietaryTags };
  if (input.amenities?.length) filter.amenities = { $in: input.amenities };
  if (input.minRating != null) filter.averageRating = { $gte: input.minRating };

  const categoryClause = input.categoryIds?.length
    ? buildCategoryOrClause(input.categoryIds)
    : null;
  if (categoryClause) appendAndClause(filter, categoryClause);

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

export function applyGeoToFilter(
  filter: Record<string, unknown>,
  input: SearchRestaurantsInput,
): { filter: Record<string, unknown>; countFilter: Record<string, unknown>; usingGeo: boolean } {
  const usingGeo = input.lat != null && input.lng != null;
  const countFilter = { ...filter };

  if (usingGeo) {
    const coordinates = [input.lng!, input.lat!];
    const maxDistanceMeters = (input.radiusKm ?? 25) * 1000;
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistanceMeters,
      },
    };
    countFilter.location = {
      $geoWithin: {
        $centerSphere: [coordinates, maxDistanceMeters / 6_378_100],
      },
    };
  }

  return { filter, countFilter, usingGeo };
}

function slotMatchesTime(isoTime: string, timeHm?: string): boolean {
  if (!timeHm) return true;
  const d = new Date(isoTime);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return hm === timeHm;
}

export async function filterByAvailability<T extends RestaurantLike>(
  restaurants: T[],
  date: string,
  partySize: number,
  time?: string,
): Promise<T[]> {
  const available: T[] = [];
  await Promise.all(
    restaurants.map(async (restaurant) => {
      const slots = await getAvailability({
        restaurantId: restaurant._id.toString(),
        date,
        partySize,
      });
      if (slots.some((s) => s.available && slotMatchesTime(s.time, time))) {
        available.push(restaurant);
      }
    }),
  );
  return available;
}

export async function restaurantIdsWithAvailability(
  restaurantIds: string[],
  date: string,
  partySize: number,
  time?: string,
): Promise<Set<string>> {
  const available = new Set<string>();
  await Promise.all(
    restaurantIds.map(async (id) => {
      const slots = await getAvailability({ restaurantId: id, date, partySize });
      if (slots.some((s) => s.available && slotMatchesTime(s.time, time))) {
        available.add(id);
      }
    }),
  );
  return available;
}
