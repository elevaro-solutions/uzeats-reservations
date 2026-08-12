import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { isMongoObjectId, buildRestaurantBookingPath } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { buildRestaurantFaq } from '@/lib/restaurantFaq';
import { fetchRestaurantSeo } from '@/lib/restaurantSeoFetch';
import { absoluteUrl, faqJsonLd, restaurantJsonLd } from '@/lib/seo';
import {
  formatOpeningHoursLines,
  openingHoursSpecificationFromShifts,
} from '@/lib/openingHours';
import RestaurantPageClient from './RestaurantPageClient';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function searchParamsToQuery(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await fetchRestaurantSeo(id);
  if (!restaurant) {
    return {
      title: 'Restaurant | Tablevera',
      description: 'Discover this restaurant and reserve a table on Tablevera.',
    };
  }

  const path = buildRestaurantBookingPath(restaurant.slug, restaurant.id);
  const title = `${restaurant.name} — ${restaurant.cuisine} in ${restaurant.address.city} | Tablevera`;
  const description =
    restaurant.description?.trim() ||
    `Reserve a table at ${restaurant.name}, a ${restaurant.cuisine} restaurant in ${restaurant.address.city}, ${restaurant.address.state}. Live availability on Tablevera.`;
  const image = restaurant.photos?.[0];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(path),
      images: image ? [{ url: image, alt: restaurant.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function RestaurantPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const restaurant = await fetchRestaurantSeo(id);

  if (restaurant && isMongoObjectId(id) && restaurant.slug) {
    permanentRedirect(`/r/${restaurant.slug}${searchParamsToQuery(query)}`);
  }

  if (!restaurant) {
    return <RestaurantPageClient />;
  }

  const openingHoursLines = formatOpeningHoursLines(restaurant.shifts ?? []);
  const faq = buildRestaurantFaq({ ...restaurant, openingHoursLines });

  return (
    <>
      <JsonLd
        data={[
          restaurantJsonLd({
            ...restaurant,
            location: restaurant.location,
            dietaryTags: restaurant.dietaryTags,
            amenities: restaurant.amenities,
            meals: restaurant.meals,
            openingHoursSpecification: openingHoursSpecificationFromShifts(
              restaurant.shifts ?? [],
            ),
          }),
          faqJsonLd(faq),
        ]}
      />
      <RestaurantPageClient />
    </>
  );
}
