import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listStatesForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Browse Tablevera restaurant reservations by state across New York, New Jersey, Florida, Pennsylvania, and more.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by State — Book Tables | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/states',
});

export default function StatesIndexPage() {
  const states = listStatesForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'States' },
  ];
  const items = states.map((s) => ({
    name: s.label,
    url: `/states/${s.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants by State',
            description: PAGE_DESCRIPTION,
            url: '/states',
            items,
          }),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by state
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Choose a state to browse restaurants with live table availability on Tablevera.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {states.map((s) => (
          <li key={s.slug}>
            <Link href={`/states/${s.slug}`} style={{ fontSize: 16 }}>
              {s.label} ({s.code})
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also explore{' '}
        <Link href="/top-locations">top locations</Link>,{' '}
        <Link href="/cities">cities</Link>, and{' '}
        <Link href="/near-me">near me</Link>.
      </p>
    </div>
  );
}
