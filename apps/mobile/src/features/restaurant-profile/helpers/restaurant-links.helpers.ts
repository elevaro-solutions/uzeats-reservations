export type LinkAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip?: string | null;
};

type Location = { lat: number; lng: number } | null | undefined;

export function formatRestaurantAddress(address: LinkAddress): string {
  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildDirectionsUrl(
  address: LinkAddress,
  location?: Location,
): string {
  if (location?.lat != null && location?.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatRestaurantAddress(address))}`;
}

export function buildMapsSearchUrl(
  address: LinkAddress,
  location?: Location,
): string {
  if (location?.lat != null && location?.lng != null) {
    return `https://maps.google.com/?q=${location.lat},${location.lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(formatRestaurantAddress(address))}`;
}

export function buildTelUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function buildWebsiteUrl(website: string): string {
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

export function buildRestaurantShareUrl(slugOrId: string): string {
  return `https://tablevera.online/r/${slugOrId}`;
}
