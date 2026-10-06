import {
  LOYALTY,
  pointsToDiscountCents,
  RESTAURANT_LOYALTY,
  resolveBookingCharges,
  restaurantPointsToDiscountCents,
} from "@reservations/shared";

import type {
  BookableExperience,
  BookablePackage,
  BookableTable,
  PrivateDiningSpace,
  PromotionValidation,
  RestaurantBookingInfo,
} from "../types";

type PricingInput = {
  restaurant: RestaurantBookingInfo;
  partySize: number;
  selectedTable?: BookableTable | null;
  selectedPackage?: BookablePackage | null;
  selectedPrivateSpace?: PrivateDiningSpace | null;
  selectedExperience?: BookableExperience | null;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  restaurantLoyaltyBalance: number;
  minRedeemPoints?: number;
  redeemPointsPerDollar?: number;
  activePromo?: PromotionValidation | null;
  giftValidation?: PromotionValidation | null;
};

function bookingCharges(input: PricingInput) {
  return resolveBookingCharges({
    restaurant: input.restaurant,
    table: input.selectedTable,
    partySize: input.partySize,
  });
}

/** Table deposit charged at booking (`prepaid` policy only). */
function computeBaseDepositCents(input: PricingInput): number {
  const charges = bookingCharges(input);
  return charges.policy === "prepaid" ? charges.tableDepositCents : 0;
}

/** Card-guarantee fee: saved card, charged only on no-show / late cancel. */
export function computeNoShowFeeCents(input: PricingInput): number {
  return bookingCharges(input).noShowFeeCents;
}

export function computeGrossDepositCents(input: PricingInput): number {
  const { partySize } = input;
  const baseDeposit = computeBaseDepositCents(input);

  const packagePrice = input.selectedPackage
    ? input.selectedPackage.pricePerGuest
      ? input.selectedPackage.priceCents * partySize
      : input.selectedPackage.priceCents
    : 0;

  const privateSpacePrice = input.selectedPrivateSpace?.rentalFeeCents ?? 0;
  // Server charges ticketPriceCents × partySize (see reservations.ts)
  const experiencePrice = input.selectedExperience
    ? input.selectedExperience.ticketPriceCents * partySize
    : 0;

  return baseDeposit + packagePrice + privateSpacePrice + experiencePrice;
}

export function computeDepositBeforePromo(input: PricingInput): number {
  const gross = computeGrossDepositCents(input);
  let deposit = gross;
  const minRedeem = input.minRedeemPoints ?? LOYALTY.MIN_REDEEM_POINTS;

  if (input.redeemPoints >= minRedeem) {
    deposit -= pointsToDiscountCents(
      input.redeemPoints,
      input.redeemPointsPerDollar,
    );
  }

  const restaurantMinRedeem =
    input.restaurant.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    input.restaurant.loyaltyEnabled &&
    input.restaurantLoyaltyBalance >= restaurantMinRedeem &&
    gross > 0;

  if (
    canRedeemRestaurant &&
    input.redeemRestaurantPoints >= restaurantMinRedeem
  ) {
    deposit -= restaurantPointsToDiscountCents(input.redeemRestaurantPoints);
  }

  return Math.max(0, deposit);
}

export function computeFinalDepositCents(input: PricingInput): number {
  return computeDepositBreakdown(input).dueCents;
}

export type DepositBreakdown = {
  baseDepositCents: number;
  addOnsCents: number;
  grossCents: number;
  platformPointsDiscountCents: number;
  restaurantPointsDiscountCents: number;
  pointsDiscountCents: number;
  promoDiscountCents: number;
  giftDiscountCents: number;
  dueCents: number;
  noShowFeeCents: number;
};

export function computeDepositBreakdown(input: PricingInput): DepositBreakdown {
  const baseDepositCents = computeBaseDepositCents(input);

  const grossCents = computeGrossDepositCents(input);
  const addOnsCents = Math.max(0, grossCents - baseDepositCents);

  let remaining = grossCents;
  let platformPointsDiscountCents = 0;
  const minRedeem = input.minRedeemPoints ?? LOYALTY.MIN_REDEEM_POINTS;
  if (input.redeemPoints >= minRedeem) {
    platformPointsDiscountCents = Math.min(
      remaining,
      pointsToDiscountCents(input.redeemPoints, input.redeemPointsPerDollar),
    );
    remaining -= platformPointsDiscountCents;
  }

  const restaurantMinRedeem =
    input.restaurant.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    input.restaurant.loyaltyEnabled &&
    input.restaurantLoyaltyBalance >= restaurantMinRedeem &&
    grossCents > 0;

  let restaurantPointsDiscountCents = 0;
  if (
    canRedeemRestaurant &&
    input.redeemRestaurantPoints >= restaurantMinRedeem
  ) {
    restaurantPointsDiscountCents = Math.min(
      remaining,
      restaurantPointsToDiscountCents(input.redeemRestaurantPoints),
    );
    remaining -= restaurantPointsDiscountCents;
  }

  const promoDiscountCents = input.activePromo?.valid
    ? Math.min(remaining, input.activePromo.discountCents)
    : 0;
  remaining -= promoDiscountCents;

  const giftDiscountCents = input.giftValidation?.valid
    ? Math.min(remaining, input.giftValidation.discountCents)
    : 0;
  remaining -= giftDiscountCents;

  return {
    baseDepositCents,
    addOnsCents,
    grossCents,
    platformPointsDiscountCents,
    restaurantPointsDiscountCents,
    pointsDiscountCents:
      platformPointsDiscountCents + restaurantPointsDiscountCents,
    promoDiscountCents,
    giftDiscountCents,
    dueCents: Math.max(0, remaining),
    noShowFeeCents: computeNoShowFeeCents(input),
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
