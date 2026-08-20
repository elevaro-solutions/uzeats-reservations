import type { MetadataRoute } from 'next';
import {
  listCategoryCityLandingParams,
  listCategoryLandingParams,
  listCityLandingParams,
  listCuisineCityLandingParams,
  listCuisineLandingParams,
  listLandmarkLandingParams,
  listMealLandingParams,
  listNeighborhoodLandingParams,
  listOccasionLandingParams,
  listStateLandingParams,
} from '@/lib/discoveryIndex';
import { fetchBlogSitemapEntries } from '@/lib/blogSeoFetch';
import { fetchRestaurantSitemapEntries } from '@/lib/restaurantSeoFetch';
import { getSiteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/top-restaurants`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/top-locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/near-me`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/near-me/restaurants`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/near-me/food`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/near-me/meals`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/cities`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/states`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/cuisine`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/occasion`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${base}/neighborhoods`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${base}/landmarks`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/for-restaurants`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/sms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [
    cityParams,
    neighborhoodParams,
    cuisineParams,
    occasionParams,
    stateParams,
    landmarkParams,
    categoryParams,
    mealParams,
    cuisineCityParams,
    categoryCityParams,
    restaurantEntries,
    blogEntries,
  ] = await Promise.all([
    listCityLandingParams(),
    listNeighborhoodLandingParams(),
    listCuisineLandingParams(),
    listOccasionLandingParams(),
    Promise.resolve(listStateLandingParams()),
    Promise.resolve(listLandmarkLandingParams()),
    Promise.resolve(listCategoryLandingParams()),
    Promise.resolve(listMealLandingParams()),
    listCuisineCityLandingParams(),
    listCategoryCityLandingParams(),
    fetchRestaurantSitemapEntries(),
    fetchBlogSitemapEntries(),
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

  const statePages = stateParams.map(({ slug }) => ({
    url: `${base}/states/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const landmarkPages = landmarkParams.map(({ slug }) => ({
    url: `${base}/landmarks/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const categoryPages = categoryParams.map(({ slug }) => ({
    url: `${base}/categories/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const topRestaurantCityPages = cityParams.map(({ slug }) => ({
    url: `${base}/top-restaurants/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const nearMeRestaurantStatePages = stateParams.map(({ slug }) => ({
    url: `${base}/near-me/restaurants/state/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const nearMeRestaurantCityPages = cityParams.map(({ slug }) => ({
    url: `${base}/near-me/restaurants/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const nearMeNeighborhoodPages = neighborhoodParams.map(({ slug }) => ({
    url: `${base}/near-me/neighborhoods/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const nearMeLandmarkPages = landmarkParams.map(({ slug }) => ({
    url: `${base}/near-me/landmarks/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const nearMeFoodPages = cuisineParams.map(({ slug }) => ({
    url: `${base}/near-me/food/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const nearMeFoodCityPages = cuisineCityParams.map(({ slug, citySlug }) => ({
    url: `${base}/near-me/food/${slug}/${citySlug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const nearMeMealPages = mealParams.map(({ slug }) => ({
    url: `${base}/near-me/meals/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const nearMeMealCityPages = mealParams.flatMap(({ slug }) =>
    cityParams.map((city) => ({
      url: `${base}/near-me/meals/${slug}/${city.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  );

  const cuisineCityPages = cuisineCityParams.map(({ slug, citySlug }) => ({
    url: `${base}/cuisine/${slug}/${citySlug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryCityPages = categoryCityParams.map(({ slug, citySlug }) => ({
    url: `${base}/categories/${slug}/${citySlug}`,
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

  const blogPages = blogEntries.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.lastModified ? new Date(p.lastModified) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [
    ...staticPages,
    ...cuisinePages,
    ...occasionPages,
    ...cityPages,
    ...neighborhoodPages,
    ...statePages,
    ...landmarkPages,
    ...categoryPages,
    ...topRestaurantCityPages,
    ...nearMeRestaurantStatePages,
    ...nearMeRestaurantCityPages,
    ...nearMeNeighborhoodPages,
    ...nearMeLandmarkPages,
    ...nearMeFoodPages,
    ...nearMeFoodCityPages,
    ...nearMeMealPages,
    ...nearMeMealCityPages,
    ...cuisineCityPages,
    ...categoryCityPages,
    ...restaurantPages,
    ...blogPages,
  ];
}
