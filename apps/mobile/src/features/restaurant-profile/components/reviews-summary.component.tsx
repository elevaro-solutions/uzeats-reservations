import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, StarRatingDisplay, Typography } from "@/components";

export type ReviewsSummaryProps = {
  averageRating: number;
  reviewCount: number;
};

export function ReviewsSummary({
  averageRating,
  reviewCount,
}: ReviewsSummaryProps) {
  const { theme } = useUnistyles();
  const hasRatings = reviewCount > 0 && averageRating > 0;

  if (!hasRatings) {
    return (
      <Flex alignItems="center" gap={1} style={styles.emptySummary}>
        <StarRatingDisplay
          rating={0}
          size={20}
          emptyColor={theme.colors.slate4}
        />
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
        <StarRatingDisplay rating={averageRating} size={18} />

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
