import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { StarIcon } from "@/assets";
import { Flex, Typography, UserAvatar } from "@/components";

import {
  dinerDisplayName,
  formatReviewDate,
} from "../helpers/restaurant-profile.helpers";
import { formatRelativeReviewDate } from "../helpers/review.helpers";
import type { RestaurantReview } from "../types";

export type ReviewCardProps = {
  review: RestaurantReview;
  isLast?: boolean;
};

export function ReviewCard({ review, isLast = false }: ReviewCardProps) {
  const { theme } = useUnistyles();

  return (
    <Flex gap={1.5} style={[styles.card, isLast ? styles.cardLast : undefined]}>
      <Flex
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
        style={styles.header}
      >
        <Flex direction="row" alignItems="flex-start" gap={1.5} flex={1}>
          <UserAvatar
            size="md"
            variant="subtle"
            firstName={review.diner?.firstName ?? undefined}
            lastName={review.diner?.lastName ?? undefined}
          />
          <Flex flex={1} gap={0.5}>
            <Typography weight="semibold" size="text-sm">
              {dinerDisplayName(review.diner)}
            </Typography>
            <Flex direction="row" alignItems="center" gap={0.75}>
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon
                  key={index}
                  size={14}
                  filled={index < review.rating}
                  color={
                    index < review.rating
                      ? theme.colors.accent
                      : theme.colors.border
                  }
                />
              ))}
              <Typography size="text-sm" weight="semibold">
                {review.rating.toFixed(1)}
              </Typography>
            </Flex>
          </Flex>
        </Flex>

        <Typography size="text-xs" color="muted" style={styles.date}>
          {formatRelativeReviewDate(review.createdAt) ||
            formatReviewDate(review.createdAt)}
        </Typography>
      </Flex>

      {review.comment?.trim() ? (
        <Typography size="text-sm" color="secondary" style={styles.comment}>
          {review.comment}
        </Typography>
      ) : null}

      {review.ownerReply?.trim() ? (
        <Flex style={styles.reply} gap={0.75}>
          <Typography size="text-xs" weight="semibold">
            Response from the restaurant
          </Typography>
          <Typography size="text-sm" color="secondary">
            {review.ownerReply}
          </Typography>
        </Flex>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    paddingBottom: space(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  header: {
    width: "100%",
  },
  date: {
    flexShrink: 0,
    paddingTop: space(0.25),
  },
  comment: {
    marginTop: space(0.25),
  },
  reply: {
    marginTop: space(0.5),
    padding: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
}));
