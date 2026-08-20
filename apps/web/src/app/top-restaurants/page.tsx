import type { Metadata } from 'next';
import { topRestaurantsLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCitiesForIndex,
  listLandmarksForIndex,
  listStatesForIndex,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';
import { DEFAULT_LOCATION } from '@/lib/cities';

const meta = topRestaurantsLandingMeta();

export const metadata: Metadata = discoveryLandingMetadata({
  title: meta.title,
  description: meta.description,
  canonicalPath: '/top-restaurants',
});

export default async function TopRestaurantsPage() {
  const canonicalPath = '/top-restaurants';
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Top restaurants' },
  ];

  const [cities, landmarks, states] = await Promise.all([
    listCitiesForIndex(),
    Promise.resolve(listLandmarksForIndex()),
    Promise.resolve(listStatesForIndex()),
  ]);

  const related = [
    { href: '/top-locations', label: 'Top locations' },
    { href: '/near-me', label: 'Restaurants near me' },
    { href: '/near-me/food', label: 'Food near me' },
    { href: '/near-me/meals', label: 'Meals near me' },
    ...cities.slice(0, 8).map((c) => ({
      href: `/top-restaurants/${c.slug}`,
      label: `Top in ${c.label}`,
    })),
    ...states.map((s) => ({
      href: `/near-me/restaurants/state/${s.slug}`,
      label: `Restaurants near me in ${s.label}`,
    })),
    ...landmarks.slice(0, 4).map((l) => ({
      href: `/near-me/landmarks/${l.slug}`,
      label: `Restaurants near ${l.label}`,
    })),
    { href: '/categories', label: 'Categories' },
    { href: '/cuisine', label: 'Cuisines' },
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
          topRatedOnly: true,
          lat: DEFAULT_LOCATION.lat,
          lng: DEFAULT_LOCATION.lng,
          locationLabel: `${DEFAULT_LOCATION.city}, ${DEFAULT_LOCATION.state}`,
          // National top-rated list; map still centers on default city for UX.
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
