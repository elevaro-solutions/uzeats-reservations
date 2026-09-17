import { useMutation } from "@apollo/client";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { CREATE_REVIEW, MY_RESERVATIONS } from "@/graphql";

import type { MyReservationsQueryData } from "../types";

export type UseCreateReviewOptions = {
  visible: boolean;
  reservationId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
};

const EMPTY_RATINGS = {
  overall: 0,
  food: 0,
  service: 0,
  atmosphere: 0,
};

export function useCreateReview({
  visible,
  reservationId,
  onClose,
  onSubmitted,
}: UseCreateReviewOptions) {
  const [ratings, setRatings] = useState(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [createReview, { loading }] = useMutation(CREATE_REVIEW);
  const hasAllRatings =
    ratings.overall > 0 &&
    ratings.food > 0 &&
    ratings.service > 0 &&
    ratings.atmosphere > 0;

  useEffect(() => {
    if (!visible) return;
    setRatings(EMPTY_RATINGS);
    setComment("");
  }, [visible, reservationId]);

  function setQuality(
    key: keyof typeof EMPTY_RATINGS,
    value: number,
  ) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!reservationId || !hasAllRatings) return;

    try {
      await createReview({
        variables: {
          input: {
            reservationId,
            rating: ratings.overall,
            foodRating: ratings.food,
            serviceRating: ratings.service,
            atmosphereRating: ratings.atmosphere,
            comment: comment.trim() || undefined,
          },
        },
        refetchQueries: [{ query: MY_RESERVATIONS }],
        update(cache) {
          const existing = cache.readQuery<MyReservationsQueryData>({
            query: MY_RESERVATIONS,
          });
          if (!existing?.myReservations) return;

          cache.writeQuery({
            query: MY_RESERVATIONS,
            data: {
              myReservations: existing.myReservations.map((reservation) =>
                reservation.id === reservationId
                  ? { ...reservation, hasReview: true }
                  : reservation,
              ),
            },
          });
        },
      });
      onClose();
      onSubmitted();
      Alert.alert("Thank you", "Your review has been submitted.");
    } catch (error) {
      Alert.alert(
        "Couldn't submit review",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return {
    ratings,
    setQuality,
    comment,
    setComment,
    hasAllRatings,
    loading,
    handleSubmit,
  };
}
