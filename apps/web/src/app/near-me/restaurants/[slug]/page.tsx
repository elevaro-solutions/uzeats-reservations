import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { restaurantsNearMeInCityMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCityLandingParams,
  listCitiesForIndex,
  listCuisinesForIndex,
  listMealsForIndex,
  listStatesForIndex,
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
  const meta = restaurantsNearMeInCityMeta(city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/restaurants/${slug}`,
  });
}

export default async function NearMeRestaurantsCityPage({ params }: PageProps) {
  const { slug } = await params;
  const city = await resolveCityBySlug(slug);
  if (!city) notFound();

  const meta = restaurantsNearMeInCityMeta(city.city, city.state);
  const place = `${city.city}, ${city.state}`;
  const canonicalPath = `/near-me/restaurants/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'By city & state', href: '/near-me/restaurants' },
    { name: place },
  ];

  const [cities, cuisines, meals, states] = await Promise.all([
    listCitiesForIndex(),
    listCuisinesForIndex(),
    Promise.resolve(listMealsForIndex()),
    Promise.resolve(listStatesForIndex()),
  ]);

  const related = [
    {
      href: `/near-me/restaurants/state/${city.state.toLowerCase()}`,
      label: `Restaurants near me in ${states.find((s) => s.code === city.state)?.label ?? city.state}`,
    },
    { href: `/cities/${slug}`, label: `All restaurants in ${city.city}` },
    { href: `/top-restaurants/${slug}`, label: `Top restaurants in ${city.city}` },
    ...cuisines.slice(0, 6).map((c) => ({
      href: `/near-me/food/${c.slug}/${slug}`,
      label: `${c.label} restaurants near me in ${place}`,
    })),
    ...meals.slice(0, 4).map((m) => ({
      href: `/near-me/meals/${m.slug}/${slug}`,
      label: `${m.label} restaurants near me in ${place}`,
    })),
    ...cities
      .filter((c) => c.slug !== slug)
      .slice(0, 6)
      .map((c) => ({
        href: `/near-me/restaurants/${c.slug}`,
        label: `Restaurants near me in ${c.label}`,
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
