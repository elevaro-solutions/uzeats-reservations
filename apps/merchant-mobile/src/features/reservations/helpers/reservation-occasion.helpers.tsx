import type { ReactElement } from "react";

import {
  BriefcaseIcon,
  CakeIcon,
  HeartIcon,
  PartyPopperIcon,
  SparklesIcon,
  WineIcon,
} from "@/assets";
import type { IconPropsType } from "@/types";
import { OCCASION_LABELS, type Occasion } from "@reservations/shared";

/** Display label for occasion; treats missing / "none" as absent. */
export function reservationOccasionLabel(
  occasion?: string | null,
): string | null {
  const value = occasion?.trim();
  if (!value || value.toLowerCase() === "none") return null;
  return OCCASION_LABELS[value as Occasion] ?? value;
}

/** Occasion icon matching diner reservation detail rows. */
export function reservationOccasionIcon(
  occasion: string,
  color: string,
  size = 18,
): ReactElement<IconPropsType> {
  const props = { size, color };
  switch (occasion.trim().toLowerCase()) {
    case "date":
      return <HeartIcon {...props} />;
    case "birthday":
      return <CakeIcon {...props} />;
    case "anniversary":
      return <WineIcon {...props} />;
    case "business":
      return <BriefcaseIcon {...props} />;
    case "celebration":
      return <PartyPopperIcon {...props} />;
    default:
      return <SparklesIcon {...props} />;
  }
}
