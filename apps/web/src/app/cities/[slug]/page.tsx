import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cityLandingMeta, citySlug } from '@reservations/shared';
import { DiscoveryLandingView } from '@/components/DiscoveryLandingView';
import { POPULAR_CITIES, findCityBySlug } from '@/lib/cities';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return POPULAR_CITIES.map((c) => ({ slug: citySlug(c.city, c.state) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = findCityBySlug(slug);
  if (!city) return {};
  const meta = cityLandingMeta(city.city, city.state);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/cities/${slug}` },
  };
}

export default async function CityLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const city = findCityBySlug(slug);
  if (!city) notFound();

  const meta = cityLandingMeta(city.city, city.state);

  return (
    <DiscoveryLandingView
      meta={meta}
      canonicalPath={`/cities/${slug}`}
      preset={{
        city: city.city,
        lat: city.lat,
        lng: city.lng,
        locationLabel: `${city.city}, ${city.state}`,
      }}
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Cities', href: `/cities/${citySlug('New York', 'NY')}` },
        { name: `${city.city}, ${city.state}` },
      ]}
      relatedLinks={POPULAR_CITIES.filter((c) => c.city !== city.city || c.state !== city.state)
        .slice(0, 6)
        .map((c) => ({
          href: `/cities/${citySlug(c.city, c.state)}`,
          label: `${c.city}, ${c.state}`,
        }))}
    />
  );
}
