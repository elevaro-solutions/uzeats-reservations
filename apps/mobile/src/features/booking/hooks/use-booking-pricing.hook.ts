import { useQuery } from "@apollo/client";
import { useMemo } from "react";
import { RESTAURANT_LOYALTY } from "@reservations/shared";

import {
  BEST_PROMOTION,
  VALIDATE_GIFT_CARD,
  VALIDATE_PROMOTION,
} from "../api/booking.operations";
import {
  computeDepositBeforePromo,
  computeFinalDepositCents,
} from "../helpers/booking-pricing.helpers";
import type {
  BookableExperience,
  BookablePackage,
  BookableTable,
  BookingStep,
  PrivateDiningSpace,
  PromotionValidation,
  RestaurantBookingInfo,
} from "../types";

export type UseBookingPricingParams = {
  restaurantId: string | undefined;
  restaurant: RestaurantBookingInfo | null | undefined;
  step: BookingStep;
  partySize: number;
  selectedSlot: string | null;
  promoCode: string;
  giftCardCode: string;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  restaurantLoyaltyBalance: number;
  selectedTable?: BookableTable | null;
  selectedPackage?: BookablePackage | null;
  selectedPrivateSpace?: PrivateDiningSpace | null;
  selectedExperience?: BookableExperience | null;
};

export type UseBookingPricingResult = {
  restaurantMinRedeem: number;
  finalDepositCents: number;
  activePromo: PromotionValidation | null | undefined;
  giftValidation: PromotionValidation | null | undefined;
};

export function useBookingPricing(
  params: UseBookingPricingParams,
): UseBookingPricingResult {
  const {
    restaurantId,
    restaurant,
    step,
    partySize,
    selectedSlot,
    promoCode,
    giftCardCode,
    redeemPoints,
    redeemRestaurantPoints,
    restaurantLoyaltyBalance,
    selectedTable,
    selectedPackage,
    selectedPrivateSpace,
    selectedExperience,
  } = params;

  const restaurantMinRedeem =
    restaurant?.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;

  const pricingInput = useMemo(() => {
    if (!restaurant) return null;
    return {
      restaurant,
      partySize,
      selectedTable,
      selectedPackage,
      selectedPrivateSpace,
      selectedExperience,
      redeemPoints,
      redeemRestaurantPoints,
      restaurantLoyaltyBalance,
    };
  }, [
    restaurant,
    partySize,
    selectedTable,
    selectedPackage,
    selectedPrivateSpace,
    selectedExperience,
    redeemPoints,
    redeemRestaurantPoints,
    restaurantLoyaltyBalance,
  ]);

  const depositBeforePromo = pricingInput
    ? computeDepositBeforePromo(pricingInput)
    : 0;

  const { data: promoValidationData } = useQuery<{
    validatePromotion: PromotionValidation;
  }>(VALIDATE_PROMOTION, {
    variables: {
      restaurantId,
      code: promoCode.trim().toUpperCase(),
      slotStart: selectedSlot,
      depositCents: depositBeforePromo,
    },
    skip:
      !restaurantId ||
      !promoCode.trim() ||
      !selectedSlot ||
      depositBeforePromo <= 0 ||
      step !== "details",
  });

  const { data: bestPromoData } = useQuery<{
    bestPromotion: PromotionValidation;
  }>(BEST_PROMOTION, {
    variables: {
      restaurantId,
      slotStart: selectedSlot,
      depositCents: depositBeforePromo,
    },
    skip:
      !restaurantId ||
      !!promoCode.trim() ||
      !selectedSlot ||
      depositBeforePromo <= 0 ||
      step !== "details",
  });

  const promoValidation = promoValidationData?.validatePromotion;
  const bestPromotion = bestPromoData?.bestPromotion;
  const activePromo = promoCode.trim() ? promoValidation : bestPromotion;

  const depositAfterPromo = Math.max(
    0,
    depositBeforePromo - (activePromo?.valid ? activePromo.discountCents : 0),
  );

  const { data: giftValidationData } = useQuery<{
    validateGiftCard: PromotionValidation;
  }>(VALIDATE_GIFT_CARD, {
    variables: {
      restaurantId,
      code: giftCardCode.trim().toUpperCase(),
      depositCents: depositAfterPromo,
    },
    skip:
      !restaurantId ||
      !giftCardCode.trim() ||
      depositAfterPromo <= 0 ||
      step !== "details",
  });

  const giftValidation = giftValidationData?.validateGiftCard;

  const finalDepositCents = pricingInput
    ? computeFinalDepositCents({
        ...pricingInput,
        activePromo: activePromo ?? null,
        giftValidation: giftValidation ?? null,
      })
    : 0;

  return {
    restaurantMinRedeem,
    finalDepositCents,
    activePromo,
    giftValidation,
  };
}
