import { useMutation } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { LOYALTY, type Occasion } from "@reservations/shared";

import { MY_RESERVATIONS } from "@/graphql";
import {
  getGraphQLErrorCode,
  getGraphQLErrorMessage,
  getValidationIssues,
  toFieldErrors,
} from "@/lib/graphql-errors";

import { CONFIRM_DEPOSIT, CREATE_RESERVATION } from "../api/booking.operations";
import { clearBookingDraft } from "../helpers/booking-draft.helpers";
import { isSlotStillAvailable } from "../helpers/booking-validation.helpers";
import type { AvailabilitySlot, RestaurantBookingInfo } from "../types";
import {
  extractPaymentIntentId,
  useDepositPayment,
} from "./use-deposit-payment.hook";

type CreateReservationPayload = {
  createReservation: {
    clientSecret?: string | null;
    reservation?: {
      id: string;
      status: string;
      slotStart: string;
      partySize: number;
      depositAmountCents?: number | null;
      depositStatus?: string | null;
    } | null;
  };
};

export type UseBookingSubmitParams = {
  restaurantId: string | undefined;
  restaurant: RestaurantBookingInfo | null | undefined;
  user: { id: string } | null | undefined;
  selectedSlot: string | null;
  partySize: number;
  occasion: Occasion;
  notes: string;
  promoCode: string;
  giftCardCode: string;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  restaurantLoyaltyBalance: number;
  restaurantMinRedeem: number;
  selectedTableId: string | null;
  selectedPackageId: string | null;
  selectedPrivateSpaceId: string | null;
  selectedExperienceId: string | null;
  termsAccepted: boolean;
  slots: AvailabilitySlot[];
  refetchAvailability: () => Promise<{
    data?: { availability?: AvailabilitySlot[] } | null;
  }>;
  persistDraft: () => void;
  onSlotBecameUnavailable: () => void;
};

export type UseBookingSubmitResult = {
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  submitError: string | null;
  creating: boolean;
  paying: boolean;
  openConfirm: () => void;
  submitBooking: () => Promise<void>;
};

