type Address = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
};

type Location = { lat: number; lng: number } | null | undefined;

export function formatRestaurantAddress(address: Address): string {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.zip}`]
    .filter(Boolean)
    .join(', ');
}

export function buildDirectionsUrl(address: Address, location?: Location): string {
  if (location?.lat != null && location?.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatRestaurantAddress(address))}`;
}

export function buildMapsSearchUrl(address: Address, location?: Location): string {
  if (location?.lat != null && location?.lng != null) {
    return `https://maps.google.com/?q=${location.lat},${location.lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(formatRestaurantAddress(address))}`;
}
