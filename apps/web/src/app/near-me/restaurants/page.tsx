import type { Metadata } from 'next';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import { listCitiesForIndex, listStatesForIndex } from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find restaurants near me by city and state — New York, Miami, Philadelphia, New Jersey, Florida, and more on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants Near Me by City & State | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/near-me/restaurants',
});

export default async function NearMeRestaurantsHubPage() {
  const [cities, states] = await Promise.all([
    listCitiesForIndex(),
    Promise.resolve(listStatesForIndex()),
  ]);

  return (
    <DiscoveryHubIndex
      title="Restaurants near me by city & state"
      description={PAGE_DESCRIPTION}
      intro="Choose a city or state to open restaurants near me in that location with live table availability."
      canonicalPath="/near-me/restaurants"
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Restaurants near me', href: '/near-me' },
        { name: 'By city & state' },
      ]}
      sections={[
        {
          heading: 'Restaurants near me by state',
          links: states.map((s) => ({
            href: `/near-me/restaurants/state/${s.slug}`,
            label: `Restaurants near me in ${s.label} (${s.code})`,
          })),
        },
        {
          heading: 'Restaurants near me by city',
          links: cities.map((c) => ({
            href: `/near-me/restaurants/${c.slug}`,
            label: `Restaurants near me in ${c.label}`,
            count: c.count,
          })),
        },
        {
          heading: 'Related',
          links: [
            { href: '/near-me', label: 'Restaurants near me' },
            { href: '/near-me/food', label: 'Food near me by city' },
            { href: '/near-me/meals', label: 'Meals near me by city' },
            { href: '/cities', label: 'All cities' },
            { href: '/states', label: 'All states' },
          ],
        },
      ]}
    />
  );
}
