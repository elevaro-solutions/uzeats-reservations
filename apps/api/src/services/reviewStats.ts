import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';

/** Public rating and count ignore hidden reviews. */
export async function recomputePublicReviewStats(
  restaurantId: mongoose.Types.ObjectId | string,
): Promise<void> {
  const id =
    restaurantId instanceof mongoose.Types.ObjectId
      ? restaurantId
      : new mongoose.Types.ObjectId(restaurantId);

  const stats = await Review.aggregate([
    { $match: { restaurantId: id, hidden: { $ne: true } } },
    {
      $group: {
        _id: '$restaurantId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats[0]) {
    await Restaurant.findByIdAndUpdate(id, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
    return;
  }

  await Restaurant.findByIdAndUpdate(id, {
    averageRating: 0,
    reviewCount: 0,
  });
}
