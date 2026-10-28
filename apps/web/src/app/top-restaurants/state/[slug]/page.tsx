import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { topRestaurantsInStateMeta, seoTierRestaurantsIn } from '@reservations/shared';
import { DiscoveryLanding } from '@/components/DiscoveryLanding';
import {
  listCitiesForIndex,
  listStateLandingParams,
  listStatesForIndex,
  resolveStateBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listStateLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const state = resolveStateBySlug(slug);
  if (!state) return {};
  const meta = topRestaurantsInStateMeta(state.name, state.code);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/top-restaurants/state/${slug}`,
  });
}

export default async function TopRestaurantsStatePage({ params }: PageProps) {
  const { slug } = await params;
  const state = resolveStateBySlug(slug);
  if (!state) notFound();

  const meta = topRestaurantsInStateMeta(state.name, state.code);
  const canonicalPath = `/top-restaurants/state/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Top restaurants', href: '/top-restaurants' },
    { name: state.name },
  ];

  const cities = (await listCitiesForIndex()).filter((c) =>
    c.slug.endsWith(`-${state.code.toLowerCase()}`),
  );
  const related = [
    { href: `/states/${slug}`, label: `All restaurants in ${state.name}` },
    { href: `/top-restaurants/state/${slug}`, label: `Top restaurants in ${state.name}` },
    { href: `/near-me/restaurants/state/${slug}`, label: `Restaurants near me in ${state.name}` },
    ...cities.slice(0, 6).map((c) => ({
      href: `/top-restaurants/${c.slug}`,
      label: seoTierRestaurantsIn('top', c.label),
    })),
    ...listStatesForIndex()
      .filter((s) => s.slug !== slug)
      .map((s) => ({
        href: `/top-restaurants/state/${s.slug}`,
        label: seoTierRestaurantsIn('top', s.label),
      })),
  ];

  return (
    <DiscoveryLanding
      meta={meta}
      canonicalPath={canonicalPath}
      breadcrumbs={breadcrumbs}
      relatedLinks={related}
      requireInventory
      preset={{
          state: state.code,
          lat: state.lat,
          lng: state.lng,
          locationLabel: state.name,
          radiusKm: 80,
          topRatedOnly: true,
        }}
    />
  );
}
