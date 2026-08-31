import { AMENITIES } from "@reservations/shared";

import type { RestaurantDetail } from "../types";

export type DetailSection =
  | {
      id: string;
      title: string;
      type: "amenityList";
      items: string[];
    }
  | {
      id: string;
      title: string;
      type: "accessibility";
      label: string;
    };

/** Visit-changing amenities shown in Details (excludes wheelchair — own section). */
const VISIT_CHANGING_AMENITIES = new Set(
  AMENITIES.filter((label) => label !== "Wheelchair Accessible").map((label) =>
    label.toLowerCase(),
  ),
);

function cleanList(values?: string[] | null): string[] {
  if (!values?.length) return [];
  const unique: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    if (unique.some((u) => u.toLowerCase() === value.toLowerCase())) continue;
    unique.push(value);
  }
  return unique;
}

/**
 * Keep only allowlisted visit-changing amenities.
 * Case-insensitive match; preserves first-seen casing; drops unknowns.
 */
export function filterVisitChangingAmenities(labels: string[]): string[] {
  const result: string[] = [];
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (!VISIT_CHANGING_AMENITIES.has(key)) continue;
    if (result.some((r) => r.toLowerCase() === key)) continue;
    result.push(label.trim());
  }
  return result;
}

export function buildDetailSections(
  restaurant: RestaurantDetail,
): DetailSection[] {
  const sections: DetailSection[] = [];

  if (restaurant.wheelchairAccessible) {
    sections.push({
      id: "accessibility",
      title: "Accessibility",
      type: "accessibility",
      label: "Wheelchair accessible",
    });
  }

  const amenities = filterVisitChangingAmenities(
    cleanList(restaurant.amenities),
  );
  if (amenities.length > 0) {
    sections.push({
      id: "amenities",
      title: "Amenities",
      type: "amenityList",
      items: amenities,
    });
  }

  return sections;
}
