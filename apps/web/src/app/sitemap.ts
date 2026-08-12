import type { MetadataRoute } from 'next';
import {
  listCityLandingParams,
  listCuisineLandingParams,
  listNeighborhoodLandingParams,
  listOccasionLandingParams,
} from '@/lib/discoveryIndex';
import { fetchRestaurantSitemapEntries } from '@/lib/restaurantSeoFetch';
import { getSiteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/cities`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/cuisine`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/occasion`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${base}/neighborhoods`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [cityParams, neighborhoodParams, cuisineParams, occasionParams, restaurantEntries] =
    await Promise.all([
      listCityLandingParams(),
      listNeighborhoodLandingParams(),
      listCuisineLandingParams(),
      listOccasionLandingParams(),
      fetchRestaurantSitemapEntries(),
    ]);

  const cuisinePages = cuisineParams.map(({ slug }) => ({
    url: `${base}/cuisine/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const occasionPages = occasionParams.map(({ slug }) => ({
    url: `${base}/occasion/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const cityPages = cityParams.map(({ slug }) => ({
    url: `${base}/cities/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const neighborhoodPages = neighborhoodParams.map(({ slug }) => ({
    url: `${base}/neighborhoods/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const restaurantPages = restaurantEntries.map((r) => ({
    url: `${base}/r/${r.slug}`,
    lastModified: r.createdAt ? new Date(r.createdAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [
    ...staticPages,
    ...cuisinePages,
    ...occasionPages,
    ...cityPages,
    ...neighborhoodPages,
    ...restaurantPages,
  ];
}
