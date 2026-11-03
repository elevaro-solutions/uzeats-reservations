import type { RestaurantActivity, RestaurantVisibility } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { requireAdmin, requireSuperAdmin, type GraphQLContext } from '../graphql/context.js';
import { logAudit } from './audit.js';
import { provisionDefaultRestaurantSetup } from './restaurantSetup.js';
import { adminDeleteRestaurant } from './adminDeleteUser.js';
import { mapRestaurant } from '../graphql/mappers.js';
import { logger } from '../lib/logger.js';
import { notifyOwnerRestaurantApproved } from './restaurantOwnerEmails.js';

export type RestaurantStatusValue = 'pending' | 'approved' | 'rejected' | 'suspended';

/** Suspend closes discovery. Approve opens it again. Reject and pending leave listing flags alone. */
export function listingPatchForRestaurantStatus(status: RestaurantStatusValue): {
  visibility?: RestaurantVisibility;
  activity?: RestaurantActivity;
} {
  if (status === 'suspended') return { visibility: 'hidden', activity: 'inactive' };
  if (status === 'approved') return { visibility: 'visible', activity: 'active' };
  return {};
}

export async function setRestaurantStatuses(
  ids: string[],
  status: RestaurantStatusValue,
  ctx: GraphQLContext,
) {
  const admin = requireAdmin(ctx);
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No restaurants selected');
  const listing = listingPatchForRestaurantStatus(status);

  const items = [];
  for (const id of uniqueIds) {
    const previous = await Restaurant.findById(id).select('status').lean();
    const doc = await Restaurant.findByIdAndUpdate(id, { status, ...listing }, { new: true });
    if (!doc) continue;
    if (status === 'approved') {
      await provisionDefaultRestaurantSetup(doc._id);
      if (previous?.status !== 'approved' && doc.ownerId) {
        void notifyOwnerRestaurantApproved({
          ownerId: doc.ownerId.toString(),
          restaurantId: doc._id.toString(),
          restaurantName: doc.name,
        }).catch((err) => {
          logger.error(
            { err, restaurantId: id },
            '[setRestaurantStatuses] restaurant_approved email failed',
          );
        });
      }
    }
    await logAudit({
      actorId: admin._id.toString(),
      action: 'setRestaurantStatus',
      resource: 'Restaurant',
      resourceId: id,
      details: { status, ...listing, bulk: true },
    });
    items.push(mapRestaurant(doc));
  }

  return { updated: items.length, items };
}

function listingReason(reason?: string | null) {
  const trimmed = reason?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) throw new Error('Reason must be 500 characters or fewer');
  return trimmed;
}

export async function setRestaurantListings(
  ids: string[],
  patch: {
    visibility?: RestaurantVisibility | null;
    activity?: RestaurantActivity | null;
    reason?: string | null;
  },
  ctx: GraphQLContext,
) {
  const admin = requireAdmin(ctx);
  const visibility = patch.visibility ?? undefined;
  const activity = patch.activity ?? undefined;
  const reason = listingReason(patch.reason);
  if (!visibility && !activity) throw new Error('Choose visibility or activity');

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No restaurants selected');

  const update: { visibility?: RestaurantVisibility; activity?: RestaurantActivity } = {};
  if (visibility) update.visibility = visibility;
  if (activity) update.activity = activity;

  const items = [];
  for (const id of uniqueIds) {
    const doc = await Restaurant.findByIdAndUpdate(id, update, { new: true });
    if (!doc) continue;
    await logAudit({
      actorId: admin._id.toString(),
      action: 'setRestaurantListing',
      resource: 'Restaurant',
      resourceId: id,
      details: { ...update, ...(reason ? { reason } : {}), bulk: uniqueIds.length > 1 },
    });
    items.push(mapRestaurant(doc));
  }

  return { updated: items.length, items };
}

export async function adminDeleteRestaurants(ids: string[], ctx: GraphQLContext) {
  requireSuperAdmin(ctx);
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No restaurants selected');

  let deleted = 0;
  const errors: string[] = [];

  for (const id of uniqueIds) {
    try {
      await adminDeleteRestaurant(id);
      deleted += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed to delete ${id}`);
    }
  }

  return { deleted, errors };
}
