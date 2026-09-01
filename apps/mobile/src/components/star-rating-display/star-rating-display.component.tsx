import { useUnistyles } from "react-native-unistyles";

import { StarIcon } from "@/assets";

import { Flex } from "../flex";

export type StarRatingDisplayProps = {
  rating: number;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
  gap?: number;
};

function filledStarCount(rating: number): number {
  if (rating <= 0) return 0;
  return Math.min(5, Math.max(0, Math.round(rating)));
}

export function StarRatingDisplay({
  rating,
  size = 18,
  filledColor,
  emptyColor,
  gap = 0.25,
}: StarRatingDisplayProps) {
  const { theme } = useUnistyles();
  const filledCount = filledStarCount(rating);
  const activeColor = filledColor ?? theme.colors.accent;
  const inactiveColor = emptyColor ?? theme.colors.border;

  return (
    <Flex direction="row" gap={gap}>
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          key={index}
          size={size}
          filled={index < filledCount}
          color={index < filledCount ? activeColor : inactiveColor}
        />
      ))}
    </Flex>
  );
}
