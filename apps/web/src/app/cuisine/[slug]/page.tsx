import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cuisineLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCuisineLandingParams,
  listCuisinesForIndex,
  resolveCuisineBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listCuisineLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cuisine = await resolveCuisineBySlug(slug);
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
  const cuisine = await resolveCuisineBySlug(slug);
  if (!cuisine) notFound();

  const meta = cuisineLandingMeta(cuisine);
  const canonicalPath = `/cuisine/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Cuisines', href: '/cuisine' },
    { name: cuisine },
  ];

  const related = (await listCuisinesForIndex())
    .filter((c) => c.slug !== slug)
    .slice(0, 8)
    .map((c) => ({ href: `/cuisine/${c.slug}`, label: c.label }));

  return (
    <>
      <DiscoveryLandingSchema breadcrumbs={breadcrumbs} faq={meta.faq} />
      <DiscoveryLandingView
        meta={meta}
        canonicalPath={canonicalPath}
        preset={{ cuisine }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
