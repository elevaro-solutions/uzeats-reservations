import type { Metadata } from 'next';
import Link from 'next/link';
import { Typography } from 'antd';
import { JsonLd } from '@/components/JsonLd';
import { listNeighborhoodsForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const { Title, Paragraph, Text } = Typography;

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
      <Title level={1} style={{ marginBottom: 8 }}>
        Restaurants by neighborhood
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 32, fontSize: 16 }}>
        Explore walkable dining areas and reserve tables with live availability.
      </Paragraph>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {neighborhoods.map((n) => (
          <li key={n.slug}>
            <Link href={`/neighborhoods/${n.slug}`} style={{ fontSize: 16 }}>
              {n.label}
              {typeof n.count === 'number' ? (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
                  ({n.count})
                </Text>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
