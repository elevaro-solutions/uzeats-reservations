import { cache } from 'react';
import { isMongoObjectId } from '@reservations/shared';
import { serverGraphql } from '@/lib/serverGraphql';

export type RestaurantSeoShift = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active: boolean;
};

export type RestaurantSeoData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cuisine: string;
  priceRange: number;
  phone?: string | null;
  website?: string | null;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  depositRequired: boolean;
  depositAmountCents: number;
  dietaryTags: string[];
  amenities: string[];
  meals: string[];
  faq: Array<{ question: string; answer: string }>;
  shifts: RestaurantSeoShift[];
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

const RESTAURANT_SEO_QUERY = `
  query RestaurantSeo($id: ID, $slug: String) {
    restaurant(id: $id, slug: $slug) {
      id
      name
      slug
      description
      cuisine
      priceRange
      phone
      website
      photos
      averageRating
      reviewCount
      depositRequired
      depositAmountCents
      dietaryTags
      amenities
      meals
      faq {
        question
        answer
      }
      shifts {
        daysOfWeek
        startTime
        endTime
        active
      }
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
      RESTAURANT_SEO_QUERY,
      variables,
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
