import { reverseGeocodeLatLng } from '@reservations/ui';
import { POPULAR_CITIES, cityLabel, type CityOption } from '@/lib/cities';
import type { LocationSelection } from '@/components/AddressAutocomplete';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function nearestPopularCity(lat: number, lng: number): CityOption {
  let best = POPULAR_CITIES[0]!;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const city of POPULAR_CITIES) {
    const dist = haversineKm({ lat, lng }, city);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  return best;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
}

/**
 * Read the diner's device coordinates and resolve a city/state WHERE label.
 * Keeps exact lat/lng for search; falls back to nearest curated city name when
 * Google reverse geocoding is unavailable.
 */
export async function resolveDeviceLocation(): Promise<LocationSelection> {
  const position = await getCurrentPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const geo = await reverseGeocodeLatLng(lat, lng);
  if (geo?.city && geo?.state) {
    return {
      label: `${geo.city}, ${geo.state}`,
      lat,
      lng,
      city: geo.city,
    };
  }

  const nearest = nearestPopularCity(lat, lng);
  return {
    label: cityLabel(nearest),
    lat,
    lng,
    city: nearest.city,
  };
}

export function geolocationErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const geoErr = err as GeolocationPositionError;
    if (geoErr.code === geoErr.PERMISSION_DENIED) {
      return 'Location access denied — please enable it in browser settings';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not determine your location';
}
