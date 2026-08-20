import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { citySlug, nearMeLandingMeta } from '@reservations/shared';
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
  const meta = nearMeLandingMeta(landmark.landmark);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/landmarks/${slug}`,
  });
}

export default async function NearMeLandmarkPage({ params }: PageProps) {
  const { slug } = await params;
  const landmark = resolveLandmarkBySlug(slug);
  if (!landmark) notFound();

  const meta = nearMeLandingMeta(landmark.landmark);
  const canonicalPath = `/near-me/landmarks/${slug}`;
  const cityPath = citySlug(landmark.city, landmark.state);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Near me', href: '/near-me' },
    { name: landmark.landmark },
  ];

  const related = [
    { href: `/landmarks/${slug}`, label: `Restaurants near ${landmark.landmark}` },
    { href: `/near-me/restaurants/${cityPath}`, label: `Restaurants near me in ${landmark.city}` },
    ...listLandmarksForIndex()
      .filter((l) => l.slug !== slug)
      .slice(0, 6)
      .map((l) => ({ href: `/near-me/landmarks/${l.slug}`, label: `Near ${l.label}` })),
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
