/**
 * Google Places Autocomplete + Details via REST (mobile).
 * Degrades gracefully when EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing.
 */

const API_KEY =
  (typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  "";

const AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type AddressSelection = {
  label: string;
  placeId?: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  neighborhood?: string;
  zip?: string;
  country?: string;
  line1?: string;
};

type AutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type AutocompleteResponse = {
  status: string;
  predictions?: AutocompletePrediction[];
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlaceDetailsResult = {
  formatted_address?: string;
  name?: string;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: AddressComponent[];
};

type DetailsResponse = {
  status: string;
  result?: PlaceDetailsResult;
};

/** One session token per typing→select cycle (Places billing). */
let sessionToken: string | null = null;

function ensureSessionToken(): string {
  if (!sessionToken) {
    sessionToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionToken;
}

function clearSessionToken(): void {
  sessionToken = null;
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(API_KEY.trim());
}

function parseAddressComponents(
  components: AddressComponent[],
): Partial<AddressSelection> {
  const find = (type: string) => components.find((c) => c.types.includes(type));

  const streetNumber = find("street_number")?.long_name;
  const route = find("route")?.long_name;
  const line1 = [streetNumber, route].filter(Boolean).join(" ") || undefined;

  return {
    line1,
    city:
      find("locality")?.long_name ??
      find("postal_town")?.long_name ??
      find("sublocality")?.long_name ??
      find("sublocality_level_1")?.long_name,
    neighborhood: find("neighborhood")?.long_name,
    state: find("administrative_area_level_1")?.short_name,
    zip: find("postal_code")?.long_name,
    country: find("country")?.short_name,
  };
}

/**
 * City is the comma-separated token immediately before the state initials.
 * "2060 East 19th Street, Brooklyn, NY, USA" → Brooklyn
 */
function cityBeforeState(formatted: string, state?: string): string | undefined {
  const parts = formatted
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return undefined;

  const stateIdx = parts.findIndex((part) => {
    const token = part.split(/\s+/)[0]?.toUpperCase();
    if (!token || !/^[A-Z]{2}$/.test(token)) return false;
    if (state) return token === state.toUpperCase();
    return part === token || /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/i.test(part);
  });

  if (stateIdx > 0) return parts[stateIdx - 1];
  return undefined;
}

export async function fetchPlacePredictions(
  input: string,
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2 || !hasGoogleMapsApiKey()) return [];

  const params = new URLSearchParams({
    input: trimmed,
    types: "geocode",
    language: "en",
    key: API_KEY,
    sessiontoken: ensureSessionToken(),
  });

  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as AutocompleteResponse;
    if (data.status !== "OK" || !data.predictions?.length) return [];
    return data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));
  } catch {
    return [];
  }
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<AddressSelection | null> {
  if (!placeId.trim() || !hasGoogleMapsApiKey()) return null;

  const token = sessionToken;
  clearSessionToken();

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "formatted_address,name,geometry,address_components",
    key: API_KEY,
    language: "en",
  });
  if (token) params.set("sessiontoken", token);

  try {
    const res = await fetch(`${DETAILS_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as DetailsResponse;
    if (data.status !== "OK" || !data.result) return null;

    const result = data.result;
    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;
    if (lat == null || lng == null) return null;

    const parsed = parseAddressComponents(result.address_components ?? []);
    const label =
      result.formatted_address || result.name || "Selected location";

    return {
      placeId,
      label,
      lat,
      lng,
      ...parsed,
      city: parsed.city ?? cityBeforeState(label, parsed.state),
    };
  } catch {
    return null;
  }
}
