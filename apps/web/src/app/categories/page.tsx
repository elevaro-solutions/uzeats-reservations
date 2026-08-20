import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listCategoriesForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Browse restaurants by category on Tablevera — romantic, brunch, fine dining, kid-friendly, groups, and more with live reservations.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Category — Book a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/categories',
});

export default function CategoriesIndexPage() {
  const categories = listCategoriesForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Categories' },
  ];
  const items = categories.map((c) => ({
    name: c.label,
    url: `/categories/${c.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by Category',
            description: PAGE_DESCRIPTION,
            url: '/categories',
            items,
          }),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by category
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Pick a dining category to see restaurants with open tables you can reserve instantly.
      </p>
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
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`} style={{ fontSize: 16 }}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also explore <Link href="/cuisine">cuisines</Link>,{' '}
        <Link href="/cities">cities</Link>, and{' '}
        <Link href="/top-locations">top locations</Link>.
      </p>
    </div>
  );
}
