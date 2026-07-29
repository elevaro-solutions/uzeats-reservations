import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DISCOVERY_OCCASIONS,
  occasionLandingMeta,
  slugToOccasion,
  discoverySlug,
} from '@reservations/shared';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DISCOVERY_OCCASIONS.map((occasion) => ({ slug: discoverySlug(occasion) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const occasion = slugToOccasion(slug);
  if (!occasion) return {};
  const meta = occasionLandingMeta(occasion);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/occasion/${slug}` },
  };
}

export default async function OccasionLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const occasion = slugToOccasion(slug);
  if (!occasion) notFound();

  const meta = occasionLandingMeta(occasion);

  return (
    <DiscoveryLandingView
      meta={meta}
      canonicalPath={`/occasion/${slug}`}
      preset={{ occasion }}
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Occasions', href: `/occasion/${discoverySlug(DISCOVERY_OCCASIONS[0]!)}` },
        { name: occasion },
      ]}
      relatedLinks={DISCOVERY_OCCASIONS.filter((o) => o !== occasion).map((o) => ({
        href: `/occasion/${discoverySlug(o)}`,
        label: o,
      }))}
    />
  );
}