export function useBookingSubmit(
  params: UseBookingSubmitParams,
): UseBookingSubmitResult {
  const {
    restaurantId,
    restaurant,
    user,
    selectedSlot,
    partySize,
    occasion,
    notes,
    promoCode,
    giftCardCode,
    redeemPoints,
    redeemRestaurantPoints,
    restaurantLoyaltyBalance,
    restaurantMinRedeem,
    selectedTableId,
    selectedPackageId,
    selectedPrivateSpaceId,
    selectedExperienceId,
    termsAccepted,
    slots,
    refetchAvailability,
    persistDraft,
    onSlotBecameUnavailable,
  } = params;

  const router = useRouter();
  const { paying, error: paymentError, payDeposit, clearError } =
    useDepositPayment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const [createReservation, { loading: creating }] =
    useMutation<CreateReservationPayload>(CREATE_RESERVATION);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);

  const openConfirm = useCallback(() => {
    if (!user) {
      persistDraft();
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${restaurantId}/book?resume=1` },
      });
      return;
    }

    if (!selectedSlot || !isSlotStillAvailable(slots, selectedSlot)) {
      Alert.alert(
        "Time unavailable",
        "That time is no longer available. Please pick another slot.",
      );
      onSlotBecameUnavailable();
      return;
    }

    setSubmitError(null);
    clearError();
    setConfirmOpen(true);
  }, [
    user,
    persistDraft,
    router,
    restaurantId,
    selectedSlot,
    slots,
    onSlotBecameUnavailable,
    clearError,
  ]);

  const submitBooking = useCallback(async () => {
    if (!user || !selectedSlot || !restaurant || !restaurantId) return;
    if (isSubmittingRef.current) return;
    if (!termsAccepted) return;

    isSubmittingRef.current = true;
    setSubmitError(null);
    clearError();

    try {
      const { data: freshAvail } = await refetchAvailability();
      const freshSlots = freshAvail?.availability ?? [];
      if (!isSlotStillAvailable(freshSlots, selectedSlot)) {
        setConfirmOpen(false);
        onSlotBecameUnavailable();
        setSubmitError("That time is no longer available — pick another slot.");
        return;
      }

      const canRedeemRestaurant =
        restaurant.loyaltyEnabled &&
        restaurantLoyaltyBalance >= restaurantMinRedeem;

      const { data: result } = await createReservation({
        variables: {
          input: {
            restaurantId,
            partySize,
            slotStart: selectedSlot,
            occasion,
            guestNotes: notes.trim() || undefined,
            ...(redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? { redeemPoints } : {}),
            ...(canRedeemRestaurant &&
            redeemRestaurantPoints >= restaurantMinRedeem
              ? { redeemRestaurantPoints }
              : {}),
            ...(promoCode.trim()
              ? { promoCode: promoCode.trim().toUpperCase() }
              : {}),
            ...(giftCardCode.trim()
              ? { giftCardCode: giftCardCode.trim().toUpperCase() }
              : {}),
            ...(selectedTableId ? { tableId: selectedTableId } : {}),
            ...(selectedPackageId ? { packageId: selectedPackageId } : {}),
            ...(selectedPrivateSpaceId
              ? { privateDiningSpaceId: selectedPrivateSpaceId }
              : {}),
            ...(selectedExperienceId
              ? { experienceId: selectedExperienceId }
              : {}),
          },
        },
        refetchQueries: [{ query: MY_RESERVATIONS }],
      });

      const payload = result?.createReservation;
      const reservation = payload?.reservation;
      if (!reservation?.id) {
        throw new Error("Booking failed");
      }

      clearBookingDraft(restaurantId);

      const depositAmountCents = reservation.depositAmountCents ?? 0;
      const depositStatus = reservation.depositStatus ?? "none";
      const clientSecret = payload?.clientSecret ?? null;

      if (clientSecret) {
        const payment = await payDeposit({
          clientSecret,
          merchantName: restaurant.name,
        });
        if (!payment.paid) {
          setSubmitError(
            payment.error ??
              "Payment was not completed. You can pay from your reservations.",
          );
          setConfirmOpen(false);
          router.push({
            pathname: "/reservations/[id]",
            params: { id: reservation.id },
          });
          return;
        }

        const paymentIntentId = extractPaymentIntentId(clientSecret);
        try {
          await confirmDeposit({ variables: { paymentIntentId } });
        } catch {
          // webhook may reconcile
        }
      } else if (
        depositAmountCents > 0 &&
        depositStatus === "requires_payment"
      ) {
        setSubmitError(
          "Payment could not be started. You can pay from your reservations.",
        );
        setConfirmOpen(false);
        router.push({
          pathname: "/reservations/[id]",
          params: { id: reservation.id },
        });
        return;
      }

      setConfirmOpen(false);
      router.replace({
        pathname: "/booking/confirmation",
        params: { reservationId: reservation.id },
      });
    } catch (err) {
      const issues = getValidationIssues(err);
      if (issues.length > 0) {
        const fieldErrors = toFieldErrors(issues);
        setSubmitError(
          Object.values(fieldErrors)[0] ??
            "Please fix the highlighted fields and try again.",
        );
        return;
      }
      const code = getGraphQLErrorCode(err);
      if (code === "CONFLICT") {
        setConfirmOpen(false);
        onSlotBecameUnavailable();
      }
      setSubmitError(getGraphQLErrorMessage(err, "Booking failed"));
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    user,
    selectedSlot,
    restaurant,
    restaurantId,
    termsAccepted,
    refetchAvailability,
    onSlotBecameUnavailable,
    restaurantLoyaltyBalance,
    restaurantMinRedeem,
    createReservation,
    partySize,
    occasion,
    notes,
    redeemPoints,
    redeemRestaurantPoints,
    promoCode,
    giftCardCode,
    selectedTableId,
    selectedPackageId,
    selectedPrivateSpaceId,
    selectedExperienceId,
    clearError,
    payDeposit,
    confirmDeposit,
    router,
  ]);

  return {
    confirmOpen,
    setConfirmOpen,
    submitError: submitError ?? paymentError,
    creating,
    paying,
    openConfirm,
    submitBooking,
  };
}
