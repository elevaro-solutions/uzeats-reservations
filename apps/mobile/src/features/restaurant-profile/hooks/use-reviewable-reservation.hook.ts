import { useQuery } from "@apollo/client";
import { useMemo } from "react";

import { MY_RESERVATIONS, useAuth } from "@/graphql";

import { canLeaveReview } from "../helpers/review.helpers";

export type MyReservationItem = {
  id: string;
  status: string;
  hasReview: boolean;
  restaurant: {
    id: string;
  };
};

export type MyReservationsQueryData = {
  myReservations: MyReservationItem[];
};

export type ReviewableReservationResult = {
  loading: boolean;
  reservationId: string | null;
  canReview: boolean;
  hasReviewed: boolean;
  ctaState: "eligible" | "already_reviewed" | "not_eligible" | "sign_in_required";
  refetchReservations: () => Promise<unknown>;
};

export function useReviewableReservation(
  restaurantId: string,
): ReviewableReservationResult {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery<MyReservationsQueryData>(MY_RESERVATIONS, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const eligibility = useMemo(() => {
    if (!user) {
      return {
        loading: false,
        reservationId: null,
        canReview: false,
        hasReviewed: false,
        ctaState: "sign_in_required" as const,
      };
    }

    if (loading && !data) {
      return {
        loading: true,
        reservationId: null,
        canReview: false,
        hasReviewed: false,
        ctaState: "not_eligible" as const,
      };
    }

    const reservations =
      data?.myReservations?.filter(
        (reservation) => reservation.restaurant.id === restaurantId,
      ) ?? [];

    const reviewable = reservations.find((reservation) =>
      canLeaveReview(reservation),
    );
    const reviewed = reservations.some((reservation) => reservation.hasReview);

    if (reviewable) {
      return {
        loading,
        reservationId: reviewable.id,
        canReview: true,
        hasReviewed: false,
        ctaState: "eligible" as const,
      };
    }

    if (reviewed) {
      return {
        loading,
        reservationId: null,
        canReview: false,
        hasReviewed: true,
        ctaState: "already_reviewed" as const,
      };
    }

    return {
      loading,
      reservationId: null,
      canReview: false,
      hasReviewed: false,
      ctaState: "not_eligible" as const,
    };
  }, [user, loading, data, restaurantId]);

  return { ...eligibility, refetchReservations: refetch };
}
