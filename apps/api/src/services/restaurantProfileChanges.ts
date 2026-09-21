import {
  requestRestaurantProfileChangeInputSchema,
  restaurantProfileChangeSchema,
  isPlatformAdmin,
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
  profileChangeToDbSet,
  profileChangesEqual,
  restaurantProfileSnapshot,
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

function mapProfileChange(profile: unknown): RestaurantProfileChange {
  return restaurantProfileChangeSchema.parse(profile ?? {});
}

async function mapProfileChangeRequest(doc: RestaurantProfileChangeRequestDocument) {
  const [restaurant, requester, reviewer] = await Promise.all([
    Restaurant.findById(doc.restaurantId),
    User.findById(doc.requestedById),
    doc.reviewedById ? User.findById(doc.reviewedById) : Promise.resolve(null),
  ]);

  return {
    id: doc._id.toString(),
    restaurantId: doc.restaurantId.toString(),
    restaurant: restaurant ? mapRestaurant(restaurant) : null,
    requestedBy: requester ? mapUser(requester) : null,
    current: mapProfileChange(doc.current),
    proposed: mapProfileChange(doc.proposed),
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
  const profile = restaurantProfileChangeSchema.parse(opts.profile);
  const restaurant = await Restaurant.findById(opts.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

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

export async function requestRestaurantProfileChange(rawInput: unknown, user: UserDocument) {
  const input = requestRestaurantProfileChangeInputSchema.parse(rawInput);
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasProfileChangeAccess(user, restaurant)) {
    throw new ForbiddenError('You do not have access to this restaurant');
  }

  const current = restaurantProfileSnapshot(restaurant);
  const proposed = restaurantProfileChangeSchema.parse(input.profile);
  if (profileChangesEqual(current, proposed)) {
    throw new ValidationError('No public profile changes to request');
  }

  const existing = await RestaurantProfileChangeRequest.findOne({
    restaurantId: restaurant._id,
    status: 'pending',
  }).sort({ createdAt: -1 });

  if (existing) {
    existing.proposed = proposed;
    existing.current = current;
    existing.reason = input.reason;
    existing.requestedById = user._id;
    await existing.save();
    return mapProfileChangeRequest(existing);
  }

  const doc = await RestaurantProfileChangeRequest.create({
    restaurantId: restaurant._id,
    requestedById: user._id,
    current,
    proposed,
    reason: input.reason,
    status: 'pending',
  });

  await logAudit({
    actorId: user._id.toString(),
    action: 'requestRestaurantProfileChange',
    resource: 'Restaurant',
    resourceId: restaurant._id.toString(),
  });

  return mapProfileChangeRequest(doc);
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
      { 'proposed.description': { $regex: q, $options: 'i' } },
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
