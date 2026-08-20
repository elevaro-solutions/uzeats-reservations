import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { topRestaurantsLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCityLandingParams,
  listCitiesForIndex,
  listCuisinesForIndex,
  resolveCityBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listCityLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCityBySlug(slug);
  if (!city) return {};
  const meta = topRestaurantsLandingMeta(city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/top-restaurants/${slug}`,
  });
}

export default async function TopRestaurantsCityPage({ params }: PageProps) {
  const { slug } = await params;
  const city = await resolveCityBySlug(slug);
  if (!city) notFound();

  const meta = topRestaurantsLandingMeta(city.city, city.state);
  const canonicalPath = `/top-restaurants/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Top restaurants', href: '/top-restaurants' },
    { name: `${city.city}, ${city.state}` },
  ];

  const [cities, cuisines] = await Promise.all([listCitiesForIndex(), listCuisinesForIndex()]);
  const related = [
    { href: `/cities/${slug}`, label: `All restaurants in ${city.city}` },
    { href: `/near-me/restaurants/${slug}`, label: `Restaurants near me in ${city.city}` },
    ...cuisines.slice(0, 4).map((c) => ({
      href: `/cuisine/${c.slug}/${slug}`,
      label: `${c.label} in ${city.city}`,
    })),
    ...cities
      .filter((c) => c.slug !== slug)
      .slice(0, 4)
      .map((c) => ({ href: `/top-restaurants/${c.slug}`, label: `Top in ${c.label}` })),
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
          city: city.city,
          state: city.state,
          lat: city.lat,
          lng: city.lng,
          locationLabel: `${city.city}, ${city.state}`,
          topRatedOnly: true,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
