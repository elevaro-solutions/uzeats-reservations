import type { Metadata } from 'next';
import Link from 'next/link';
import { Typography } from 'antd';
import { DISCOVERY_OCCASIONS, discoverySlug } from '@reservations/shared';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const { Title, Paragraph } = Typography;

const PAGE_DESCRIPTION =
  'Find restaurants for date night, birthdays, business meals, group dining, and more. Book with live availability on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Occasion — Reserve a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/occasion',
});

export default function OccasionIndexPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Occasions' },
  ];
  const items = DISCOVERY_OCCASIONS.map((occasion) => ({
    name: occasion,
    url: `/occasion/${discoverySlug(occasion)}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by Occasion',
            description: PAGE_DESCRIPTION,
            url: '/occasion',
            items,
          }),
        ]}
      />
      <Title level={1} style={{ marginBottom: 8 }}>
        Restaurants by occasion
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 32, fontSize: 16 }}>
        Match the mood — then reserve a table with live availability.
      </Paragraph>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {DISCOVERY_OCCASIONS.map((occasion) => (
          <li key={occasion}>
            <Link href={`/occasion/${discoverySlug(occasion)}`} style={{ fontSize: 16 }}>
              {occasion}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
