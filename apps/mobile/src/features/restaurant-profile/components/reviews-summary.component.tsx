import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { StarIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import { filledStarCount } from "../helpers/review.helpers";

export type ReviewsSummaryProps = {
  averageRating: number;
  reviewCount: number;
};

export function ReviewsSummary({
  averageRating,
  reviewCount,
}: ReviewsSummaryProps) {
  const { theme } = useUnistyles();
  const filledCount = filledStarCount(averageRating);
  const hasRatings = reviewCount > 0 && averageRating > 0;

  if (!hasRatings) {
    return (
      <Flex alignItems="center" gap={1} style={styles.emptySummary}>
        <Flex direction="row" gap={0.25}>
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              key={index}
              size={20}
              filled={false}
              color={theme.colors.slate4}
            />
          ))}
        </Flex>
        <Typography size="text-md" weight="semibold" align="center">
          No reviews yet
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex direction="row" alignItems="center" gap={1}>
      <Typography size="display-md" weight="bold" style={styles.score}>
        {averageRating.toFixed(1)}
      </Typography>

      <Flex gap={0.5}>
        <Flex direction="row" gap={0.25}>
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              key={index}
              size={18}
              filled={index < filledCount}
              color={
                index < filledCount ? theme.colors.accent : theme.colors.border
              }
            />
          ))}
        </Flex>

        <Typography size="text-sm" color="secondary">
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </Typography>
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  emptySummary: {
    paddingVertical: space(1),
  },
  score: {
    minWidth: space(8),
  },
}));
