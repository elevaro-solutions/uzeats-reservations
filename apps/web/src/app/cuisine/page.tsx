import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listCuisinesForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Explore restaurants by cuisine on Tablevera — Italian, Japanese, Mexican, Mediterranean, and more with live reservations.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants by Cuisine — Book a Table | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/cuisine',
});

export default async function CuisineIndexPage() {
  const cuisineList = await listCuisinesForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Cuisines' },
  ];
  const items = cuisineList.map((cuisine) => ({
    name: cuisine.label,
    url: `/cuisine/${cuisine.slug}`,
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
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by cuisine
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Pick a cuisine to see restaurants with open tables you can reserve instantly.
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
        {cuisineList.map((cuisine) => (
          <li key={cuisine.slug}>
            <Link href={`/cuisine/${cuisine.slug}`} style={{ fontSize: 16 }}>
              {cuisine.label}
              {typeof cuisine.count === 'number' ? (
                <span style={{ marginLeft: 8, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
                  ({cuisine.count})
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Looking for a city? Open a cuisine, then pick a city — or browse{' '}
        <Link href="/categories">categories</Link> and <Link href="/cities">cities</Link>.
      </p>
    </div>
  );
}
