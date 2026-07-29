import type { MetadataRoute } from 'next';
import {
  CUISINES,
  DISCOVERY_OCCASIONS,
  cuisineSlug,
  discoverySlug,
  citySlug,
  neighborhoodSlug,
} from '@reservations/shared';
import { POPULAR_CITIES, POPULAR_NEIGHBORHOODS } from '@/lib/cities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tablevera.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '');
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const cuisinePages = CUISINES.filter((c) => c !== 'Other').map((cuisine) => ({
    url: `${base}/cuisine/${cuisineSlug(cuisine)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const occasionPages = DISCOVERY_OCCASIONS.map((occasion) => ({
    url: `${base}/occasion/${discoverySlug(occasion)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const cityPages = POPULAR_CITIES.map((city) => ({
    url: `${base}/cities/${citySlug(city.city, city.state)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const neighborhoodPages = POPULAR_NEIGHBORHOODS.map((n) => ({
    url: `${base}/neighborhoods/${neighborhoodSlug(n.neighborhood, n.city, n.state)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [...staticPages, ...cuisinePages, ...occasionPages, ...cityPages, ...neighborhoodPages];
}
