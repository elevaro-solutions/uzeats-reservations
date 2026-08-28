import type { DiscoveryFilters } from "@/store";

import type { FilterChipSectionOption } from "../components/filter-chip-section.component";
import { toggleValue } from "./filter-draft.helpers";
import {
  getFilterOptionIcon,
  type FilterIconKind,
  WHEELCHAIR_ACCESSIBLE_LABEL,
} from "./filter-option-icons.helpers";

type BrowseOptionKind = Extract<
  FilterIconKind,
  "diningStyle" | "meal" | "occasion" | "dietary"
>;

export function buildAmenityOptions(
  labels: string[],
): FilterChipSectionOption[] {
  const withoutWheelchair = labels.filter(
    (label) => label !== WHEELCHAIR_ACCESSIBLE_LABEL,
  );
  const unique = [...new Set([WHEELCHAIR_ACCESSIBLE_LABEL, ...withoutWheelchair])];
  return unique.map((label) => ({
    key: label,
    label,
    Icon: getFilterOptionIcon("amenity", label),
  }));
}

export function mapBrowseOptions(
  kind: BrowseOptionKind,
  items: { slug: string; label: string }[],
): FilterChipSectionOption[] {
  return items.map((item) => ({
    key: item.slug,
    label: item.label,
    Icon: getFilterOptionIcon(kind, item.label),
  }));
}

export function isAmenitySelected(
  label: string,
  amenities: string[] | undefined,
  wheelchairAccessible: boolean | undefined,
): boolean {
  if (label === WHEELCHAIR_ACCESSIBLE_LABEL) {
    return Boolean(wheelchairAccessible);
  }
  return (amenities ?? []).includes(label);
}

export function nextAmenityDraft(
  label: string,
  amenities: string[] | undefined,
  wheelchairAccessible: boolean | undefined,
): Partial<DiscoveryFilters> {
  if (label === WHEELCHAIR_ACCESSIBLE_LABEL) {
    return { wheelchairAccessible: !wheelchairAccessible };
  }
  return { amenities: toggleValue(amenities, label) };
}

export function selectedAmenityLabels(
  amenities: string[] | undefined,
  wheelchairAccessible: boolean | undefined,
): string[] {
  return [
    ...(amenities ?? []),
    ...(wheelchairAccessible ? [WHEELCHAIR_ACCESSIBLE_LABEL] : []),
  ];
}
