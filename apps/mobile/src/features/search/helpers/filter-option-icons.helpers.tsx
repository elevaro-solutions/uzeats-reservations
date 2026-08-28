import type { ComponentType } from "react";
import { Circle, Path } from "react-native-svg";

import { SvgWrapper } from "@/assets/icons/components/svg-wrapper.component";
import {
  CroissantIcon,
  MusicIcon,
  RoseIcon,
  WineIcon,
} from "@/features/home/icons/dining-style-icons";
import type { IconPropsType } from "@/types";

import {
  CoffeeMealIcon,
  MoonMealIcon,
  SoupMealIcon,
} from "../icons/meal-icons";

function UsersIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgWrapper>
  );
}

function UtensilsIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <Path d="M7 2v20" />
      <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v5Z" />
    </SvgWrapper>
  );
}

function MartiniIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M8 22h8" />
      <Path d="M12 11v11" />
      <Path d="m19 3-7 8-7-8Z" />
    </SvgWrapper>
  );
}

function CakeIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <Path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <Path d="M2 21h20" />
      <Path d="M7 8v3" />
      <Path d="M12 8v3" />
      <Path d="M17 8v3" />
      <Path d="M7 4h.01" />
      <Path d="M12 4h.01" />
      <Path d="M17 4h.01" />
    </SvgWrapper>
  );
}

function BuildingIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <Path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <Path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <Path d="M10 6h4" />
      <Path d="M10 10h4" />
      <Path d="M10 14h4" />
      <Path d="M10 18h4" />
    </SvgWrapper>
  );
}

function FlameIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </SvgWrapper>
  );
}

function MoonIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </SvgWrapper>
  );
}

function SunIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="m17.66 17.66 1.41 1.41" />
      <Path d="M2 12h2" />
      <Path d="M20 12h2" />
      <Path d="m6.34 17.66-1.41 1.41" />
      <Path d="m19.07 4.93-1.41 1.41" />
    </SvgWrapper>
  );
}

function WavesIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <Path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <Path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </SvgWrapper>
  );
}

function TrophyIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </SvgWrapper>
  );
}

type IconComponent = ComponentType<IconPropsType>;

const MEAL_ICONS: Record<string, IconComponent> = {
  Breakfast: CoffeeMealIcon,
  Brunch: CroissantIcon,
  Lunch: SoupMealIcon,
  Dinner: MoonMealIcon,
  "Happy Hour": MartiniIcon,
  Dessert: CakeIcon,
};

const DINING_STYLE_ICONS: Record<string, IconComponent> = {
  "Fine Dining": WineIcon,
  Casual: UtensilsIcon,
  "Family-Friendly": UsersIcon,
  Romantic: RoseIcon,
  Trendy: FlameIcon,
  Rooftop: BuildingIcon,
  Waterfront: WavesIcon,
  "Outdoor Dining": SunIcon,
  "Sports Bar": TrophyIcon,
  "Live Music": MusicIcon,
  "Late Night": MoonIcon,
};

export type FilterIconKind =
  | "meal"
  | "diningStyle"
  | "occasion"
  | "dietary"
  | "amenity";

export function getFilterOptionIcon(
  kind: FilterIconKind,
  label: string,
): IconComponent | undefined {
  switch (kind) {
    case "meal":
      return MEAL_ICONS[label];
    case "diningStyle":
      return DINING_STYLE_ICONS[label];
    case "occasion":
    case "dietary":
    case "amenity":
      return undefined;
    default:
      return undefined;
  }
}

export const WHEELCHAIR_ACCESSIBLE_LABEL = "Wheelchair Accessible";
