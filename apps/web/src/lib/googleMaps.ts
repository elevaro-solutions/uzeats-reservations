/**
 * Lazy-loads the Google Maps JavaScript API (Places library) once per page.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY with Places API enabled.
 */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type ResolvedPlace = {
  placeId: string;
  label: string;
  lat: number;
  lng: number;
};

type GoogleMapsApi = NonNullable<NonNullable<Window['google']>['maps']>;

export function hasGoogleMapsKey(): boolean {
  return Boolean(API_KEY);
}

export function loadGoogleMaps(): Promise<GoogleMapsApi | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!API_KEY) return Promise.resolve(null);

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__rtGoogleMapsPromise) {
    return window.__rtGoogleMapsPromise.then((g) => g.maps ?? null);
  }

  window.__rtGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-rt-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps?.places) resolve(window.google);
        else reject(new Error('Google Maps failed to load'));
      });
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.rtGoogleMaps = '1';
    script.onload = () => {
      if (window.google?.maps?.places) resolve(window.google);
      else reject(new Error('Google Maps Places library unavailable'));
    };
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });

  return window.__rtGoogleMapsPromise.then((g) => g.maps ?? null);
}

export async function fetchPlacePredictions(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const maps = await loadGoogleMaps();
  if (!maps) return [];

  const service = new maps.places.AutocompleteService();
  const sessionToken = new maps.places.AutocompleteSessionToken();

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: trimmed,
        types: ['geocode'],
        componentRestrictions: { country: 'us' },
        sessionToken,
      },
      (predictions, status) => {
        if (status !== 'OK' || !predictions?.length) {
          resolve([]);
          return;
        }
        resolve(
          predictions.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting.main_text,
            secondaryText: p.structured_formatting.secondary_text,
          })),
        );
      },
    );
  });
}

export async function resolvePlace(placeId: string): Promise<ResolvedPlace | null> {
  const maps = await loadGoogleMaps();
  if (!maps) return null;

  const attribution = document.createElement('div');
  const service = new maps.places.PlacesService(attribution);
  const sessionToken = new maps.places.AutocompleteSessionToken();

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'name', 'geometry'],
        sessionToken,
      },
      (result, status) => {
        if (status !== 'OK' || !result?.geometry?.location) {
          resolve(null);
          return;
        }
        resolve({
          placeId,
          label: result.formatted_address || result.name || 'Selected location',
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        });
      },
    );
  });
}
