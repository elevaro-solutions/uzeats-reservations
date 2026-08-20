import type { Metadata } from 'next';
import { nearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCitiesForIndex,
  listCuisinesForIndex,
  listMealsForIndex,
  listStatesForIndex,
} from '@/lib/discoveryIndex';
import { DEFAULT_LOCATION } from '@/lib/cities';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

const meta = nearMeLandingMeta();

export const metadata: Metadata = discoveryLandingMetadata({
  title: meta.title,
  description: meta.description,
  canonicalPath: '/near-me',
});

export default async function NearMeRestaurantsPage() {
  const canonicalPath = '/near-me';
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me' },
  ];

  const [cities, states, cuisines, meals] = await Promise.all([
    listCitiesForIndex(),
    Promise.resolve(listStatesForIndex()),
    listCuisinesForIndex(),
    Promise.resolve(listMealsForIndex()),
  ]);

  const related = [
    { href: '/near-me/restaurants', label: 'Restaurants near me by city & state' },
    ...states.map((s) => ({
      href: `/near-me/restaurants/state/${s.slug}`,
      label: `Restaurants near me in ${s.label} (${s.code})`,
    })),
    ...cities.slice(0, 12).map((c) => ({
      href: `/near-me/restaurants/${c.slug}`,
      label: `Restaurants near me in ${c.label}`,
    })),
    ...cuisines.slice(0, 4).flatMap((cuisine) =>
      cities.slice(0, 2).map((c) => ({
        href: `/near-me/food/${cuisine.slug}/${c.slug}`,
        label: `${cuisine.label} restaurants near me in ${c.label}`,
      })),
    ),
    ...meals.slice(0, 3).map((m) => ({
      href: `/near-me/meals/${m.slug}/${cities[0]?.slug ?? 'new-york-ny'}`,
      label: `${m.label} restaurants near me in ${cities[0]?.label ?? 'New York, NY'}`,
    })),
    { href: '/near-me/food', label: 'Food near me by city' },
    { href: '/near-me/meals', label: 'Meals near me by city' },
    { href: '/?near=1', label: 'Use my location on homepage' },
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
          lat: DEFAULT_LOCATION.lat,
          lng: DEFAULT_LOCATION.lng,
          locationLabel: 'Near me',
          radiusKm: 16,
          useGeo: true,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
