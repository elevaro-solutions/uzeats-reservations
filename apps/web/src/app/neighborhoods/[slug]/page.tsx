import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { neighborhoodLandingMeta } from '@reservations/shared';
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
  const meta = neighborhoodLandingMeta(hood.neighborhood, hood.city, hood.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/neighborhoods/${slug}`,
  });
}

export default async function NeighborhoodLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const hood = await resolveNeighborhoodBySlug(slug);
  if (!hood) notFound();

  const meta = neighborhoodLandingMeta(hood.neighborhood, hood.city, hood.state);
  const canonicalPath = `/neighborhoods/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Neighborhoods', href: '/neighborhoods' },
    { name: hood.neighborhood },
  ];

  const related = (await listNeighborhoodsForIndex())
    .filter((n) => n.slug !== slug)
    .slice(0, 6)
    .map((n) => ({ href: `/neighborhoods/${n.slug}`, label: n.label }));

  return (
    <>
      <DiscoveryLandingSchema breadcrumbs={breadcrumbs} faq={meta.faq} />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{
          city: hood.city,
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
