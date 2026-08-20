import type { Metadata } from 'next';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import { listCitiesForIndex, listCuisinesForIndex } from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find restaurants near me by cuisine and city — Italian, sushi, Mexican, and more in New York, Miami, Philadelphia, and beyond.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Food Near Me — Restaurants by Cuisine & City | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/near-me/food',
});

export default async function FoodNearMeIndexPage() {
  const [cuisines, cities] = await Promise.all([listCuisinesForIndex(), listCitiesForIndex()]);

  return (
    <DiscoveryHubIndex
      title="Food near me by city"
      description={PAGE_DESCRIPTION}
      intro="Pick a cuisine, then a city — for example Italian restaurants near me in Miami, FL."
      canonicalPath="/near-me/food"
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Restaurants near me', href: '/near-me' },
        { name: 'Food near me' },
      ]}
      sections={[
        {
          heading: 'Cuisines (pick a city next)',
          links: cuisines.map((c) => ({
            href: `/near-me/food/${c.slug}`,
            label: `${c.label} restaurants near me`,
            count: c.count,
          })),
        },
        {
          heading: 'Popular: restaurants near me by cuisine + city',
          links: cuisines.slice(0, 6).flatMap((cuisine) =>
            cities.slice(0, 3).map((city) => ({
              href: `/near-me/food/${cuisine.slug}/${city.slug}`,
              label: `${cuisine.label} restaurants near me in ${city.label}`,
            })),
          ),
        },
        {
          heading: 'Related',
          links: [
            { href: '/near-me/restaurants', label: 'Restaurants near me by city & state' },
            { href: '/near-me', label: 'Restaurants near me' },
            { href: '/near-me/meals', label: 'Meals near me by city' },
          ],
        },
      ]}
    />
  );
}
