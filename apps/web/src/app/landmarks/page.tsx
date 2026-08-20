import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listLandmarksForIndex } from '@/lib/discoveryIndex';
import { breadcrumbJsonLd, discoveryLandingMetadata, itemListJsonLd } from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Find restaurants near popular landmarks — Times Square, Central Park, South Beach, and more — with live reservations on Tablevera.';

export const metadata: Metadata = discoveryLandingMetadata({
  title: 'Restaurants Near Landmarks — Book Tables | Tablevera',
  description: PAGE_DESCRIPTION,
  canonicalPath: '/landmarks',
});

export default function LandmarksIndexPage() {
  const landmarks = listLandmarksForIndex();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Landmarks' },
  ];
  const items = landmarks.map((l) => ({
    name: l.label,
    url: `/landmarks/${l.slug}`,
  }));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 72px' }}>
      <JsonLd
        data={[
          breadcrumbJsonLd(breadcrumbs),
          itemListJsonLd({
            name: 'Restaurants Near Landmarks',
            description: PAGE_DESCRIPTION,
            url: '/landmarks',
            items,
          }),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants near landmarks
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Pick a landmark to browse nearby restaurants with open tables you can reserve instantly.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {landmarks.map((l) => (
          <li key={l.slug}>
            <Link href={`/landmarks/${l.slug}`} style={{ fontSize: 16 }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also see <Link href="/near-me">near me locations</Link> and{' '}
        <Link href="/top-locations">top locations</Link>.
      </p>
    </div>
  );
}
