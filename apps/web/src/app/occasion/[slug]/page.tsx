import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { occasionLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listOccasionLandingParams,
  listOccasionsForIndex,
  resolveOccasionBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listOccasionLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const occasion = await resolveOccasionBySlug(slug);
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
  const occasion = await resolveOccasionBySlug(slug);
  if (!occasion) notFound();

  const meta = occasionLandingMeta(occasion);
  const canonicalPath = `/occasion/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Occasions', href: '/occasion' },
    { name: occasion },
  ];

  const related = (await listOccasionsForIndex())
    .filter((o) => o.slug !== slug)
    .map((o) => ({ href: `/occasion/${o.slug}`, label: o.label }));

  return (
    <>
      <DiscoveryLandingSchema breadcrumbs={breadcrumbs} faq={meta.faq} />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{ occasion }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
