import mongoose, { type ClientSession } from 'mongoose';
import {
  LOYALTY,
  LOYALTY_EARN_REASONS,
  depositPointsFromCents,
  visitPointsForTier,
} from '@reservations/shared';
import { User } from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { notifyUser } from './notifications.js';
import {
  addCreditBucket,
  consumePointsFifo,
  reconcileUserLoyaltyBuckets,
} from '../lib/loyaltyBuckets.js';

type LoyaltyNotificationType = 'points_earned' | 'points_redeemed' | 'points_refunded';

function notifyLoyaltyUpdate(
  userId: string,
  type: LoyaltyNotificationType,
  points: number,
  context?: string,
) {
  const abs = Math.abs(points);
  const payload = {
    points_earned: {
      title: 'Points earned',
      body: context ? `You earned ${abs} pts — ${context}` : `You earned ${abs} loyalty points`,
    },
    points_redeemed: {
      title: 'Points redeemed',
      body: `${abs} pts applied to your reservation`,
    },
    points_refunded: {
      title: 'Points refunded',
      body: `${abs} pts returned to your balance`,
    },
  }[type];

  void notifyUser(userId, {
    type,
    title: payload.title,
    body: payload.body,
    data: { points },
  }).catch(() => {
    // Non-blocking — loyalty ledger is source of truth.
  });
}

async function withLoyaltyTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function earnPoints(
  userId: string,
  points: number,
  reservationId?: string,
  description = 'Points earned',
) {
  return withLoyaltyTransaction(async (session) => {
    await addCreditBucket(userId, points, description, session, {
      reservationId,
      type: 'earn',
    });
    return points;
  });
}

/** Award points only if the same earn reason has not already been recorded. */
export async function earnPointsOnce(
  userId: string,
  points: number,
  description: string,
  reservationId?: string,
): Promise<number> {
  if (points <= 0) return 0;

  const filter: Record<string, unknown> = { userId, type: 'earn', description };
  if (reservationId) filter.reservationId = reservationId;

  const existing = await LoyaltyTransaction.findOne(filter);
  if (existing) return 0;

  const awarded = await earnPoints(userId, points, reservationId, description);
  if (awarded > 0) {
    notifyLoyaltyUpdate(userId, 'points_earned', awarded, description);
  }
  return awarded;
}

export async function redeemPoints(
  userId: string,
  points: number,
  reservationId?: string,
  description = 'Redeemed for reservation discount',
) {
  if (points < LOYALTY.MIN_REDEEM_POINTS) {
    throw new Error(`Minimum redeem is ${LOYALTY.MIN_REDEEM_POINTS} points`);
  }

  return withLoyaltyTransaction(async (session) => {
    const user = await User.findById(userId).select('loyaltyPoints').session(session);
    if (!user || (user.loyaltyPoints ?? 0) < points) {
      throw new Error('Insufficient loyalty points');
    }

    await consumePointsFifo(userId, points, session);

    await LoyaltyTransaction.create(
      [
        {
          userId,
          reservationId,
          type: 'redeem',
          points: -points,
          description,
        },
      ],
      { session },
    );
    notifyLoyaltyUpdate(userId, 'points_redeemed', points);
    return points;
  });
}

/** Restore points when a reservation with a loyalty redemption is cancelled. */
export async function refundRedeemedPoints(
  userId: string,
  points: number,
  reservationId?: string,
  description = 'Points refunded — reservation cancelled',
) {
  if (points <= 0) return 0;

  return withLoyaltyTransaction(async (session) => {
    await addCreditBucket(userId, points, description, session, {
      reservationId,
      type: 'earn',
    });
    notifyLoyaltyUpdate(userId, 'points_refunded', points);
    return points;
  });
}

/** Apply a signed point delta and record an admin or system adjustment. */
export async function adjustPoints(
  userId: string,
  delta: number,
  description: string,
  reservationId?: string,
) {
  if (delta === 0) return 0;

  return withLoyaltyTransaction(async (session) => {
    if (delta < 0) {
      const user = await User.findById(userId).select('loyaltyPoints').session(session);
      if (!user || (user.loyaltyPoints ?? 0) < -delta) {
        throw new Error('Cannot adjust: insufficient loyalty points');
      }
      await consumePointsFifo(userId, -delta, session);
    } else {
      await addCreditBucket(userId, delta, description, session, {
        reservationId,
        type: 'adjust',
      });
      return delta;
    }

    await LoyaltyTransaction.create(
      [
        {
          userId,
          reservationId,
          type: 'adjust',
          points: delta,
          description,
        },
      ],
      { session },
    );
    return delta;
  });
}

export async function awardDepositPoints(input: {
  dinerId: string;
  reservationId: string;
  depositAmountCents: number;
  depositStatus: string;
}) {
  if (input.depositStatus !== 'authorized' || input.depositAmountCents <= 0) return 0;

  const points = depositPointsFromCents(input.depositAmountCents);
  return earnPointsOnce(
    input.dinerId,
    points,
    LOYALTY_EARN_REASONS.DEPOSIT_PAYMENT,
    input.reservationId,
  );
}

export async function awardFirstBookingBonus(dinerId: string) {
  return earnPointsOnce(
    dinerId,
    LOYALTY.FIRST_BOOKING_BONUS_POINTS,
    LOYALTY_EARN_REASONS.FIRST_BOOKING,
  );
}

export async function awardReviewPoints(dinerId: string, reservationId: string) {
  return earnPointsOnce(
    dinerId,
    LOYALTY.POINTS_PER_REVIEW,
    LOYALTY_EARN_REASONS.REVIEW,
    reservationId,
  );
}

export async function awardCompletedVisitPoints(dinerId: string, reservationId: string) {
  const user = await User.findById(dinerId).select('loyaltyCompletedVisits referredByUserId');
  if (!user) return 0;

  const visitsBefore = user.loyaltyCompletedVisits ?? 0;
  const points = visitPointsForTier(visitsBefore);

  const awarded = await earnPointsOnce(
    dinerId,
    points,
    LOYALTY_EARN_REASONS.COMPLETED_VISIT,
    reservationId,
  );

  if (awarded > 0) {
    await User.findByIdAndUpdate(dinerId, { $inc: { loyaltyCompletedVisits: 1 } });
    if (visitsBefore === 0 && user.referredByUserId) {
      await awardReferralBonus(user.referredByUserId.toString(), dinerId);
    }
  }

  return awarded;
}

async function awardReferralBonus(referrerId: string, refereeId: string) {
  return earnPointsOnce(
    referrerId,
    LOYALTY.REFERRAL_BONUS_POINTS,
    `${LOYALTY_EARN_REASONS.REFERRAL_BONUS} — ${refereeId}`,
  );
}

/** Claw back deposit earn points when a reservation is cancelled. */
export async function reverseDepositPoints(dinerId: string, reservationId: string) {
  const existing = await LoyaltyTransaction.findOne({
    userId: dinerId,
    reservationId,
    type: 'earn',
    description: LOYALTY_EARN_REASONS.DEPOSIT_PAYMENT,
  });
  if (!existing || existing.points <= 0) return 0;

  const alreadyReversed = await LoyaltyTransaction.findOne({
    userId: dinerId,
    reservationId,
    type: 'adjust',
    description: 'Deposit points reversed — reservation cancelled',
  });
  if (alreadyReversed) return 0;

  return adjustPoints(
    dinerId,
    -existing.points,
    'Deposit points reversed — reservation cancelled',
    reservationId,
  );
}

export async function getLoyaltyHistory(userId: string) {
  return LoyaltyTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50);
}

export { reconcileUserLoyaltyBuckets };
