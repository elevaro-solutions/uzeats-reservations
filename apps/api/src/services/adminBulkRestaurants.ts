import { Restaurant } from '../models/Restaurant.js';
import { requireAdmin, requireSuperAdmin, type GraphQLContext } from '../graphql/context.js';
import { logAudit } from './audit.js';
import { provisionDefaultRestaurantSetup } from './restaurantSetup.js';
import { adminDeleteRestaurant } from './adminDeleteUser.js';
import { mapRestaurant } from '../graphql/mappers.js';

export type RestaurantStatusValue = 'pending' | 'approved' | 'rejected' | 'suspended';

export async function setRestaurantStatuses(
  ids: string[],
  status: RestaurantStatusValue,
  ctx: GraphQLContext,
) {
  const admin = requireAdmin(ctx);
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No restaurants selected');

  const items = [];
  for (const id of uniqueIds) {
    const doc = await Restaurant.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) continue;
    if (status === 'approved') {
      await provisionDefaultRestaurantSetup(doc._id);
    }
    await logAudit({
      actorId: admin._id.toString(),
      action: 'setRestaurantStatus',
      resource: 'Restaurant',
      resourceId: id,
      details: { status, bulk: true },
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
