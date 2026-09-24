import { cache } from 'react';
import { DEFAULT_LOCATION } from '@/lib/cities';
import { serverGraphql } from '@/lib/serverGraphql';

export type HomeSearchSeedItem = {
  id: string;
  name: string;
  slug?: string | null;
  cuisine: string;
  priceRange: number;
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
    lat: number;
    lng: number;
    radiusKm: number;
    date: string;
    partySize: number;
    page: number;
    limit: number;
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
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Default home grid seed (NYC + tomorrow + party 2). Short revalidate — slots move. */
export const fetchHomeSearchSeed = cache(async (): Promise<HomeSearchSeed | null> => {
  const input = {
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    radiusKm: 16,
    date: defaultSeedDate(),
    partySize: 2,
    page: 1,
    limit: 24,
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
