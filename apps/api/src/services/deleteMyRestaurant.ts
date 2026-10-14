import { Restaurant, Subscription } from '../models/index.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import { logAudit } from './audit.js';
import { deleteRestaurantCascade } from './adminDeleteUser.js';
import { assertRestaurantClearOfPlatformDebt } from './restaurantDebt.js';
import { cancelStripeSubscription } from './stripe.js';

export async function deleteMyRestaurant(input: {
  restaurantId: string;
  actorId: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

  if (!restaurant.ownerId.equals(input.actorId)) {
    throw new ForbiddenError('Only the restaurant owner can delete this restaurant');
  }

  await assertRestaurantClearOfPlatformDebt(input.restaurantId);

  const sub = await Subscription.findOne({ restaurantId: restaurant._id });
  if (sub?.stripeSubscriptionId) {
    try {
      await cancelStripeSubscription(sub.stripeSubscriptionId);
    } catch {
      // Cascade still removes the local subscription; avoid blocking on Stripe flakiness
      // after debt was already cleared.
    }
  }

  const deletedCounts = await deleteRestaurantCascade([restaurant._id]);
  const parts = Object.entries(deletedCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`);

  await logAudit({
    actorId: input.actorId,
    action: 'deleteMyRestaurant',
    resource: 'Restaurant',
    resourceId: input.restaurantId,
    details: { deletedCounts },
  });

  return {
    success: true,
    deletedRestaurantId: input.restaurantId,
    message: parts.length
      ? `Deleted restaurant and related records (${parts.join(', ')})`
      : 'Deleted restaurant',
    deletedCounts,
  };
}
