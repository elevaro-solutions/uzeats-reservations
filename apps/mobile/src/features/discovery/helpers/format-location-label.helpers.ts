import type { DiscoveryFilters } from "@/store";

export function formatLocationLabel(
  location: Pick<DiscoveryFilters, "nearMe" | "locationLabel" | "city">,
): string {
  return location.nearMe
    ? (location.locationLabel ?? "Near you")
    : location.city;
}
