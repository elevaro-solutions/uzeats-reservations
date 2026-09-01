import { formatPriceRangeChip } from "@/features/discovery/helpers/format-price-range.helpers";
import {
  formatDisplayDate,
  formatDisplayTime,
  toIsoDate,
} from "@/lib/helpers/date-time.helpers";
import { useAppStore, type DiscoveryFilters } from "@/store";

import { WHEELCHAIR_ACCESSIBLE_LABEL } from "./filter-option-icons.helpers";

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

function tomorrowIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIsoDate(date);
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
      clear: () => {
        const lastSearchCity = useAppStore.getState().lastSearchCity;
        setDiscovery({
          nearMe: false,
          lat: undefined,
          lng: undefined,
          locationLabel: undefined,
          city: lastSearchCity || discovery.city,
          state: undefined,
        });
      },
    });
  }
  if (discovery.time) {
    chips.push({
      key: "date",
      label: formatDisplayDate(discovery.date),
      clear: () => setDiscovery({ date: tomorrowIsoDate(), time: undefined }),
    });
    chips.push({
      key: "time",
      label: formatDisplayTime(discovery.time),
      clear: () => setDiscovery({ time: undefined }),
    });
    chips.push({
      key: "party",
      label: `${discovery.partySize} guest${discovery.partySize === 1 ? "" : "s"}`,
      clear: () => setDiscovery({ partySize: 2 }),
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
      label: WHEELCHAIR_ACCESSIBLE_LABEL,
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
