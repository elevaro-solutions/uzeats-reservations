import type { Metadata } from 'next';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import { listCitiesForIndex, listMealsForIndex } from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find meal restaurants near me by city — breakfast, brunch, lunch, dinner, and more in New York, Miami, Philadelphia, and beyond.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Meals Near Me — Restaurants by City | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/near-me/meals',
});

export default async function MealsNearMeIndexPage() {
  const [meals, cities] = await Promise.all([
    Promise.resolve(listMealsForIndex()),
    listCitiesForIndex(),
  ]);

  return (
    <DiscoveryHubIndex
      title="Meals near me by city"
      description={PAGE_DESCRIPTION}
      intro="Pick a meal, then a city — for example dinner restaurants near me in New York, NY."
      canonicalPath="/near-me/meals"
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Restaurants near me', href: '/near-me' },
        { name: 'Meals near me' },
      ]}
      sections={[
        {
          heading: 'Meals (pick a city next)',
          links: meals.map((m) => ({
            href: `/near-me/meals/${m.slug}`,
            label: `${m.label} restaurants near me`,
          })),
        },
        {
          heading: 'Popular: restaurants near me by meal + city',
          links: meals.slice(0, 4).flatMap((meal) =>
            cities.slice(0, 3).map((city) => ({
              href: `/near-me/meals/${meal.slug}/${city.slug}`,
              label: `${meal.label} restaurants near me in ${city.label}`,
            })),
          ),
        },
        {
          heading: 'Related',
          links: [
            { href: '/near-me/restaurants', label: 'Restaurants near me by city & state' },
            { href: '/near-me', label: 'Restaurants near me' },
            { href: '/near-me/food', label: 'Food near me by city' },
          ],
        },
      ]}
    />
  );
}
