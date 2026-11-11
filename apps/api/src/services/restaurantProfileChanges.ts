import {
  requestRestaurantProfileChangeInputSchema,
  restaurantProfileChangePatchSchema,
  isPlatformAdmin,
  type RestaurantInput,
  type RestaurantProfileChange,
} from '@reservations/shared';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import type { UserDocument } from '../models/User.js';
import {
  RestaurantProfileChangeRequest,
  type RestaurantProfileChangeRequestDocument,
} from '../models/RestaurantProfileChangeRequest.js';
import { mapRestaurant, mapUser } from '../graphql/mappers.js';
import { normalizePagination } from '../lib/pagination.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../lib/errors.js';
import {
  fallbackProfileChange,
  listingPatchFromRestaurantUpdate,
  mergeProfileChange,
  profileChangeToDbSet,
  profileChangesEqual,
  proposalFromProfileRequest,
  restaurantProfileSnapshot,
  type RestaurantProfileSource,
} from '../lib/restaurantProfileChange.js';
import { logAudit } from './audit.js';
import { notifyUser } from './notifications.js';
import { logger } from '../lib/logger.js';

function hasProfileChangeAccess(
  user: UserDocument,
  restaurant: { _id: mongoose.Types.ObjectId; ownerId: mongoose.Types.ObjectId },
) {
  if (isPlatformAdmin(user.role)) return true;
  if (restaurant.ownerId.equals(user._id)) return true;
  return Boolean(user.restaurantIds?.some((id) => id.equals(restaurant._id)));
}

function mapProfileChange(profile: unknown, fallback: RestaurantProfileChange): RestaurantProfileChange {
  return mergeProfileChange(fallback, profile);
}

async function mapProfileChangeRequest(doc: RestaurantProfileChangeRequestDocument) {
  const [restaurant, requester, reviewer] = await Promise.all([
    Restaurant.findById(doc.restaurantId),
    User.findById(doc.requestedById),
    doc.reviewedById ? User.findById(doc.reviewedById) : Promise.resolve(null),
  ]);

  const fallback = restaurant ? restaurantProfileSnapshot(restaurant) : fallbackProfileChange();

  return {
    id: doc._id.toString(),
    restaurantId: doc.restaurantId.toString(),
    restaurant: restaurant ? mapRestaurant(restaurant) : null,
    requestedBy: requester ? mapUser(requester) : null,
    current: mapProfileChange(doc.current, fallback),
    proposed: mapProfileChange(doc.proposed, fallback),
    reason: doc.reason ?? null,
    status: doc.status,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    reviewedAt: doc.reviewedAt ?? null,
    reviewer: reviewer ? mapUser(reviewer) : null,
  };
}

async function notifyOwnerProfileChange(
  ownerId: string,
  payload: {
    restaurantName: string;
    approved: boolean;
    notes?: string | null;
  },
) {
  try {
    if (payload.approved) {
      await notifyUser(ownerId, {
        type: 'restaurant_profile_changed',
        title: `Public profile updated for ${payload.restaurantName}`,
        body: 'The diner-facing profile you requested is now live.',
        data: { restaurantName: payload.restaurantName },
      });
    } else {
      await notifyUser(ownerId, {
        type: 'restaurant_profile_denied',
        title: `Public profile change declined for ${payload.restaurantName}`,
        body: payload.notes?.trim()
          ? `We could not apply the public profile changes. ${payload.notes.trim()}`
          : 'We could not apply the public profile changes.',
        data: { restaurantName: payload.restaurantName },
      });
    }
  } catch (err) {
    logger.error({ err }, '[restaurantProfileChanges] failed to notify owner');
  }
}

export async function denyPendingProfileChangeRequests(opts: {
  restaurantId: string;
  actorId: string;
  excludeRequestId?: string;
  notes?: string;
}) {
  const pendingFilter: Record<string, unknown> = {
    restaurantId: opts.restaurantId,
    status: 'pending',
  };
  if (opts.excludeRequestId) {
    pendingFilter._id = { $ne: opts.excludeRequestId };
  }
  await RestaurantProfileChangeRequest.updateMany(pendingFilter, {
    $set: {
      status: 'denied',
      notes: opts.notes ?? 'The public profile was updated before this request was reviewed',
      reviewedById: new mongoose.Types.ObjectId(opts.actorId),
      reviewedAt: new Date(),
    },
  });
}

