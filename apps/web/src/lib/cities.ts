/**
 * Fallback location suggestions when Google Maps Places is unavailable
 * (no NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). Coordinates match the API seed.
 */

import { citySlug, neighborhoodSlug, landmarkSlug } from '@reservations/shared';

export const US_STATE_NAMES: Record<string, string> = {
  NY: 'New York',
  NJ: 'New Jersey',
  FL: 'Florida',
  PA: 'Pennsylvania',
};

export interface CityOption {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const DEFAULT_LOCATION: CityOption = {
  city: 'New York',
  state: 'NY',
  lat: 40.7505,
  lng: -73.9942,
};

export const POPULAR_CITIES: CityOption[] = [
  // New York
  { city: 'New York', state: 'NY', lat: 40.7505, lng: -73.9942 },
  { city: 'Brooklyn', state: 'NY', lat: 40.6943, lng: -73.9903 },
  { city: 'Queens', state: 'NY', lat: 40.759, lng: -73.8272 },
  { city: 'Buffalo', state: 'NY', lat: 42.8864, lng: -78.8784 },
  { city: 'Rochester', state: 'NY', lat: 43.1566, lng: -77.6109 },
  { city: 'Albany', state: 'NY', lat: 42.6526, lng: -73.7562 },
  // New Jersey
  { city: 'Jersey City', state: 'NJ', lat: 40.7178, lng: -74.0431 },
  { city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724 },
  { city: 'Paterson', state: 'NJ', lat: 40.9168, lng: -74.1718 },
  { city: 'Edison', state: 'NJ', lat: 40.5187, lng: -74.4121 },
  { city: 'Hoboken', state: 'NJ', lat: 40.744, lng: -74.0324 },
  { city: 'Princeton', state: 'NJ', lat: 40.3573, lng: -74.6672 },
  { city: 'Atlantic City', state: 'NJ', lat: 39.3643, lng: -74.4229 },
  // Florida
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'Fort Lauderdale', state: 'FL', lat: 26.1224, lng: -80.1373 },
  { city: 'St. Petersburg', state: 'FL', lat: 27.7676, lng: -82.6403 },
  { city: 'Tallahassee', state: 'FL', lat: 30.4383, lng: -84.2807 },
  // Pennsylvania
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
];

export function cityLabel(c: Pick<CityOption, 'city' | 'state'>): string {
  return `${c.city}, ${c.state}`;
}

export interface NeighborhoodOption {
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

/** Curated neighborhoods for search fallback and SEO landing pages. */
export const POPULAR_NEIGHBORHOODS: NeighborhoodOption[] = [
  { neighborhood: 'SoHo', city: 'New York', state: 'NY', lat: 40.7233, lng: -74.003 },
  { neighborhood: 'Tribeca', city: 'New York', state: 'NY', lat: 40.7163, lng: -74.0086 },
  { neighborhood: 'Williamsburg', city: 'Brooklyn', state: 'NY', lat: 40.7081, lng: -73.9571 },
  { neighborhood: 'Astoria', city: 'Queens', state: 'NY', lat: 40.7644, lng: -73.9235 },
  { neighborhood: 'Downtown', city: 'Jersey City', state: 'NJ', lat: 40.7178, lng: -74.0431 },
  { neighborhood: 'Brickell', city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { neighborhood: 'Center City', city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { neighborhood: 'Ybor City', city: 'Tampa', state: 'FL', lat: 27.9636, lng: -82.4368 },
];

export function neighborhoodLabel(n: Pick<NeighborhoodOption, 'neighborhood' | 'city' | 'state'>): string {
  return `${n.neighborhood}, ${n.city}, ${n.state}`;
}

export function findCityBySlug(slug: string): CityOption | undefined {
  return POPULAR_CITIES.find((c) => citySlug(c.city, c.state) === slug);
}

export function findNeighborhoodBySlug(slug: string): NeighborhoodOption | undefined {
  return POPULAR_NEIGHBORHOODS.find(
    (n) => neighborhoodSlug(n.neighborhood, n.city, n.state) === slug,
  );
}

export interface StateOption {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

/** Approximate state centroids for map-centered SEO landing pages. */
export const POPULAR_STATES: StateOption[] = [
  { code: 'NY', name: 'New York', lat: 42.9538, lng: -75.5268 },
  { code: 'NJ', name: 'New Jersey', lat: 40.0583, lng: -74.4057 },
  { code: 'FL', name: 'Florida', lat: 27.6648, lng: -81.5158 },
  { code: 'PA', name: 'Pennsylvania', lat: 41.2033, lng: -77.1945 },
];

export function findStateBySlug(slug: string): StateOption | undefined {
  return POPULAR_STATES.find((s) => s.code.toLowerCase() === slug.toLowerCase());
}

export interface LandmarkOption {
  landmark: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

/** Curated landmarks for “restaurants near” SEO / AEO pages. */
export const POPULAR_LANDMARKS: LandmarkOption[] = [
  { landmark: 'Times Square', city: 'New York', state: 'NY', lat: 40.758, lng: -73.9855 },
  { landmark: 'Empire State Building', city: 'New York', state: 'NY', lat: 40.7484, lng: -73.9857 },
  { landmark: 'Central Park', city: 'New York', state: 'NY', lat: 40.7829, lng: -73.9654 },
  { landmark: 'Brooklyn Bridge', city: 'Brooklyn', state: 'NY', lat: 40.7061, lng: -73.9969 },
  { landmark: 'Statue of Liberty', city: 'Jersey City', state: 'NJ', lat: 40.6892, lng: -74.0445 },
  { landmark: 'South Beach', city: 'Miami', state: 'FL', lat: 25.7826, lng: -80.1341 },
  { landmark: 'Walt Disney World', city: 'Orlando', state: 'FL', lat: 28.3852, lng: -81.5639 },
  { landmark: 'Independence Hall', city: 'Philadelphia', state: 'PA', lat: 39.9489, lng: -75.15 },
];

export function landmarkLabel(l: Pick<LandmarkOption, 'landmark' | 'city' | 'state'>): string {
  return `${l.landmark}, ${l.city}, ${l.state}`;
}

export function findLandmarkBySlug(slug: string): LandmarkOption | undefined {
  return POPULAR_LANDMARKS.find((l) => landmarkSlug(l.landmark, l.state) === slug);
}
