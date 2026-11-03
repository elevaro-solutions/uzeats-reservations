import type { UserRole } from '@reservations/shared';
import { isFailToPayPubliclyListed, isPlatformAdmin, type FailToPayStage } from '@reservations/shared';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { subscriptionGrantsEntitlements } from './subscriptionLifecycle.js';

const LISTING_STATUSES = ['trialing', 'active', 'past_due'] as const;
const HIDDEN_STAGES: FailToPayStage[] = ['unlisted', 'restricted', 'terminated'];

function listingAllowsEnforcementStage(stage: unknown) {
  if (!stage) return true;
  return isFailToPayPubliclyListed(stage as FailToPayStage);
}

/** Missing fields stay public so restaurants created before this flag keep their listing. */
export function restaurantDiscoveryOpen(restaurant: {
  visibility?: string | null;
  activity?: string | null;
} | null | undefined) {
  if (!restaurant) return false;
  if (restaurant.visibility === 'hidden') return false;
  if (restaurant.activity === 'inactive') return false;
  return true;
}

async function listingEntitled(restaurantId: string, now: Date) {
  const restaurant = await Restaurant.findById(restaurantId).select('visibility activity').lean();
  const sub = await Subscription.findOne({ restaurantId })
    .select('status cancelAtPeriodEnd currentPeriodEnd billingEnforcement')
    .lean();
  const entitled = Boolean(
    sub &&
      subscriptionGrantsEntitlements(sub, now) &&
      listingAllowsEnforcementStage(sub.billingEnforcement?.stage),
  );
  const visible = Boolean(restaurant) && restaurant?.visibility !== 'hidden';
  const active = restaurant?.activity !== 'inactive';
  return {
    /** Public page. Inactive venues stay reachable so diners see that booking is closed. */
    viewable: visible && entitled,
    /** Search and new bookings. Inactive venues are omitted. */
    listed: visible && active && entitled,
  };
}

/** True when the restaurant has a plan that still entitles a public listing. */
export async function restaurantIsPubliclyListed(restaurantId: string, now = new Date()) {
  return (await listingEntitled(restaurantId, now)).listed;
}

/** Public restaurant page, including inactive venues that are still visible. */
export async function restaurantIsPubliclyViewable(restaurantId: string, now = new Date()) {
  return (await listingEntitled(restaurantId, now)).viewable;
}

/** Restaurant ids that should appear in public search and booking. */
export async function publiclyListedRestaurantIds(): Promise<mongoose.Types.ObjectId[]> {
  const subs = await Subscription.find({
    status: { $in: [...LISTING_STATUSES] },
    'billingEnforcement.stage': { $nin: HIDDEN_STAGES },
  })
    .select('restaurantId')
    .lean();
  const candidateIds = subs.map((sub) => sub.restaurantId as mongoose.Types.ObjectId);
  if (candidateIds.length === 0) return [];
  const restaurants = await Restaurant.find({
    _id: { $in: candidateIds },
    visibility: { $ne: 'hidden' },
    activity: { $ne: 'inactive' },
  })
    .select('_id')
    .lean();
  return restaurants.map((restaurant) => restaurant._id as mongoose.Types.ObjectId);
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
