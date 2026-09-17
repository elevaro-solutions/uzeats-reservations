import {
  restaurantSlugSchema,
  requestRestaurantSlugInputSchema,
  isPlatformAdmin,
} from '@reservations/shared';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import type { UserDocument } from '../models/User.js';
import {
  RestaurantSlugRequest,
  type RestaurantSlugRequestDocument,
} from '../models/RestaurantSlugRequest.js';
import { mapRestaurant, mapUser } from '../graphql/mappers.js';
import { normalizePagination } from '../lib/pagination.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../lib/errors.js';
import { logAudit } from './audit.js';
import { notifyUser } from './notifications.js';
import { logger } from '../lib/logger.js';

function hasOwnerSlugAccess(user: UserDocument, restaurant: { _id: mongoose.Types.ObjectId; ownerId: mongoose.Types.ObjectId }) {
  if (isPlatformAdmin(user.role)) return true;
  if (user.role !== 'restaurant_owner') return false;
  if (restaurant.ownerId.equals(user._id)) return true;
  return Boolean(user.restaurantIds?.some((id) => id.equals(restaurant._id)));
}

async function isRestaurantSlugAvailable(slug: string, excludeRestaurantId?: string) {
  const filter: Record<string, unknown> = {
    $or: [{ slug }, { previousSlugs: slug }],
  };
  if (excludeRestaurantId) {
    filter._id = { $ne: excludeRestaurantId };
  }
  const existing = await Restaurant.findOne(filter).select('_id').lean();
  return !existing;
}

async function mapSlugRequest(doc: RestaurantSlugRequestDocument) {
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
    currentSlug: doc.currentSlug,
    requestedSlug: doc.requestedSlug,
    reason: doc.reason ?? null,
    status: doc.status,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    reviewedAt: doc.reviewedAt ?? null,
    reviewer: reviewer ? mapUser(reviewer) : null,
  };
}

export async function restaurantSlugAvailable(slug: string, excludeRestaurantId?: string | null) {
  const parsed = restaurantSlugSchema.safeParse(slug);
  if (!parsed.success) return false;
  return isRestaurantSlugAvailable(parsed.data, excludeRestaurantId ?? undefined);
}

export async function applyRestaurantSlug(opts: {
  restaurantId: string;
  slug: string;
  actorId: string;
  excludeRequestId?: string;
  notifyOwner?: boolean;
}) {
  const slug = restaurantSlugSchema.parse(opts.slug);
  const restaurant = await Restaurant.findById(opts.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

  if (restaurant.slug === slug) return restaurant;

  if (!(await isRestaurantSlugAvailable(slug, opts.restaurantId))) {
    throw new ConflictError('That URL slug is already in use');
  }

  const previous = restaurant.slug;
  const previousSlugs = new Set(restaurant.previousSlugs ?? []);
  if (previous) previousSlugs.add(previous);
  previousSlugs.delete(slug);

  restaurant.slug = slug;
  restaurant.previousSlugs = [...previousSlugs];
  await restaurant.save();

  const pendingFilter: Record<string, unknown> = {
    restaurantId: restaurant._id,
    status: 'pending',
  };
  if (opts.excludeRequestId) {
    pendingFilter._id = { $ne: opts.excludeRequestId };
  }
  await RestaurantSlugRequest.updateMany(pendingFilter, {
    $set: {
      status: 'denied',
      notes: 'The public URL was updated before this request was reviewed',
      reviewedById: new mongoose.Types.ObjectId(opts.actorId),
      reviewedAt: new Date(),
    },
  });

  await logAudit({
    actorId: opts.actorId,
    action: 'updateRestaurantSlug',
    resource: 'Restaurant',
    resourceId: opts.restaurantId,
    details: { from: previous, to: slug },
  });

  if (opts.notifyOwner !== false) {
    void notifyOwnerSlugChange(restaurant.ownerId.toString(), {
      restaurantName: restaurant.name,
      from: previous ?? '',
      to: slug,
      approved: true,
    });
  }

  return restaurant;
}

async function notifyOwnerSlugChange(
  ownerId: string,
  payload: {
    restaurantName: string;
    from: string;
    to: string;
    approved: boolean;
    notes?: string | null;
  },
) {
  try {
    if (payload.approved) {
      await notifyUser(ownerId, {
        type: 'restaurant_slug_changed',
        title: `Public URL updated for ${payload.restaurantName}`,
        body: payload.from
          ? `Your booking page is now /restaurants/${payload.to} (was /restaurants/${payload.from}).`
          : `Your booking page is now /restaurants/${payload.to}.`,
        data: { slug: payload.to },
      });
    } else {
      await notifyUser(ownerId, {
        type: 'restaurant_slug_denied',
        title: `URL change declined for ${payload.restaurantName}`,
        body: payload.notes?.trim()
          ? `We could not change the public URL to /restaurants/${payload.to}. ${payload.notes.trim()}`
          : `We could not change the public URL to /restaurants/${payload.to}.`,
        data: { slug: payload.to },
      });
    }
  } catch (err) {
    logger.error({ err }, '[restaurantSlugs] failed to notify owner');
  }
}

export async function requestRestaurantSlugChange(rawInput: unknown, user: UserDocument) {
  const input = requestRestaurantSlugInputSchema.parse(rawInput);
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasOwnerSlugAccess(user, restaurant)) {
    throw new ForbiddenError('Only restaurant owners can request a public URL change');
  }
  if (restaurant.slug === input.slug) {
    throw new ValidationError('That is already your public URL');
  }
  if (!(await isRestaurantSlugAvailable(input.slug, restaurant._id.toString()))) {
    throw new ConflictError('That URL slug is already in use');
  }

  const existing = await RestaurantSlugRequest.findOne({
    restaurantId: restaurant._id,
    status: 'pending',
  }).sort({ createdAt: -1 });

  if (existing) {
    existing.requestedSlug = input.slug;
    existing.currentSlug = restaurant.slug ?? existing.currentSlug;
    existing.reason = input.reason;
    existing.requestedById = user._id;
    await existing.save();
    return mapSlugRequest(existing);
  }

  const doc = await RestaurantSlugRequest.create({
    restaurantId: restaurant._id,
    requestedById: user._id,
    currentSlug: restaurant.slug ?? '',
    requestedSlug: input.slug,
    reason: input.reason,
    status: 'pending',
  });

  await logAudit({
    actorId: user._id.toString(),
    action: 'requestRestaurantSlugChange',
    resource: 'Restaurant',
    resourceId: restaurant._id.toString(),
    details: { from: restaurant.slug, to: input.slug },
  });

  return mapSlugRequest(doc);
}

