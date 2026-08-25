import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { stateLandingMeta, seoTierRestaurantsIn } from '@reservations/shared';
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
  const meta = stateLandingMeta(state.name, state.code);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/states/${slug}`,
  });
}

export default async function StateLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const state = resolveStateBySlug(slug);
  if (!state) notFound();

  const meta = stateLandingMeta(state.name, state.code);
  const canonicalPath = `/states/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'States', href: '/states' },
    { name: state.name },
  ];

  const cities = (await listCitiesForIndex()).filter((c) =>
    c.slug.endsWith(`-${state.code.toLowerCase()}`),
  );
  const related = [
    { href: `/near-me/restaurants/state/${slug}`, label: `Restaurants near me in ${state.name}` },
    { href: `/top-restaurants/state/${slug}`, label: `Top restaurants in ${state.name}` },
    { href: `/best-restaurants/state/${slug}`, label: `Best restaurants in ${state.name}` },
    ...cities.slice(0, 6).map((c) => ({
      href: `/cities/${c.slug}`,
      label: seoTierRestaurantsIn('best', c.label),
    })),
    ...listStatesForIndex()
      .filter((s) => s.slug !== slug)
      .map((s) => ({ href: `/states/${s.slug}`, label: seoTierRestaurantsIn('best', s.label) })),
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
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
