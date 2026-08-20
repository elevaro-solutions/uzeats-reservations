import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categoryLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  categorySearchPreset,
  listCategoryCityLandingParams,
  listCitiesForIndex,
  resolveCategoryBySlug,
  resolveCityBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string; citySlug: string }> };

export async function generateStaticParams() {
  return listCategoryCityLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, citySlug } = await params;
  const [category, city] = await Promise.all([
    Promise.resolve(resolveCategoryBySlug(slug)),
    resolveCityBySlug(citySlug),
  ]);
  if (!category || !city) return {};
  const meta = categoryLandingMeta(category.label, city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/categories/${slug}/${citySlug}`,
  });
}

export default async function CategoryCityLandingPage({ params }: PageProps) {
  const { slug, citySlug } = await params;
  const category = resolveCategoryBySlug(slug);
  const city = await resolveCityBySlug(citySlug);
  if (!category || !city) notFound();

  const meta = categoryLandingMeta(category.label, city.city, city.state);
  const canonicalPath = `/categories/${slug}/${citySlug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/categories' },
    { name: category.label, href: `/categories/${slug}` },
    { name: `${city.city}, ${city.state}` },
  ];

  const related = [
    { href: `/categories/${slug}`, label: `All ${category.label}` },
    { href: `/cities/${citySlug}`, label: `Restaurants in ${city.city}` },
    { href: `/top-restaurants/${citySlug}`, label: `Top in ${city.city}` },
    ...(await listCitiesForIndex())
      .filter((c) => c.slug !== citySlug)
      .slice(0, 6)
      .map((c) => ({
        href: `/categories/${slug}/${c.slug}`,
        label: `${category.label} in ${c.label}`,
      })),
  ];

  const categoryPreset = categorySearchPreset(category);

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
          ...categoryPreset,
          city: city.city,
          state: city.state,
          lat: city.lat,
          lng: city.lng,
          locationLabel: `${city.city}, ${city.state}`,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
