import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { foodNearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCitiesForIndex,
  listCuisineCityLandingParams,
  listCuisinesForIndex,
  resolveCityBySlug,
  resolveCuisineBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string; citySlug: string }> };

export async function generateStaticParams() {
  return listCuisineCityLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, citySlug } = await params;
  const [cuisine, city] = await Promise.all([
    resolveCuisineBySlug(slug),
    resolveCityBySlug(citySlug),
  ]);
  if (!cuisine || !city) return {};
  const meta = foodNearMeLandingMeta(cuisine, city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/food/${slug}/${citySlug}`,
  });
}

export default async function FoodNearMeCityPage({ params }: PageProps) {
  const { slug, citySlug } = await params;
  const cuisine = await resolveCuisineBySlug(slug);
  const city = await resolveCityBySlug(citySlug);
  if (!cuisine || !city) notFound();

  const meta = foodNearMeLandingMeta(cuisine, city.city, city.state);
  const place = `${city.city}, ${city.state}`;
  const canonicalPath = `/near-me/food/${slug}/${citySlug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'Food near me', href: '/near-me/food' },
    { name: cuisine, href: `/near-me/food/${slug}` },
    { name: place },
  ];

  const [cities, cuisines] = await Promise.all([listCitiesForIndex(), listCuisinesForIndex()]);
  const related = [
    {
      href: `/near-me/restaurants/${citySlug}`,
      label: `Restaurants near me in ${place}`,
    },
    { href: `/near-me/food/${slug}`, label: `${cuisine} restaurants near me` },
    { href: `/cuisine/${slug}/${citySlug}`, label: `${cuisine} in ${city.city}` },
    ...cities
      .filter((c) => c.slug !== citySlug)
      .slice(0, 6)
      .map((c) => ({
        href: `/near-me/food/${slug}/${c.slug}`,
        label: `${cuisine} restaurants near me in ${c.label}`,
      })),
    ...cuisines
      .filter((c) => c.slug !== slug)
      .slice(0, 4)
      .map((c) => ({
        href: `/near-me/food/${c.slug}/${citySlug}`,
        label: `${c.label} restaurants near me in ${place}`,
      })),
  ];

  return (
    <>
      <DiscoveryLandingSchema
        breadcrumbs={breadcrumbs}
        faq={meta.faq}
        canonicalPath={canonicalPath}
        heading={meta.heading}
        description={meta.description}
      />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{
          cuisine,
          city: city.city,
          state: city.state,
          lat: city.lat,
          lng: city.lng,
          locationLabel: place,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
