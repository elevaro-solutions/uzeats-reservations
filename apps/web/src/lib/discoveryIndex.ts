import { cache } from 'react';
import {
  CUISINES,
  DISCOVERY_OCCASIONS,
  MEALS,
  RESTAURANT_DISCOVERY_CATEGORIES,
  citySlug,
  cuisineSlug,
  discoverySlug,
  landmarkSlug,
  mealSlug,
  neighborhoodSlug,
  slugToCuisine,
  slugToMeal,
  slugToOccasion,
  stateSlug,
  type DiscoveryOccasion,
  type Meal,
} from '@reservations/shared';
import {
  DEFAULT_LOCATION,
  POPULAR_CITIES,
  POPULAR_LANDMARKS,
  POPULAR_NEIGHBORHOODS,
  POPULAR_STATES,
  findCityBySlug,
  findLandmarkBySlug,
  findNeighborhoodBySlug,
  findStateBySlug,
  type CityOption,
  type LandmarkOption,
  type NeighborhoodOption,
  type StateOption,
} from '@/lib/cities';
import { serverGraphql } from '@/lib/serverGraphql';

export type DiscoveryIndexEntry = {
  slug: string;
  label: string;
  count: number;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type DiscoveryIndex = {
  cities: DiscoveryIndexEntry[];
  neighborhoods: DiscoveryIndexEntry[];
  cuisines: DiscoveryIndexEntry[];
  occasions: DiscoveryIndexEntry[];
};

const EMPTY_INDEX: DiscoveryIndex = {
  cities: [],
  neighborhoods: [],
  cuisines: [],
  occasions: [],
};

const DISCOVERY_INDEX_QUERY = `
  query DiscoveryIndex {
    discoveryIndex {
      cities {
        slug
        label
        count
        city
        state
        lat
        lng
      }
      neighborhoods {
        slug
        label
        count
        city
        state
        neighborhood
        lat
        lng
      }
      cuisines {
        slug
        label
        count
      }
      occasions {
        slug
        label
        count
      }
    }
  }
`;

export const fetchDiscoveryIndex = cache(async function fetchDiscoveryIndex(): Promise<DiscoveryIndex> {
  try {
    const data = await serverGraphql<{ discoveryIndex: DiscoveryIndex }>(DISCOVERY_INDEX_QUERY);
    return data.discoveryIndex ?? EMPTY_INDEX;
  } catch {
    return EMPTY_INDEX;
  }
});

function curatedCityCoords(city: string, state: string): Pick<CityOption, 'lat' | 'lng'> | undefined {
  return POPULAR_CITIES.find(
    (c) => c.city.toLowerCase() === city.toLowerCase() && c.state.toLowerCase() === state.toLowerCase(),
  );
}

export async function resolveCityBySlug(slug: string): Promise<CityOption | null> {
  const curated = findCityBySlug(slug);
  if (curated) return curated;

  const index = await fetchDiscoveryIndex();
  const entry = index.cities.find((c) => c.slug === slug);
  if (!entry?.city || !entry.state) return null;

  const coords = curatedCityCoords(entry.city, entry.state);
  return {
    city: entry.city,
    state: entry.state,
    lat: entry.lat ?? coords?.lat ?? DEFAULT_LOCATION.lat,
    lng: entry.lng ?? coords?.lng ?? DEFAULT_LOCATION.lng,
  };
}

export async function resolveNeighborhoodBySlug(slug: string): Promise<NeighborhoodOption | null> {
  const curated = findNeighborhoodBySlug(slug);
  if (curated) return curated;

  const index = await fetchDiscoveryIndex();
  const entry = index.neighborhoods.find((n) => n.slug === slug);
  if (!entry?.neighborhood || !entry.city || !entry.state) return null;

  const curatedHood = POPULAR_NEIGHBORHOODS.find(
    (n) =>
      n.neighborhood.toLowerCase() === entry.neighborhood!.toLowerCase() &&
      n.city.toLowerCase() === entry.city!.toLowerCase() &&
      n.state.toLowerCase() === entry.state!.toLowerCase(),
  );

  return {
    neighborhood: entry.neighborhood,
    city: entry.city,
    state: entry.state,
    lat: entry.lat ?? curatedHood?.lat ?? DEFAULT_LOCATION.lat,
    lng: entry.lng ?? curatedHood?.lng ?? DEFAULT_LOCATION.lng,
  };
}

export async function resolveCuisineBySlug(slug: string): Promise<string | null> {
  const known = slugToCuisine(slug, CUISINES);
  if (known && known !== 'Other') return known;

  const index = await fetchDiscoveryIndex();
  const entry = index.cuisines.find((c) => c.slug === slug);
  return entry?.label ?? null;
}

export async function resolveOccasionBySlug(slug: string): Promise<DiscoveryOccasion | null> {
  const known = slugToOccasion(slug);
  if (known) return known;

  const index = await fetchDiscoveryIndex();
  const entry = index.occasions.find((o) => o.slug === slug);
  if (!entry?.label) return null;
  return (DISCOVERY_OCCASIONS as readonly string[]).includes(entry.label)
    ? (entry.label as DiscoveryOccasion)
    : null;
}

export async function listCityLandingParams(): Promise<Array<{ slug: string }>> {
  const index = await fetchDiscoveryIndex();
  const slugs = new Set<string>([
    ...POPULAR_CITIES.map((c) => citySlug(c.city, c.state)),
    ...index.cities.map((c) => c.slug),
  ]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function listNeighborhoodLandingParams(): Promise<Array<{ slug: string }>> {
  const index = await fetchDiscoveryIndex();
  const slugs = new Set<string>([
    ...POPULAR_NEIGHBORHOODS.map((n) => neighborhoodSlug(n.neighborhood, n.city, n.state)),
    ...index.neighborhoods.map((n) => n.slug),
  ]);
  return [...slugs].map((slug) => ({ slug }));
}

/** Prefer live inventory; fall back to curated list when the API is empty at build time. */
export async function listCuisineLandingParams(): Promise<Array<{ slug: string }>> {
  const index = await fetchDiscoveryIndex();
  if (index.cuisines.length > 0) {
    return index.cuisines
      .filter((c) => c.label && c.label !== 'Other')
      .map((c) => ({ slug: c.slug }));
  }
  return CUISINES.filter((c) => c !== 'Other').map((cuisine) => ({
    slug: cuisineSlug(cuisine),
  }));
}

export async function listOccasionLandingParams(): Promise<Array<{ slug: string }>> {
  const index = await fetchDiscoveryIndex();
  if (index.occasions.length > 0) {
    return index.occasions.map((o) => ({ slug: o.slug }));
  }
  return DISCOVERY_OCCASIONS.map((occasion) => ({ slug: discoverySlug(occasion) }));
}

export async function listCitiesForIndex(): Promise<
  Array<{ slug: string; label: string; count?: number }>
> {
  const index = await fetchDiscoveryIndex();
  const bySlug = new Map<string, { slug: string; label: string; count?: number }>();

  for (const c of POPULAR_CITIES) {
    const slug = citySlug(c.city, c.state);
    bySlug.set(slug, { slug, label: `${c.city}, ${c.state}` });
  }
  for (const c of index.cities) {
    bySlug.set(c.slug, {
      slug: c.slug,
      label: c.label,
      count: c.count,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function listNeighborhoodsForIndex(): Promise<
  Array<{ slug: string; label: string; count?: number }>
> {
  const index = await fetchDiscoveryIndex();
  const bySlug = new Map<string, { slug: string; label: string; count?: number }>();

  for (const n of POPULAR_NEIGHBORHOODS) {
    const slug = neighborhoodSlug(n.neighborhood, n.city, n.state);
    bySlug.set(slug, {
      slug,
      label: `${n.neighborhood}, ${n.city}, ${n.state}`,
    });
  }
  for (const n of index.neighborhoods) {
    bySlug.set(n.slug, {
      slug: n.slug,
      label: n.label,
      count: n.count,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function listCuisinesForIndex(): Promise<
  Array<{ slug: string; label: string; count?: number }>
> {
  const index = await fetchDiscoveryIndex();
  if (index.cuisines.length > 0) {
    return index.cuisines
      .filter((c) => c.label !== 'Other')
      .map((c) => ({ slug: c.slug, label: c.label, count: c.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return CUISINES.filter((c) => c !== 'Other' && c !== 'Uzbek').map((cuisine) => ({
    slug: cuisineSlug(cuisine),
    label: cuisine,
  }));
}

export async function listOccasionsForIndex(): Promise<
  Array<{ slug: string; label: string; count?: number }>
> {
  const index = await fetchDiscoveryIndex();
  if (index.occasions.length > 0) {
    return index.occasions
      .map((o) => ({ slug: o.slug, label: o.label, count: o.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return DISCOVERY_OCCASIONS.map((occasion) => ({
    slug: discoverySlug(occasion),
    label: occasion,
  }));
}

export function listStatesForIndex(): Array<{ slug: string; label: string; code: string }> {
  return POPULAR_STATES.map((s) => ({
    slug: stateSlug(s.code),
    label: s.name,
    code: s.code,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function listStateLandingParams(): Array<{ slug: string }> {
  return POPULAR_STATES.map((s) => ({ slug: stateSlug(s.code) }));
}

export function resolveStateBySlug(slug: string): StateOption | null {
  return findStateBySlug(slug) ?? null;
}

export function listLandmarksForIndex(): Array<{ slug: string; label: string }> {
  return POPULAR_LANDMARKS.map((l) => ({
    slug: landmarkSlug(l.landmark, l.state),
    label: `${l.landmark}, ${l.city}`,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function listLandmarkLandingParams(): Array<{ slug: string }> {
  return POPULAR_LANDMARKS.map((l) => ({ slug: landmarkSlug(l.landmark, l.state) }));
}

export function resolveLandmarkBySlug(slug: string): LandmarkOption | null {
  return findLandmarkBySlug(slug) ?? null;
}

export type DiscoveryCategoryOption = (typeof RESTAURANT_DISCOVERY_CATEGORIES)[number];

export function listCategoriesForIndex(): Array<{ slug: string; label: string }> {
  return RESTAURANT_DISCOVERY_CATEGORIES.map((c) => ({
    slug: c.id,
    label: c.label,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function listCategoryLandingParams(): Array<{ slug: string }> {
  return RESTAURANT_DISCOVERY_CATEGORIES.map((c) => ({ slug: c.id }));
}

export function resolveCategoryBySlug(slug: string): DiscoveryCategoryOption | null {
  return RESTAURANT_DISCOVERY_CATEGORIES.find((c) => c.id === slug) ?? null;
}

export function listMealsForIndex(): Array<{ slug: string; label: string }> {
  return MEALS.map((meal) => ({
    slug: mealSlug(meal),
    label: meal,
  }));
}

export function listMealLandingParams(): Array<{ slug: string }> {
  return MEALS.map((meal) => ({ slug: mealSlug(meal) }));
}

export function resolveMealBySlug(slug: string): Meal | null {
  return slugToMeal(slug) ?? null;
}

export async function listCuisineCityLandingParams(): Promise<
  Array<{ slug: string; citySlug: string }>
> {
  const cuisines = await listCuisineLandingParams();
  const cities = POPULAR_CITIES.map((c) => citySlug(c.city, c.state));
  const params: Array<{ slug: string; citySlug: string }> = [];
  for (const { slug } of cuisines) {
    for (const city of cities) {
      params.push({ slug, citySlug: city });
    }
  }
  return params;
}

export async function listCategoryCityLandingParams(): Promise<
  Array<{ slug: string; citySlug: string }>
> {
  const categories = listCategoryLandingParams();
  const cities = POPULAR_CITIES.map((c) => citySlug(c.city, c.state));
  const params: Array<{ slug: string; citySlug: string }> = [];
  for (const { slug } of categories) {
    for (const city of cities) {
      params.push({ slug, citySlug: city });
    }
  }
  return params;
}

export function categorySearchPreset(category: DiscoveryCategoryOption): {
  cuisine?: string;
  categoryIds: string[];
} {
  return {
    cuisine: 'cuisine' in category ? category.cuisine : undefined,
    categoryIds: [category.id],
  };
}
