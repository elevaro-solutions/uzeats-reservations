import type { ComponentType } from "react";

import type { IconPropsType } from "@/types";
import type { DiscoveryFilters } from "@/store";

import {
  ArrowRightIcon,
  CroissantIcon,
  MusicIcon,
  RoseIcon,
  WineIcon,
} from "../icons/dining-style-icons";

export type DiningStyleFilter = Pick<
  DiscoveryFilters,
  "diningStyles" | "occasions" | "meals" | "amenities"
>;

export type DiningStyleIconLayout = {
  /** Multiplier of tile row height */
  sizeFactor: number;
  /** Bleed outside card as a fraction of icon size (applied as negative inset) */
  rightFactor: number;
  bottomFactor: number;
  rotateDeg: number;
  opacity: number;
  strokeWidth: number;
};

export type DiningStyleTile = {
  id: string;
  label: string;
  span: 1 | 2;
  kind?: "style" | "more";
  Icon: ComponentType<IconPropsType>;
  iconLayout?: DiningStyleIconLayout;
  filter?: DiningStyleFilter;
};

/** Slim Dining Styles bento — four strong styles + More. */
export const DINING_STYLE_TILES: DiningStyleTile[] = [
  {
    id: "fine-dining",
    label: "Fine Dining",
    span: 2,
    Icon: WineIcon,
    iconLayout: {
      sizeFactor: 0.72,
      rightFactor: 0.18,
      bottomFactor: 0.22,
      rotateDeg: -14,
      opacity: 0.82,
      strokeWidth: 1.65,
    },
    filter: { diningStyles: ["Fine Dining"] },
  },
  {
    id: "brunch",
    label: "Brunch",
    span: 1,
    Icon: CroissantIcon,
    iconLayout: {
      sizeFactor: 0.72,
      rightFactor: 0.18,
      bottomFactor: 0.2,
      rotateDeg: -48,
      opacity: 0.82,
      strokeWidth: 1.65,
    },
    filter: { meals: ["Brunch"] },
  },
  {
    id: "date-night",
    label: "Date Night",
    span: 1,
    Icon: RoseIcon,
    iconLayout: {
      sizeFactor: 0.56,
      rightFactor: 0.06,
      bottomFactor: 0.08,
      rotateDeg: -10,
      opacity: 0.82,
      strokeWidth: 1.55,
    },
    filter: { occasions: ["Date Night"] },
  },
  {
    id: "live-music",
    label: "Live Music",
    span: 1,
    Icon: MusicIcon,
    iconLayout: {
      sizeFactor: 0.58,
      rightFactor: 0.06,
      bottomFactor: 0.08,
      rotateDeg: -12,
      opacity: 0.82,
      strokeWidth: 1.65,
    },
    filter: { diningStyles: ["Live Music"] },
  },
  {
    id: "more",
    label: "More",
    span: 1,
    kind: "more",
    Icon: ArrowRightIcon,
  },
];
