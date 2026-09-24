import { cache } from 'react';
import { isMongoObjectId } from '@reservations/shared';
import { serverGraphql } from '@/lib/serverGraphql';

export type RestaurantSeoShift = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active: boolean;
};

/** SSR restaurant payload — matches RESTAURANT_DETAIL minus auth-only bookmark flags. */
export type RestaurantSeoData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  diningStyles?: string[];
  discoveryOccasions?: string[];
  categoryIds?: string[];
  landmarkIds?: string[];
  photos: string[];
  logoUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  depositRequired: boolean;
  depositAmountCents: number;
  dietaryTags: string[];
  amenities: string[];
  meals: string[];
  wheelchairAccessible?: boolean;
  featured?: boolean;
  faq: Array<{ question: string; answer: string }>;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }>;
  termsAndConditions?: string | null;
  isSaved?: boolean;
  isFavorite?: boolean;
  loyaltyEnabled?: boolean;
  loyaltyPointsPerVisit?: number;
  loyaltyMinRedeemPoints?: number;
  allowGuestTableSelection?: boolean;
  reservationsEnabled?: boolean;
  reservationsVisible?: boolean;
  shifts: RestaurantSeoShift[];
  timezone?: string | null;
  bookingWindow?: { maxAdvanceDays: number; minAdvanceHours: number } | null;
  menu?: {
    sections: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
        name: string;
        description?: string | null;
        priceCents: number;
        dietary?: string[];
        photoUrl?: string | null;
        popular?: boolean;
      }>;
    }>;
  } | null;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
    neighborhood?: string | null;
  };
  location: { lat: number; lng: number };
};

const RESTAURANT_PAGE_QUERY = `
  query RestaurantPage($id: ID, $slug: String) {
    restaurant(id: $id, slug: $slug) {
      id
      name
      slug
      description
      cuisine
      priceRange
      address {
        line1
        line2
        city
        state
        zip
        neighborhood
      }
      location {
        lat
        lng
      }
      phone
      website
      menuUrl
      diningStyles
      discoveryOccasions
      categoryIds
      landmarkIds
      dietaryTags
      amenities
      meals
      wheelchairAccessible
      featured
      faq {
        question
        answer
      }
      featuredIn {
        title
        description
        url
        logoUrl
      }
      termsAndConditions
      photos
      logoUrl
      averageRating
      reviewCount
      isSaved
      isFavorite
      depositRequired
      depositAmountCents
      loyaltyEnabled
      loyaltyPointsPerVisit
      loyaltyMinRedeemPoints
      allowGuestTableSelection
      reservationsEnabled
      reservationsVisible
      shifts {
        daysOfWeek
        startTime
        endTime
        active
      }
      timezone
      bookingWindow {
        maxAdvanceDays
        minAdvanceHours
      }
      menu {
        sections {
          id
          name
          items {
            id
            name
            description
            priceCents
            dietary
            photoUrl
            popular
          }
        }
      }
    }
  }
`;

export const fetchRestaurantSeo = cache(async function fetchRestaurantSeo(
  slugOrId: string,
): Promise<RestaurantSeoData | null> {
  try {
    const variables = isMongoObjectId(slugOrId)
      ? { id: slugOrId }
      : { slug: slugOrId };
    const data = await serverGraphql<{ restaurant: RestaurantSeoData | null }>(
      RESTAURANT_PAGE_QUERY,
      variables,
      { revalidate: 120, tags: [`restaurant:${slugOrId}`] },
    );
    return data.restaurant;
  } catch {
    return null;
  }
});

const SITEMAP_RESTAURANTS_QUERY = `
  query SitemapRestaurants($page: Int!, $limit: Int!) {
    searchRestaurants(input: { page: $page, limit: $limit, requireAvailability: false }) {
      items {
        id
        slug
        createdAt
      }
      total
      page
      limit
    }
  }
`;

export async function fetchRestaurantSitemapEntries(): Promise<
  Array<{ slug: string; id: string; createdAt?: string | null }>
> {
  const pageSize = 50;
  const maxPages = 40;
  const entries: Array<{ slug: string; id: string; createdAt?: string | null }> = [];

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const data = await serverGraphql<{
        searchRestaurants: {
          items: Array<{ id: string; slug: string; createdAt?: string | null }>;
          total: number;
          page: number;
          limit: number;
        };
      }>(SITEMAP_RESTAURANTS_QUERY, { page, limit: pageSize });

      const { items, total } = data.searchRestaurants;
      for (const item of items) {
        if (item.slug) entries.push(item);
      }

      if (entries.length >= total || items.length < pageSize) break;
    }
  } catch {
    return entries;
  }

  return entries;
}
