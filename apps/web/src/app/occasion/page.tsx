import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listOccasionsForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find restaurants for date night, birthdays, business meals, group dining, and more. Book with live availability on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Occasion — Reserve a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/occasion',
});

export default async function OccasionIndexPage() {
  const occasions = await listOccasionsForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Occasions' },
  ];
  const items = occasions.map((occasion) => ({
    name: occasion.label,
    url: `/occasion/${occasion.slug}`,
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
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by occasion
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Match the mood — then reserve a table with live availability.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {occasions.map((occasion) => (
          <li key={occasion.slug}>
            <Link href={`/occasion/${occasion.slug}`} style={{ fontSize: 16 }}>
              {occasion.label}
              {typeof occasion.count === 'number' ? (
                <span style={{ marginLeft: 8, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
                  ({occasion.count})
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
