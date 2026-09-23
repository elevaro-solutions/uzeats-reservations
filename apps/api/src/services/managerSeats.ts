import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ManagerInvite } from '../models/ManagerInvite.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { DEFAULT_MANAGER_SEATS, normalizeManagerSeats } from '../config/plans.js';
import { getEffectivePlan } from './platformConfig.js';
import { applyPendingPlanChangeIfDue } from './planChange.js';
import { PlanFeatureError } from '../lib/errors.js';

export type ManagerSeatsUsage = {
  restaurantId: string;
  planKey: string;
  limit: number;
  used: number;
  pending: number;
  remaining: number;
};

/**
 * Active manager seats = `manager` users assigned to the venue.
 * Primary restaurant owner does not consume a manager seat.
 */
export async function countManagerSeatsUsed(
  restaurantId: string,
  options?: { excludeUserIds?: string[] },
): Promise<number> {
  const restaurantOid = new mongoose.Types.ObjectId(restaurantId);
  const exclude = (options?.excludeUserIds ?? [])
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));

  const filter: Record<string, unknown> = {
    role: 'manager',
    restaurantIds: restaurantOid,
  };
  if (exclude.length) {
    filter._id = { $nin: exclude };
  }
  return User.countDocuments(filter);
}

/**
 * Unaccepted, unexpired invites that have not yet provisioned a user.
 * (Current inviteManager always creates the user immediately — those seats
 * count via `countManagerSeatsUsed`. This covers a future accept-first flow.)
 */
export async function countPendingManagerInvites(
  restaurantId: string,
  options?: { excludeEmails?: string[] },
): Promise<number> {
  const restaurantOid = new mongoose.Types.ObjectId(restaurantId);
  const excludeEmails = (options?.excludeEmails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const filter: Record<string, unknown> = {
    role: 'manager',
    restaurantIds: restaurantOid,
    userId: { $exists: false },
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  };
  if (excludeEmails.length) {
    filter.email = { $nin: excludeEmails };
  }
  return ManagerInvite.countDocuments(filter);
}

/** Manager seat limit from the restaurant's current package (default Basic = 1). */
export async function getManagerSeatLimit(restaurantId: string): Promise<{
  planKey: string;
  limit: number;
}> {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub || sub.status === 'cancelled' || sub.status === 'paused') {
    const basic = await getEffectivePlan('basic');
    return {
      planKey: basic?.key ?? 'basic',
      limit: normalizeManagerSeats(basic?.managerSeats, DEFAULT_MANAGER_SEATS),
    };
  }
  await applyPendingPlanChangeIfDue(sub);
  const plan = await getEffectivePlan(sub.plan);
  return {
    planKey: plan?.key ?? sub.plan,
    limit: normalizeManagerSeats(plan?.managerSeats, DEFAULT_MANAGER_SEATS),
  };
}

export async function getManagerSeatsUsage(restaurantId: string): Promise<ManagerSeatsUsage> {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const [{ planKey, limit }, used, pending] = await Promise.all([
    getManagerSeatLimit(restaurantId),
    countManagerSeatsUsed(restaurantId),
    countPendingManagerInvites(restaurantId),
  ]);

  return {
    restaurantId,
    planKey,
    limit,
    used,
    pending,
    remaining: Math.max(0, limit - used - pending),
  };
}

/**
 * Ensures adding `addCount` manager seats fits the package quota.
 * Call before inviting or assigning a new `manager` user to a restaurant.
 */
export async function assertManagerSeatsAvailable(
  restaurantId: string,
  options?: {
    addCount?: number;
    excludeUserIds?: string[];
    excludeEmails?: string[];
  },
): Promise<ManagerSeatsUsage> {
  const addCount = Math.max(1, options?.addCount ?? 1);
  const [{ planKey, limit }, used, pending] = await Promise.all([
    getManagerSeatLimit(restaurantId),
    countManagerSeatsUsed(restaurantId, { excludeUserIds: options?.excludeUserIds }),
    countPendingManagerInvites(restaurantId, { excludeEmails: options?.excludeEmails }),
  ]);

  const usage: ManagerSeatsUsage = {
    restaurantId,
    planKey,
    limit,
    used,
    pending,
    remaining: Math.max(0, limit - used - pending),
  };

  if (used + pending + addCount > limit) {
    throw new PlanFeatureError(
      `Your ${planKey} package includes ${limit} manager seat${limit === 1 ? '' : 's'} ` +
        `(${used} used, ${pending} pending). Upgrade your package to invite more managers.`,
    );
  }
  return usage;
}

/**
 * Whether assigning this user to the restaurant would consume a new manager seat.
 * Existing managers already on the venue do not consume an additional seat.
 */
export async function wouldConsumeManagerSeat(
  restaurantId: string,
  userId: string,
  nextRole?: string | null,
): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user) return true;
  const role = nextRole || user.role;
  if (role !== 'manager') return false;
  const alreadyAssigned = user.restaurantIds?.some((id) => id.equals(restaurantId));
  return !alreadyAssigned;
}
