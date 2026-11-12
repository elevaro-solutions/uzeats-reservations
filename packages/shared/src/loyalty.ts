import { LOYALTY, LOYALTY_TIERS, type LoyaltyTierId } from './constants.js';
import { resolveRestaurantRedeemPoints } from './restaurantLoyalty.js';

export type LoyaltyTierDef = {
  id: LoyaltyTierId;
  name: string;
  minVisits: number;
  earnMultiplier: number;
};

export type LoyaltyRates = {
  pointsPerCompletedVisit: number;
  pointsPerDollarDeposit: number;
  redeemPointsPerDollar: number;
  minRedeemPoints: number;
  firstBookingBonusPoints: number;
  pointsPerReview: number;
  referralBonusPoints: number;
  pointsExpiryMonths: number;
};

export type LoyaltyProgram = LoyaltyRates & {
  tiers: LoyaltyTierDef[];
};

export function defaultLoyaltyProgram(): LoyaltyProgram {
  return {
    pointsPerCompletedVisit: LOYALTY.POINTS_PER_COMPLETED_VISIT,
    pointsPerDollarDeposit: LOYALTY.POINTS_PER_DOLLAR_DEPOSIT,
    redeemPointsPerDollar: LOYALTY.REDEEM_POINTS_PER_DOLLAR,
    minRedeemPoints: LOYALTY.MIN_REDEEM_POINTS,
    firstBookingBonusPoints: LOYALTY.FIRST_BOOKING_BONUS_POINTS,
    pointsPerReview: LOYALTY.POINTS_PER_REVIEW,
    referralBonusPoints: LOYALTY.REFERRAL_BONUS_POINTS,
    pointsExpiryMonths: LOYALTY.POINTS_EXPIRY_MONTHS,
    tiers: LOYALTY_TIERS.map((tier) => ({ ...tier })),
  };
}

/** Convert loyalty points to a deposit discount in cents. */
export function pointsToDiscountCents(
  points: number,
  redeemPointsPerDollar: number = LOYALTY.REDEEM_POINTS_PER_DOLLAR,
): number {
  const rate = Math.max(1, redeemPointsPerDollar);
  return Math.floor((points / rate) * 100);
}

/** Max points redeemable without exceeding a deposit (100 pts = $1). */
export function maxRedeemPointsForDeposit(
  depositCents: number,
  redeemPointsPerDollar: number = LOYALTY.REDEEM_POINTS_PER_DOLLAR,
): number {
  const rate = Math.max(1, redeemPointsPerDollar);
  return Math.floor(depositCents / 100) * rate;
}

/** Points earned from a deposit payment (1 pt per dollar by default). */
export function depositPointsFromCents(
  depositCents: number,
  pointsPerDollar: number = LOYALTY.POINTS_PER_DOLLAR_DEPOSIT,
): number {
  if (depositCents <= 0) return 0;
  return Math.floor(depositCents / 100) * Math.max(0, pointsPerDollar);
}

/** Estimate total earnable points for a booking (excludes first-booking bonus). */
export function estimateBookingEarnPoints(
  depositCents: number,
  program?: Pick<LoyaltyRates, 'pointsPerCompletedVisit' | 'pointsPerDollarDeposit'> | null,
): number {
  const visitPts = program?.pointsPerCompletedVisit ?? LOYALTY.POINTS_PER_COMPLETED_VISIT;
  const perDollar = program?.pointsPerDollarDeposit ?? LOYALTY.POINTS_PER_DOLLAR_DEPOSIT;
  return visitPts + depositPointsFromCents(depositCents, perDollar);
}

export interface LoyaltyRedeemProgress {
  balance: number;
  target: number;
  percent: number;
  remaining: number;
  canRedeem: boolean;
}

/** Progress toward the minimum redeem threshold (500 pts by default). */
export function loyaltyRedeemProgress(
  balance: number,
  minRedeem: number = LOYALTY.MIN_REDEEM_POINTS,
): LoyaltyRedeemProgress {
  const target = Math.max(1, minRedeem);
  const percent = Math.min(100, Math.round((balance / target) * 100));
  return {
    balance,
    target,
    percent,
    remaining: Math.max(0, target - balance),
    canRedeem: balance >= target,
  };
}

export interface LoyaltyTierInfo {
  id: LoyaltyTierId;
  name: string;
  minVisits: number;
  earnMultiplier: number;
  nextTier: Pick<LoyaltyTierInfo, 'id' | 'name' | 'minVisits' | 'earnMultiplier'> | null;
  visitsToNextTier: number | null;
}

function sortedTiers(tiers?: readonly LoyaltyTierDef[] | null): LoyaltyTierDef[] {
  const list = tiers?.length ? [...tiers] : LOYALTY_TIERS.map((tier) => ({ ...tier }));
  return list.sort((a, b) => a.minVisits - b.minVisits);
}

/** Resolve tier from completed visit count (highest tier whose minVisits is met). */
export function resolveLoyaltyTier(
  completedVisits: number,
  tiers?: readonly LoyaltyTierDef[] | null,
): LoyaltyTierInfo {
  const list = sortedTiers(tiers);
  let current = list[0]!;
  for (const tier of list) {
    if (completedVisits >= tier.minVisits) current = tier;
  }
  const idx = list.findIndex((t) => t.id === current.id);
  const next = list[idx + 1] ?? null;
  return {
    ...current,
    nextTier: next,
    visitsToNextTier: next ? Math.max(0, next.minVisits - completedVisits) : null,
  };
}

