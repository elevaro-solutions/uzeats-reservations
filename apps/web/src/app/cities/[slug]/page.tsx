import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cityLandingMeta } from '@reservations/shared';
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
  const meta = cityLandingMeta(city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/cities/${slug}`,
  });
}

export default async function CityLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const city = await resolveCityBySlug(slug);
  if (!city) notFound();

  const meta = cityLandingMeta(city.city, city.state);
  const canonicalPath = `/cities/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Cities', href: '/cities' },
    { name: `${city.city}, ${city.state}` },
  ];

  const related = (await listCitiesForIndex())
    .filter((c) => c.slug !== slug)
    .slice(0, 4)
    .map((c) => ({ href: `/cities/${c.slug}`, label: c.label }));

  const cuisines = await listCuisinesForIndex();
  const crossLinks = [
    { href: `/top-restaurants/${slug}`, label: `Top restaurants in ${city.city}` },
    { href: `/near-me/restaurants/${slug}`, label: `Restaurants near me in ${city.city}` },
    ...cuisines.slice(0, 4).map((c) => ({
      href: `/cuisine/${c.slug}/${slug}`,
      label: `${c.label} in ${city.city}`,
    })),
    ...related,
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
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={crossLinks}
      />
    </>
  );
}
