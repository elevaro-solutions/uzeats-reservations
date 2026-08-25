import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categoryLandingMeta, seoCategoryInCityLabel } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  categorySearchPreset,
  listCategoriesForIndex,
  listCategoryLandingParams,
  listCitiesForIndex,
  resolveCategoryBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return listCategoryLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategoryBySlug(slug);
  if (!category) return {};
  const meta = categoryLandingMeta(category.label);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/categories/${slug}`,
  });
}

export default async function CategoryLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await resolveCategoryBySlug(slug);
  if (!category) notFound();

  const meta = categoryLandingMeta(category.label);
  const canonicalPath = `/categories/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/categories' },
    { name: category.label },
  ];

  const cities = await listCitiesForIndex();
  const relatedCategories = await listCategoriesForIndex();
  const related = [
    ...cities.slice(0, 8).map((c) => ({
      href: `/categories/${slug}/${c.slug}`,
      label: seoCategoryInCityLabel(category.label, slug, c.label),
    })),
    ...relatedCategories
      .filter((c) => c.slug !== slug)
      .slice(0, 6)
      .map((c) => ({ href: `/categories/${c.slug}`, label: c.seoLabel })),
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
        preset={categorySearchPreset(category)}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
