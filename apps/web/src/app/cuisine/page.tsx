import type { Metadata } from 'next';
import Link from 'next/link';
import { Typography } from 'antd';
import { CUISINES, cuisineSlug } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const { Title, Paragraph } = Typography;

const cuisineList = CUISINES.filter((c) => c !== 'Other' && c !== 'Uzbek');

const PAGE_DESCRIPTION =
  'Explore restaurants by cuisine on Tablevera — Italian, Japanese, Mexican, Mediterranean, and more with live reservations.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Cuisine — Book a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/cuisine',
});

export default function CuisineIndexPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Cuisines' },
  ];
  const items = cuisineList.map((cuisine) => ({
    name: cuisine,
    url: `/cuisine/${cuisineSlug(cuisine)}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by Cuisine',
            description: PAGE_DESCRIPTION,
            url: '/cuisine',
            items,
          }),
        ]}
      />
      <Title level={1} style={{ marginBottom: 8 }}>
        Restaurants by cuisine
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 32, fontSize: 16 }}>
        Pick a cuisine to see restaurants with open tables you can reserve instantly.
      </Paragraph>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        }}
      >
        {cuisineList.map((cuisine) => (
          <li key={cuisine}>
            <Link href={`/cuisine/${cuisineSlug(cuisine)}`} style={{ fontSize: 16 }}>
              {cuisine}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