export async function myRestaurantSlugRequest(restaurantId: string, user: UserDocument) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasOwnerSlugAccess(user, restaurant)) {
    throw new ForbiddenError();
  }
  const doc = await RestaurantSlugRequest.findOne({ restaurantId }).sort({ createdAt: -1 });
  return doc ? mapSlugRequest(doc) : null;
}

export async function cancelRestaurantSlugRequest(id: string, user: UserDocument) {
  const doc = await RestaurantSlugRequest.findById(id);
  if (!doc) throw new NotFoundError('Slug request');
  if (doc.status !== 'pending') {
    throw new ValidationError('Only pending requests can be cancelled');
  }
  const restaurant = await Restaurant.findById(doc.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');
  if (!hasOwnerSlugAccess(user, restaurant)) {
    throw new ForbiddenError();
  }
  doc.status = 'denied';
  doc.notes = 'Cancelled by restaurant owner';
  doc.reviewedAt = new Date();
  doc.reviewedById = user._id;
  await doc.save();
  return mapSlugRequest(doc);
}

export async function adminListRestaurantSlugRequests(args: {
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
    filter.$or = [
      { requestedSlug: { $regex: q, $options: 'i' } },
      { currentSlug: { $regex: q, $options: 'i' } },
      { reason: { $regex: q, $options: 'i' } },
    ];
  }

  const { limit, offset } = normalizePagination(
    { limit: args.limit, offset: args.offset },
    { limit: 20, max: 100 },
  );
  const [docs, total] = await Promise.all([
    RestaurantSlugRequest.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    RestaurantSlugRequest.countDocuments(filter),
  ]);

  return {
    items: await Promise.all(docs.map((doc) => mapSlugRequest(doc))),
    total,
    limit,
    offset,
  };
}

export async function reviewRestaurantSlugRequest(opts: {
  id: string;
  status: 'approved' | 'denied';
  reviewerId: string;
  notes?: string | null;
  slug?: string | null;
}) {
  const doc = await RestaurantSlugRequest.findById(opts.id);
  if (!doc) throw new NotFoundError('Slug request');
  if (doc.status !== 'pending') {
    throw new ValidationError('This request has already been reviewed');
  }

  const restaurant = await Restaurant.findById(doc.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

  if (opts.status === 'approved') {
    const nextSlug = opts.slug?.trim() ? opts.slug : doc.requestedSlug;
    await applyRestaurantSlug({
      restaurantId: restaurant._id.toString(),
      slug: nextSlug,
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
    action: 'reviewRestaurantSlugRequest',
    resource: 'RestaurantSlugRequest',
    resourceId: doc._id.toString(),
    details: {
      status: opts.status,
      restaurantId: doc.restaurantId.toString(),
      slug: doc.requestedSlug,
    },
  });

  const updatedRestaurant = await Restaurant.findById(doc.restaurantId);
  void notifyOwnerSlugChange(restaurant.ownerId.toString(), {
    restaurantName: restaurant.name,
    from: doc.currentSlug,
    to: updatedRestaurant?.slug ?? doc.requestedSlug,
    approved: opts.status === 'approved',
    notes: opts.notes,
  });

  return mapSlugRequest(doc);
}
