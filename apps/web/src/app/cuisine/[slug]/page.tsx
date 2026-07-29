import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CUISINES,
  cuisineLandingMeta,
  cuisineSlug,
  slugToCuisine,
} from '@reservations/shared';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';

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
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/cuisine/${slug}` },
  };
}

export default async function CuisineLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const cuisine = slugToCuisine(slug, CUISINES);
  if (!cuisine) notFound();

  const meta = cuisineLandingMeta(cuisine);

  return (
    <DiscoveryLandingView
      meta={meta}
      canonicalPath={`/cuisine/${slug}`}
      preset={{ cuisine }}
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Cuisines', href: '/cuisine/italian' },
        { name: cuisine },
      ]}
      relatedLinks={CUISINES.filter((c) => c !== cuisine && c !== 'Other')
        .slice(0, 8)
        .map((c) => ({ href: `/cuisine/${cuisineSlug(c)}`, label: c }))}
    />
  );
}
