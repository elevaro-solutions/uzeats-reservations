import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { nearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listNeighborhoodLandingParams,
  listNeighborhoodsForIndex,
  resolveNeighborhoodBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listNeighborhoodLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hood = await resolveNeighborhoodBySlug(slug);
  if (!hood) return {};
  const label = `${hood.neighborhood}, ${hood.city}`;
  const meta = nearMeLandingMeta(label);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/neighborhoods/${slug}`,
  });
}

export default async function NearMeNeighborhoodPage({ params }: PageProps) {
  const { slug } = await params;
  const hood = await resolveNeighborhoodBySlug(slug);
  if (!hood) notFound();

  const label = `${hood.neighborhood}, ${hood.city}`;
  const meta = nearMeLandingMeta(label);
  const canonicalPath = `/near-me/neighborhoods/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Near me', href: '/near-me' },
    { name: hood.neighborhood },
  ];

  const related = [
    { href: `/neighborhoods/${slug}`, label: `Restaurants in ${hood.neighborhood}` },
    ...(await listNeighborhoodsForIndex())
      .filter((n) => n.slug !== slug)
      .slice(0, 6)
      .map((n) => ({ href: `/near-me/neighborhoods/${n.slug}`, label: `${n.label} near me` })),
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
          city: hood.city,
          state: hood.state,
          neighborhood: hood.neighborhood,
          lat: hood.lat,
          lng: hood.lng,
          locationLabel: `${hood.neighborhood}, ${hood.city}, ${hood.state}`,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
