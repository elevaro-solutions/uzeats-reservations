import type { Metadata } from 'next';
import { DiscoveryHubIndex } from '@/components/DiscoveryHubIndex';
import {
  listCitiesForIndex,
  listLandmarksForIndex,
  listNeighborhoodsForIndex,
  listStatesForIndex,
} from '@/lib/discoveryIndex';
import { discoveryLandingMetadata } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Explore top dining locations on Tablevera — states, cities, neighborhoods, and landmarks with live restaurant reservations.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Top Locations — Cities, Neighborhoods & Landmarks | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/top-locations',
});

export default async function TopLocationsPage() {
  const [cities, neighborhoods, landmarks, states] = await Promise.all([
    listCitiesForIndex(),
    listNeighborhoodsForIndex(),
    Promise.resolve(listLandmarksForIndex()),
    Promise.resolve(listStatesForIndex()),
  ]);

  return (
    <DiscoveryHubIndex
      title="Top locations"
      description={PAGE_DESCRIPTION}
      intro="Browse the most popular places to dine — by state, city, neighborhood, or landmark — then book with live availability. Use these hubs when you want restaurants near a place, not just a cuisine."
      canonicalPath="/top-locations"
      breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Top locations' }]}
      faq={[
        {
          question: 'What are top locations on Tablevera?',
          answer:
            'Top locations are curated states, cities, neighborhoods, and landmarks with restaurant reservation hubs. Each link opens a landing page with filters, map search, and live table availability.',
        },
        {
          question: 'How do I find restaurants near a landmark?',
          answer:
            'Open the Landmarks section (or /landmarks), pick a place, then filter by cuisine, price, and party size. You can also use Near Me landmark pages for the same area.',
        },
        {
          question: 'What is the difference between top locations and top restaurants?',
          answer:
            'Top locations help you browse by place. Top restaurants highlights highly rated partners — often combined with a city filter for “best restaurants in [city]” queries.',
        },
      ]}
      sections={[
        {
          heading: 'Top states',
          links: states.map((s) => ({
            href: `/states/${s.slug}`,
            label: `${s.label} (${s.code})`,
          })),
        },
        {
          heading: 'Top cities',
          links: cities.slice(0, 20).map((c) => ({
            href: `/cities/${c.slug}`,
            label: c.label,
            count: c.count,
          })),
        },
        {
          heading: 'Top neighborhoods',
          links: neighborhoods.slice(0, 16).map((n) => ({
            href: `/neighborhoods/${n.slug}`,
            label: n.label,
            count: n.count,
          })),
        },
        {
          heading: 'Top landmarks',
          links: landmarks.map((l) => ({
            href: `/landmarks/${l.slug}`,
            label: l.label,
          })),
        },
        {
          heading: 'Related',
          links: [
            { href: '/top-restaurants', label: 'Top restaurants' },
            { href: '/near-me', label: 'Restaurants near me' },
            { href: '/near-me/food', label: 'Food near me' },
            { href: '/near-me/meals', label: 'Meals near me' },
            { href: '/categories', label: 'Categories' },
            { href: '/cuisine', label: 'Cuisines' },
          ],
        },
      ]}
    />
  );
}