export async function applyRestaurantProfileChange(opts: {
  restaurantId: string;
  profile: unknown;
  actorId: string;
  excludeRequestId?: string;
  notifyOwner?: boolean;
}) {
  const restaurant = await Restaurant.findById(opts.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  const profile = mergeProfileChange(restaurantProfileSnapshot(restaurant), opts.profile);

  await Restaurant.findByIdAndUpdate(opts.restaurantId, {
    $set: profileChangeToDbSet(profile),
  });

  await denyPendingProfileChangeRequests({
    restaurantId: opts.restaurantId,
    actorId: opts.actorId,
    excludeRequestId: opts.excludeRequestId,
  });

  await logAudit({
    actorId: opts.actorId,
    action: 'updateRestaurantProfile',
    resource: 'Restaurant',
    resourceId: opts.restaurantId,
  });

  if (opts.notifyOwner !== false) {
    void notifyOwnerProfileChange(restaurant.ownerId.toString(), {
      restaurantName: restaurant.name,
      approved: true,
    });
  }

  return Restaurant.findById(opts.restaurantId);
}

async function pendingProfileChange(restaurantId: mongoose.Types.ObjectId) {
  return RestaurantProfileChangeRequest.findOne({
    restaurantId,
    status: 'pending',
  }).sort({ createdAt: -1 });
}

async function persistProfileChange(opts: {
  restaurant: { _id: mongoose.Types.ObjectId };
  user: UserDocument;
  current: RestaurantProfileChange;
  proposed: RestaurantProfileChange;
  reason?: string;
  replaceReason: boolean;
}) {
  const existing = await pendingProfileChange(opts.restaurant._id);
  if (existing) {
    const unchanged =
      profileChangesEqual(mergeProfileChange(opts.current, existing.proposed), opts.proposed) &&
      (!opts.replaceReason || (existing.reason ?? undefined) === opts.reason);
    if (unchanged) return mapProfileChangeRequest(existing);

    existing.proposed = opts.proposed;
    existing.current = opts.current;
    if (opts.replaceReason) existing.reason = opts.reason;
    existing.requestedById = opts.user._id;
    await existing.save();
    return mapProfileChangeRequest(existing);
  }

  const doc = await RestaurantProfileChangeRequest.create({
    restaurantId: opts.restaurant._id,
    requestedById: opts.user._id,
    current: opts.current,
    proposed: opts.proposed,
    reason: opts.reason,
    status: 'pending',
  });

  await logAudit({
    actorId: opts.user._id.toString(),
    action: 'requestRestaurantProfileChange',
    resource: 'Restaurant',
    resourceId: opts.restaurant._id.toString(),
  });

  return mapProfileChangeRequest(doc);
}

export async function requestRestaurantProfileChange(rawInput: unknown, user: UserDocument) {
  const input = requestRestaurantProfileChangeInputSchema.parse(rawInput);
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasProfileChangeAccess(user, restaurant)) {
    throw new ForbiddenError('You do not have access to this restaurant');
  }

  const current = restaurantProfileSnapshot(restaurant);
  const existing = await pendingProfileChange(restaurant._id);
  const rawProfile = asProfileRecord(rawInput);
  restaurantProfileChangePatchSchema.parse(rawProfile);
  const proposed = proposalFromProfileRequest(current, existing?.proposed, rawProfile);
  if (profileChangesEqual(current, proposed)) {
    throw new ValidationError('No public profile changes to request');
  }

  return persistProfileChange({
    restaurant,
    user,
    current,
    proposed,
    reason: input.reason,
    replaceReason: true,
  });
}

function asProfileRecord(rawInput: unknown) {
  if (!rawInput || typeof rawInput !== 'object' || !('profile' in rawInput)) return {};
  const profile = (rawInput as { profile?: unknown }).profile;
  return profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {};
}

/**
 * Queue guest-facing listing edits from updateRestaurant.
 * `replace` trusts the editor payload (so a field can be changed back).
 * `delta` only queues values that differ from the live restaurant.
 */
export async function queueOwnerRestaurantListingChange(opts: {
  restaurant: RestaurantProfileSource & { _id: mongoose.Types.ObjectId; status?: string | null };
  user: UserDocument;
  raw: Record<string, unknown>;
  input: RestaurantInput;
  replaceListing: boolean;
}) {
  const current = restaurantProfileSnapshot(opts.restaurant);
  const existing = await pendingProfileChange(opts.restaurant._id);
  const patch = listingPatchFromRestaurantUpdate({
    live: current,
    input: opts.input,
    raw: opts.raw,
    mode: opts.replaceListing ? 'replace' : 'delta',
  });
  if (Object.keys(patch).length === 0) return 'unchanged' as const;

  const base = existing ? mergeProfileChange(current, existing.proposed) : current;
  const proposed = mergeProfileChange(base, patch);
  if (profileChangesEqual(proposed, current)) {
    if (existing) await cancelRestaurantProfileChangeRequest(existing._id.toString(), opts.user);
    return 'reverted' as const;
  }
  if (existing && profileChangesEqual(proposed, mergeProfileChange(current, existing.proposed))) {
    return 'unchanged' as const;
  }

  await persistProfileChange({
    restaurant: opts.restaurant,
    user: opts.user,
    current,
    proposed,
    replaceReason: false,
  });
  return 'queued' as const;
}

