import type { Metadata } from 'next';
import { seoLinkLabelText, seoTierRestaurantsInParts } from '@reservations/shared';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import { listStatesForIndex } from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Browse Tablevera restaurant reservations by state — near me, top restaurants, and best restaurants across New York, New Jersey, Florida, Pennsylvania, and more.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Browse by State — Near Me, Top & Best Restaurants | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/states',
});

export default function StatesIndexPage() {
  const states = listStatesForIndex();

  return (
    <DiscoveryHubIndex
      title="Browse by state"
      description={PAGE_DESCRIPTION}
      intro="Pick a state to browse all restaurants, restaurants near me, top-rated picks, or the best restaurants — with live table availability on Tablevera."
      canonicalPath="/states"
      breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Browse by state' }]}
      faq={[
        {
          question: 'What can I browse by state on Tablevera?',
          answer:
            'Each state has hubs for all restaurants, restaurants near me, top restaurants, and best restaurants. Every page supports filters and live reservation slots.',
        },
        {
          question: 'What is the difference between top and best restaurants by state?',
          answer:
            'Both highlight highly rated partners (typically 4.5+). Top and best state pages use the same rating filter with SEO copy aimed at “top restaurants in [state]” and “best restaurants in [state]” searches.',
        },
        {
          question: 'How do restaurants near me by state work?',
          answer:
            'Open a near-me state page to center on that state, or tap Near Me for your device location. Jump into a city hub inside the state for tighter results.',
        },
      ]}
      sections={[
        {
          heading: 'Restaurants by state',
          links: states.map((s) => {
            const labelParts = seoTierRestaurantsInParts('best', `${s.label} (${s.code})`);
            return {
              href: `/states/${s.slug}`,
              label: seoLinkLabelText(labelParts),
              labelParts,
            };
          }),
        },
        {
          heading: 'Restaurants near me by state',
          links: states.map((s) => ({
            href: `/near-me/restaurants/state/${s.slug}`,
            label: `Near me in ${s.label}`,
            labelParts: { before: 'Near me in ', highlight: s.label, after: '' },
          })),
        },
        {
          heading: 'Top restaurants by state',
          links: states.map((s) => {
            const labelParts = seoTierRestaurantsInParts('top', s.label);
            return {
              href: `/top-restaurants/state/${s.slug}`,
              label: seoLinkLabelText(labelParts),
              labelParts,
            };
          }),
        },
        {
          heading: 'Best restaurants by state',
          links: states.map((s) => {
            const labelParts = seoTierRestaurantsInParts('best', s.label);
            return {
              href: `/best-restaurants/state/${s.slug}`,
              label: seoLinkLabelText(labelParts),
              labelParts,
            };
          }),
        },
        {
          heading: 'Related',
          links: [
            { href: '/best-restaurants', label: 'Best restaurants' },
            { href: '/top-restaurants', label: 'Top restaurants' },
            { href: '/near-me/restaurants', label: 'Near me by city & state' },
            { href: '/top-locations', label: 'Top locations' },
            { href: '/cities', label: 'Cities' },
          ],
        },
      ]}
    />
  );
}
