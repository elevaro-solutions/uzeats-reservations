import type { RestaurantAddress } from "../types";

export function formatRestaurantLocation(address: RestaurantAddress): string {
  if (address.neighborhood?.trim()) return address.neighborhood.trim();
  if (address.line1?.trim()) return address.line1.trim();
  return [address.city, address.state].filter(Boolean).join(", ");
}

/**
 * Compact one-line address for discovery cards.
 * Always includes neighborhood when available.
 * Examples: "123 Main St, SoHo", "SoHo, New York", "123 Main St"
 */
export function formatCardAddress(address: RestaurantAddress): string {
  const line1 = address.line1?.trim() || "";
  const neighborhood = address.neighborhood?.trim() || "";
  const city = address.city?.trim() || "";
  const state = address.state?.trim() || "";

  if (line1 && neighborhood) {
    return `${line1}, ${neighborhood}`;
  }
  if (neighborhood && city) {
    return `${neighborhood}, ${city}`;
  }
  if (neighborhood) return neighborhood;
  if (line1 && city) return `${line1}, ${city}`;
  if (line1) return line1;
  return [city, state].filter(Boolean).join(", ");
}

export function formatFullAddress(address: RestaurantAddress): string {
  const street = [address.line1, address.line2]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  const locality = [
    address.neighborhood,
    address.city,
    address.state,
    address.zip,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  return [street, locality].filter(Boolean).join(" · ");
}