export async function myRestaurantProfileChangeRequest(restaurantId: string, user: UserDocument) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasProfileChangeAccess(user, restaurant)) {
    throw new ForbiddenError();
  }
  const doc = await RestaurantProfileChangeRequest.findOne({ restaurantId }).sort({ createdAt: -1 });
  return doc ? mapProfileChangeRequest(doc) : null;
}

export async function cancelRestaurantProfileChangeRequest(id: string, user: UserDocument) {
  const doc = await RestaurantProfileChangeRequest.findById(id);
  if (!doc) throw new NotFoundError('Profile change request');
  if (doc.status !== 'pending') {
    throw new ValidationError('Only pending requests can be cancelled');
  }
  const restaurant = await Restaurant.findById(doc.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasProfileChangeAccess(user, restaurant)) {
    throw new ForbiddenError();
  }
  doc.status = 'denied';
  doc.notes = 'Cancelled by restaurant';
  doc.reviewedAt = new Date();
  doc.reviewedById = user._id;
  await doc.save();
  return mapProfileChangeRequest(doc);
}

export async function pendingRestaurantProfileChangeRequestCount() {
  return RestaurantProfileChangeRequest.countDocuments({ status: 'pending' });
}

export async function adminListRestaurantProfileChangeRequests(args: {
  status?: string | null;
  search?: string | null;
  restaurantId?: string | null;
  limit?: number | null;
  offset?: number | null;
}) {
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.restaurantId) filter.restaurantId = args.restaurantId;
  if (args.search?.trim()) {
    const q = args.search.trim();
    const restaurants = await Restaurant.find({
      name: { $regex: q, $options: 'i' },
    })
      .select('_id')
      .lean();
    filter.$or = [
      { reason: { $regex: q, $options: 'i' } },
      { 'proposed.name': { $regex: q, $options: 'i' } },
      { 'proposed.description': { $regex: q, $options: 'i' } },
      { 'proposed.cuisine': { $regex: q, $options: 'i' } },
      { restaurantId: { $in: restaurants.map((r) => r._id) } },
    ];
  }

  const { limit, offset } = normalizePagination(
    { limit: args.limit, offset: args.offset },
    { limit: 20, max: 100 },
  );
  const [docs, total] = await Promise.all([
    RestaurantProfileChangeRequest.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    RestaurantProfileChangeRequest.countDocuments(filter),
  ]);

  return {
    items: await Promise.all(docs.map((doc) => mapProfileChangeRequest(doc))),
    total,
    limit,
    offset,
  };
}

export async function reviewRestaurantProfileChangeRequest(opts: {
  id: string;
  status: 'approved' | 'denied';
  reviewerId: string;
  notes?: string | null;
}) {
  const doc = await RestaurantProfileChangeRequest.findById(opts.id);
  if (!doc) throw new NotFoundError('Profile change request');
  if (doc.status !== 'pending') {
    throw new ValidationError('This request has already been reviewed');
  }

  const restaurant = await Restaurant.findById(doc.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

  if (opts.status === 'approved') {
    await applyRestaurantProfileChange({
      restaurantId: restaurant._id.toString(),
      profile: doc.proposed,
      actorId: opts.reviewerId,
      excludeRequestId: doc._id.toString(),
      notifyOwner: false,
    });
  }

  doc.status = opts.status;
  doc.notes = opts.notes ?? undefined;
  doc.reviewedById = new mongoose.Types.ObjectId(opts.reviewerId);
  doc.reviewedAt = new Date();
  await doc.save();

  await logAudit({
    actorId: opts.reviewerId,
    action: 'reviewRestaurantProfileChangeRequest',
    resource: 'RestaurantProfileChangeRequest',
    resourceId: doc._id.toString(),
    details: {
      status: opts.status,
      restaurantId: doc.restaurantId.toString(),
    },
  });

  void notifyOwnerProfileChange(restaurant.ownerId.toString(), {
    restaurantName: restaurant.name,
    approved: opts.status === 'approved',
    notes: opts.notes,
  });

  return mapProfileChangeRequest(doc);
}
