import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DISCOVERY_OCCASIONS,
  occasionLandingMeta,
  slugToOccasion,
  discoverySlug,
} from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DISCOVERY_OCCASIONS.map((occasion) => ({ slug: discoverySlug(occasion) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const occasion = slugToOccasion(slug);
  if (!occasion) return {};
  const meta = occasionLandingMeta(occasion);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/occasion/${slug}`,
  });
}

export default async function OccasionLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const occasion = slugToOccasion(slug);
  if (!occasion) notFound();

  const meta = occasionLandingMeta(occasion);
  const canonicalPath = `/occasion/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Occasions', href: '/occasion' },
    { name: occasion },
  ];

  return (
    <>
      <DiscoveryLandingSchema breadcrumbs={breadcrumbs} faq={meta.faq} />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{ occasion }}
        breadcrumbs={breadcrumbs}
        relatedLinks={DISCOVERY_OCCASIONS.filter((o) => o !== occasion).map((o) => ({
          href: `/occasion/${discoverySlug(o)}`,
          label: o,
        }))}
      />
    </>
  );
}
