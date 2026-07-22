import mongoose from 'mongoose';
import { GuestProfile } from '../models/GuestProfile.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantLoyaltyTransaction } from '../models/RestaurantLoyalty.js';

export async function getRestaurantLoyaltyStats(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).select('loyaltyEnabled');
  const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [outstandingAgg, guestsWithPoints, earned30Agg, redeemed30Agg, totalVisitsAwarded] =
    await Promise.all([
      GuestProfile.aggregate([
        { $match: { restaurantId: restaurantObjectId } },
        { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } },
      ]),
      GuestProfile.countDocuments({ restaurantId, loyaltyPoints: { $gt: 0 } }),
      RestaurantLoyaltyTransaction.aggregate([
        {
          $match: {
            restaurantId: restaurantObjectId,
            type: 'earn',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      RestaurantLoyaltyTransaction.aggregate([
        {
          $match: {
            restaurantId: restaurantObjectId,
            type: 'redeem',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: { $abs: '$points' } } } },
      ]),
      RestaurantLoyaltyTransaction.countDocuments({
        restaurantId,
        type: 'earn',
        description: 'Restaurant visit completed',
      }),
    ]);

  return {
    loyaltyEnabled: restaurant?.loyaltyEnabled ?? false,
    totalOutstandingPoints: outstandingAgg[0]?.total ?? 0,
    guestsWithPoints,
    pointsEarned30d: earned30Agg[0]?.total ?? 0,
    pointsRedeemed30d: redeemed30Agg[0]?.total ?? 0,
    totalVisitsAwarded,
  };
}
