import type { DiscoveryFilters } from "@/store";

import { formatPriceRangeChip } from "@/features/discovery/helpers/format-price-range.helpers";

export type ActiveFilterChip = {
  key: string;
  label: string;
  clear: () => void;
};

export type ShortcutFilterChip = {
  key: string;
  label: string;
};

export type BuildActiveFilterChipsOptions = {
  onClearQuery?: () => void;
};

type MultiFilterKey =
  | "diningStyles"
  | "occasions"
  | "meals"
  | "dietaryTags"
  | "amenities";

function pushMultiValueChips(
  chips: ActiveFilterChip[],
  discovery: DiscoveryFilters,
  setDiscovery: (partial: Partial<DiscoveryFilters>) => void,
  field: MultiFilterKey,
  keyPrefix: string,
) {
  for (const value of discovery[field] ?? []) {
    chips.push({
      key: `${keyPrefix}-${value}`,
      label: value,
      clear: () => {
        const next = (discovery[field] ?? []).filter((item) => item !== value);
        setDiscovery({ [field]: next.length ? next : undefined });
      },
    });
  }
}

const SHORTCUT_FILTERS: Array<{
  key: string;
  label: string;
  isActive: (discovery: DiscoveryFilters) => boolean;
}> = [
  {
    key: "shortcut-cuisine",
    label: "Cuisine",
    isActive: (discovery) => Boolean(discovery.cuisine),
  },
  {
    key: "shortcut-price",
    label: "Price",
    isActive: (discovery) => Boolean(discovery.priceRange),
  },
  {
    key: "shortcut-rating",
    label: "Rating",
    isActive: (discovery) => Boolean(discovery.minRating),
  },
  {
    key: "shortcut-meals",
    label: "Meals",
    isActive: (discovery) => Boolean(discovery.meals?.length),
  },
  {
    key: "shortcut-dining",
    label: "Dining style",
    isActive: (discovery) => Boolean(discovery.diningStyles?.length),
  },
  {
    key: "shortcut-occasions",
    label: "Occasions",
    isActive: (discovery) => Boolean(discovery.occasions?.length),
  },
  {
    key: "shortcut-dietary",
    label: "Dietary",
    isActive: (discovery) => Boolean(discovery.dietaryTags?.length),
  },
  {
    key: "shortcut-amenities",
    label: "Amenities",
    isActive: (discovery) => Boolean(discovery.amenities?.length),
  },
];

export function buildActiveFilterChips(
  discovery: DiscoveryFilters,
  setDiscovery: (partial: Partial<DiscoveryFilters>) => void,
  options: BuildActiveFilterChipsOptions = {},
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const trimmedQuery = discovery.query.trim();

  if (trimmedQuery) {
    chips.push({
      key: "query",
      label: trimmedQuery,
      clear: () => {
        if (options.onClearQuery) {
          options.onClearQuery();
          return;
        }
        setDiscovery({ query: "" });
      },
    });
  }

  if (discovery.cuisine) {
    chips.push({
      key: "cuisine",
      label: discovery.cuisine,
      clear: () => setDiscovery({ cuisine: undefined }),
    });
  }
  if (discovery.nearMe) {
    chips.push({
      key: "near",
      label: "Near me",
      clear: () =>
        setDiscovery({
          nearMe: false,
          lat: undefined,
          lng: undefined,
          locationLabel: undefined,
        }),
    });
  }
  if (discovery.priceRange) {
    chips.push({
      key: "price",
      label: formatPriceRangeChip(discovery.priceRange),
      clear: () => setDiscovery({ priceRange: undefined }),
    });
  }
  if (discovery.minRating) {
    chips.push({
      key: "rating",
      label: `${discovery.minRating}+ ★`,
      clear: () => setDiscovery({ minRating: undefined }),
    });
  }
  if (discovery.wheelchairAccessible) {
    chips.push({
      key: "wheelchair",
      label: "Wheelchair accessible",
      clear: () => setDiscovery({ wheelchairAccessible: undefined }),
    });
  }

  pushMultiValueChips(chips, discovery, setDiscovery, "diningStyles", "style");
  pushMultiValueChips(chips, discovery, setDiscovery, "occasions", "occasion");
  pushMultiValueChips(chips, discovery, setDiscovery, "meals", "meal");
  pushMultiValueChips(chips, discovery, setDiscovery, "dietaryTags", "dietary");
  pushMultiValueChips(chips, discovery, setDiscovery, "amenities", "amenity");

  return chips;
}

/** Quick-access facets shown when that filter category is not yet applied. */
export function buildShortcutFilterChips(
  discovery: DiscoveryFilters,
): ShortcutFilterChip[] {
  return SHORTCUT_FILTERS.filter((shortcut) => !shortcut.isActive(discovery)).map(
    ({ key, label }) => ({ key, label }),
  );
}
