import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mealNearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLandingSchema } from '@/components/DiscoveryLandingSchema';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import {
  listCitiesForIndex,
  listMealLandingParams,
  listMealsForIndex,
  resolveMealBySlug,
} from '@/lib/discoveryIndex';
import { DEFAULT_LOCATION } from '@/lib/cities';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listMealLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meal = resolveMealBySlug(slug);
  if (!meal) return {};
  const meta = mealNearMeLandingMeta(meal);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/meals/${slug}`,
  });
}

export default async function MealNearMePage({ params }: PageProps) {
  const { slug } = await params;
  const meal = resolveMealBySlug(slug);
  if (!meal) notFound();

  const meta = mealNearMeLandingMeta(meal);
  const canonicalPath = `/near-me/meals/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'Meals near me', href: '/near-me/meals' },
    { name: meal },
  ];

  const [meals, cities] = await Promise.all([
    Promise.resolve(listMealsForIndex()),
    listCitiesForIndex(),
  ]);

  const related = [
    { href: '/near-me/restaurants', label: 'Restaurants near me by city & state' },
    ...cities.slice(0, 12).map((c) => ({
      href: `/near-me/meals/${slug}/${c.slug}`,
      label: `${meal} restaurants near me in ${c.label}`,
    })),
    ...meals
      .filter((m) => m.slug !== slug)
      .map((m) => ({
        href: `/near-me/meals/${m.slug}`,
        label: `${m.label} restaurants near me`,
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
          meal,
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
