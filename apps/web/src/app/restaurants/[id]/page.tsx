import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { buildRestaurantBookingPath, citySlug } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { buildRestaurantFaq } from '@/lib/restaurantFaq';
import { fetchRestaurantSeo } from '@/lib/restaurantSeoFetch';
import {
  DEFAULT_OG_IMAGE_PATH,
  absoluteUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  restaurantJsonLd,
} from '@/lib/seo';
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
  if (!restaurant) notFound();

  const path = buildRestaurantBookingPath(restaurant.slug, restaurant.id);
  const title = `${restaurant.name} — ${restaurant.cuisine} in ${restaurant.address.city}, ${restaurant.address.state} | Book a Table on Tablevera`;
  const description =
    restaurant.description?.trim() ||
    `Reserve a table at ${restaurant.name}, a ${restaurant.cuisine} restaurant in ${restaurant.address.city}, ${restaurant.address.state}. Live availability on Tablevera.`;
  const image = restaurant.photos?.[0] || DEFAULT_OG_IMAGE_PATH;

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

  if (restaurant && restaurant.slug && id !== restaurant.slug) {
    permanentRedirect(
      `${buildRestaurantBookingPath(restaurant.slug, restaurant.id)}${searchParamsToQuery(query)}`,
    );
  }

  if (!restaurant) notFound();

  const openingHoursLines = formatOpeningHoursLines(
    restaurant.shifts ?? [],
    restaurant.timezone ?? undefined,
  );
  const faq = buildRestaurantFaq({ ...restaurant, openingHoursLines });
  const path = buildRestaurantBookingPath(restaurant.slug, restaurant.id);

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
            menuUrl: restaurant.menuUrl,
            reservationsEnabled: restaurant.reservationsEnabled,
            openingHoursSpecification: openingHoursSpecificationFromShifts(
              restaurant.shifts ?? [],
            ),
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Restaurants', href: '/cities' },
            {
              name: `${restaurant.address.city}, ${restaurant.address.state}`,
              href: `/cities/${citySlug(restaurant.address.city, restaurant.address.state)}`,
            },
            { name: restaurant.name, href: path },
          ]),
        ]}
      />
      <RestaurantPageClient initialRestaurant={restaurant} />
    </>
  );
}
