import type { ComponentType } from "react";

import type { IconPropsType } from "@/types";

import {
  AccessibilityIcon,
  BarSeatingIcon,
  CheckIcon,
  KidsMenuIcon,
  LiveEntertainmentIcon,
  OutdoorSeatingIcon,
  ParkingIcon,
  PrivateDiningIcon,
} from "../icons/attribute-icons";

const AMENITY_ICONS: Record<string, ComponentType<IconPropsType>> = {
  "private dining": PrivateDiningIcon,
  "outdoor seating": OutdoorSeatingIcon,
  "bar seating": BarSeatingIcon,
  parking: ParkingIcon,
  "wheelchair accessible": AccessibilityIcon,
  "kids' menu": KidsMenuIcon,
  "kids menu": KidsMenuIcon,
  "live entertainment": LiveEntertainmentIcon,
};

/** Short labels for icon-grid tiles (Airbnb-style one-word captions). */
const AMENITY_SHORT_LABELS: Record<string, string> = {
  "private dining": "Private",
  "outdoor seating": "Outdoor",
  "bar seating": "Bar",
  parking: "Parking",
  "wheelchair accessible": "Access",
  "kids' menu": "Kids",
  "kids menu": "Kids",
  "live entertainment": "Live",
};

export function getAmenityIcon(
  label: string,
): ComponentType<IconPropsType> {
  return AMENITY_ICONS[label.trim().toLowerCase()] ?? CheckIcon;
}

export function getAmenityDisplayLabel(label: string): string {
  const trimmed = label.trim();
  return AMENITY_SHORT_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

export { AccessibilityIcon };
