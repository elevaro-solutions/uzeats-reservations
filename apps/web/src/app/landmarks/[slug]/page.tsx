import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { citySlug, landmarkLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listLandmarkLandingParams,
  listLandmarksForIndex,
  resolveLandmarkBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listLandmarkLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landmark = resolveLandmarkBySlug(slug);
  if (!landmark) return {};
  const meta = landmarkLandingMeta(landmark.landmark, landmark.city, landmark.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/landmarks/${slug}`,
  });
}

export default async function LandmarkLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const landmark = resolveLandmarkBySlug(slug);
  if (!landmark) notFound();

  const meta = landmarkLandingMeta(landmark.landmark, landmark.city, landmark.state);
  const canonicalPath = `/landmarks/${slug}`;
  const cityPath = citySlug(landmark.city, landmark.state);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Landmarks', href: '/landmarks' },
    { name: landmark.landmark },
  ];

  const related = [
    { href: `/near-me/landmarks/${slug}`, label: `Near me · ${landmark.landmark}` },
    { href: `/cities/${cityPath}`, label: `Restaurants in ${landmark.city}` },
    { href: `/top-restaurants/${cityPath}`, label: `Top in ${landmark.city}` },
    ...listLandmarksForIndex()
      .filter((l) => l.slug !== slug)
      .slice(0, 6)
      .map((l) => ({ href: `/landmarks/${l.slug}`, label: l.label })),
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
          city: landmark.city,
          state: landmark.state,
          lat: landmark.lat,
          lng: landmark.lng,
          locationLabel: `${landmark.landmark}, ${landmark.city}`,
          radiusKm: 8,
          useGeo: true,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
