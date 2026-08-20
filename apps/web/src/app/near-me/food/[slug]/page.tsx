import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { foodNearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCitiesForIndex,
  listCuisineLandingParams,
  listCuisinesForIndex,
  resolveCuisineBySlug,
} from '@/lib/discoveryIndex';
import { DEFAULT_LOCATION } from '@/lib/cities';
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
  const meta = foodNearMeLandingMeta(cuisine);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/food/${slug}`,
  });
}

export default async function FoodNearMePage({ params }: PageProps) {
  const { slug } = await params;
  const cuisine = await resolveCuisineBySlug(slug);
  if (!cuisine) notFound();

  const meta = foodNearMeLandingMeta(cuisine);
  const canonicalPath = `/near-me/food/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'Food near me', href: '/near-me/food' },
    { name: cuisine },
  ];

  const [cuisines, cities] = await Promise.all([listCuisinesForIndex(), listCitiesForIndex()]);

  const related = [
    { href: '/near-me/restaurants', label: 'Restaurants near me by city & state' },
    ...cities.slice(0, 12).map((c) => ({
      href: `/near-me/food/${slug}/${c.slug}`,
      label: `${cuisine} restaurants near me in ${c.label}`,
    })),
    ...cuisines
      .filter((c) => c.slug !== slug)
      .slice(0, 6)
      .map((c) => ({
        href: `/near-me/food/${c.slug}`,
        label: `${c.label} restaurants near me`,
      })),
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
          cuisine,
          lat: DEFAULT_LOCATION.lat,
          lng: DEFAULT_LOCATION.lng,
          locationLabel: 'Near me',
          radiusKm: 16,
        }}
        breadcrumbs={breadcrumbs}
        relatedLinks={related}
      />
    </>
  );
}