/** Visit completion points with tier multiplier applied. */
export function visitPointsForTier(
  completedVisitsBeforeAward: number,
  program?: Pick<LoyaltyProgram, 'pointsPerCompletedVisit' | 'tiers'> | null,
): number {
  const pointsPerVisit = program?.pointsPerCompletedVisit ?? LOYALTY.POINTS_PER_COMPLETED_VISIT;
  const tier = resolveLoyaltyTier(completedVisitsBeforeAward, program?.tiers);
  return Math.round(pointsPerVisit * tier.earnMultiplier);
}

export interface RedeemResolution {
  pointsToRedeem: number;
  discountCents: number;
}

export type RedeemRateOverrides = {
  minRedeemPoints?: number;
  redeemPointsPerDollar?: number;
};

/**
 * Validate a redeem request and return the points to deduct and discount to apply.
 * Caps redemption at the deposit value and enforces minimum balance rules.
 */
export function resolveRedeemPoints(
  redeemPoints: number | undefined,
  depositCents: number,
  userBalance: number,
  rates?: RedeemRateOverrides,
): RedeemResolution | null {
  if (!redeemPoints || redeemPoints === 0) return null;

  const minRedeem = rates?.minRedeemPoints ?? LOYALTY.MIN_REDEEM_POINTS;
  const redeemPerDollar = rates?.redeemPointsPerDollar ?? LOYALTY.REDEEM_POINTS_PER_DOLLAR;

  if (redeemPoints < minRedeem) {
    throw new Error(`Minimum redeem is ${minRedeem} points`);
  }
  if (depositCents <= 0) {
    throw new Error('Loyalty points can only be redeemed against a deposit');
  }
  if (redeemPoints > userBalance) {
    throw new Error('Insufficient loyalty points');
  }

  const maxPoints = maxRedeemPointsForDeposit(depositCents, redeemPerDollar);
  const pointsToRedeem = Math.min(redeemPoints, maxPoints);
  if (pointsToRedeem < minRedeem) {
    throw new Error(
      `Deposit is too small to redeem ${minRedeem} points (max ${maxPoints} for this booking)`,
    );
  }

  return {
    pointsToRedeem,
    discountCents: pointsToDiscountCents(pointsToRedeem, redeemPerDollar),
  };
}

export type RedeemSideInput = {
  points: number;
  balance: number;
  minRedeemPoints: number;
  redeemPointsPerDollar: number;
};

export type FittedRedeemSide = {
  pointsToRedeem: number;
  discountCents: number;
};

export type DepositRedeemFit = {
  platform: FittedRedeemSide | null;
  restaurant: FittedRedeemSide | null;
  platformError: string | null;
  restaurantError: string | null;
  /** Set when Tablevera points were left off so restaurant points could fit. */
  platformNote: string | null;
};

function catchRedeem(resolve: () => RedeemResolution | null): {
  resolution: RedeemResolution | null;
  error: string | null;
} {
  try {
    return { resolution: resolve(), error: null };
  } catch (err) {
    return {
      resolution: null,
      error: err instanceof Error ? err.message : 'Invalid points amount',
    };
  }
}

/**
 * Apply Tablevera points and restaurant points to one prepaid deposit.
 * Restaurant points are checked against the full deposit. Tablevera points
 * then use whatever is left, and are left off when they no longer meet their
 * minimum — so a valid restaurant amount is not rejected for an empty range.
 */
export function fitDepositRedemptions(
  depositCents: number,
  platform: RedeemSideInput | null,
  restaurant: RedeemSideInput | null,
): DepositRedeemFit {
  const empty: DepositRedeemFit = {
    platform: null,
    restaurant: null,
    platformError: null,
    restaurantError: null,
    platformNote: null,
  };
  const platformRequested = platform && platform.points > 0 ? platform : null;
  const restaurantRequested = restaurant && restaurant.points > 0 ? restaurant : null;

  const resolvePlatform = (cents: number, input: RedeemSideInput) =>
    catchRedeem(() =>
      resolveRedeemPoints(input.points, cents, input.balance, {
        minRedeemPoints: input.minRedeemPoints,
        redeemPointsPerDollar: input.redeemPointsPerDollar,
      }),
    );

  if (!restaurantRequested) {
    if (!platformRequested) return empty;
    const result = resolvePlatform(depositCents, platformRequested);
    return { ...empty, platform: result.resolution, platformError: result.error };
  }

  const restaurantResult = catchRedeem(() =>
    resolveRestaurantRedeemPoints(
      restaurantRequested.points,
      depositCents,
      restaurantRequested.balance,
      restaurantRequested.minRedeemPoints,
    ),
  );
  if (restaurantResult.error || !restaurantResult.resolution) {
    const platformResult = platformRequested
      ? resolvePlatform(depositCents, platformRequested)
      : { resolution: null, error: null };
    return {
      ...empty,
      platform: platformResult.resolution,
      platformError: platformResult.error,
      restaurantError: restaurantResult.error ?? 'Invalid points amount',
    };
  }

  if (!platformRequested) {
    return { ...empty, restaurant: restaurantResult.resolution };
  }

  const roomCents = Math.max(0, depositCents - restaurantResult.resolution.discountCents);
  const platformResult = resolvePlatform(roomCents, platformRequested);
  if (platformResult.resolution) {
    return {
      ...empty,
      platform: platformResult.resolution,
      restaurant: restaurantResult.resolution,
    };
  }

  const blockedByBalance =
    platformResult.error != null &&
    /Minimum redeem|Insufficient/.test(platformResult.error);
  if (blockedByBalance) {
    return {
      ...empty,
      platformError: platformResult.error,
      restaurant: restaurantResult.resolution,
    };
  }

  return {
    ...empty,
    restaurant: restaurantResult.resolution,
    platformNote:
      'Not applied — restaurant points use the rest of this deposit. Clear restaurant points to use Tablevera points.',
  };
}
