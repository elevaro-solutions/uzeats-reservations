import mongoose, { type ClientSession } from 'mongoose';
import { RESTAURANT_LOYALTY } from '@reservations/shared';
import { GuestProfile } from '../models/GuestProfile.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantLoyaltyTransaction } from '../models/RestaurantLoyalty.js';

async function withRestaurantLoyaltyTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function getOrCreateProfile(
  restaurantId: string,
  dinerId: string,
  session?: ClientSession,
) {
  return GuestProfile.findOneAndUpdate(
    { restaurantId, dinerId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true, session },
  );
}

export async function getRestaurantLoyaltyBalance(restaurantId: string, dinerId: string) {
  const profile = await GuestProfile.findOne({ restaurantId, dinerId }).select('loyaltyPoints');
  return profile?.loyaltyPoints ?? 0;
}

export async function awardRestaurantVisitPoints(input: {
  restaurantId: string;
  dinerId: string;
  reservationId: string;
  pointsPerVisit: number;
}) {
  if (input.pointsPerVisit <= 0) return 0;

  const description = 'Restaurant visit completed';
  const existing = await RestaurantLoyaltyTransaction.findOne({
    restaurantId: input.restaurantId,
    dinerId: input.dinerId,
    reservationId: input.reservationId,
    type: 'earn',
    description,
  });
  if (existing) return 0;

  return withRestaurantLoyaltyTransaction(async (session) => {
    await getOrCreateProfile(input.restaurantId, input.dinerId, session);
    await GuestProfile.findOneAndUpdate(
      { restaurantId: input.restaurantId, dinerId: input.dinerId },
      { $inc: { loyaltyPoints: input.pointsPerVisit } },
      { session },
    );
    await RestaurantLoyaltyTransaction.create(
      [
        {
          restaurantId: input.restaurantId,
          dinerId: input.dinerId,
          reservationId: input.reservationId,
          type: 'earn',
          points: input.pointsPerVisit,
          description,
        },
      ],
      { session },
    );
    return input.pointsPerVisit;
  });
}

export async function redeemRestaurantPoints(input: {
  restaurantId: string;
  dinerId: string;
  points: number;
  reservationId: string;
  minRedeem: number;
}) {
  if (input.points < input.minRedeem) {
    throw new Error(`Minimum redeem is ${input.minRedeem} restaurant points`);
  }

  return withRestaurantLoyaltyTransaction(async (session) => {
    const profile = await GuestProfile.findOneAndUpdate(
      { restaurantId: input.restaurantId, dinerId: input.dinerId, loyaltyPoints: { $gte: input.points } },
      { $inc: { loyaltyPoints: -input.points } },
      { new: true, session },
    );
    if (!profile) {
      throw new Error('Insufficient restaurant loyalty points');
    }

    await RestaurantLoyaltyTransaction.create(
      [
        {
          restaurantId: input.restaurantId,
          dinerId: input.dinerId,
          reservationId: input.reservationId,
          type: 'redeem',
          points: -input.points,
          description: 'Redeemed for reservation discount',
        },
      ],
      { session },
    );
    return input.points;
  });
}

export async function refundRestaurantRedeemedPoints(input: {
  restaurantId: string;
  dinerId: string;
  points: number;
  reservationId: string;
}) {
  if (input.points <= 0) return 0;

  const alreadyRefunded = await RestaurantLoyaltyTransaction.findOne({
    restaurantId: input.restaurantId,
    dinerId: input.dinerId,
    reservationId: input.reservationId,
    type: 'adjust',
    description: 'Restaurant points refunded — reservation cancelled',
  });
  if (alreadyRefunded) return 0;

  return withRestaurantLoyaltyTransaction(async (session) => {
    await getOrCreateProfile(input.restaurantId, input.dinerId, session);
    await GuestProfile.findOneAndUpdate(
      { restaurantId: input.restaurantId, dinerId: input.dinerId },
      { $inc: { loyaltyPoints: input.points } },
      { session },
    );
    await RestaurantLoyaltyTransaction.create(
      [
        {
          restaurantId: input.restaurantId,
          dinerId: input.dinerId,
          reservationId: input.reservationId,
          type: 'adjust',
          points: input.points,
          description: 'Restaurant points refunded — reservation cancelled',
        },
      ],
      { session },
    );
    return input.points;
  });
}

export async function getRestaurantLoyaltySettings(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).select(
    'loyaltyEnabled loyaltyPointsPerVisit loyaltyMinRedeemPoints',
  );
  if (!restaurant?.loyaltyEnabled) return null;
  return {
    enabled: true,
    pointsPerVisit:
      restaurant.loyaltyPointsPerVisit ?? RESTAURANT_LOYALTY.DEFAULT_POINTS_PER_VISIT,
    minRedeem:
      restaurant.loyaltyMinRedeemPoints ?? RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS,
  };
}

export async function getMyRestaurantLoyaltyBalances(dinerId: string) {
  const profiles = await GuestProfile.find({ dinerId, loyaltyPoints: { $gt: 0 } })
    .populate('restaurantId', 'name slug loyaltyEnabled')
    .sort({ updatedAt: -1 })
    .limit(50);

  return profiles
    .filter((p) => {
      const r = p.restaurantId as unknown as { loyaltyEnabled?: boolean } | null;
      return r?.loyaltyEnabled;
    })
    .map((p) => {
      const r = p.restaurantId as unknown as {
        _id: { toString(): string };
        name: string;
        slug?: string;
      };
      return {
        restaurantId: r._id.toString(),
        restaurantName: r.name,
        restaurantSlug: r.slug ?? null,
        points: p.loyaltyPoints ?? 0,
      };
    });
}

export async function getRestaurantLoyaltyHistory(
  dinerId: string,
  options?: { restaurantId?: string; limit?: number },
) {
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 100);
  const filter: Record<string, unknown> = { dinerId };
  if (options?.restaurantId) filter.restaurantId = options.restaurantId;

  const items = await RestaurantLoyaltyTransaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('restaurantId', 'name');

  return items.map((t) => {
    const r = t.restaurantId as unknown as { _id: { toString(): string }; name: string } | null;
    return {
      id: t._id.toString(),
      restaurantId: r?._id.toString() ?? t.restaurantId.toString(),
      restaurantName: r?.name ?? 'Restaurant',
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: (t as { createdAt: Date }).createdAt,
    };
  });
}
