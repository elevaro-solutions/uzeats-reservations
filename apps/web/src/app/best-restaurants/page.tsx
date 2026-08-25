import type { Metadata } from 'next';
import {
  bestRestaurantsLandingMeta,
  seoLinkLabelText,
  seoTierRestaurantsInParts,
} from '@reservations/shared';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import { listCitiesForIndex, listStatesForIndex } from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const meta = bestRestaurantsLandingMeta();

export const metadata: Metadata = discoveryLandingMetadata({
  title: meta.title,
  description: meta.description,
  canonicalPath: '/best-restaurants',
});

export default async function BestRestaurantsHubPage() {
  const [cities, states] = await Promise.all([
    listCitiesForIndex(),
    Promise.resolve(listStatesForIndex()),
  ]);

  return (
    <DiscoveryHubIndex
      title={meta.heading}
      description={meta.description}
      intro={meta.intro}
      canonicalPath="/best-restaurants"
      breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Best restaurants' }]}
      faq={meta.faq}
      sections={[
        {
          heading: 'Best restaurants by state',
          links: states.map((s) => {
            const labelParts = seoTierRestaurantsInParts('best', `${s.label} (${s.code})`);
            return {
              href: `/best-restaurants/state/${s.slug}`,
              label: seoLinkLabelText(labelParts),
              labelParts,
            };
          }),
        },
        {
          heading: 'Best restaurants by city',
          links: cities.slice(0, 16).map((c) => {
            const labelParts = seoTierRestaurantsInParts('best', c.label);
            return {
              href: `/top-restaurants/${c.slug}`,
              label: seoLinkLabelText(labelParts),
              labelParts,
              count: c.count,
            };
          }),
        },
        {
          heading: 'Related',
          links: [
            { href: '/top-restaurants', label: 'Top restaurants' },
            { href: '/states', label: 'Browse by state' },
            { href: '/near-me', label: 'Restaurants near me' },
            { href: '/near-me/restaurants', label: 'Near me by city & state' },
            { href: '/top-locations', label: 'Top locations' },
          ],
        },
      ]}
    />
  );
}
