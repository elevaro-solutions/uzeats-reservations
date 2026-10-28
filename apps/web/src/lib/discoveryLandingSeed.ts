import { cache } from 'react';
import { PLATFORM_TIMEZONE, addCalendarDays, todayIsoInTimeZone } from '@reservations/shared';
import { serverGraphql } from '@/lib/serverGraphql';
import type { HomeSearchSeed } from '@/lib/homeSearchSeed';

export type DiscoverySearchPreset = {
  cuisine?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  occasion?: string;
  diningStyle?: string;
  meal?: string;
  dietary?: string;
  amenity?: string;
  categoryIds?: string[];
  landmarkIds?: string[];
  query?: string;
  topRatedOnly?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  locationLabel?: string;
  useGeo?: boolean;
  autoLocate?: boolean;
};

const SEARCH_QUERY = `
  query DiscoveryLandingSeed($input: SearchRestaurantsInput!) {
    searchRestaurants(input: $input) {
      total
      page
      limit
      items {
        id
        name
        slug
        cuisine
        priceRange
        timezone
        address { city state }
        location { lat lng }
        photos
        averageRating
        reviewCount
        availableSlotTimes
      }
    }
  }
`;

function defaultSeedDate(): string {
  return addCalendarDays(todayIsoInTimeZone(PLATFORM_TIMEZONE), 1);
}

export function discoverySeedInput(preset: DiscoverySearchPreset) {
  const preferGeo =
    preset.useGeo === true || (preset.useGeo !== false && Boolean(preset.neighborhood));
  return {
    query: preset.query || undefined,
    cuisine: preset.cuisine,
    city: preset.city,
    state: preset.state,
    neighborhood: preset.neighborhood,
    categoryIds: preset.categoryIds?.length ? preset.categoryIds : undefined,
    landmarkIds: preset.landmarkIds?.length ? preset.landmarkIds : undefined,
    occasions: preset.occasion ? [preset.occasion] : undefined,
    diningStyles: preset.diningStyle ? [preset.diningStyle] : undefined,
    meals: preset.meal ? [preset.meal] : undefined,
    dietaryTags: preset.dietary ? [preset.dietary] : undefined,
    amenities: preset.amenity ? [preset.amenity] : undefined,
    minRating: preset.topRatedOnly ? 4.5 : undefined,
    partySize: 2,
    date: defaultSeedDate(),
    requireAvailability: false,
    lat: preferGeo ? preset.lat : undefined,
    lng: preferGeo ? preset.lng : undefined,
    radiusKm: preferGeo ? (preset.radiusKm ?? 16) : undefined,
    page: 1,
    limit: 24,
  };
}

export const fetchDiscoveryLandingSeed = cache(async function fetchDiscoveryLandingSeed(
  preset: DiscoverySearchPreset,
): Promise<HomeSearchSeed | null> {
  const input = discoverySeedInput(preset);
  try {
    const data = await serverGraphql<{ searchRestaurants: Omit<HomeSearchSeed, 'input'> }>(
      SEARCH_QUERY,
      { input },
      { revalidate: 120, tags: ['discovery-landing'] },
    );
    return { ...data.searchRestaurants, input };
  } catch {
    return null;
  }
});
