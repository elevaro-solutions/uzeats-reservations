import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { neighborhoodLandingMeta, neighborhoodSlug, citySlug } from '@reservations/shared';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import { POPULAR_NEIGHBORHOODS, findNeighborhoodBySlug } from '@/lib/cities';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return POPULAR_NEIGHBORHOODS.map((n) => ({
    slug: neighborhoodSlug(n.neighborhood, n.city, n.state),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hood = findNeighborhoodBySlug(slug);
  if (!hood) return {};
  const meta = neighborhoodLandingMeta(hood.neighborhood, hood.city, hood.state);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/neighborhoods/${slug}` },
  };
}

export default async function NeighborhoodLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const hood = findNeighborhoodBySlug(slug);
  if (!hood) notFound();

  const meta = neighborhoodLandingMeta(hood.neighborhood, hood.city, hood.state);

  return (
    <DiscoveryLandingView
      meta={meta}
      canonicalPath={`/neighborhoods/${slug}`}
      preset={{
        city: hood.city,
        neighborhood: hood.neighborhood,
        lat: hood.lat,
        lng: hood.lng,
        locationLabel: `${hood.neighborhood}, ${hood.city}, ${hood.state}`,
      }}
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: hood.city, href: `/cities/${citySlug(hood.city, hood.state)}` },
        { name: hood.neighborhood },
      ]}
      relatedLinks={POPULAR_NEIGHBORHOODS.filter(
        (n) => n.neighborhood !== hood.neighborhood || n.city !== hood.city,
      )
        .slice(0, 6)
        .map((n) => ({
          href: `/neighborhoods/${neighborhoodSlug(n.neighborhood, n.city, n.state)}`,
          label: `${n.neighborhood}, ${n.city}`,
        }))}
    />
  );
}
