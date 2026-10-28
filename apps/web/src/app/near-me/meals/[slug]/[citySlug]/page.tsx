import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mealNearMeLandingMeta } from '@reservations/shared';
import { DiscoveryLanding } from '@/components/DiscoveryLanding';
import {
  listCitiesForIndex,
  listMealCityLandingParams,
  listMealsForIndex,
  resolveCityBySlug,
  resolveMealBySlug,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';
import type { BreadcrumbItem } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string; citySlug: string }> };

export async function generateStaticParams() {
  return listMealCityLandingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, citySlug: cityParam } = await params;
  const meal = resolveMealBySlug(slug);
  const city = await resolveCityBySlug(cityParam);
  if (!meal || !city) return {};
  const meta = mealNearMeLandingMeta(meal, city.city, city.state);
  return discoveryLandingMetadata({
    title: meta.title,
    description: meta.description,
    canonicalPath: `/near-me/meals/${slug}/${cityParam}`,
  });
}

export default async function MealNearMeCityPage({ params }: PageProps) {
  const { slug, citySlug: cityParam } = await params;
  const meal = resolveMealBySlug(slug);
  const city = await resolveCityBySlug(cityParam);
  if (!meal || !city) notFound();

  const meta = mealNearMeLandingMeta(meal, city.city, city.state);
  const place = `${city.city}, ${city.state}`;
  const canonicalPath = `/near-me/meals/${slug}/${cityParam}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Restaurants near me', href: '/near-me' },
    { name: 'Meals near me', href: '/near-me/meals' },
    { name: meal, href: `/near-me/meals/${slug}` },
    { name: place },
  ];

  const [cities, meals] = await Promise.all([
    listCitiesForIndex(),
    Promise.resolve(listMealsForIndex()),
  ]);

  const related = [
    {
      href: `/near-me/restaurants/${cityParam}`,
      label: `Restaurants near me in ${place}`,
    },
    { href: `/near-me/meals/${slug}`, label: `${meal} restaurants near me` },
    ...cities
      .filter((c) => c.slug !== cityParam)
      .slice(0, 6)
      .map((c) => ({
        href: `/near-me/meals/${slug}/${c.slug}`,
        label: `${meal} restaurants near me in ${c.label}`,
      })),
    ...meals
      .filter((m) => m.slug !== slug)
      .slice(0, 4)
      .map((m) => ({
        href: `/near-me/meals/${m.slug}/${cityParam}`,
        label: `${m.label} restaurants near me in ${place}`,
      })),
  ];

  return (
    <DiscoveryLanding
      meta={meta}
      canonicalPath={canonicalPath}
      breadcrumbs={breadcrumbs}
      relatedLinks={related}
      requireInventory
      preset={{
          meal,
          city: city.city,
          state: city.state,
          lat: city.lat,
          lng: city.lng,
          locationLabel: place,
        }}
    />
  );
}
