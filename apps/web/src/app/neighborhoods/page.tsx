import type { Metadata } from 'next';
import Link from 'next/link';
import { seoTierRestaurantsIn, seoTierRestaurantsInParts } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { DiscoveryIndexRowList } from '@/components/DiscoveryIndexRowList';
import {
  neighborhoodIndexDescription,
  neighborhoodIndexImageAlt,
  neighborhoodIndexImageSrc,
} from '@/lib/discoveryIndexContent';
import { listNeighborhoodsForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Browse restaurant reservations by neighborhood — SoHo, Williamsburg, Brickell, Center City, and more on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Neighborhood — Book Tables | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/neighborhoods',
});

export default async function NeighborhoodsIndexPage() {
  const neighborhoods = await listNeighborhoodsForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Neighborhoods' },
  ];
  const items = neighborhoods.map((n) => ({
    name: seoTierRestaurantsIn('best', n.label),
    url: `/neighborhoods/${n.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by Neighborhood',
            description: PAGE_DESCRIPTION,
            url: '/neighborhoods',
            items,
          }),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by neighborhood
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Explore walkable dining areas and reserve tables with live availability.
      </p>
      <DiscoveryIndexRowList
        items={neighborhoods.map((n) => ({
          slug: n.slug,
          href: `/neighborhoods/${n.slug}`,
          labelParts: seoTierRestaurantsInParts('best', n.label),
          description: neighborhoodIndexDescription(n.slug, n.label),
          imageSrc: neighborhoodIndexImageSrc(n.slug, n.label),
          imageAlt: neighborhoodIndexImageAlt(n.label),
          count: n.count,
        }))}
      />
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also explore <Link href="/near-me">near me neighborhoods</Link>,{' '}
        <Link href="/landmarks">landmarks</Link>, and{' '}
        <Link href="/top-locations">top locations</Link>.
      </p>
    </div>
  );
}
