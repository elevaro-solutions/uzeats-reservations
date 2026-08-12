import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CUISINES,
  cuisineLandingMeta,
  cuisineSlug,
  slugToCuisine,
} from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return CUISINES.filter((c) => c !== 'Other').map((cuisine) => ({
    slug: cuisineSlug(cuisine),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cuisine = slugToCuisine(slug, CUISINES);
  if (!cuisine) return {};
  const meta = cuisineLandingMeta(cuisine);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/cuisine/${slug}`,
  });
}

export default async function CuisineLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const cuisine = slugToCuisine(slug, CUISINES);
  if (!cuisine) notFound();

  const meta = cuisineLandingMeta(cuisine);
  const canonicalPath = `/cuisine/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Cuisines', href: '/cuisine' },
    { name: cuisine },
  ];

  return (
    <>
      <DiscoveryLandingSchema breadcrumbs={breadcrumbs} faq={meta.faq} />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{ cuisine }}
        breadcrumbs={breadcrumbs}
        relatedLinks={CUISINES.filter((c) => c !== cuisine && c !== 'Other')
          .slice(0, 8)
          .map((c) => ({ href: `/cuisine/${cuisineSlug(c)}`, label: c }))}
      />
    </>
  );
}
