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

export function useCreateReview({
  visible,
  reservationId,
  onClose,
  onSubmitted,
}: UseCreateReviewOptions) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [createReview, { loading }] = useMutation(CREATE_REVIEW);
  const hasRating = rating > 0;

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setComment("");
  }, [visible, reservationId]);

  async function handleSubmit() {
    if (!reservationId || rating < 1) return;

    try {
      await createReview({
        variables: {
          input: {
            reservationId,
            rating,
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
    rating,
    setRating,
    comment,
    setComment,
    hasRating,
    loading,
    handleSubmit,
  };
}
