import type { UserRole } from '@reservations/shared';
import { isFailToPayPubliclyListed, isPlatformAdmin, type FailToPayStage } from '@reservations/shared';
import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { subscriptionGrantsEntitlements } from './subscriptionLifecycle.js';

const LISTING_STATUSES = ['trialing', 'active', 'past_due'] as const;
const HIDDEN_STAGES: FailToPayStage[] = ['unlisted', 'restricted', 'terminated'];

function listingAllowsEnforcementStage(stage: unknown) {
  if (!stage) return true;
  return isFailToPayPubliclyListed(stage as FailToPayStage);
}

/** True when the restaurant has a plan that still entitles a public listing. */
export async function restaurantIsPubliclyListed(restaurantId: string, now = new Date()) {
  const sub = await Subscription.findOne({ restaurantId })
    .select('status cancelAtPeriodEnd currentPeriodEnd billingEnforcement')
    .lean();
  if (!sub) return false;
  if (!subscriptionGrantsEntitlements(sub, now)) return false;
  return listingAllowsEnforcementStage(sub.billingEnforcement?.stage);
}

/** Restaurant ids that should appear in public search and booking. */
export async function publiclyListedRestaurantIds(): Promise<mongoose.Types.ObjectId[]> {
  const subs = await Subscription.find({
    status: { $in: [...LISTING_STATUSES] },
    'billingEnforcement.stage': { $nin: HIDDEN_STAGES },
  })
    .select('restaurantId')
    .lean();
  return subs.map((sub) => sub.restaurantId as mongoose.Types.ObjectId);
}

export async function viewerCanSeeUnlistedRestaurant(
  user: { _id: unknown; role: string } | null | undefined,
  restaurant: { _id: unknown; ownerId: unknown },
) {
  if (!user) return false;
  if (isPlatformAdmin(user.role as UserRole)) return true;
  const userId = String(user._id);
  if (String(restaurant.ownerId) === userId) return true;
  const doc = await User.findById(userId).select('restaurantIds').lean();
  return Boolean(doc?.restaurantIds?.some((id) => String(id) === String(restaurant._id)));
}
