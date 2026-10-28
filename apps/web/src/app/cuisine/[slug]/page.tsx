import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cuisineLandingMeta, seoCuisineInCityLabel, seoCuisineLinkLabel } from '@reservations/shared';
import { DiscoveryLanding } from '@/components/DiscoveryLanding';
import {
  listCuisineLandingParams,
  listCuisinesForIndex,
  listCitiesForIndex,
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

  const [cuisines, cities] = await Promise.all([listCuisinesForIndex(), listCitiesForIndex()]);
  const related = [
    ...cities.slice(0, 8).map((c) => ({
      href: `/cuisine/${slug}/${c.slug}`,
      label: seoCuisineInCityLabel(cuisine, c.label),
    })),
    ...cuisines
      .filter((c) => c.slug !== slug)
      .slice(0, 6)
      .map((c) => ({ href: `/cuisine/${c.slug}`, label: seoCuisineLinkLabel(c.label) })),
  ];

  return (
    <DiscoveryLanding
      meta={meta}
      canonicalPath={canonicalPath}
      breadcrumbs={breadcrumbs}
      relatedLinks={related}
      preset={{ cuisine }}
    />
  );
}
