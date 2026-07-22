import {
  registerSchema,
  registerRestaurantPartnerSchema,
  loginSchema,
  phoneOtpVerifySchema,
  restaurantInputSchema,
  tableInputSchema,
  shiftInputSchema,
  reservationInputSchema,
  ownerReservationInputSchema,
  updateReservationInputSchema,
  waitlistInputSchema,
  reviewInputSchema,
  notificationPreferencesSchema,
  searchRestaurantsSchema,
  normalizeAnnualBillingSettings,
  type AnnualBillingSettings,
} from '@reservations/shared';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  requestPhoneOtp,
  verifyPhoneOtp,
  refreshTokens,
  logout,
  requestPasswordReset,
  resetPassword,
  adminCreatePasswordReset,
} from '../services/auth.js';
import { registerRestaurantPartner } from '../services/partnerRegister.js';
import {
  buildAdminRestaurantFilter,
  buildOwnerRestaurantFilter,
} from '../services/restaurantFilters.js';
import { getAvailability } from '../services/availability.js';
import { paginateQuery } from '../lib/pagination.js';
import {
  createReservation,
  createOwnerReservation,
  updateReservationDetails,
  deleteReservation,
  updateReservationStatus,
  confirmDepositPayment,
} from '../services/reservations.js';
import { getLoyaltyHistory, awardReviewPoints } from '../services/loyalty.js';
import {
  getMyRestaurantLoyaltyBalances,
  getRestaurantLoyaltyBalance,
  getRestaurantLoyaltyHistory,
} from '../services/restaurantLoyalty.js';
import { getAdminLoyaltyStats, getAdminReferralLeaders } from '../services/loyaltyStats.js';
import { getRestaurantLoyaltyStats } from '../services/restaurantLoyaltyStats.js';
import {
  resolvePromotionDiscount,
  findBestAutoPromotion,
} from '../services/promotionCodes.js';
import { getPromotionStats } from '../services/promotionStats.js';
import {
  issueGiftCard,
  redeemGiftCardBalance,
  resolveGiftCardDiscount,
  setGiftCardActive,
} from '../services/giftCards.js';
import { GiftCard } from '../models/GiftCard.js';
import { ensureUserReferralCode } from '../lib/referralCode.js';
import { createUploadUrl } from '../services/spaces.js';
import {
  User,
  Restaurant,
  Table,
  Shift,
  Blackout,
  Reservation,
  WaitlistEntry,
  Review,
  Menu,
  AuditLog,
  Subscription,
  CoverFee,
  Invoice,
  Experience,
  Ticket,
  PrivateDiningSpace,
  PrivateDiningInquiry,
  RestaurantGroup,
  GuestProfile,
  Campaign,
  SurveyResponse,
  SurveyConfig,
  Message,
  AccessRule,
  Promotion,
  BoostCampaign,
  Integration,
  Notification,
} from '../models/index.js';
import crypto from 'node:crypto';
import {
  cancelStripeSubscription,
  updateStripeSubscription,
  createDepositIntent,
  isStubPaymentIntent,
} from '../services/stripe.js';
import { logAudit } from '../services/audit.js';
import { createRestaurantSubscription } from '../services/restaurantSubscription.js';
import { requireAuth, requireRole, type GraphQLContext } from './context.js';
import {
  mapUser,
  mapRestaurant,
  mapTable,
  mapShift,
  mapReservation,
  mapExperience,
  mapTicket,
  mapPrivateDiningSpace,
  mapPrivateDiningInquiry,
  mapGuestProfile,
  mapCampaign,
  mapSurveyResponse,
  mapReview,
  mapWaitlistEntry,
  mapMessage,
  mapAccessRule,
  mapPromotion,
  mapGiftCard,
  mapBoostCampaign,
  mapIntegration,
  slugify,
} from './mappers.js';
import { notifyUser, notifyRestaurantStaff } from '../services/notifications.js';
import { requireFeature } from '../services/plans.js';
import { executeCampaign, scheduleCampaign } from '../services/campaigns.js';
import {
  buildPreShiftReport,
  buildRevenueForecast,
  buildCustomReport,
  buildMultiLocationAnalytics,
} from '../services/reports.js';
import {
  BUILTIN_PLAN_KEYS,
  getEffectivePlan,
  getEffectivePlans,
  getPlanOverridesMap,
  getPlatformConfig,
  mapPlatformConfig,
  getAnnualBillingSettings,
  mapAnnualBillingSettings,
  isFeatureEnabled,
  pickDiscountOverrides,
  uniquePlanKey,
} from '../services/platformConfig.js';
import {
  generateInvoicesForPeriod,
  getPlatformRevenueReport,
  listInvoices,
  setInvoiceStatus,
  setInvoiceStatuses,
} from '../services/invoices.js';
import {
  adminOpsMutation,
  adminOpsQuery,
  applyPlatformConfigFeatureFlags,
} from '../services/adminOpsResolvers.js';

