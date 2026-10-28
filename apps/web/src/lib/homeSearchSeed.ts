import { cache } from 'react';
import { PLATFORM_TIMEZONE, addCalendarDays, todayIsoInTimeZone } from '@reservations/shared';
import { serverGraphql } from '@/lib/serverGraphql';

export type HomeSearchSeedItem = {
  id: string;
  name: string;
  slug?: string | null;
  cuisine: string;
  priceRange: number;
  timezone?: string | null;
  address: { city: string; state: string };
  location?: { lat: number; lng: number } | null;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  availableSlotTimes: string[];
};

export type HomeSearchSeed = {
  total: number;
  page: number;
  limit: number;
  items: HomeSearchSeedItem[];
  /** Variables used for the seed — client skips seed when filters diverge. */
  input: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    date: string;
    partySize: number;
    page: number;
    limit: number;
    requireAvailability: boolean;
  };
};

const SEARCH_QUERY = `
  query HomeSearchSeed($input: SearchRestaurantsInput!) {
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

/** Nationwide seed so crawlers see real partners instead of an empty NYC radius. */
export const fetchHomeSearchSeed = cache(async (): Promise<HomeSearchSeed | null> => {
  const input = {
    date: defaultSeedDate(),
    partySize: 2,
    page: 1,
    limit: 24,
    requireAvailability: false,
  };
  try {
    const data = await serverGraphql<{ searchRestaurants: Omit<HomeSearchSeed, 'input'> }>(
      SEARCH_QUERY,
      { input },
      { revalidate: 60, tags: ['home-search'] },
    );
    return { ...data.searchRestaurants, input };
  } catch {
    return null;
  }
});
