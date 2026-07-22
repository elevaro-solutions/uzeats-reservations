import type { ClientSession } from 'mongoose';
import { LOYALTY } from '@reservations/shared';
import { User } from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';
import { computePointsExpiryDate } from './loyaltyExpiryDate.js';

function bucketRemaining(tx: { points: number; remainingPoints?: number | null }) {
  return tx.remainingPoints ?? tx.points;
}

/** Assign remainingPoints on credit txs so bucket totals match the user's balance (FIFO). */
export async function reconcileUserLoyaltyBuckets(userId: string, session?: ClientSession) {
  const user = await User.findById(userId).select('loyaltyPoints').session(session ?? null);
  if (!user) return;

  const balance = user.loyaltyPoints ?? 0;
  if (balance <= 0) return;

  const credits = await LoyaltyTransaction.find({ userId, points: { $gt: 0 } })
    .sort({ createdAt: 1 })
    .session(session ?? null);

  if (credits.length === 0) {
    const expiresAt =
      LOYALTY.POINTS_EXPIRY_MONTHS > 0 ? computePointsExpiryDate() : undefined;
    await LoyaltyTransaction.create(
      [
        {
          userId,
          type: 'adjust',
          points: balance,
          remainingPoints: balance,
          description: 'Legacy balance (FIFO migration)',
          expiresAt,
        },
      ],
      { session },
    );
    await syncUserExpiryDate(userId, session);
    return;
  }

  let left = balance;
  for (const tx of credits) {
    const assign = Math.min(tx.points, Math.max(0, left));
    tx.remainingPoints = assign;
    left -= assign;
    await tx.save({ session });
  }

  if (left > 0) {
    const newest = credits[credits.length - 1]!;
    newest.remainingPoints = (newest.remainingPoints ?? 0) + left;
    await newest.save({ session });
  }

  await syncUserExpiryDate(userId, session);
}

export async function syncUserExpiryDate(userId: string, session?: ClientSession) {
  if (LOYALTY.POINTS_EXPIRY_MONTHS <= 0) {
    await User.findByIdAndUpdate(userId, { loyaltyPointsExpireAt: null }, { session });
    return;
  }

  const next = await LoyaltyTransaction.findOne({
    userId,
    points: { $gt: 0 },
    remainingPoints: { $gt: 0 },
    expiresAt: { $ne: null },
  })
    .sort({ expiresAt: 1 })
    .select('expiresAt')
    .session(session ?? null);

  await User.findByIdAndUpdate(
    userId,
    { loyaltyPointsExpireAt: next?.expiresAt ?? null },
    { session },
  );
}

/** Consume points oldest-bucket-first; decrements user balance and bucket remainingPoints. */
export async function consumePointsFifo(
  userId: string,
  points: number,
  session: ClientSession,
) {
  if (points <= 0) return;

  await reconcileUserLoyaltyBuckets(userId, session);

  const buckets = await LoyaltyTransaction.find({
    userId,
    points: { $gt: 0 },
    remainingPoints: { $gt: 0 },
  })
    .sort({ createdAt: 1 })
    .session(session);

  let remaining = points;
  for (const bucket of buckets) {
    if (remaining <= 0) break;
    const available = bucketRemaining(bucket);
    const take = Math.min(available, remaining);
    bucket.remainingPoints = available - take;
    await bucket.save({ session });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error('Insufficient loyalty points');
  }

  await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: -points } }, { session });
  await syncUserExpiryDate(userId, session);
}

export async function addCreditBucket(
  userId: string,
  points: number,
  description: string,
  session: ClientSession,
  options?: { reservationId?: string; type?: 'earn' | 'adjust' },
) {
  if (points <= 0) return 0;

  const expiresAt =
    LOYALTY.POINTS_EXPIRY_MONTHS > 0 ? computePointsExpiryDate() : undefined;

  await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } }, { session });
  await LoyaltyTransaction.create(
    [
      {
        userId,
        reservationId: options?.reservationId,
        type: options?.type ?? 'earn',
        points,
        remainingPoints: points,
        description,
        expiresAt,
      },
    ],
    { session },
  );
  await syncUserExpiryDate(userId, session);
  return points;
}

export async function expireFifoPointBuckets() {
  const now = new Date();
  const buckets = await LoyaltyTransaction.find({
    points: { $gt: 0 },
    remainingPoints: { $gt: 0 },
    expiresAt: { $lt: now },
  }).sort({ expiresAt: 1 });

  let expiredPoints = 0;
  const touchedUsers = new Set<string>();

  for (const bucket of buckets) {
    const points = bucketRemaining(bucket);
    if (points <= 0) continue;

    const userId = bucket.userId.toString();
    try {
      await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: -points } });
      bucket.remainingPoints = 0;
      await bucket.save();
      await LoyaltyTransaction.create({
        userId,
        reservationId: bucket.reservationId,
        type: 'adjust',
        points: -points,
        description: `Points expired (${bucket.description})`,
      });
      touchedUsers.add(userId);
      expiredPoints += points;
    } catch (err) {
      // logged by caller
      throw err;
    }
  }

  for (const userId of touchedUsers) {
    await syncUserExpiryDate(userId);
  }

  return { expiredUsers: touchedUsers.size, expiredPoints };
}
