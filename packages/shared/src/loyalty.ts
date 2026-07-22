import { LOYALTY, LOYALTY_TIERS, type LoyaltyTierId } from './constants.js';

/** Convert loyalty points to a deposit discount in cents. */
export function pointsToDiscountCents(points: number): number {
  return Math.floor((points / LOYALTY.REDEEM_POINTS_PER_DOLLAR) * 100);
}

/** Max points redeemable without exceeding a deposit (100 pts = $1). */
export function maxRedeemPointsForDeposit(depositCents: number): number {
  return Math.floor(depositCents / 100) * LOYALTY.REDEEM_POINTS_PER_DOLLAR;
}

/** Points earned from a deposit payment (1 pt per dollar by default). */
export function depositPointsFromCents(depositCents: number): number {
  if (depositCents <= 0) return 0;
  return Math.floor(depositCents / 100) * LOYALTY.POINTS_PER_DOLLAR_DEPOSIT;
}

/** Estimate total earnable points for a booking (excludes first-booking bonus). */
export function estimateBookingEarnPoints(depositCents: number): number {
  return LOYALTY.POINTS_PER_COMPLETED_VISIT + depositPointsFromCents(depositCents);
}

export interface LoyaltyRedeemProgress {
  balance: number;
  target: number;
  percent: number;
  remaining: number;
  canRedeem: boolean;
}

/** Progress toward the minimum redeem threshold (500 pts by default). */
export function loyaltyRedeemProgress(balance: number): LoyaltyRedeemProgress {
  const target = LOYALTY.MIN_REDEEM_POINTS;
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

type LoyaltyTierDef = (typeof LOYALTY_TIERS)[number];

/** Resolve tier from completed visit count (highest tier whose minVisits is met). */
export function resolveLoyaltyTier(completedVisits: number): LoyaltyTierInfo {
  let current: LoyaltyTierDef = LOYALTY_TIERS[0]!;
  for (const tier of LOYALTY_TIERS) {
    if (completedVisits >= tier.minVisits) current = tier;
  }
  const idx = LOYALTY_TIERS.findIndex((t) => t.id === current.id);
  const next = LOYALTY_TIERS[idx + 1] ?? null;
  return {
    ...current,
    nextTier: next,
    visitsToNextTier: next ? Math.max(0, next.minVisits - completedVisits) : null,
  };
}

/** Visit completion points with tier multiplier applied. */
export function visitPointsForTier(completedVisitsBeforeAward: number): number {
  const tier = resolveLoyaltyTier(completedVisitsBeforeAward);
  return Math.round(LOYALTY.POINTS_PER_COMPLETED_VISIT * tier.earnMultiplier);
}

export interface RedeemResolution {
  pointsToRedeem: number;
  discountCents: number;
}

/**
 * Validate a redeem request and return the points to deduct and discount to apply.
 * Caps redemption at the deposit value and enforces minimum balance rules.
 */
export function resolveRedeemPoints(
  redeemPoints: number | undefined,
  depositCents: number,
  userBalance: number,
): RedeemResolution | null {
  if (!redeemPoints || redeemPoints === 0) return null;

  if (redeemPoints < LOYALTY.MIN_REDEEM_POINTS) {
    throw new Error(`Minimum redeem is ${LOYALTY.MIN_REDEEM_POINTS} points`);
  }
  if (depositCents <= 0) {
    throw new Error('Loyalty points can only be redeemed against a deposit');
  }
  if (redeemPoints > userBalance) {
    throw new Error('Insufficient loyalty points');
  }

  const maxPoints = maxRedeemPointsForDeposit(depositCents);
  const pointsToRedeem = Math.min(redeemPoints, maxPoints);
  if (pointsToRedeem < LOYALTY.MIN_REDEEM_POINTS) {
    throw new Error(
      `Deposit is too small to redeem ${LOYALTY.MIN_REDEEM_POINTS} points (max ${maxPoints} for this booking)`,
    );
  }

  return {
    pointsToRedeem,
    discountCents: pointsToDiscountCents(pointsToRedeem),
  };
}
