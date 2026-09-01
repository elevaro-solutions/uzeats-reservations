import type { DiscoveryIndexEntry } from "../types";

export function filterCitiesByQuery(
  cities: DiscoveryIndexEntry[],
  query: string,
): DiscoveryIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return cities;
  return cities.filter((city) => {
    const haystack = [city.label, city.city, city.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
