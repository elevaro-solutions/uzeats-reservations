import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { listCitiesForIndex } from '@/lib/discoveryIndex';
import {
  breadcrumbJsonLd,
  discoveryLandingMetadata,
  faqJsonLd,
  itemListJsonLd,
  webPageJsonLd,
} from '@/lib/seo';

const PAGE_DESCRIPTION =
  'Browse Tablevera restaurant reservations by city. Find live availability across New York, New Jersey, Florida, Pennsylvania, and more.';

const CITIES_FAQ = [
  {
    question: 'How do I book restaurants by city on Tablevera?',
    answer:
      'Pick a city hub, set your date and party size, then open a restaurant and choose a live time slot. Reservations are free for diners.',
  },
  {
    question: 'Can I search restaurants near me instead of by city?',
    answer:
      'Yes. Open Restaurants near me, tap Near Me for your device location, or use a city-specific near-me page after you know where you are dining.',
  },
  {
    question: 'Where do I find top restaurants in a city?',
    answer:
      'Open Top restaurants and choose your city, or start from a city page and follow the Top restaurants in [city] link.',
  },
];

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
          webPageJsonLd({
            name: 'Restaurants by City',
            description: PAGE_DESCRIPTION,
            url: '/cities',
          }),
          faqJsonLd(CITIES_FAQ),
        ]}
      />
      <h1 style={{ marginBottom: 8, fontSize: 32, fontWeight: 700, lineHeight: 1.25 }}>
        Restaurants by city
      </h1>
      <p style={{ marginBottom: 32, fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>
        Choose a city to browse restaurants with live table availability on Tablevera. Each city hub
        links to top restaurants, near-me pages, and cuisine × city combinations for deeper search.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {cities.map((c) => (
          <li key={c.slug}>
            <Link href={`/cities/${c.slug}`} style={{ fontSize: 16 }}>
              {c.label}
              {typeof c.count === 'number' ? (
                <span style={{ marginLeft: 8, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
                  ({c.count})
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <section style={{ marginTop: 48 }}>
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
          Frequently asked questions
        </h2>
        {CITIES_FAQ.map((item) => (
          <div key={item.question} style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.question}</p>
            <p style={{ margin: 0, color: 'rgba(0,0,0,0.45)' }}>{item.answer}</p>
          </div>
        ))}
      </section>
      <p style={{ marginTop: 32, fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
        Also explore <Link href="/top-restaurants">top restaurants</Link>,{' '}
        <Link href="/states">states</Link>, <Link href="/near-me">near me</Link>, and{' '}
        <Link href="/top-locations">top locations</Link>.
      </p>
    </div>
  );
}
