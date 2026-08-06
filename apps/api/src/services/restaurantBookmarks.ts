import { NotFoundError, ValidationError } from '../lib/errors.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantBookmark, type RestaurantBookmarkKind } from '../models/RestaurantBookmark.js';

export async function isRestaurantBookmarked(
  userId: string,
  restaurantId: string,
  kind: RestaurantBookmarkKind,
) {
  const doc = await RestaurantBookmark.findOne({ userId, restaurantId, kind });
  return !!doc;
}

export async function listBookmarkedRestaurants(userId: string, kind: RestaurantBookmarkKind) {
  const bookmarks = await RestaurantBookmark.find({ userId, kind })
    .sort({ createdAt: -1 })
    .select('restaurantId');
  const ids = bookmarks.map((b) => b.restaurantId);
  if (ids.length === 0) return [];
  const restaurants = await Restaurant.find({ _id: { $in: ids }, status: 'approved' });
  const byId = new Map(restaurants.map((r) => [r._id.toString(), r]));
  return ids.map((id) => byId.get(id.toString())).filter(Boolean);
}

export async function setRestaurantBookmark(
  userId: string,
  restaurantId: string,
  kind: RestaurantBookmarkKind,
  active: boolean,
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new NotFoundError('Restaurant');
  }

  if (active) {
    await RestaurantBookmark.updateOne(
      { userId, restaurantId, kind },
      { $setOnInsert: { userId, restaurantId, kind } },
      { upsert: true },
    );
    return true;
  }

  await RestaurantBookmark.deleteOne({ userId, restaurantId, kind });
  return false;
}

export async function toggleRestaurantBookmark(
  userId: string,
  restaurantId: string,
  kind: RestaurantBookmarkKind,
) {
  const existing = await RestaurantBookmark.findOne({ userId, restaurantId, kind });
  if (existing) {
    await existing.deleteOne();
    return false;
  }
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new ValidationError('Restaurant not available');
  }
  await RestaurantBookmark.create({ userId, restaurantId, kind });
  return true;
}
