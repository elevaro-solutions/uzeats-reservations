/**
 * Fallback location suggestions when Google Maps Places is unavailable
 * (no NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). Coordinates match the API seed.
 */

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
