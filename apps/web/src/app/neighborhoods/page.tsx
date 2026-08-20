import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
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
    name: n.label,
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
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {neighborhoods.map((n) => (
          <li key={n.slug}>
            <Link href={`/neighborhoods/${n.slug}`} style={{ fontSize: 16 }}>
              {n.label}
              {typeof n.count === 'number' ? (
                <span style={{ marginLeft: 8, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
                  ({n.count})
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also explore <Link href="/near-me">near me neighborhoods</Link>,{' '}
        <Link href="/landmarks">landmarks</Link>, and{' '}
        <Link href="/top-locations">top locations</Link>.
      </p>
    </div>
  );
}
