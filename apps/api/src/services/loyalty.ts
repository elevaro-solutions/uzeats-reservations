import { LOYALTY } from '@reservations/shared';
import { User } from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';

export async function earnPoints(
  userId: string,
  points: number,
  reservationId?: string,
  description = 'Points earned',
) {
  await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } });
  await LoyaltyTransaction.create({
    userId,
    reservationId,
    type: 'earn',
    points,
    description,
  });
  return points;
}

export async function redeemPoints(userId: string, points: number) {
  if (points < LOYALTY.MIN_REDEEM_POINTS) {
    throw new Error(`Minimum redeem is ${LOYALTY.MIN_REDEEM_POINTS} points`);
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, loyaltyPoints: { $gte: points } },
    { $inc: { loyaltyPoints: -points } },
    { new: true },
  );
  if (!user) {
    throw new Error('Insufficient loyalty points');
  }

  await LoyaltyTransaction.create({
    userId,
    type: 'redeem',
    points: -points,
    description: 'Redeemed for reservation discount',
  });
  return points;
}

export async function getLoyaltyHistory(userId: string) {
  return LoyaltyTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50);
}
