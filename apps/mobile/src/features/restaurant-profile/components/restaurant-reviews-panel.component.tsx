import { useApolloClient, useQuery } from "@apollo/client";
import { useState } from "react";
import { StyleSheet } from "react-native-unistyles";

import {
  Button,
  Flex,
  InlineAlert,
} from "@/components";
import { Skeleton } from "@/components/skeleton";
import { RESTAURANT, RESTAURANT_REVIEWS, MY_RESERVATIONS } from "@/graphql";

import { AddReviewSheet } from "./add-review-sheet.component";
import { ReviewCard } from "./review-card.component";
import { ReviewsSummary } from "./reviews-summary.component";
import { WriteReviewCta } from "./write-review-cta.component";
import { useReviewableReservation } from "../hooks/use-reviewable-reservation.hook";
import type {
  RestaurantDetail,
  RestaurantReviewsQueryData,
} from "../types";

export type RestaurantReviewsPanelProps = {
  restaurant: RestaurantDetail;
};

export function RestaurantReviewsPanel({
  restaurant,
}: RestaurantReviewsPanelProps) {
  const client = useApolloClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<RestaurantReviewsQueryData>(
    RESTAURANT_REVIEWS,
    {
      variables: { restaurantId: restaurant.id, limit: 50, offset: 0 },
      fetchPolicy: "cache-and-network",
    },
  );

  const { refetchReservations, ...reviewEligibility } =
    useReviewableReservation(restaurant.id);

  const items = data?.restaurantReviews?.items ?? [];
  const total = data?.restaurantReviews?.total ?? restaurant.reviewCount;

  function handleReviewSubmitted() {
    void refetch();
    void refetchReservations();
    void client.refetchQueries({
      include: [RESTAURANT, MY_RESERVATIONS],
    });
  }

  const cta = (
    <WriteReviewCta
      state={reviewEligibility.ctaState}
      restaurantId={restaurant.id}
      onPress={() => setSheetOpen(true)}
    />
  );

  if (loading && items.length === 0) {
    return (
      <Flex gap={2} style={styles.panel}>
        <Skeleton height={56} />
        <Skeleton height={48} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex gap={2} style={styles.panel}>
        <InlineAlert
          tone="error"
          title="Couldn't load reviews"
          message={error.message}
        />
        <Button variant="outlined" color="secondary" onPress={() => refetch()}>
          Try again
        </Button>
      </Flex>
    );
  }

  return (
    <Flex gap={2} style={styles.panel}>
      <ReviewsSummary
        averageRating={restaurant.averageRating}
        reviewCount={total}
      />

      {cta}

      {items.length > 0 ? (
        <Flex gap={3} style={styles.list}>
          {items.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              isLast={index === items.length - 1}
            />
          ))}
        </Flex>
      ) : null}

      <AddReviewSheet
        visible={sheetOpen}
        restaurantName={restaurant.name}
        restaurantPhoto={restaurant.photos?.[0]}
        reservationId={reviewEligibility.reservationId}
        onClose={() => setSheetOpen(false)}
        onSubmitted={handleReviewSubmitted}
      />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  panel: {
    paddingTop: space(0.5),
  },
  list: {
    marginTop: space(0.5),
  },
}));
