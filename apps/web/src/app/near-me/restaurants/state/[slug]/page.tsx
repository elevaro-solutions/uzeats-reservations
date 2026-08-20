import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { restaurantsNearMeInStateMeta } from '@reservations/shared';
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
  const meta = restaurantsNearMeInStateMeta(state.name, state.code);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/restaurants/state/${slug}`,
  });
}

export default async function NearMeRestaurantsStatePage({ params }: PageProps) {
  const { slug } = await params;
  const state = resolveStateBySlug(slug);
  if (!state) notFound();

  const meta = restaurantsNearMeInStateMeta(state.name, state.code);
  const canonicalPath = `/near-me/restaurants/state/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'By city & state', href: '/near-me/restaurants' },
    { name: state.name },
  ];

  const cities = (await listCitiesForIndex()).filter((c) =>
    c.slug.endsWith(`-${state.code.toLowerCase()}`),
  );
  const related = [
    { href: `/states/${slug}`, label: `All restaurants in ${state.name}` },
    ...cities.map((c) => ({
      href: `/near-me/restaurants/${c.slug}`,
      label: `Restaurants near me in ${c.label}`,
    })),
    ...listStatesForIndex()
      .filter((s) => s.slug !== slug)
      .map((s) => ({
        href: `/near-me/restaurants/state/${s.slug}`,
        label: `Restaurants near me in ${s.label}`,
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
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