function mapSubscription(sub: any) {
  return {
    id: sub._id.toString(),
    restaurantId: sub.restaurantId.toString(),
    plan: sub.plan,
    status: sub.status,
    stripeCustomerId: sub.stripeCustomerId ?? null,
    stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
    currentPeriodStart: sub.currentPeriodStart ?? null,
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    trialEndsAt: sub.trialEndsAt ?? null,
    cancelledAt: sub.cancelledAt ?? null,
    monthlyPriceCents: sub.monthlyPriceCents,
    networkCoverFeeCents: sub.networkCoverFeeCents,
    websiteCoverFeeCents: sub.websiteCoverFeeCents ?? 0,
    features: sub.features ?? {},
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

async function assertRestaurantAccess(userId: string, restaurantId: string, role: string) {
  if (role === 'admin') return;
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (!restaurant.ownerId.equals(userId)) {
    const user = await User.findById(userId);
    const allowed = user?.restaurantIds?.some((id) => id.equals(restaurantId));
    if (!allowed) throw new Error('Forbidden');
  }
}

export const resolvers = {
  DateTime: {
    serialize: (v: Date | string) => (v instanceof Date ? v.toISOString() : v),
    parseValue: (v: string) => new Date(v),
    parseLiteral: (ast: { kind: string; value?: string }) =>
      ast.kind === 'StringValue' && ast.value ? new Date(ast.value) : null,
  },

  User: {
    id: (u: { id: string }) => u.id,
  },

  Restaurant: {
    tables: async (r: { id: string }) => {
      const tables = await Table.find({ restaurantId: r.id });
      return tables.map(mapTable);
    },
    shifts: async (r: { id: string }) => {
      const shifts = await Shift.find({ restaurantId: r.id });
      return shifts.map(mapShift);
    },
    menu: async (r: { id: string }) => {
      const menu = await Menu.findOne({ restaurantId: r.id });
      if (!menu) return null;
      return {
        id: menu._id.toString(),
        restaurantId: r.id,
        sections: menu.sections.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          items: s.items.map((i: any) => ({
            id: i._id.toString(),
            name: i.name,
            description: i.description,
            priceCents: i.priceCents,
            photoUrl: i.photoUrl,
            dietary: i.dietary ?? [],
            available: i.available,
          })),
        })),
      };
    },
  },

  Reservation: {
    restaurant: async (r: { restaurantId: string }) => {
      const doc = await Restaurant.findById(r.restaurantId);
      return doc ? mapRestaurant(doc) : null;
    },
    diner: async (r: { dinerId: string }) => {
      const doc = await User.findById(r.dinerId);
      return doc ? mapUser(doc) : null;
    },
    tables: async (r: { tableIds: string[] }) => {
      const tables = await Table.find({ _id: { $in: r.tableIds } });
      return tables.map(mapTable);
    },
  },

  Review: {
    diner: async (r: { dinerId: string }) => {
      const doc = await User.findById(r.dinerId);
      return doc ? mapUser(doc) : null;
    },
  },

  AuditLog: {
    actor: async (log: { actorId: string }) => {
      const doc = await User.findById(log.actorId);
      return doc ? mapUser(doc) : null;
    },
  },

  Experience: {
    restaurant: async (e: { restaurantId: string }) => {
      const doc = await Restaurant.findById(e.restaurantId);
      return doc ? mapRestaurant(doc) : null;
    },
  },

  Ticket: {
    experience: async (t: { experienceId: string }) => {
      const doc = await Experience.findById(t.experienceId);
      return doc ? mapExperience(doc) : null;
    },
  },

  PrivateDiningSpace: {
    restaurant: async (s: { restaurantId: string }) => {
      const doc = await Restaurant.findById(s.restaurantId);
      return doc ? mapRestaurant(doc) : null;
    },
  },

  PrivateDiningInquiry: {
    space: async (i: { spaceId?: string }) => {
      if (!i.spaceId) return null;
      const doc = await PrivateDiningSpace.findById(i.spaceId);
      return doc ? mapPrivateDiningSpace(doc) : null;
    },
    diner: async (i: { dinerId: string }) => {
      const doc = await User.findById(i.dinerId);
      return doc ? mapUser(doc) : null;
    },
  },

  GuestProfile: {
    diner: async (g: { dinerId: string }) => {
      const doc = await User.findById(g.dinerId);
      return doc ? mapUser(doc) : null;
    },
  },

  SurveyResponse: {
    diner: async (s: { dinerId: string }) => {
      const doc = await User.findById(s.dinerId);
      return doc ? mapUser(doc) : null;
    },
  },

  WaitlistEntry: {
    diner: async (w: { dinerId?: string | null }) => {
      if (!w.dinerId) return null;
      const doc = await User.findById(w.dinerId);
      return doc ? mapUser(doc) : null;
    },
  },

  Conversation: {
    diner: async (c: { dinerId: string }) => {
      const doc = await User.findById(c.dinerId);
      return doc ? mapUser(doc) : null;
    },
    restaurant: async (c: { restaurantId: string }) => {
      const doc = await Restaurant.findById(c.restaurantId);
      return doc ? mapRestaurant(doc) : null;
    },
    reservation: async (c: { reservationId: string }) => {
      const doc = await Reservation.findById(c.reservationId);
      return doc ? mapReservation(doc) : null;
    },
  },

  LocationStat: {
    restaurant: (s: { restaurant: any }) =>
      s.restaurant?._id ? mapRestaurant(s.restaurant) : s.restaurant,
  },

  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = ctx.user;
      if (!user) return null;
      const referralCode = await ensureUserReferralCode(user);
      return mapUser({ ...user.toObject(), referralCode });
    },
    ...adminOpsQuery,

    restaurant: async (_: unknown, args: { id?: string; slug?: string }) => {
      const doc = args.id
        ? await Restaurant.findById(args.id)
        : args.slug
          ? await Restaurant.findOne({ slug: args.slug })
          : null;
      return doc ? mapRestaurant(doc) : null;
    },

    validatePromotion: async (
      _: unknown,
      args: { restaurantId: string; code: string; slotStart: string; depositCents: number },
    ) => {
      try {
        const slotStart = new Date(args.slotStart);
        const { promotion, discountCents } = await resolvePromotionDiscount({
          restaurantId: args.restaurantId,
          code: args.code,
          slotStart,
          depositCents: args.depositCents,
        });
        return {
          valid: true,
          message: null,
          promotion: mapPromotion(promotion),
          discountCents,
          discountedDepositCents: Math.max(0, args.depositCents - discountCents),
          autoApplied: false,
        };
      } catch (err) {
        return {
          valid: false,
          message: err instanceof Error ? err.message : 'Invalid promotion',
          promotion: null,
          discountCents: 0,
          discountedDepositCents: args.depositCents,
          autoApplied: false,
        };
      }
    },

    bestPromotion: async (
      _: unknown,
      args: { restaurantId: string; slotStart: string; depositCents: number },
    ) => {
      try {
        const slotStart = new Date(args.slotStart);
        const best = await findBestAutoPromotion({
          restaurantId: args.restaurantId,
          slotStart,
          depositCents: args.depositCents,
        });
        if (!best) {
          return {
            valid: false,
            message: 'No automatic promotion available',
            promotion: null,
            discountCents: 0,
            discountedDepositCents: args.depositCents,
            autoApplied: false,
          };
        }
        return {
          valid: true,
          message: null,
          promotion: mapPromotion(best.promotion),
          discountCents: best.discountCents,
          discountedDepositCents: Math.max(0, args.depositCents - best.discountCents),
          autoApplied: true,
        };
      } catch (err) {
        return {
          valid: false,
          message: err instanceof Error ? err.message : 'Invalid promotion',
          promotion: null,
          discountCents: 0,
          discountedDepositCents: args.depositCents,
          autoApplied: false,
        };
      }
    },

    validateGiftCard: async (
      _: unknown,
      args: { restaurantId: string; code: string; depositCents: number },
    ) => {
      try {
        const { giftCard, discountCents } = await resolveGiftCardDiscount({
          restaurantId: args.restaurantId,
          code: args.code,
          depositCents: args.depositCents,
        });
        return {
          valid: true,
          message: null,
          giftCard: mapGiftCard(giftCard),
          discountCents,
          discountedDepositCents: Math.max(0, args.depositCents - discountCents),
        };
      } catch (err) {
        return {
          valid: false,
          message: err instanceof Error ? err.message : 'Invalid gift card',
          giftCard: null,
          discountCents: 0,
          discountedDepositCents: args.depositCents,
        };
      }
    },

    searchRestaurants: async (_: unknown, args: { input: unknown }) => {
      const input = searchRestaurantsSchema.parse(args.input);
      const filter: Record<string, unknown> = { status: 'approved' };
      const usingGeo = input.lat != null && input.lng != null;

      if (input.query) {
        // MongoDB forbids combining $text with $near / geoNear, so use regex
        // when a location filter is also applied.
        if (usingGeo) {
          const q = input.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (q) {
            const pattern = new RegExp(q, 'i');
            filter.$or = [
              { name: pattern },
              { cuisine: pattern },
              { description: pattern },
              { 'address.city': pattern },
            ];
          }
        } else {
          filter.$text = { $search: input.query };
        }
      }
      if (input.cuisine) filter.cuisine = input.cuisine;
      if (input.priceRange) filter.priceRange = input.priceRange;
      if (input.city) filter['address.city'] = new RegExp(`^${input.city}$`, 'i');

      const skip = (input.page - 1) * input.limit;
      // Featured (promoted) restaurants rank first, then by rating.
      // Geo $near queries return distance-sorted results, so keep that order there.
      // countDocuments uses aggregation, which rejects $near — use $geoWithin for counts.
      const countFilter = { ...filter };
      if (usingGeo) {
        const coordinates = [input.lng!, input.lat!];
        const maxDistanceMeters = (input.radiusKm ?? 25) * 1000;
        filter.location = {
          $near: {
            $geometry: { type: 'Point', coordinates },
            $maxDistance: maxDistanceMeters,
          },
        };
        countFilter.location = {
          $geoWithin: {
            $centerSphere: [coordinates, maxDistanceMeters / 6_378_100],
          },
        };
      }

      const query = Restaurant.find(filter).skip(skip).limit(input.limit);
      if (!usingGeo) query.sort({ featured: -1, averageRating: -1 });
      const [items, total] = await Promise.all([
        query,
        Restaurant.countDocuments(countFilter),
      ]);

      return {
        items: items.map(mapRestaurant),
        total,
        page: input.page,
        limit: input.limit,
      };
    },

    availability: async (
      _: unknown,
      args: { restaurantId: string; date: string; partySize: number },
    ) => getAvailability(args),

    myReservations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const items = await Reservation.find({ dinerId: user._id }).sort({ slotStart: -1 });
      return items.map((r) => mapReservation(r));
    },

    restaurantReservations: async (
      _: unknown,
      args: { restaurantId: string; date?: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const filter: Record<string, unknown> = { restaurantId: args.restaurantId };
      if (args.date) {
        const start = new Date(`${args.date}T00:00:00`);
        const end = new Date(`${args.date}T23:59:59`);
        filter.slotStart = { $gte: start, $lte: end };
      }
      return paginateQuery(Reservation, filter, {
        sort: { slotStart: 1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 50,
        map: mapReservation,
      });
    },

    myWaitlist: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const items = await WaitlistEntry.find({ dinerId: user._id }).sort({ createdAt: -1 });
      return items.map(mapWaitlistEntry);
    },

    restaurantWaitlist: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(
        WaitlistEntry,
        {
          restaurantId: args.restaurantId,
          status: { $in: ['waiting', 'notified'] },
        },
        {
          sort: { createdAt: 1 },
          limit: args.limit,
          offset: args.offset,
          defaultLimit: 50,
          map: mapWaitlistEntry,
        },
      );
    },

    restaurantReviews: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      // Owners see hidden reviews too; the public does not.
      let includeHidden = false;
      if (ctx.user) {
        try {
          await assertRestaurantAccess(ctx.user._id.toString(), args.restaurantId, ctx.user.role);
          includeHidden = true;
        } catch {
          includeHidden = false;
        }
      }
      const filter: Record<string, unknown> = { restaurantId: args.restaurantId };
      if (!includeHidden) filter.hidden = { $ne: true };
      return paginateQuery(Review, filter, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 50,
        map: mapReview,
      });
    },

    myLoyalty: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const items = await getLoyaltyHistory(user._id.toString());
      return items.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        points: t.points,
        description: t.description,
        createdAt: (t as any).createdAt,
      }));
    },

    myRestaurantLoyalty: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return getMyRestaurantLoyaltyBalances(user._id.toString());
    },

    myRestaurantLoyaltyBalance: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return getRestaurantLoyaltyBalance(args.restaurantId, user._id.toString());
    },

    myRestaurantLoyaltyHistory: async (
      _: unknown,
      args: { restaurantId?: string; limit?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return getRestaurantLoyaltyHistory(user._id.toString(), {
        restaurantId: args.restaurantId,
        limit: args.limit ?? undefined,
      });
    },

    myNotifications: async (
      _: unknown,
      args: { limit?: number | null },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
      const items = await Notification.find({
        userId: user._id,
        channel: 'in_app',
      })
        .sort({ createdAt: -1 })
        .limit(limit);
      return items.map((n: any) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ? JSON.stringify(n.data) : null,
        readAt: n.readAt ?? null,
        createdAt: n.createdAt,
      }));
    },

    unreadNotificationCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return Notification.countDocuments({
        userId: user._id,
        channel: 'in_app',
        readAt: null,
      });
    },

    myRestaurants: async (
      _: unknown,
      args: { search?: string; status?: string; city?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const items = await Restaurant.find(
        buildOwnerRestaurantFilter(user, args),
      ).sort({ name: 1 });
      return items.map(mapRestaurant);
    },

    myRestaurantLocationsMeta: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const baseFilter = buildOwnerRestaurantFilter(user);
      const [total, cityRows] = await Promise.all([
        Restaurant.countDocuments(baseFilter),
        Restaurant.aggregate<{ _id: string }>([
          { $match: baseFilter },
          { $group: { _id: '$address.city' } },
          { $match: { _id: { $nin: [null, ''] } } },
          { $sort: { _id: 1 } },
        ]),
      ]);
      return {
        total,
        cities: cityRows.map((row) => row._id),
      };
    },

    adminRestaurants: async (
      _: unknown,
      args: { status?: string; search?: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      const filter = buildAdminRestaurantFilter(args);
      const result = await paginateQuery(Restaurant, filter, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        map: mapRestaurant,
      });
      return { ...result, page: Math.floor(result.offset / result.limit) + 1 };
    },

    adminStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ['admin']);
      const [
        users,
        restaurants,
        reservations,
        pendingRestaurants,
        activeSubscriptions,
        mrrAgg,
        openInvoices,
      ] = await Promise.all([
        User.countDocuments(),
        Restaurant.countDocuments(),
        Reservation.countDocuments(),
        Restaurant.countDocuments({ status: 'pending' }),
        Subscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
        Subscription.aggregate([
          { $match: { status: { $in: ['active', 'past_due'] } } },
          { $group: { _id: null, mrrCents: { $sum: '$monthlyPriceCents' } } },
        ]),
        Invoice.countDocuments({ status: { $in: ['pending', 'overdue', 'upcoming'] } }),
      ]);
      return {
        users,
        restaurants,
        reservations,
        pendingRestaurants,
        mrrCents: mrrAgg[0]?.mrrCents ?? 0,
        activeSubscriptions,
        openInvoices,
      };
    },

    adminLoyaltyStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ['admin']);
      return getAdminLoyaltyStats();
    },

    adminReferralLeaders: async (
      _: unknown,
      args: { limit?: number },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      return getAdminReferralLeaders(args.limit ?? 20);
    },

    adminUsers: async (
      _: unknown,
      args: { search?: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      const filter: Record<string, unknown> = {};
      if (args.search?.trim()) {
        const regex = new RegExp(args.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
      }
      return paginateQuery(User, filter, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        maxLimit: 100,
        map: mapUser,
      });
    },

    restaurantTeam: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const restaurant = await Restaurant.findById(args.restaurantId);
      if (!restaurant) throw new Error('Restaurant not found');
      const team = await User.find({
        $or: [{ _id: restaurant.ownerId }, { restaurantIds: restaurant._id }],
      }).sort({ firstName: 1, lastName: 1 });
      return team.map(mapUser);
    },

    auditLogs: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      return paginateQuery(AuditLog, {}, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 25,
        maxLimit: 200,
        map: (l: any) => ({
          id: l._id.toString(),
          actorId: l.actorId.toString(),
          action: l.action,
          resource: l.resource,
          resourceId: l.resourceId,
          details: l.details ? JSON.stringify(l.details) : null,
          createdAt: l.createdAt,
        }),
      });
    },

    mySubscription: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const sub = await Subscription.findOne({ restaurantId: args.restaurantId });
      if (!sub) return null;
      return mapSubscription(sub);
    },

    plans: async () => getEffectivePlans(),

    annualBillingSettings: async () => getAnnualBillingSettings(),

    adminInvoices: async (
      _: unknown,
      args: { status?: string; search?: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      return listInvoices(args);
    },

    adminRevenueReport: async (
      _: unknown,
      args: { period?: string },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ['admin']);
      return getPlatformRevenueReport(args.period);
    },

    platformConfig: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ['admin']);
      const doc = await getPlatformConfig();
      return mapPlatformConfig(doc);
    },

    coverFeeSummary: async (
      _: unknown,
      args: { restaurantId: string; period?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);

      const period = args.period ?? new Date().toISOString().slice(0, 7);
      const fees = await CoverFee.find({
        restaurantId: args.restaurantId,
        billingPeriod: period,
      });

      let totalCovers = 0;
      let totalFeeCents = 0;
      let networkCovers = 0;
      let websiteCovers = 0;
      let widgetCovers = 0;
      let phoneCovers = 0;
      let walkinCovers = 0;

      for (const fee of fees) {
        totalCovers += fee.partySize;
        totalFeeCents += fee.feeCents;
        switch (fee.source) {
          case 'network': networkCovers += fee.partySize; break;
          case 'website': websiteCovers += fee.partySize; break;
          case 'widget': widgetCovers += fee.partySize; break;
          case 'phone': phoneCovers += fee.partySize; break;
          case 'walkin': walkinCovers += fee.partySize; break;
        }
      }

      return { totalCovers, totalFeeCents, networkCovers, websiteCovers, widgetCovers, phoneCovers, walkinCovers };
    },

    myRestaurantGroups: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const groups = await RestaurantGroup.find({
        $or: [{ ownerId: user._id }, { adminUserIds: user._id }],
      });
      return groups.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        ownerId: g.ownerId.toString(),
        restaurantIds: g.restaurantIds.map((id) => id.toString()),
        adminUserIds: g.adminUserIds.map((id) => id.toString()),
        settings: {
          sharedGuestProfiles: g.settings?.sharedGuestProfiles ?? true,
          centralizedReporting: g.settings?.centralizedReporting ?? true,
        },
        createdAt: (g as any).createdAt,
        updatedAt: (g as any).updatedAt,
      }));
    },

    groupAnalytics: async (
      _: unknown,
      args: { groupId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const group = await RestaurantGroup.findById(args.groupId);
      if (!group) throw new Error('Group not found');
      if (
        !group.ownerId.equals(user._id) &&
        !group.adminUserIds.some((id) => id.equals(user._id)) &&
        user.role !== 'admin'
      ) {
        throw new Error('Forbidden');
      }

      const restaurantIds = group.restaurantIds;
      const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });

      const reservations = await Reservation.find({
        restaurantId: { $in: restaurantIds },
        status: { $in: ['confirmed', 'seated', 'completed'] },
      });

      let totalReservations = 0;
      let totalCovers = 0;
      const byRestaurant = new Map<string, { count: number; covers: number }>();

      for (const rId of restaurantIds) {
        byRestaurant.set(rId.toString(), { count: 0, covers: 0 });
      }

      for (const r of reservations) {
        totalReservations++;
        totalCovers += r.partySize;
        const key = r.restaurantId.toString();
        const entry = byRestaurant.get(key);
        if (entry) {
          entry.count++;
          entry.covers += r.partySize;
        }
      }

      const totalRating = restaurants.reduce((sum, r) => sum + (r.averageRating ?? 0), 0);
      const averageRating = restaurants.length > 0 ? totalRating / restaurants.length : 0;

      const reservationsByRestaurant = restaurants.map((rest) => {
        const stats = byRestaurant.get(rest._id.toString()) ?? { count: 0, covers: 0 };
        return {
          restaurant: mapRestaurant(rest),
          reservationCount: stats.count,
          coverCount: stats.covers,
          averageRating: rest.averageRating ?? 0,
        };
      });

      let topPerformingRestaurant = null;
      let maxCount = 0;
      for (const stat of reservationsByRestaurant) {
        if (stat.reservationCount > maxCount) {
          maxCount = stat.reservationCount;
          topPerformingRestaurant = stat.restaurant;
        }
      }

      return {
        totalReservations,
        totalCovers,
        averageRating: Math.round(averageRating * 10) / 10,
        reservationsByRestaurant,
        topPerformingRestaurant,
      };
    },

    experiences: async (
      _: unknown,
      args: { restaurantId?: string; upcoming?: boolean; limit?: number; offset?: number },
    ) => {
      const filter: Record<string, unknown> = {};
      if (args.restaurantId) filter.restaurantId = args.restaurantId;
      if (args.upcoming) {
        filter.date = { $gte: new Date() };
        filter.status = { $in: ['published', 'sold_out'] };
      }
      return paginateQuery(Experience, filter, {
        sort: { date: 1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 50,
        map: mapExperience,
      });
    },

    experience: async (_: unknown, args: { id: string }) => {
      const doc = await Experience.findById(args.id);
      return doc ? mapExperience(doc) : null;
    },

    myTickets: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const items = await Ticket.find({ dinerId: user._id }).sort({ createdAt: -1 });
      return items.map((t) => mapTicket(t));
    },

    privateDiningSpaces: async (_: unknown, args: { restaurantId: string }) => {
      const items = await PrivateDiningSpace.find({
        restaurantId: args.restaurantId,
        active: true,
      });
      return items.map(mapPrivateDiningSpace);
    },

    privateDiningInquiries: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(
        PrivateDiningInquiry,
        { restaurantId: args.restaurantId },
        {
          sort: { createdAt: -1 },
          limit: args.limit,
          offset: args.offset,
          defaultLimit: 10,
          map: mapPrivateDiningInquiry,
        },
      );
    },

    myInquiries: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const items = await PrivateDiningInquiry.find({ dinerId: user._id }).sort({ createdAt: -1 });
      return items.map(mapPrivateDiningInquiry);
    },

    restaurantLoyaltyStats: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return getRestaurantLoyaltyStats(args.restaurantId);
    },

    restaurantGuests: async (
      _: unknown,
      args: {
        restaurantId: string;
        tag?: string;
        vipStatus?: string;
        search?: string;
        limit?: number;
        offset?: number;
      },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const filter: Record<string, unknown> = { restaurantId: args.restaurantId };
      if (args.tag) filter.tags = args.tag;
      if (args.vipStatus) filter.vipStatus = args.vipStatus;

      if (args.search?.trim()) {
        const regex = new RegExp(args.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const matchingUsers = await User.find({
          $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
        }).select('_id');
        filter.dinerId = { $in: matchingUsers.map((u) => u._id) };
      }

      return paginateQuery(GuestProfile, filter, {
        sort: { lastVisitDate: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        maxLimit: 200,
        map: mapGuestProfile,
      });
    },

    guestProfile: async (
      _: unknown,
      args: { restaurantId: string; dinerId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await GuestProfile.findOne({
        restaurantId: args.restaurantId,
        dinerId: args.dinerId,
      });
      return doc ? mapGuestProfile(doc) : null;
    },

    campaigns: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(Campaign, { restaurantId: args.restaurantId }, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        map: mapCampaign,
      });
    },

    campaign: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await Campaign.findById(args.id);
      if (!doc) return null;
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      return mapCampaign(doc);
    },

    restaurantSurveys: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(SurveyResponse, { restaurantId: args.restaurantId }, {
        sort: { submittedAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        maxLimit: 200,
        map: mapSurveyResponse,
      });
    },

    surveyStats: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const stats = await SurveyResponse.aggregate([
        { $match: { restaurantId: new (await import('mongoose')).default.Types.ObjectId(args.restaurantId) } },
        {
          $group: {
            _id: null,
            totalResponses: { $sum: 1 },
            avgOverall: { $avg: '$overallRating' },
            avgFood: { $avg: '$foodRating' },
            avgService: { $avg: '$serviceRating' },
            avgAmbience: { $avg: '$ambienceRating' },
            avgValue: { $avg: '$valueRating' },
            recommendCount: { $sum: { $cond: ['$wouldRecommend', 1, 0] } },
          },
        },
      ]);
      const s = stats[0];
      if (!s) {
        return { totalResponses: 0, avgOverall: 0, avgFood: 0, avgService: 0, avgAmbience: 0, avgValue: 0, recommendPercent: 0 };
      }
      return {
        totalResponses: s.totalResponses,
        avgOverall: Math.round((s.avgOverall ?? 0) * 10) / 10,
        avgFood: Math.round((s.avgFood ?? 0) * 10) / 10,
        avgService: Math.round((s.avgService ?? 0) * 10) / 10,
        avgAmbience: Math.round((s.avgAmbience ?? 0) * 10) / 10,
        avgValue: Math.round((s.avgValue ?? 0) * 10) / 10,
        recommendPercent: s.totalResponses > 0
          ? Math.round((s.recommendCount / s.totalResponses) * 100)
          : 0,
      };
    },

    surveyConfig: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      // Readable by any authenticated user: diners need the question toggles
      // to render the survey form, and the config holds nothing sensitive.
      requireAuth(ctx);
      const doc = await SurveyConfig.findOne({ restaurantId: args.restaurantId });
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        restaurantId: doc.restaurantId.toString(),
        enabled: doc.enabled,
        includeFood: doc.includeFood,
        includeService: doc.includeService,
        includeAmbience: doc.includeAmbience,
        includeValue: doc.includeValue,
        includeRecommend: doc.includeRecommend,
      };
    },

    conversations: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const mongoose = (await import('mongoose')).default;
      const latest = await Message.aggregate([
        {
          $match: {
            restaurantId: new mongoose.Types.ObjectId(args.restaurantId),
            reservationId: { $ne: null },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$reservationId',
            dinerId: { $first: '$dinerId' },
            restaurantId: { $first: '$restaurantId' },
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$senderType', 'diner'] }, { $eq: ['$readAt', null] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { 'lastMessage.createdAt': -1 } },
      ]);
      return latest.map((c) => ({
        reservationId: c._id.toString(),
        dinerId: c.dinerId.toString(),
        restaurantId: c.restaurantId.toString(),
        lastMessage: mapMessage(c.lastMessage),
        unreadCount: c.unreadCount,
      }));
    },

    conversation: async (
      _: unknown,
      args: { reservationId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await Reservation.findById(args.reservationId);
      if (!reservation) return null;

      const isDiner = reservation.dinerId.equals(user._id);
      if (!isDiner) {
        await assertRestaurantAccess(
          user._id.toString(),
          reservation.restaurantId.toString(),
          user.role,
        );
      }

      const lastMessage = await Message.findOne({ reservationId: args.reservationId }).sort({
        createdAt: -1,
      });
      const unreadSenderType = isDiner ? 'restaurant' : 'diner';
      const unreadCount = await Message.countDocuments({
        reservationId: args.reservationId,
        senderType: unreadSenderType,
        readAt: null,
      });

      return {
        reservationId: reservation._id.toString(),
        dinerId: reservation.dinerId.toString(),
        restaurantId: reservation.restaurantId.toString(),
        lastMessage: lastMessage ? mapMessage(lastMessage) : null,
        unreadCount,
      };
    },

    messages: async (
      _: unknown,
      args: { reservationId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await Reservation.findById(args.reservationId);
      if (!reservation) throw new Error('Reservation not found');

      const isDiner = reservation.dinerId.equals(user._id);
      if (!isDiner) {
        await assertRestaurantAccess(
          user._id.toString(),
          reservation.restaurantId.toString(),
          user.role,
        );
      }

      const items = await Message.find({ reservationId: args.reservationId }).sort({
        createdAt: 1,
      });
      return items.map(mapMessage);
    },

    myConversations: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const latest = await Message.aggregate([
        { $match: { dinerId: user._id, reservationId: { $ne: null } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$reservationId',
            dinerId: { $first: '$dinerId' },
            restaurantId: { $first: '$restaurantId' },
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$senderType', 'restaurant'] }, { $eq: ['$readAt', null] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { 'lastMessage.createdAt': -1 } },
      ]);
      return latest.map((c) => ({
        reservationId: c._id.toString(),
        dinerId: c.dinerId.toString(),
        restaurantId: c.restaurantId.toString(),
        lastMessage: mapMessage(c.lastMessage),
        unreadCount: c.unreadCount,
      }));
    },

    accessRules: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const rules = await AccessRule.find({ restaurantId: args.restaurantId }).sort({ createdAt: -1 });
      return rules.map(mapAccessRule);
    },

    promotions: async (
      _: unknown,
      args: { restaurantId: string; activeOnly?: boolean; limit?: number; offset?: number },
    ) => {
      const filter: Record<string, unknown> = { restaurantId: args.restaurantId };
      if (args.activeOnly) {
        filter.active = true;
        const today = new Date().toISOString().slice(0, 10);
        filter.$and = [
          { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: today } }] },
          { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: today } }] },
        ];
      }
      return paginateQuery(Promotion, filter, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 50,
        map: mapPromotion,
      });
    },

    promotionStats: async (
      _: unknown,
      args: { restaurantId: string; days?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return getPromotionStats(args.restaurantId, args.days ?? 30);
    },

    giftCards: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(GiftCard, { restaurantId: args.restaurantId }, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 50,
        map: mapGiftCard,
      });
    },

    boostCampaigns: async (
      _: unknown,
      args: { restaurantId: string; limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      return paginateQuery(BoostCampaign, { restaurantId: args.restaurantId }, {
        sort: { createdAt: -1 },
        limit: args.limit,
        offset: args.offset,
        defaultLimit: 20,
        map: mapBoostCampaign,
      });
    },

    integrations: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const items = await Integration.find({ restaurantId: args.restaurantId }).sort({ createdAt: -1 });
      return items.map(mapIntegration);
    },

    preShiftReport: async (
      _: unknown,
      args: { restaurantId: string; date: string; shiftId?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'preShift');
      return buildPreShiftReport(args.restaurantId, args.date, args.shiftId);
    },

    revenueForecast: async (
      _: unknown,
      args: { restaurantId: string; days?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'revenueForecasting');
      return buildRevenueForecast(args.restaurantId, Math.min(args.days ?? 14, 60));
    },

    customReport: async (
      _: unknown,
      args: { input: { restaurantId: string; metrics: string[]; groupBy: string; startDate: string; endDate: string } },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.input.restaurantId, user.role);
      await requireFeature(args.input.restaurantId, 'customReports');
      const groupBy = args.input.groupBy as 'day' | 'week' | 'month' | 'source' | 'status' | 'occasion';
      if (!['day', 'week', 'month', 'source', 'status', 'occasion'].includes(groupBy)) {
        throw new Error('Invalid groupBy');
      }
      return buildCustomReport({ ...args.input, groupBy });
    },

    multiLocationAnalytics: async (
      _: unknown,
      args: { period?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const restaurants = await Restaurant.find({
        $or: [{ ownerId: user._id }, { _id: { $in: user.restaurantIds } }],
      }).select('_id');
      const ids = restaurants.map((r) => r._id.toString());
      if (ids.length === 0) {
        return { totalReservations: 0, totalCovers: 0, totalRevenueCents: 0, locations: [] };
      }
      // Gate on the first restaurant with the feature; any subscribed location unlocks the rollup
      let allowed = false;
      for (const id of ids) {
        try {
          await requireFeature(id, 'multiLocationAnalytics');
          allowed = true;
          break;
        } catch {
          // keep checking
        }
      }
      if (!allowed) throw new Error('Multi-location analytics requires the Pro plan');
      return buildMultiLocationAnalytics(ids, args.period);
    },

    reservationForSurvey: async (
      _: unknown,
      args: { reservationId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await Reservation.findById(args.reservationId);
      if (!reservation || !reservation.dinerId.equals(user._id)) return null;
      return mapReservation(reservation);
    },
  },

  RestaurantGroup: {
    restaurants: async (g: { restaurantIds: string[] }) => {
      const docs = await Restaurant.find({ _id: { $in: g.restaurantIds } });
      return docs.map(mapRestaurant);
    },
  },

  Mutation: {
    register: async (_: unknown, args: { input: unknown }) => {
      const input = registerSchema.parse(args.input);
      const result = await registerWithEmail(input);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: mapUser(result.user),
      };
    },

    registerRestaurantPartner: async (_: unknown, args: { input: unknown }) => {
      const input = registerRestaurantPartnerSchema.parse(args.input);
      const result = await registerRestaurantPartner(input);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: mapUser(result.user),
        restaurant: mapRestaurant(result.restaurant),
        subscription: mapSubscription(result.subscription),
      };
    },

    login: async (_: unknown, args: { input: unknown }) => {
      const input = loginSchema.parse(args.input);
      const result = await loginWithEmail(input.email, input.password);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: mapUser(result.user),
      };
    },

    loginWithGoogle: async (_: unknown, args: { idToken: string }) => {
      const result = await loginWithGoogle(args.idToken);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: mapUser(result.user),
      };
    },

    requestPhoneOtp: async (_: unknown, args: { phone: string }) =>
      requestPhoneOtp(args.phone),

    verifyPhoneOtp: async (_: unknown, args: { input: unknown }) => {
      const input = phoneOtpVerifySchema.parse(args.input);
      const result = await verifyPhoneOtp(input);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: mapUser(result.user),
      };
    },

    refreshToken: async (_: unknown, args: { refreshToken: string }) => {
      const tokens = await refreshTokens(args.refreshToken);
      const payload = JSON.parse(
        Buffer.from(tokens.accessToken.split('.')[1]!, 'base64').toString(),
      );
      const user = await User.findById(payload.sub);
      if (!user) throw new Error('User not found');
      return { ...tokens, user: mapUser(user) };
    },

    logout: async (_: unknown, args: { refreshToken?: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return logout(user._id.toString(), args.refreshToken);
    },

    requestPasswordReset: async (_: unknown, args: { email: string }) =>
      requestPasswordReset(args.email),

    resetPassword: async (_: unknown, args: { token: string; newPassword: string }) =>
      resetPassword(args.token, args.newPassword),

    createRestaurant: async (
      _: unknown,
      args: { input: unknown; plan?: string | null },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const input = restaurantInputSchema.parse(args.input);
      const doc = await Restaurant.create({
        ...input,
        slug: slugify(input.name),
        location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
        ownerId: user._id,
        status: 'pending',
      });
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { restaurantIds: doc._id },
        role: user.role === 'diner' ? 'restaurant_owner' : user.role,
      });

      if (args.plan) {
        try {
          await createRestaurantSubscription({
            restaurantId: doc._id.toString(),
            plan: args.plan,
            customerEmail: user.email ?? undefined,
            customerName: doc.name,
            actorId: user._id.toString(),
          });
        } catch (err) {
          await Restaurant.findByIdAndDelete(doc._id);
          await User.findByIdAndUpdate(user._id, {
            $pull: { restaurantIds: doc._id },
          });
          throw err;
        }
      }

      return mapRestaurant(doc);
    },

    updateRestaurant: async (
      _: unknown,
      args: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.id, user.role);
      const input = restaurantInputSchema.parse(args.input);
      const doc = await Restaurant.findByIdAndUpdate(
        args.id,
        {
          ...input,
          location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
        },
        { new: true },
      );
      if (!doc) throw new Error('Restaurant not found');
      return mapRestaurant(doc);
    },

    setRestaurantStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const doc = await Restaurant.findByIdAndUpdate(
        args.id,
        { status: args.status },
        { new: true },
      );
      if (!doc) throw new Error('Restaurant not found');
      await logAudit({
        actorId: admin._id.toString(),
        action: 'setRestaurantStatus',
        resource: 'Restaurant',
        resourceId: args.id,
        details: { status: args.status },
      });
      return mapRestaurant(doc);
    },

    createTable: async (
      _: unknown,
      args: { restaurantId: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const input = tableInputSchema.parse(args.input);
      const doc = await Table.create({ ...input, restaurantId: args.restaurantId });
      return mapTable(doc);
    },

    updateTable: async (
      _: unknown,
      args: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const existing = await Table.findById(args.id);
      if (!existing) throw new Error('Table not found');
      await assertRestaurantAccess(
        user._id.toString(),
        existing.restaurantId.toString(),
        user.role,
      );
      const input = tableInputSchema.parse(args.input);
      Object.assign(existing, input);
      await existing.save();
      return mapTable(existing);
    },

    deleteTable: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const existing = await Table.findById(args.id);
      if (!existing) throw new Error('Table not found');
      await assertRestaurantAccess(
        user._id.toString(),
        existing.restaurantId.toString(),
        user.role,
      );
      await existing.deleteOne();
      await logAudit({
        actorId: user._id.toString(),
        action: 'deleteTable',
        resource: 'Table',
        resourceId: args.id,
        details: { restaurantId: existing.restaurantId.toString(), name: existing.name },
      });
      return true;
    },

    createShift: async (
      _: unknown,
      args: { restaurantId: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const input = shiftInputSchema.parse(args.input);
      const doc = await Shift.create({ ...input, restaurantId: args.restaurantId });
      return mapShift(doc);
    },

    updateShift: async (
      _: unknown,
      args: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const existing = await Shift.findById(args.id);
      if (!existing) throw new Error('Shift not found');
      await assertRestaurantAccess(
        user._id.toString(),
        existing.restaurantId.toString(),
        user.role,
      );
      const input = shiftInputSchema.parse(args.input);
      Object.assign(existing, input);
      await existing.save();
      return mapShift(existing);
    },

    deleteShift: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const existing = await Shift.findById(args.id);
      if (!existing) throw new Error('Shift not found');
      await assertRestaurantAccess(
        user._id.toString(),
        existing.restaurantId.toString(),
        user.role,
      );
      await existing.deleteOne();
      await logAudit({
        actorId: user._id.toString(),
        action: 'deleteShift',
        resource: 'Shift',
        resourceId: args.id,
        details: { restaurantId: existing.restaurantId.toString(), name: existing.name },
      });
      return true;
    },

    createBlackout: async (
      _: unknown,
      args: {
        restaurantId: string;
        date: string;
        reason?: string;
        allDay?: boolean;
      },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await Blackout.create({
        restaurantId: args.restaurantId,
        date: args.date,
        reason: args.reason,
        allDay: args.allDay ?? true,
      });
      return {
        id: doc._id.toString(),
        restaurantId: args.restaurantId,
        date: doc.date,
        reason: doc.reason,
        allDay: doc.allDay,
        startTime: doc.startTime,
        endTime: doc.endTime,
      };
    },

    createReservation: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const rawInput = args.input as Record<string, unknown>;
      if (rawInput.slotStart instanceof Date) {
        rawInput.slotStart = rawInput.slotStart.toISOString();
      }
      const input = reservationInputSchema.parse(rawInput);
      const result = await createReservation({
        dinerId: user._id.toString(),
        restaurantId: input.restaurantId,
        partySize: input.partySize,
        slotStart: new Date(input.slotStart),
        occasion: input.occasion,
        guestNotes: input.guestNotes,
        redeemPoints: input.redeemPoints,
        redeemRestaurantPoints: input.redeemRestaurantPoints,
        promoCode: input.promoCode,
        giftCardCode: input.giftCardCode,
        source: (rawInput as any).source,
      });
      await logAudit({
        actorId: user._id.toString(),
        action: 'createReservation',
        resource: 'Reservation',
        resourceId: result.reservation._id.toString(),
        details: { restaurantId: input.restaurantId, partySize: input.partySize },
      });
      return {
        reservation: mapReservation(result.reservation, result.clientSecret),
        clientSecret: result.clientSecret ?? null,
      };
    },

    createOwnerReservation: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const rawInput = args.input as Record<string, unknown>;
      if (rawInput.slotStart instanceof Date) {
        rawInput.slotStart = rawInput.slotStart.toISOString();
      }
      const input = ownerReservationInputSchema.parse(rawInput);
      await assertRestaurantAccess(user._id.toString(), input.restaurantId, user.role);
      if (input.source && !['phone', 'walkin'].includes(input.source)) {
        throw new Error('Owner bookings must use phone or walkin source');
      }
      const reservation = await createOwnerReservation({
        restaurantId: input.restaurantId,
        partySize: input.partySize,
        slotStart: new Date(input.slotStart),
        occasion: input.occasion,
        guestNotes: input.guestNotes,
        source: input.source,
        guest: input.guest,
        tableId: input.tableId,
        seatImmediately: input.seatImmediately,
      });
      await logAudit({
        actorId: user._id.toString(),
        action: 'createOwnerReservation',
        resource: 'Reservation',
        resourceId: reservation._id.toString(),
        details: {
          restaurantId: input.restaurantId,
          partySize: input.partySize,
          source: input.source,
        },
      });
      return mapReservation(reservation);
    },

    confirmDepositPayment: async (
      _: unknown,
      args: { paymentIntentId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await confirmDepositPayment({
        paymentIntentId: args.paymentIntentId,
        dinerId: user._id.toString(),
      });
      if (!reservation) throw new Error('Payment confirmation failed');
      return mapReservation(reservation);
    },

    updateReservation: async (
      _: unknown,
      args: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const rawInput = args.input as Record<string, unknown>;
      if (rawInput.slotStart instanceof Date) {
        rawInput.slotStart = rawInput.slotStart.toISOString();
      }
      const input = updateReservationInputSchema.parse(rawInput);
      const reservation = await updateReservationDetails(args.id, user._id.toString(), {
        partySize: input.partySize,
        slotStart: input.slotStart ? new Date(input.slotStart) : undefined,
        occasion: input.occasion,
        guestNotes: input.guestNotes,
        tableId: input.tableId,
      });
      await logAudit({
        actorId: user._id.toString(),
        action: 'updateReservation',
        resource: 'Reservation',
        resourceId: args.id,
        details: input,
      });
      return mapReservation(reservation);
    },

    updateReservationStatus: async (
      _: unknown,
      args: { id: string; status: string; reason?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await updateReservationStatus(
        args.id,
        args.status,
        user._id.toString(),
        args.reason,
      );
      await logAudit({
        actorId: user._id.toString(),
        action: 'updateReservationStatus',
        resource: 'Reservation',
        resourceId: args.id,
        details: { status: args.status, reason: args.reason },
      });
      return mapReservation(reservation);
    },

    deleteReservation: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      await deleteReservation(args.id, user._id.toString());
      await logAudit({
        actorId: user._id.toString(),
        action: 'deleteReservation',
        resource: 'Reservation',
        resourceId: args.id,
      });
      return true;
    },

    joinWaitlist: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      if (!(await isFeatureEnabled('waitlist'))) {
        throw new Error('Waitlist is temporarily unavailable');
      }
      const input = waitlistInputSchema.parse(args.input);
      const doc = await WaitlistEntry.create({
        ...input,
        dinerId: user._id,
        source: 'online',
        status: 'waiting',
      });
      return mapWaitlistEntry(doc);
    },

    cancelWaitlist: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const entry = await WaitlistEntry.findById(args.id);
      if (!entry || !entry.dinerId?.equals(user._id)) throw new Error('Not found');
      entry.status = 'cancelled';
      await entry.save();
      return true;
    },

    createReview: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      if (!(await isFeatureEnabled('reviews'))) {
        throw new Error('Reviews are temporarily unavailable');
      }
      const input = reviewInputSchema.parse(args.input);
      const reservation = await Reservation.findById(input.reservationId);
      if (!reservation || !reservation.dinerId.equals(user._id)) {
        throw new Error('Reservation not found');
      }
      if (reservation.status !== 'completed') {
        throw new Error('Can only review completed visits');
      }
      const existing = await Review.findOne({ reservationId: reservation._id });
      if (existing) throw new Error('Already reviewed');

      const review: any = await Review.create({
        restaurantId: reservation.restaurantId,
        dinerId: user._id,
        reservationId: reservation._id,
        rating: input.rating,
        comment: input.comment ?? '',
      });

      const stats = await Review.aggregate([
        { $match: { restaurantId: reservation.restaurantId } },
        {
          $group: {
            _id: '$restaurantId',
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      if (stats[0]) {
        await Restaurant.findByIdAndUpdate(reservation.restaurantId, {
          averageRating: Math.round(stats[0].averageRating * 10) / 10,
          reviewCount: stats[0].reviewCount,
        });
      }

      await awardReviewPoints(user._id.toString(), reservation._id.toString());

      return mapReview(review);
    },

    upsertMenu: async (
      _: unknown,
      args: { restaurantId: string; input: { sections: any[] } },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const menu = await Menu.findOneAndUpdate(
        { restaurantId: args.restaurantId },
        { sections: args.input.sections },
        { upsert: true, new: true },
      );
      return {
        id: menu!._id.toString(),
        restaurantId: args.restaurantId,
        sections: menu!.sections.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          items: s.items.map((i: any) => ({
            id: i._id.toString(),
            name: i.name,
            description: i.description,
            priceCents: i.priceCents,
            photoUrl: i.photoUrl,
            dietary: i.dietary ?? [],
            available: i.available,
          })),
        })),
      };
    },

    createUploadUrl: async (
      _: unknown,
      args: { filename: string; contentType: string },
      ctx: GraphQLContext,
    ) => {
      requireAuth(ctx);
      const key = `uploads/${Date.now()}-${args.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      return createUploadUrl({ key, contentType: args.contentType });
    },

    setUserRole: async (
      _: unknown,
      args: { userId: string; role: string },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const validRoles = ['diner', 'restaurant_owner', 'staff', 'admin'];
      if (!validRoles.includes(args.role)) throw new Error('Invalid role');
      const target = await User.findByIdAndUpdate(
        args.userId,
        { role: args.role },
        { new: true },
      );
      if (!target) throw new Error('User not found');
      await logAudit({
        actorId: admin._id.toString(),
        action: 'setUserRole',
        resource: 'User',
        resourceId: args.userId,
        details: { newRole: args.role },
      });
      return mapUser(target);
    },

    adminSendPasswordReset: async (
      _: unknown,
      args: { userId: string; sendEmail?: boolean },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const result = await adminCreatePasswordReset({
        userId: args.userId,
        sendEmail: args.sendEmail,
      });
      await logAudit({
        actorId: admin._id.toString(),
        action: 'adminSendPasswordReset',
        resource: 'User',
        resourceId: args.userId,
        details: { emailed: result.emailed, email: result.email },
      });
      return result;
    },

    generateInvoices: async (
      _: unknown,
      args: { period: string },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const result = await generateInvoicesForPeriod(args.period);
      await logAudit({
        actorId: admin._id.toString(),
        action: 'generateInvoices',
        resource: 'Invoice',
        details: result,
      });
      return result;
    },

    setInvoiceStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const invoice = await setInvoiceStatus(
        args.id,
        args.status as 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue',
      );
      await logAudit({
        actorId: admin._id.toString(),
        action: 'setInvoiceStatus',
        resource: 'Invoice',
        resourceId: args.id,
        details: { status: args.status },
      });
      return invoice;
    },

    setInvoiceStatuses: async (
      _: unknown,
      args: { ids: string[]; status: string },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const result = await setInvoiceStatuses(
        args.ids,
        args.status as 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue',
      );
      await logAudit({
        actorId: admin._id.toString(),
        action: 'setInvoiceStatuses',
        resource: 'Invoice',
        details: { status: args.status, ids: args.ids, updated: result.updated },
      });
      return result;
    },

    updatePlatformConfig: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const doc = await getPlatformConfig();
      const allowed = [
        'supportEmail',
        'supportPhone',
        'defaultSignupRole',
        'defaultPartnerRole',
        'defaultStaffRole',
        'maintenanceMode',
        'allowPublicRegistration',
        'allowPartnerRegistration',
        'requireAdminDelete2FA',
        'invoicePrefix',
        'currency',
      ] as const;
      for (const key of allowed) {
        if (args.input[key] !== undefined) {
          (doc as any)[key] = args.input[key];
        }
      }
      if (args.input.featureFlags && typeof args.input.featureFlags === 'object') {
        await applyPlatformConfigFeatureFlags(
          doc,
          args.input.featureFlags as Record<string, boolean | undefined>,
        );
      }
      if (args.input.annualBilling && typeof args.input.annualBilling === 'object') {
        const current = mapAnnualBillingSettings(doc);
        const next = normalizeAnnualBillingSettings({
          ...current,
          ...(args.input.annualBilling as Partial<AnnualBillingSettings>),
        });
        (doc as any).annualBilling = next;
        doc.markModified('annualBilling');
      }
      await doc.save();
      await logAudit({
        actorId: admin._id.toString(),
        action: 'updatePlatformConfig',
        resource: 'PlatformConfig',
        resourceId: doc._id.toString(),
        details: args.input,
      });
      return mapPlatformConfig(doc);
    },

    updatePlanPackage: async (
      _: unknown,
      args: {
        input: {
          key: string;
          name?: string;
          description?: string | null;
          monthlyPriceCents?: number;
          originalMonthlyPriceCents?: number | null;
          discountType?: string;
          discountPercent?: number | null;
          discountAmountCents?: number | null;
          annualFreeMonths?: number | null;
          networkCoverFeeCents?: number;
          websiteCoverFeeCents?: number;
          trialDays?: number;
          visibleOnPricing?: boolean;
          features?: Record<string, boolean>;
        };
      },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const key = args.input.key.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
        throw new Error('Invalid plan key');
      }
      const doc = await getPlatformConfig();
      const overrides = getPlanOverridesMap(doc);
      const existing = overrides[key] ?? {};
      if (!BUILTIN_PLAN_KEYS.has(key) && !overrides[key]) {
        throw new Error('Plan not found. Create it first.');
      }
      const next = {
        ...existing,
        ...(args.input.name !== undefined ? { name: args.input.name } : {}),
        ...(args.input.description !== undefined ? { description: args.input.description } : {}),
        ...(args.input.monthlyPriceCents !== undefined
          ? { monthlyPriceCents: args.input.monthlyPriceCents }
          : {}),
        ...(args.input.discountType !== undefined ||
        args.input.discountPercent !== undefined ||
        args.input.discountAmountCents !== undefined ||
        args.input.annualFreeMonths !== undefined ||
        args.input.originalMonthlyPriceCents !== undefined
          ? pickDiscountOverrides({
              discountType: args.input.discountType,
              discountPercent: args.input.discountPercent,
              discountAmountCents: args.input.discountAmountCents,
              annualFreeMonths: args.input.annualFreeMonths,
              originalMonthlyPriceCents: args.input.originalMonthlyPriceCents,
            })
          : {}),
        ...(args.input.networkCoverFeeCents !== undefined
          ? { networkCoverFeeCents: args.input.networkCoverFeeCents }
          : {}),
        ...(args.input.websiteCoverFeeCents !== undefined
          ? { websiteCoverFeeCents: args.input.websiteCoverFeeCents }
          : {}),
        ...(args.input.trialDays !== undefined ? { trialDays: args.input.trialDays } : {}),
        ...(args.input.visibleOnPricing !== undefined
          ? { visibleOnPricing: args.input.visibleOnPricing }
          : {}),
        ...(args.input.features !== undefined
          ? {
              features: {
                ...(existing.features instanceof Map
                  ? Object.fromEntries(existing.features)
                  : existing.features ?? {}),
                ...args.input.features,
              },
            }
          : {}),
      };
      if (!(doc as any).planOverrides) (doc as any).planOverrides = new Map();
      if ((doc as any).planOverrides instanceof Map) {
        (doc as any).planOverrides.set(key, next);
      } else {
        (doc.planOverrides as any)[key] = next;
      }
      doc.markModified('planOverrides');
      await doc.save();
      await logAudit({
        actorId: admin._id.toString(),
        action: 'updatePlanPackage',
        resource: 'PlatformConfig',
        details: { plan: key },
      });
      const plans = await getEffectivePlans();
      const plan = plans.find((p) => p.key === key);
      if (!plan) throw new Error('Plan not found after update');
      return plan;
    },

    createPlanPackage: async (
      _: unknown,
      args: {
        input: {
          name: string;
          description?: string | null;
          monthlyPriceCents: number;
          originalMonthlyPriceCents?: number | null;
          discountType?: string;
          discountPercent?: number | null;
          discountAmountCents?: number | null;
          annualFreeMonths?: number | null;
          networkCoverFeeCents?: number;
          websiteCoverFeeCents?: number;
          trialDays?: number;
          visibleOnPricing?: boolean;
          features?: Record<string, boolean>;
        };
      },
      ctx: GraphQLContext,
    ) => {
      const admin = requireRole(ctx, ['admin']);
      const name = args.input.name.trim();
      if (!name) throw new Error('Package name is required');

      const doc = await getPlatformConfig();
      const overrides = getPlanOverridesMap(doc);
      const existingKeys = new Set([...BUILTIN_PLAN_KEYS, ...Object.keys(overrides)]);
      const key = uniquePlanKey(name, existingKeys);

      const next = {
        name,
        description: args.input.description ?? null,
        monthlyPriceCents: args.input.monthlyPriceCents,
        ...pickDiscountOverrides({
          discountType: args.input.discountType,
          discountPercent: args.input.discountPercent,
          discountAmountCents: args.input.discountAmountCents,
          annualFreeMonths: args.input.annualFreeMonths,
          originalMonthlyPriceCents: args.input.originalMonthlyPriceCents,
        }),
        networkCoverFeeCents: args.input.networkCoverFeeCents ?? 0,
        websiteCoverFeeCents: args.input.websiteCoverFeeCents ?? 0,
        trialDays: args.input.trialDays ?? 0,
        visibleOnPricing: args.input.visibleOnPricing !== false,
        features: args.input.features ?? {},
      };

      if (!(doc as any).planOverrides) (doc as any).planOverrides = new Map();
      if ((doc as any).planOverrides instanceof Map) {
        (doc as any).planOverrides.set(key, next);
      } else {
        (doc.planOverrides as any)[key] = next;
      }
      doc.markModified('planOverrides');
      await doc.save();
      await logAudit({
        actorId: admin._id.toString(),
        action: 'createPlanPackage',
        resource: 'PlatformConfig',
        details: { plan: key },
      });
      const plans = await getEffectivePlans();
      const plan = plans.find((p) => p.key === key);
      if (!plan) throw new Error('Plan not found after create');
      return plan;
    },

    deletePlanPackage: async (_: unknown, args: { key: string }, ctx: GraphQLContext) => {
      const admin = requireRole(ctx, ['admin']);
      const key = args.key.trim().toLowerCase();
      if (BUILTIN_PLAN_KEYS.has(key)) {
        throw new Error('Built-in packages cannot be deleted');
      }
      const doc = await getPlatformConfig();
      const overrides = getPlanOverridesMap(doc);
      if (!overrides[key]) throw new Error('Plan not found');

      if ((doc as any).planOverrides instanceof Map) {
        (doc as any).planOverrides.delete(key);
      } else {
        delete (doc.planOverrides as any)[key];
      }
      doc.markModified('planOverrides');
      await doc.save();
      await logAudit({
        actorId: admin._id.toString(),
        action: 'deletePlanPackage',
        resource: 'PlatformConfig',
        details: { plan: key },
      });
      return true;
    },

    createSubscription: async (
      _: unknown,
      args: { restaurantId: string; plan: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);

      const planDef = await getEffectivePlan(args.plan);
      if (!planDef) throw new Error(`Invalid plan: ${args.plan}`);

      const restaurant = await Restaurant.findById(args.restaurantId);
      if (!restaurant) throw new Error('Restaurant not found');

      const sub = await createRestaurantSubscription({
        restaurantId: args.restaurantId,
        plan: args.plan,
        customerEmail: user.email ?? undefined,
        customerName: restaurant.name,
        actorId: user._id.toString(),
      });

      return mapSubscription(sub);
    },

    cancelSubscription: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);

      const sub = await Subscription.findOne({ restaurantId: args.restaurantId });
      if (!sub) throw new Error('No subscription found');
      if (sub.status === 'cancelled') throw new Error('Already cancelled');

      if (sub.stripeSubscriptionId) {
        await cancelStripeSubscription(sub.stripeSubscriptionId);
      }

      sub.status = 'cancelled';
      sub.cancelledAt = new Date();
      await sub.save();

      await logAudit({
        actorId: user._id.toString(),
        action: 'cancelSubscription',
        resource: 'Subscription',
        resourceId: sub._id.toString(),
        details: { restaurantId: args.restaurantId },
      });

      return mapSubscription(sub);
    },

    changePlan: async (
      _: unknown,
      args: { restaurantId: string; plan: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);

      const planDef = await getEffectivePlan(args.plan);
      if (!planDef) throw new Error(`Invalid plan: ${args.plan}`);
      const planKey = planDef.key;

      const sub = await Subscription.findOne({ restaurantId: args.restaurantId });
      if (!sub) throw new Error('No subscription found');
      if (sub.status === 'cancelled') throw new Error('Cannot change a cancelled subscription');

      if (sub.stripeSubscriptionId) {
        await updateStripeSubscription(sub.stripeSubscriptionId, planDef.monthlyPriceCents);
      }

      sub.plan = planKey;
      sub.monthlyPriceCents = planDef.monthlyPriceCents;
      sub.networkCoverFeeCents = planDef.networkCoverFeeCents;
      sub.websiteCoverFeeCents = planDef.websiteCoverFeeCents;
      sub.features = { ...planDef.features } as any;
      await sub.save();

      await logAudit({
        actorId: user._id.toString(),
        action: 'changePlan',
        resource: 'Subscription',
        resourceId: sub._id.toString(),
        details: { plan: planKey, restaurantId: args.restaurantId },
      });

      return mapSubscription(sub);
    },

    registerPushToken: async (
      _: unknown,
      args: { token: string; platform: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await User.findByIdAndUpdate(user._id, {
        $pull: { pushTokens: { token: args.token } },
      });
      await User.findByIdAndUpdate(user._id, {
        $push: { pushTokens: { token: args.token, platform: args.platform } },
      });
      return true;
    },

    linkTelegram: async (_: unknown, args: { chatId: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const chatId = args.chatId.trim();
      const { verifyTelegramChat } = await import('../services/telegram.js');
      await verifyTelegramChat(chatId);
      await User.findByIdAndUpdate(user._id, { telegramChatId: chatId });
      return true;
    },

    markNotificationsRead: async (
      _: unknown,
      args: { ids?: string[] | null },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const filter: Record<string, unknown> = {
        userId: user._id,
        channel: 'in_app',
        readAt: null,
      };
      if (args.ids?.length) filter._id = { $in: args.ids };
      await Notification.updateMany(filter, { $set: { readAt: new Date() } });
      return true;
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      await Notification.updateMany(
        { userId: user._id, channel: 'in_app', readAt: null },
        { $set: { readAt: new Date() } },
      );
      return true;
    },

    updateNotificationPreferences: async (
      _: unknown,
      args: {
        userId?: string | null;
        restaurantId?: string | null;
        input: Record<
          string,
          | {
              sms?: boolean | null;
              email?: boolean | null;
              webPush?: boolean | null;
              platform?: boolean | null;
            }
          | null
          | undefined
        >;
      },
      ctx: GraphQLContext,
    ) => {
      const actor = requireAuth(ctx);
      const input = notificationPreferencesSchema.parse(args.input);
      const targetId = args.userId ?? actor._id.toString();
      const isSelf = targetId === actor._id.toString();

      if (!isSelf) {
        if (!args.restaurantId) throw new Error('restaurantId is required to update another user');
        await assertRestaurantAccess(actor._id.toString(), args.restaurantId, actor.role);
        if (actor.role !== 'admin' && actor.role !== 'restaurant_owner') {
          throw new Error('Only owners can update team notification preferences');
        }
        const restaurant = await Restaurant.findById(args.restaurantId);
        if (!restaurant) throw new Error('Restaurant not found');
        const target = await User.findById(targetId);
        if (!target) throw new Error('User not found');
        const onTeam =
          restaurant.ownerId.equals(targetId) ||
          target.restaurantIds?.some((id) => id.equals(args.restaurantId!));
        if (!onTeam) throw new Error('User is not on this restaurant team');
      }

      const $set: Record<string, boolean> = {};
      for (const [eventKey, channels] of Object.entries(input)) {
        if (!channels || typeof channels !== 'object') continue;
        for (const [channelKey, value] of Object.entries(channels)) {
          if (typeof value === 'boolean') {
            $set[`notificationPreferences.${eventKey}.${channelKey}`] = value;
          }
        }
      }
      if (Object.keys($set).length === 0) throw new Error('No preferences to update');

      const updated = await User.findByIdAndUpdate(targetId, { $set }, { new: true });
      if (!updated) throw new Error('User not found');
      return mapUser(updated);
    },

    createExperience: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'ticketedEvents');
      const doc = await Experience.create({ ...args.input, restaurantId: args.restaurantId });
      return mapExperience(doc);
    },

    updateExperience: async (
      _: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const existing = await Experience.findById(args.id);
      if (!existing) throw new Error('Experience not found');
      await assertRestaurantAccess(user._id.toString(), existing.restaurantId.toString(), user.role);
      Object.assign(existing, args.input);
      await existing.save();
      return mapExperience(existing);
    },

    publishExperience: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const exp = await Experience.findById(args.id);
      if (!exp) throw new Error('Experience not found');
      await assertRestaurantAccess(user._id.toString(), exp.restaurantId.toString(), user.role);
      exp.status = exp.status === 'published' ? 'draft' : 'published';
      await exp.save();
      return mapExperience(exp);
    },

    purchaseTicket: async (
      _: unknown,
      args: { experienceId: string; quantity: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const exp = await Experience.findById(args.experienceId);
      if (!exp) throw new Error('Experience not found');
      if (exp.status !== 'published') throw new Error('Experience is not available for purchase');

      const available = exp.maxGuests - (exp.ticketsSold ?? 0);
      if (available < args.quantity) throw new Error('Not enough tickets available');

      const serviceFeeMultiplier = 1.02;
      const totalPriceCents = Math.round(exp.ticketPriceCents * args.quantity * serviceFeeMultiplier);

      const intent = await createDepositIntent({
        amountCents: totalPriceCents,
        metadata: {
          type: 'ticket',
          experienceId: args.experienceId,
          dinerId: user._id.toString(),
          quantity: String(args.quantity),
        },
      });

      const ticket = await Ticket.create({
        experienceId: args.experienceId,
        dinerId: user._id,
        quantity: args.quantity,
        totalPriceCents,
        stripePaymentIntentId: intent.id,
        status: 'pending',
      });

      if (intent.isStub) {
        ticket.status = 'confirmed';
        ticket.confirmationCode = `TKT-${Date.now().toString(36).toUpperCase()}`;
        await ticket.save();
        await Experience.findByIdAndUpdate(args.experienceId, {
          $inc: { ticketsSold: args.quantity },
        });
        const updated = await Experience.findById(args.experienceId);
        if (updated && updated.ticketsSold >= updated.maxGuests) {
          updated.status = 'sold_out';
          await updated.save();
        }
      }

      return mapTicket(ticket, intent.client_secret);
    },

    confirmTicketPayment: async (
      _: unknown,
      args: { paymentIntentId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const ticket = await Ticket.findOne({
        stripePaymentIntentId: args.paymentIntentId,
        dinerId: user._id,
      });
      if (!ticket) throw new Error('Ticket not found');
      if (ticket.status !== 'pending') return mapTicket(ticket);

      ticket.status = 'confirmed';
      ticket.confirmationCode = `TKT-${Date.now().toString(36).toUpperCase()}`;
      await ticket.save();

      await Experience.findByIdAndUpdate(ticket.experienceId, {
        $inc: { ticketsSold: ticket.quantity },
      });
      const exp = await Experience.findById(ticket.experienceId);
      if (exp && exp.ticketsSold >= exp.maxGuests) {
        exp.status = 'sold_out';
        await exp.save();
      }

      return mapTicket(ticket);
    },

    cancelTicket: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const ticket = await Ticket.findById(args.id);
      if (!ticket || !ticket.dinerId.equals(user._id)) throw new Error('Ticket not found');
      if (ticket.status !== 'confirmed' && ticket.status !== 'pending') {
        throw new Error('Ticket cannot be cancelled');
      }

      const wasConfirmed = ticket.status === 'confirmed';
      ticket.status = 'cancelled';
      await ticket.save();

      if (wasConfirmed) {
        await Experience.findByIdAndUpdate(ticket.experienceId, {
          $inc: { ticketsSold: -ticket.quantity },
        });
      }

      return mapTicket(ticket);
    },

    createPrivateDiningSpace: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await PrivateDiningSpace.create({ ...args.input, restaurantId: args.restaurantId });
      return mapPrivateDiningSpace(doc);
    },

    updatePrivateDiningSpace: async (
      _: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const existing = await PrivateDiningSpace.findById(args.id);
      if (!existing) throw new Error('Space not found');
      await assertRestaurantAccess(user._id.toString(), existing.restaurantId.toString(), user.role);
      Object.assign(existing, args.input);
      await existing.save();
      return mapPrivateDiningSpace(existing);
    },

    submitPrivateDiningInquiry: async (
      _: unknown,
      args: { input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await PrivateDiningInquiry.create({
        ...args.input,
        dinerId: user._id,
        status: 'pending',
      });
      return mapPrivateDiningInquiry(doc);
    },

    respondToInquiry: async (
      _: unknown,
      args: { id: string; status: string; response?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const inquiry = await PrivateDiningInquiry.findById(args.id);
      if (!inquiry) throw new Error('Inquiry not found');
      await assertRestaurantAccess(user._id.toString(), inquiry.restaurantId.toString(), user.role);
      inquiry.status = args.status as any;
      if (args.response) inquiry.restaurantResponse = args.response;
      await inquiry.save();
      return mapPrivateDiningInquiry(inquiry);
    },

    // ---- Guest CRM ----

    updateGuestProfile: async (
      _: unknown,
      args: { restaurantId: string; dinerId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const update: Record<string, unknown> = { ...args.input };
      if (typeof update.customFields === 'string') {
        try {
          update.customFields = JSON.parse(update.customFields as string);
        } catch {
          delete update.customFields;
        }
      }
      const doc = await GuestProfile.findOneAndUpdate(
        { restaurantId: args.restaurantId, dinerId: args.dinerId },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return mapGuestProfile(doc);
    },

    addGuestTag: async (
      _: unknown,
      args: { restaurantId: string; dinerId: string; tag: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await GuestProfile.findOneAndUpdate(
        { restaurantId: args.restaurantId, dinerId: args.dinerId },
        { $addToSet: { tags: args.tag } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return mapGuestProfile(doc);
    },

    removeGuestTag: async (
      _: unknown,
      args: { restaurantId: string; dinerId: string; tag: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await GuestProfile.findOneAndUpdate(
        { restaurantId: args.restaurantId, dinerId: args.dinerId },
        { $pull: { tags: args.tag } },
        { new: true },
      );
      if (!doc) throw new Error('Guest profile not found');
      return mapGuestProfile(doc);
    },

    // ---- Email campaigns ----

    createCampaign: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'emailCampaigns');
      const doc = await Campaign.create({
        ...args.input,
        restaurantId: args.restaurantId,
        status: args.input.scheduledAt ? 'scheduled' : 'draft',
      });
      if (args.input.scheduledAt) {
        await scheduleCampaign(doc._id.toString(), new Date(args.input.scheduledAt));
      }
      return mapCampaign(doc);
    },

    updateCampaign: async (
      _: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await Campaign.findById(args.id);
      if (!doc) throw new Error('Campaign not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      if (doc.status === 'sent') throw new Error('Cannot edit a sent campaign');
      Object.assign(doc, args.input);
      if (args.input.scheduledAt) {
        doc.status = 'scheduled';
        await scheduleCampaign(doc._id.toString(), new Date(args.input.scheduledAt));
      }
      await doc.save();
      return mapCampaign(doc);
    },

    deleteCampaign: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await Campaign.findById(args.id);
      if (!doc) throw new Error('Campaign not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      if (doc.status === 'sent') throw new Error('Cannot delete a sent campaign');
      doc.status = 'cancelled';
      await doc.save();
      return true;
    },

    sendCampaign: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await Campaign.findById(args.id);
      if (!doc) throw new Error('Campaign not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      await requireFeature(doc.restaurantId.toString(), 'emailCampaigns');
      const sent = await executeCampaign(args.id);
      return mapCampaign(sent);
    },

    // ---- Surveys ----

    updateSurveyConfig: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'surveys');
      const doc = await SurveyConfig.findOneAndUpdate(
        { restaurantId: args.restaurantId },
        { $set: args.input },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return {
        id: doc._id.toString(),
        restaurantId: doc.restaurantId.toString(),
        enabled: doc.enabled,
        includeFood: doc.includeFood,
        includeService: doc.includeService,
        includeAmbience: doc.includeAmbience,
        includeValue: doc.includeValue,
        includeRecommend: doc.includeRecommend,
      };
    },

    submitSurvey: async (_: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const reservation = await Reservation.findById(args.input.reservationId);
      if (!reservation || !reservation.dinerId.equals(user._id)) {
        throw new Error('Reservation not found');
      }
      if (reservation.status !== 'completed') {
        throw new Error('Surveys are available after a completed visit');
      }
      const existing = await SurveyResponse.findOne({ reservationId: reservation._id });
      if (existing) throw new Error('Survey already submitted');

      const doc = await SurveyResponse.create({
        restaurantId: reservation.restaurantId,
        reservationId: reservation._id,
        dinerId: user._id,
        overallRating: args.input.overallRating,
        foodRating: args.input.foodRating,
        serviceRating: args.input.serviceRating,
        ambienceRating: args.input.ambienceRating,
        valueRating: args.input.valueRating,
        wouldRecommend: args.input.wouldRecommend,
        feedback: args.input.feedback,
        submittedAt: new Date(),
      });
      return mapSurveyResponse(doc);
    },

    // ---- Restaurant groups ----

    createRestaurantGroup: async (
      _: unknown,
      args: { name: string; restaurantIds: string[] },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      for (const id of args.restaurantIds) {
        await assertRestaurantAccess(user._id.toString(), id, user.role);
      }
      const doc = await RestaurantGroup.create({
        name: args.name,
        ownerId: user._id,
        restaurantIds: args.restaurantIds,
        adminUserIds: [],
      });
      return {
        id: doc._id.toString(),
        name: doc.name,
        ownerId: doc.ownerId.toString(),
        restaurantIds: doc.restaurantIds.map((id) => id.toString()),
        adminUserIds: [],
        settings: {
          sharedGuestProfiles: doc.settings?.sharedGuestProfiles ?? true,
          centralizedReporting: doc.settings?.centralizedReporting ?? true,
        },
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    },

    addRestaurantToGroup: async (
      _: unknown,
      args: { groupId: string; restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const group = await RestaurantGroup.findById(args.groupId);
      if (!group || (!group.ownerId.equals(user._id) && user.role !== 'admin')) {
        throw new Error('Group not found');
      }
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await RestaurantGroup.findByIdAndUpdate(
        args.groupId,
        { $addToSet: { restaurantIds: args.restaurantId } },
        { new: true },
      );
      return {
        id: doc!._id.toString(),
        name: doc!.name,
        ownerId: doc!.ownerId.toString(),
        restaurantIds: doc!.restaurantIds.map((id) => id.toString()),
        adminUserIds: doc!.adminUserIds.map((id) => id.toString()),
        settings: {
          sharedGuestProfiles: doc!.settings?.sharedGuestProfiles ?? true,
          centralizedReporting: doc!.settings?.centralizedReporting ?? true,
        },
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    },

    removeRestaurantFromGroup: async (
      _: unknown,
      args: { groupId: string; restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const group = await RestaurantGroup.findById(args.groupId);
      if (!group || (!group.ownerId.equals(user._id) && user.role !== 'admin')) {
        throw new Error('Group not found');
      }
      const doc = await RestaurantGroup.findByIdAndUpdate(
        args.groupId,
        { $pull: { restaurantIds: args.restaurantId } },
        { new: true },
      );
      return {
        id: doc!._id.toString(),
        name: doc!.name,
        ownerId: doc!.ownerId.toString(),
        restaurantIds: doc!.restaurantIds.map((id) => id.toString()),
        adminUserIds: doc!.adminUserIds.map((id) => id.toString()),
        settings: {
          sharedGuestProfiles: doc!.settings?.sharedGuestProfiles ?? true,
          centralizedReporting: doc!.settings?.centralizedReporting ?? true,
        },
        createdAt: (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt,
      };
    },

    // ---- POS ----

    generatePosApiKey: async (
      _: unknown,
      args: { restaurantId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'posIntegration');
      const apiKey = `pos_${crypto.randomBytes(24).toString('hex')}`;
      await Restaurant.findByIdAndUpdate(args.restaurantId, {
        posApiKey: apiKey,
        posEnabled: true,
      });
      await logAudit({
        actorId: user._id.toString(),
        action: 'generatePosApiKey',
        resource: 'Restaurant',
        resourceId: args.restaurantId,
      });
      return apiKey;
    },

    // ---- Reviews ----

    replyToReview: async (
      _: unknown,
      args: { reviewId: string; reply: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const review = await Review.findById(args.reviewId);
      if (!review) throw new Error('Review not found');
      await assertRestaurantAccess(user._id.toString(), review.restaurantId.toString(), user.role);
      review.ownerReply = args.reply;
      review.ownerRepliedAt = new Date();
      await review.save();
      await notifyUser(review.dinerId.toString(), {
        type: 'review_reply',
        title: 'The restaurant replied to your review',
        body: args.reply.slice(0, 200),
        data: { reviewId: args.reviewId },
      });
      return mapReview(review);
    },

    setReviewHidden: async (
      _: unknown,
      args: { reviewId: string; hidden: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const review = await Review.findById(args.reviewId);
      if (!review) throw new Error('Review not found');
      await assertRestaurantAccess(user._id.toString(), review.restaurantId.toString(), user.role);
      review.hidden = args.hidden;
      await review.save();
      return mapReview(review);
    },

    // ---- Two-way messaging ----

    sendMessage: async (
      _: unknown,
      args: { reservationId: string; body: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      if (!args.body.trim()) throw new Error('Message cannot be empty');

      const reservation = await Reservation.findById(args.reservationId);
      if (!reservation) throw new Error('Reservation not found');

      const restaurantId = reservation.restaurantId.toString();
      const dinerId = reservation.dinerId.toString();

      let senderType: 'restaurant' | 'diner' = 'diner';
      if (reservation.dinerId.equals(user._id)) {
        senderType = 'diner';
      } else {
        await assertRestaurantAccess(user._id.toString(), restaurantId, user.role);
        senderType = 'restaurant';
      }

      await requireFeature(restaurantId, 'twoWayMessaging');

      const doc = await Message.create({
        restaurantId,
        dinerId,
        reservationId: args.reservationId,
        senderType,
        senderId: user._id,
        body: args.body.trim(),
      });

      if (senderType === 'restaurant') {
        const restaurant = await Restaurant.findById(restaurantId);
        await notifyUser(
          dinerId,
          {
            type: 'new_message',
            title: `Message from ${restaurant?.name ?? 'the restaurant'}`,
            body: args.body.slice(0, 200),
            data: { restaurantId, reservationId: args.reservationId },
          },
          { smsRestaurantId: restaurantId },
        );
      } else {
        await notifyRestaurantStaff(restaurantId, {
          type: 'new_message',
          title: 'New guest message',
          body: args.body.slice(0, 200),
          data: { restaurantId, dinerId, reservationId: args.reservationId },
        });
      }

      return mapMessage(doc);
    },

    markConversationRead: async (
      _: unknown,
      args: { reservationId: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const reservation = await Reservation.findById(args.reservationId);
      if (!reservation) throw new Error('Reservation not found');

      let readSenderType = 'restaurant';
      if (reservation.dinerId.equals(user._id)) {
        readSenderType = 'restaurant';
      } else {
        await assertRestaurantAccess(
          user._id.toString(),
          reservation.restaurantId.toString(),
          user.role,
        );
        readSenderType = 'diner';
      }

      await Message.updateMany(
        {
          reservationId: args.reservationId,
          senderType: readSenderType,
          readAt: null,
        },
        { $set: { readAt: new Date() } },
      );
      return true;
    },

    // ---- Access rules ----

    createAccessRule: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'accessRules');
      const doc = await AccessRule.create({ ...args.input, restaurantId: args.restaurantId });
      return mapAccessRule(doc);
    },

    updateAccessRule: async (
      _: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await AccessRule.findById(args.id);
      if (!doc) throw new Error('Access rule not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      Object.assign(doc, args.input);
      await doc.save();
      return mapAccessRule(doc);
    },

    deleteAccessRule: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await AccessRule.findById(args.id);
      if (!doc) throw new Error('Access rule not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      await doc.deleteOne();
      return true;
    },

    // ---- Promotions ----

    createPromotion: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'promotions');
      const doc = await Promotion.create({ ...args.input, restaurantId: args.restaurantId });
      return mapPromotion(doc);
    },

    updatePromotion: async (
      _: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await Promotion.findById(args.id);
      if (!doc) throw new Error('Promotion not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      Object.assign(doc, args.input);
      await doc.save();
      return mapPromotion(doc);
    },

    deletePromotion: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await Promotion.findById(args.id);
      if (!doc) throw new Error('Promotion not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      await doc.deleteOne();
      return true;
    },

    issueGiftCard: async (
      _: unknown,
      args: {
        restaurantId: string;
        input: {
          balanceCents: number;
          recipientName?: string;
          recipientEmail?: string;
          expiresAt?: string;
          note?: string;
        };
      },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const doc = await issueGiftCard({
        restaurantId: args.restaurantId,
        balanceCents: args.input.balanceCents,
        issuedByUserId: user._id.toString(),
        recipientName: args.input.recipientName,
        recipientEmail: args.input.recipientEmail,
        expiresAt: args.input.expiresAt ? new Date(args.input.expiresAt) : undefined,
        note: args.input.note,
      });
      return mapGiftCard(doc);
    },

    setGiftCardActive: async (
      _: unknown,
      args: { id: string; active: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const existing = await GiftCard.findById(args.id);
      if (!existing) throw new Error('Gift card not found');
      await assertRestaurantAccess(
        user._id.toString(),
        existing.restaurantId.toString(),
        user.role,
      );
      const doc = await setGiftCardActive(args.id, args.active);
      return mapGiftCard(doc);
    },

    // ---- Boost campaigns ----

    createBoostCampaign: async (
      _: unknown,
      args: { restaurantId: string; input: any },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'boostCampaigns');
      const doc = await BoostCampaign.create({
        ...args.input,
        restaurantId: args.restaurantId,
        status: 'active',
      });
      return mapBoostCampaign(doc);
    },

    setBoostCampaignStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await BoostCampaign.findById(args.id);
      if (!doc) throw new Error('Campaign not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      if (!['active', 'paused', 'completed'].includes(args.status)) {
        throw new Error('Invalid status');
      }
      doc.status = args.status as any;
      await doc.save();
      return mapBoostCampaign(doc);
    },

    // ---- Booking integrations ----

    createIntegration: async (
      _: unknown,
      args: { restaurantId: string; provider: string; name: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const validProviders = ['google_reserve', 'partner_site', 'affiliate', 'other'];
      if (!validProviders.includes(args.provider)) throw new Error('Invalid provider');
      const doc = await Integration.create({
        restaurantId: args.restaurantId,
        provider: args.provider,
        name: args.name,
        apiKey: `int_${crypto.randomBytes(24).toString('hex')}`,
        enabled: true,
      });
      return mapIntegration(doc);
    },

    setIntegrationEnabled: async (
      _: unknown,
      args: { id: string; enabled: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const doc = await Integration.findById(args.id);
      if (!doc) throw new Error('Integration not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      doc.enabled = args.enabled;
      await doc.save();
      return mapIntegration(doc);
    },

    deleteIntegration: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const doc = await Integration.findById(args.id);
      if (!doc) throw new Error('Integration not found');
      await assertRestaurantAccess(user._id.toString(), doc.restaurantId.toString(), user.role);
      await doc.deleteOne();
      return true;
    },

    // ---- Restaurant marketing & settings ----

    setFeaturedPlacement: async (
      _: unknown,
      args: { restaurantId: string; featured: boolean; days?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      if (args.featured) await requireFeature(args.restaurantId, 'featuredPlacement');
      const featuredUntil = args.featured
        ? new Date(Date.now() + (args.days ?? 30) * 86_400_000)
        : null;
      const doc = await Restaurant.findByIdAndUpdate(
        args.restaurantId,
        { featured: args.featured, featuredUntil },
        { new: true },
      );
      if (!doc) throw new Error('Restaurant not found');
      return mapRestaurant(doc);
    },

    updateTablePositions: async (
      _: unknown,
      args: { restaurantId: string; positions: Array<{ id: string; posX: number; posY: number; width?: number; height?: number; shape?: string }> },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      await requireFeature(args.restaurantId, 'floorPlans');
      const updated = [];
      for (const pos of args.positions) {
        const table = await Table.findOne({ _id: pos.id, restaurantId: args.restaurantId });
        if (!table) continue;
        table.posX = pos.posX;
        table.posY = pos.posY;
        if (pos.width != null) table.width = pos.width;
        if (pos.height != null) table.height = pos.height;
        if (pos.shape) table.shape = pos.shape as any;
        await table.save();
        updated.push(mapTable(table));
      }
      return updated;
    },

    updateRestaurantSettings: async (
      _: unknown,
      args: {
        restaurantId: string;
        spendAlertThresholdCents?: number;
        useSmartAssign?: boolean;
        posEnabled?: boolean;
        widgetTheme?: { primaryColor?: string; buttonText?: string; showReviews?: boolean };
      },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);

      const update: Record<string, unknown> = {};
      if (args.spendAlertThresholdCents != null) {
        if (args.spendAlertThresholdCents > 0) {
          await requireFeature(args.restaurantId, 'spendAlerts');
        }
        update.spendAlertThresholdCents = args.spendAlertThresholdCents;
      }
      if (args.useSmartAssign != null) update.useSmartAssign = args.useSmartAssign;
      if (args.posEnabled != null) update.posEnabled = args.posEnabled;
      if (args.widgetTheme) {
        await requireFeature(args.restaurantId, 'customWidget');
        if (args.widgetTheme.primaryColor != null) {
          update['widgetTheme.primaryColor'] = args.widgetTheme.primaryColor;
        }
        if (args.widgetTheme.buttonText != null) {
          update['widgetTheme.buttonText'] = args.widgetTheme.buttonText;
        }
        if (args.widgetTheme.showReviews != null) {
          update['widgetTheme.showReviews'] = args.widgetTheme.showReviews;
        }
      }

      const doc = await Restaurant.findByIdAndUpdate(args.restaurantId, update, { new: true });
      if (!doc) throw new Error('Restaurant not found');
      return mapRestaurant(doc);
    },

    // ---- In-house waitlist ----

    addInHouseWaitlistEntry: async (
      _: unknown,
      args: { input: { restaurantId: string; guestName: string; guestPhone?: string; partySize: number; quotedWaitMinutes?: number } },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.input.restaurantId, user.role);
      await requireFeature(args.input.restaurantId, 'waitlist');
      const doc = await WaitlistEntry.create({
        restaurantId: args.input.restaurantId,
        guestName: args.input.guestName,
        guestPhone: args.input.guestPhone,
        partySize: args.input.partySize,
        quotedWaitMinutes: args.input.quotedWaitMinutes,
        preferredDate: new Date().toISOString().slice(0, 10),
        source: 'in_house',
        status: 'waiting',
      });
      return mapWaitlistEntry(doc);
    },

    updateWaitlistStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const entry = await WaitlistEntry.findById(args.id);
      if (!entry) throw new Error('Waitlist entry not found');
      await assertRestaurantAccess(user._id.toString(), entry.restaurantId.toString(), user.role);
      entry.status = args.status as any;
      if (args.status === 'notified') {
        entry.notifiedAt = new Date();
        if (entry.dinerId) {
          await notifyUser(
            entry.dinerId.toString(),
            {
              type: 'waitlist_ready',
              title: 'Your table is ready!',
              body: 'Please check in with the host.',
              data: { waitlistId: args.id },
            },
            { smsRestaurantId: entry.restaurantId.toString() },
          );
        } else if (entry.guestPhone) {
          const { sendSms } = await import('../services/notifications.js');
          const { hasPremiumSms } = await import('../services/plans.js');
          if (await hasPremiumSms(entry.restaurantId.toString())) {
            await sendSms(entry.guestPhone, 'Your table is ready! Please check in with the host.');
          }
        }
      }
      await entry.save();
      return mapWaitlistEntry(entry);
    },

    // ---- Premium SMS add-on ----

    setPremiumSmsAddon: async (
      _: unknown,
      args: { restaurantId: string; enabled: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      await assertRestaurantAccess(user._id.toString(), args.restaurantId, user.role);
      const sub = await Subscription.findOne({ restaurantId: args.restaurantId });
      if (!sub) throw new Error('No subscription found');
      if (sub.plan === 'basic') {
        throw new Error('Premium SMS add-on requires the Core plan or higher');
      }
      (sub.features as any).premiumSmsAddon = args.enabled;
      sub.markModified('features');
      await sub.save();
      await logAudit({
        actorId: user._id.toString(),
        action: 'setPremiumSmsAddon',
        resource: 'Subscription',
        resourceId: sub._id.toString(),
        details: { enabled: args.enabled },
      });
      return mapSubscription(sub);
    },
    ...adminOpsMutation,
  },
};
