import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  cuisineInCityLandingMeta,
  seoCuisineInCityLabel,
  seoCuisineLinkLabel,
  seoTierRestaurantsIn,
} from '@reservations/shared';
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
  const meta = cuisineInCityLandingMeta(cuisine, city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/cuisine/${slug}/${citySlug}`,
  });
}

export default async function CuisineCityLandingPage({ params }: PageProps) {
  const { slug, citySlug } = await params;
  const cuisine = await resolveCuisineBySlug(slug);
  const city = await resolveCityBySlug(citySlug);
  if (!cuisine || !city) notFound();

  const meta = cuisineInCityLandingMeta(cuisine, city.city, city.state);
  const canonicalPath = `/cuisine/${slug}/${citySlug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Cuisines', href: '/cuisine' },
    { name: cuisine, href: `/cuisine/${slug}` },
    { name: `${city.city}, ${city.state}` },
  ];

  const [cities, cuisines] = await Promise.all([listCitiesForIndex(), listCuisinesForIndex()]);
  const related = [
    { href: `/cuisine/${slug}`, label: seoCuisineLinkLabel(cuisine) },
    { href: `/cities/${citySlug}`, label: seoTierRestaurantsIn('best', `${city.city}, ${city.state}`) },
    { href: `/top-restaurants/${citySlug}`, label: seoTierRestaurantsIn('top', `${city.city}, ${city.state}`) },
    ...cities
      .filter((c) => c.slug !== citySlug)
      .slice(0, 4)
      .map((c) => ({
        href: `/cuisine/${slug}/${c.slug}`,
        label: seoCuisineInCityLabel(cuisine, c.label),
      })),
    ...cuisines
      .filter((c) => c.slug !== slug)
      .slice(0, 4)
      .map((c) => ({
        href: `/cuisine/${c.slug}/${citySlug}`,
        label: seoCuisineInCityLabel(c.label, `${city.city}, ${city.state}`),
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
          locationLabel: `${city.city}, ${city.state}`,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
