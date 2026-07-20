/**
 * Lazy-loads the Google Maps JavaScript API (Places library) once per page
 * and exposes autocomplete helpers shared by the web and dashboard apps.
 *
 * Degrades gracefully: when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing, the
 * script fails to load, or Google rejects the key (auth failure /
 * REQUEST_DENIED), availability flips to 'unavailable' so consumers can fall
 * back to a plain input.
 */

// Next.js inlines `process.env.NEXT_PUBLIC_*` at build time; this local
// declaration avoids requiring @types/node in this package.
declare const process: { env: Record<string, string | undefined> };

const API_KEY: string =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) || '';

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type AddressSelection = {
  /** Human-readable label (formatted address or fallback option label). */
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  /** Street line, e.g. "123 Main St", when Google returns it. */
  line1?: string;
  city?: string;
  /** Two-letter state/region code when available. */
  state?: string;
  zip?: string;
  /** Two-letter country code when available. */
  country?: string;
};

/* ------------------------------------------------------------------ */
/* Minimal local typings for the Places JS API (kept private to avoid  */
/* clashing with app-level Window augmentations).                      */
/* ------------------------------------------------------------------ */

type RawPrediction = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

type RawAddressComponent = { long_name: string; short_name: string; types: string[] };

type RawPlaceResult = {
  formatted_address?: string;
  name?: string;
  geometry?: { location: { lat: () => number; lng: () => number } };
  address_components?: RawAddressComponent[];
};

type AutocompleteServiceLike = {
  getPlacePredictions: (
    request: {
      input: string;
      types?: string[];
      componentRestrictions?: { country: string | string[] };
      sessionToken?: unknown;
    },
    callback: (predictions: RawPrediction[] | null, status: string) => void,
  ) => void;
};

type PlacesServiceLike = {
  getDetails: (
    request: { placeId: string; fields: string[]; sessionToken?: unknown },
    callback: (result: RawPlaceResult | null, status: string) => void,
  ) => void;
};

type PlacesApi = {
  AutocompleteService: new () => AutocompleteServiceLike;
  PlacesService: new (attrContainer: HTMLDivElement) => PlacesServiceLike;
  AutocompleteSessionToken: new () => unknown;
};

type MapsWindow = {
  google?: { maps?: { places?: PlacesApi } };
  gm_authFailure?: () => void;
  __rtGoogleMapsOnLoad?: () => void;
};

function mapsWindow(): MapsWindow {
  return window as unknown as MapsWindow;
}

/* ------------------------------------------------------------------ */
/* Availability store                                                  */
/* ------------------------------------------------------------------ */

export type GooglePlacesAvailability = 'unknown' | 'available' | 'unavailable';

let availability: GooglePlacesAvailability = API_KEY ? 'unknown' : 'unavailable';
const listeners = new Set<() => void>();

function setAvailability(next: GooglePlacesAvailability): void {
  if (availability === next) return;
  availability = next;
  for (const listener of Array.from(listeners)) listener();
}

export function hasGoogleMapsKey(): boolean {
  return Boolean(API_KEY);
}

export function getGooglePlacesAvailability(): GooglePlacesAvailability {
  return availability;
}

export function subscribeGooglePlacesAvailability(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Script loader                                                       */
/* ------------------------------------------------------------------ */

let loaderPromise: Promise<PlacesApi | null> | null = null;

export function loadGooglePlaces(): Promise<PlacesApi | null> {
  if (typeof window === 'undefined' || !API_KEY) return Promise.resolve(null);

  const w = mapsWindow();
  if (w.google?.maps?.places) {
    setAvailability('available');
    return Promise.resolve(w.google.maps.places);
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<PlacesApi | null>((resolve) => {
      // Google calls this global when the API key is invalid or unauthorized.
      const previousAuthFailure = w.gm_authFailure;
      w.gm_authFailure = () => {
        previousAuthFailure?.();
        setAvailability('unavailable');
      };

      w.__rtGoogleMapsOnLoad = () => {
        const places = mapsWindow().google?.maps?.places ?? null;
        if (!places) setAvailability('unavailable');
        resolve(places);
      };

      const script = document.createElement('script');
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}` +
        `&libraries=places&loading=async&callback=__rtGoogleMapsOnLoad`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setAvailability('unavailable');
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  return loaderPromise;
}

/* ------------------------------------------------------------------ */
/* Autocomplete helpers                                                */
/* ------------------------------------------------------------------ */

let autocompleteService: AutocompleteServiceLike | null = null;
// One session token spans the user's keystrokes until a place is resolved,
// which is how Google bills autocomplete sessions.
let sessionToken: unknown = null;

function ensureSessionToken(places: PlacesApi): unknown {
  if (!sessionToken) sessionToken = new places.AutocompleteSessionToken();
  return sessionToken;
}

export async function fetchPlacePredictions(
  input: string,
  options?: { types?: string[]; country?: string | string[] },
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const places = await loadGooglePlaces();
  if (!places) return [];

  if (!autocompleteService) autocompleteService = new places.AutocompleteService();
  const service = autocompleteService;

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: trimmed,
        types: options?.types ?? ['address'],
        componentRestrictions: options?.country ? { country: options.country } : undefined,
        sessionToken: ensureSessionToken(places),
      },
      (predictions, status) => {
        if (status === 'REQUEST_DENIED') {
          setAvailability('unavailable');
          resolve([]);
          return;
        }
        setAvailability('available');
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

function parseAddressComponents(components: RawAddressComponent[]): Partial<AddressSelection> {
  const find = (type: string) => components.find((c) => c.types.includes(type));

  const streetNumber = find('street_number')?.long_name;
  const route = find('route')?.long_name;
  const line1 = [streetNumber, route].filter(Boolean).join(' ') || undefined;

  const city =
    find('locality')?.long_name ??
    find('sublocality_level_1')?.long_name ??
    find('sublocality')?.long_name ??
    find('postal_town')?.long_name ??
    find('administrative_area_level_3')?.long_name;

  return {
    line1,
    city,
    state: find('administrative_area_level_1')?.short_name,
    zip: find('postal_code')?.long_name,
    country: find('country')?.short_name,
  };
}

export async function resolveAddress(placeId: string): Promise<AddressSelection | null> {
  const places = await loadGooglePlaces();
  if (!places) return null;

  const service = new places.PlacesService(document.createElement('div'));
  // Consuming the session token here closes the billing session.
  const token = sessionToken;
  sessionToken = null;

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'name', 'geometry', 'address_components'],
        sessionToken: token ?? undefined,
      },
      (result, status) => {
        if (status === 'REQUEST_DENIED') setAvailability('unavailable');
        if (status !== 'OK' || !result) {
          resolve(null);
          return;
        }
        resolve({
          placeId,
          label: result.formatted_address || result.name || 'Selected location',
          lat: result.geometry?.location.lat(),
          lng: result.geometry?.location.lng(),
          ...parseAddressComponents(result.address_components ?? []),
        });
      },
    );
  });
}
