import mongoose from 'mongoose';
import { LOYALTY } from '@reservations/shared';
import { User } from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';

export async function earnPoints(
  userId: string,
  points: number,
  reservationId?: string,
  description = 'Points earned',
  session?: mongoose.ClientSession,
) {
  await User.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: points } },
    { session: session ?? null },
  );
  await LoyaltyTransaction.create(
    [
      {
        userId,
        reservationId,
        type: 'earn',
        points,
        description,
      },
    ],
    { session: session ?? undefined },
  );
  return points;
}

export async function redeemPoints(
  userId: string,
  points: number,
  session?: mongoose.ClientSession,
) {
  if (points < LOYALTY.MIN_REDEEM_POINTS) {
    throw new Error(`Minimum redeem is ${LOYALTY.MIN_REDEEM_POINTS} points`);
  }
  const user = await User.findById(userId).session(session ?? null);
  if (!user || user.loyaltyPoints < points) {
    throw new Error('Insufficient loyalty points');
  }
  user.loyaltyPoints -= points;
  await user.save({ session: session ?? undefined });
  await LoyaltyTransaction.create(
    [
      {
        userId,
        type: 'redeem',
        points: -points,
        description: 'Redeemed for reservation discount',
      },
    ],
    { session: session ?? undefined },
  );
  return points;
}

export async function getLoyaltyHistory(userId: string) {
  return LoyaltyTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50);
}
