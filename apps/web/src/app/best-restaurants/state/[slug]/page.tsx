import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { bestRestaurantsInStateMeta, seoTierRestaurantsIn } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
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
  const meta = bestRestaurantsInStateMeta(state.name, state.code);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/best-restaurants/state/${slug}`,
  });
}

export default async function BestRestaurantsStatePage({ params }: PageProps) {
  const { slug } = await params;
  const state = resolveStateBySlug(slug);
  if (!state) notFound();

  const meta = bestRestaurantsInStateMeta(state.name, state.code);
  const canonicalPath = `/best-restaurants/state/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Best restaurants', href: '/best-restaurants' },
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
      label: seoTierRestaurantsIn('best', c.label),
    })),
    ...listStatesForIndex()
      .filter((s) => s.slug !== slug)
      .map((s) => ({
        href: `/best-restaurants/state/${s.slug}`,
        label: seoTierRestaurantsIn('best', s.label),
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
          state: state.code,
          lat: state.lat,
          lng: state.lng,
          locationLabel: state.name,
          radiusKm: 80,
          topRatedOnly: true,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
