import type { Metadata } from 'next';
import Link from 'next/link';
import { Typography } from 'antd';
import { JsonLd } from '@/components/JsonLd';
import { listCitiesForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const { Title, Paragraph, Text } = Typography;

const PAGE_DESCRIPTION =
  'Browse Tablevera restaurant reservations by city. Find live availability across New York, New Jersey, Florida, Pennsylvania, and more.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by City — Book Tables | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/cities',
});

export default async function CitiesIndexPage() {
  const cities = await listCitiesForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Cities' },
  ];
  const items = cities.map((c) => ({
    name: c.label,
    url: `/cities/${c.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by City',
            description: PAGE_DESCRIPTION,
            url: '/cities',
            items,
          }),
        ]}
      />
      <Title level={1} style={{ marginBottom: 8 }}>
        Restaurants by city
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 32, fontSize: 16 }}>
        Choose a city to browse restaurants with live table availability on Tablevera.
      </Paragraph>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {cities.map((c) => (
          <li key={c.slug}>
            <Link href={`/cities/${c.slug}`} style={{ fontSize: 16 }}>
              {c.label}
              {typeof c.count === 'number' ? (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
                  ({c.count})
                </Text>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
