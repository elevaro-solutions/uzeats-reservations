import { useQuery } from "@apollo/client";
import { useMemo } from "react";
import { RESTAURANT_LOYALTY } from "@reservations/shared";

import { useDebouncedValue } from "@/lib/use-debounced-value";

import {
  BEST_PROMOTION,
  VALIDATE_GIFT_CARD,
  VALIDATE_PROMOTION,
} from "../api/booking.operations";
import {
  computeDepositBeforePromo,
  computeDepositBreakdown,
  type DepositBreakdown,
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

const PROMO_DEBOUNCE_MS = 400;

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
  depositBreakdown: DepositBreakdown;
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

  const debouncedPromoCode = useDebouncedValue(promoCode, PROMO_DEBOUNCE_MS);
  const debouncedGiftCardCode = useDebouncedValue(
    giftCardCode,
    PROMO_DEBOUNCE_MS,
  );

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
      code: debouncedPromoCode.trim().toUpperCase(),
      slotStart: selectedSlot,
      depositCents: depositBeforePromo,
    },
    skip:
      !restaurantId ||
      !debouncedPromoCode.trim() ||
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
      !!debouncedPromoCode.trim() ||
      !selectedSlot ||
      depositBeforePromo <= 0 ||
      step !== "details",
  });

  const promoValidation = promoValidationData?.validatePromotion;
  const bestPromotion = bestPromoData?.bestPromotion;
  const activePromo = debouncedPromoCode.trim()
    ? promoValidation
    : bestPromotion;

  const depositAfterPromo = Math.max(
    0,
    depositBeforePromo - (activePromo?.valid ? activePromo.discountCents : 0),
  );

  const { data: giftValidationData } = useQuery<{
    validateGiftCard: PromotionValidation;
  }>(VALIDATE_GIFT_CARD, {
    variables: {
      restaurantId,
      code: debouncedGiftCardCode.trim().toUpperCase(),
      depositCents: depositAfterPromo,
    },
    skip:
      !restaurantId ||
      !debouncedGiftCardCode.trim() ||
      depositAfterPromo <= 0 ||
      step !== "details",
  });

  const giftValidation = giftValidationData?.validateGiftCard;

  const emptyBreakdown: DepositBreakdown = {
    baseDepositCents: 0,
    addOnsCents: 0,
    grossCents: 0,
    platformPointsDiscountCents: 0,
    restaurantPointsDiscountCents: 0,
    pointsDiscountCents: 0,
    promoDiscountCents: 0,
    giftDiscountCents: 0,
    dueCents: 0,
  };

  const depositBreakdown = pricingInput
    ? computeDepositBreakdown({
        ...pricingInput,
        activePromo: activePromo ?? null,
        giftValidation: giftValidation ?? null,
      })
    : emptyBreakdown;

  return {
    restaurantMinRedeem,
    finalDepositCents: depositBreakdown.dueCents,
    depositBreakdown,
    activePromo,
    giftValidation,
  };
}
