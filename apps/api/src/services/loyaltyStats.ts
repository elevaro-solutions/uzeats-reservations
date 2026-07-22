import { LOYALTY_TIERS, resolveLoyaltyTier } from '@reservations/shared';
import { User } from '../models/User.js';
import { LoyaltyTransaction } from '../models/Loyalty.js';

export async function getAdminLoyaltyStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [outstandingAgg, usersWithPoints, referralsCount, earned30Agg, redeemed30Agg, visitCounts] =
    await Promise.all([
      User.aggregate([{ $group: { _id: null, total: { $sum: '$loyaltyPoints' } } }]),
      User.countDocuments({ loyaltyPoints: { $gt: 0 } }),
      User.countDocuments({ referredByUserId: { $exists: true, $ne: null } }),
      LoyaltyTransaction.aggregate([
        { $match: { type: 'earn', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { type: 'redeem', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: { $abs: '$points' } } } },
      ]),
      User.aggregate([
        { $group: { _id: '$loyaltyCompletedVisits', count: { $sum: 1 } } },
      ]),
    ]);

  const tierCounts = Object.fromEntries(LOYALTY_TIERS.map((t) => [t.id, 0])) as Record<
    string,
    number
  >;

  for (const row of visitCounts) {
    const visits = row._id ?? 0;
    const tier = resolveLoyaltyTier(visits);
    tierCounts[tier.id] = (tierCounts[tier.id] ?? 0) + row.count;
  }

  return {
    totalOutstandingPoints: outstandingAgg[0]?.total ?? 0,
    usersWithPoints,
    tierBronze: tierCounts.bronze ?? 0,
    tierSilver: tierCounts.silver ?? 0,
    tierGold: tierCounts.gold ?? 0,
    referralsCount,
    pointsEarned30d: earned30Agg[0]?.total ?? 0,
    pointsRedeemed30d: redeemed30Agg[0]?.total ?? 0,
  };
}

export async function getAdminReferralLeaders(limit = 20) {
  const cap = Math.min(Math.max(limit, 1), 50);
  const rows = await User.aggregate<{ _id: unknown; refereesCount: number }>([
    { $match: { referredByUserId: { $exists: true, $ne: null } } },
    { $group: { _id: '$referredByUserId', refereesCount: { $sum: 1 } } },
    { $sort: { refereesCount: -1 } },
    { $limit: cap },
  ]);

  if (rows.length === 0) return [];

  const referrerIds = rows.map((r) => r._id);
  const referrers = await User.find({ _id: { $in: referrerIds } }).select(
    'firstName lastName email referralCode',
  );
  const byId = new Map(referrers.map((u) => [u._id.toString(), u]));

  return rows.map((row) => {
    const id = String(row._id);
    const user = byId.get(id);
    return {
      userId: id,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? null,
      referralCode: user?.referralCode ?? null,
      refereesCount: row.refereesCount,
    };
  });
}
