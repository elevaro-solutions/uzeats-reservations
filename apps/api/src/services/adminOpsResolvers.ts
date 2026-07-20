import { restaurantInputSchema } from '@reservations/shared';
import { Review } from '../models/Review.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { requireAdmin, type GraphQLContext } from '../graphql/context.js';
import { mapRestaurant, mapUser } from '../graphql/mappers.js';
import { logAudit } from './audit.js';
import {
  assignUserToRestaurants,
  inviteStaff,
  removeUserFromRestaurant,
  startImpersonation,
} from './adminSupport.js';
import {
  addSupportAttachment,
  addSupportNote,
  createSupportTicket,
  deleteSupportNote,
  getChurnAlerts,
  getSlaMetrics,
  getSupportTicket,
  listFlaggedContent,
  listSupportTickets,
  removeSupportAttachment,
  updateSupportAttachment,
  updateSupportNote,
  updateSupportTicket,
} from './supportOps.js';
import {
  listEmailTemplates,
  mapEmailTemplate,
  updateEmailTemplate,
} from './emailTemplates.js';
import { getPlatformConfig, mapPlatformConfig } from './platformConfig.js';
import { listRecentStripeInvoices } from './stripe.js';
import { syncStripeInvoice } from './stripeSync.js';
import { getPlatformRevenueReport } from './invoices.js';
import {
  adminDeleteUser,
  requestAdminDeleteUserCode,
} from './adminDeleteUser.js';
import { clearSeedData as wipeSeedData } from './seedData.js';

function csvEscape(value: unknown) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

function mapFlaggedReview(r: any, restaurantName?: string | null, authorName?: string | null) {
  return {
    id: r._id.toString(),
    type: 'review',
    restaurantId: r.restaurantId.toString(),
    restaurantName: restaurantName ?? null,
    authorName: authorName ?? null,
    body: r.comment || `(${r.rating}★)`,
    rating: r.rating,
    hidden: Boolean(r.hidden),
    flagReason: r.flagReason ?? null,
    flaggedAt: r.flaggedAt ?? null,
    createdAt: r.createdAt,
  };
}

function mapFlaggedMessage(m: any, restaurantName?: string | null, authorName?: string | null) {
  return {
    id: m._id.toString(),
    type: 'message',
    restaurantId: m.restaurantId.toString(),
    restaurantName: restaurantName ?? null,
    authorName: authorName ?? null,
    body: m.body,
    rating: null,
    hidden: Boolean(m.hidden),
    flagReason: m.flagReason ?? null,
    flaggedAt: m.flaggedAt ?? null,
    createdAt: m.createdAt,
  };
}

export const adminOpsQuery = {
  session: (_: unknown, __: unknown, ctx: GraphQLContext) => ({
    user: ctx.user ? mapUser(ctx.user) : null,
    impersonator: ctx.impersonator ? mapUser(ctx.impersonator) : null,
    isImpersonating: Boolean(ctx.impersonator),
  }),

  supportTickets: async (
    _: unknown,
    args: {
      status?: string;
      assigneeId?: string;
      restaurantId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    return listSupportTickets(args);
  },

  supportTicket: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    return getSupportTicket(args.id);
  },

  emailTemplates: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    const items = await listEmailTemplates();
    return items.map(mapEmailTemplate);
  },

  churnAlerts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    return getChurnAlerts();
  },

  slaMetrics: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    return getSlaMetrics();
  },

  flaggedContent: async (
    _: unknown,
    args: { limit?: number },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    return listFlaggedContent(args.limit ?? 50);
  },
};

export const adminOpsMutation = {
  startImpersonation: async (
    _: unknown,
    args: { userId: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const result = await startImpersonation(admin._id.toString(), args.userId);
    await logAudit({
      actorId: admin._id.toString(),
      action: 'startImpersonation',
      resource: 'User',
      resourceId: args.userId,
    });
    return {
      accessToken: result.accessToken,
      user: mapUser(result.user),
      impersonator: mapUser(result.impersonator),
      expiresInSeconds: result.expiresInSeconds,
    };
  },

  inviteStaff: async (
    _: unknown,
    args: {
      email: string;
      firstName: string;
      lastName: string;
      restaurantIds: string[];
      role?: string;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const result = await inviteStaff({
      ...args,
      role: args.role as 'staff' | 'restaurant_owner' | undefined,
      invitedById: admin._id.toString(),
    });
    await logAudit({
      actorId: admin._id.toString(),
      action: 'inviteStaff',
      resource: 'User',
      resourceId: result.user._id.toString(),
      details: { email: args.email, restaurantIds: args.restaurantIds },
    });
    return {
      inviteUrl: result.inviteUrl,
      user: mapUser(result.user),
      email: args.email,
    };
  },

  assignUserRestaurants: async (
    _: unknown,
    args: { userId: string; restaurantIds: string[]; role?: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const user = await assignUserToRestaurants({
      userId: args.userId,
      restaurantIds: args.restaurantIds,
      role: args.role as any,
    });
    await logAudit({
      actorId: admin._id.toString(),
      action: 'assignUserRestaurants',
      resource: 'User',
      resourceId: args.userId,
      details: { restaurantIds: args.restaurantIds, role: args.role },
    });
    return mapUser(user);
  },

  removeUserRestaurant: async (
    _: unknown,
    args: { userId: string; restaurantId: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const user = await removeUserFromRestaurant(args.userId, args.restaurantId);
    await logAudit({
      actorId: admin._id.toString(),
      action: 'removeUserRestaurant',
      resource: 'User',
      resourceId: args.userId,
      details: { restaurantId: args.restaurantId },
    });
    return mapUser(user);
  },

  adminUpdateUser: async (
    _: unknown,
    args: {
      userId: string;
      input: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        loyaltyPoints?: number;
        emailVerified?: boolean;
        phoneVerified?: boolean;
        role?: string;
        restaurantIds?: string[];
      };
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const target = await User.findById(args.userId);
    if (!target) throw new Error('User not found');

    const updates: Record<string, unknown> = {};
    if (args.input.firstName !== undefined) updates.firstName = args.input.firstName.trim();
    if (args.input.lastName !== undefined) updates.lastName = args.input.lastName.trim();
    if (args.input.loyaltyPoints !== undefined) {
      if (args.input.loyaltyPoints < 0) throw new Error('loyaltyPoints must be >= 0');
      updates.loyaltyPoints = args.input.loyaltyPoints;
    }
    if (args.input.emailVerified !== undefined) updates.emailVerified = args.input.emailVerified;
    if (args.input.phoneVerified !== undefined) updates.phoneVerified = args.input.phoneVerified;
    if (args.input.role !== undefined) {
      const validRoles = ['diner', 'restaurant_owner', 'staff', 'admin'];
      if (!validRoles.includes(args.input.role)) throw new Error('Invalid role');
      updates.role = args.input.role;
    }
    if (args.input.restaurantIds !== undefined) {
      updates.restaurantIds = args.input.restaurantIds;
    }
    if (args.input.email !== undefined) {
      const email = args.input.email.trim().toLowerCase();
      if (!email) throw new Error('Email cannot be empty');
      const existing = await User.findOne({ email, _id: { $ne: target._id } });
      if (existing) throw new Error('Email already in use');
      updates.email = email;
    }
    if (args.input.phone !== undefined) {
      const phone = args.input.phone.trim() || null;
      if (phone) {
        const existing = await User.findOne({ phone, _id: { $ne: target._id } });
        if (existing) throw new Error('Phone already in use');
      }
      updates.phone = phone;
    }

    const updated = await User.findByIdAndUpdate(args.userId, { $set: updates }, { new: true });
    if (!updated) throw new Error('User not found');
    await logAudit({
      actorId: admin._id.toString(),
      action: 'adminUpdateUser',
      resource: 'User',
      resourceId: args.userId,
      details: updates,
    });
    return mapUser(updated);
  },

  requestAdminDeleteUserCode: async (
    _: unknown,
    args: { userId: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return requestAdminDeleteUserCode({
      adminId: admin._id.toString(),
      userId: args.userId,
    });
  },

  adminDeleteUser: async (
    _: unknown,
    args: { userId: string; code?: string | null },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return adminDeleteUser({
      adminId: admin._id.toString(),
      userId: args.userId,
      code: args.code,
    });
  },

  clearSeedData: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const admin = requireAdmin(ctx);
    const result = await wipeSeedData();
    await logAudit({
      actorId: admin._id.toString(),
      action: 'clearSeedData',
      resource: 'Platform',
      resourceId: admin._id.toString(),
      details: {
        preservedAdminCount: result.preservedAdminCount,
        deletedCounts: result.deletedCounts,
      },
    });
    return {
      success: true,
      message: result.message,
      preservedAdminCount: result.preservedAdminCount,
    };
  },

  adminUpdateRestaurant: async (
    _: unknown,
    args: {
      id: string;
      input: unknown;
      featured?: boolean;
      featuredUntil?: string | Date | null;
      ownerId?: string;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const input = restaurantInputSchema.parse(args.input);
    const restaurant = await Restaurant.findById(args.id);
    if (!restaurant) throw new Error('Restaurant not found');

    if (args.ownerId) {
      const owner = await User.findById(args.ownerId);
      if (!owner) throw new Error('Owner user not found');
    }

    const $set: Record<string, unknown> = {
      ...input,
      location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    };
    if (args.featured !== undefined) $set.featured = args.featured;
    if (args.featuredUntil !== undefined) {
      $set.featuredUntil = args.featuredUntil ? new Date(args.featuredUntil) : null;
    }
    if (args.ownerId) $set.ownerId = args.ownerId;

    const doc = await Restaurant.findByIdAndUpdate(args.id, { $set }, { new: true });
    if (!doc) throw new Error('Restaurant not found');

    if (args.ownerId && args.ownerId !== restaurant.ownerId.toString()) {
      const owner = await User.findById(args.ownerId);
      if (owner) {
        await User.findByIdAndUpdate(owner._id, {
          $addToSet: { restaurantIds: doc._id },
          ...(owner.role === 'diner' ? { role: 'restaurant_owner' } : {}),
        });
      }
    }

    await logAudit({
      actorId: admin._id.toString(),
      action: 'adminUpdateRestaurant',
      resource: 'Restaurant',
      resourceId: args.id,
      details: {
        name: input.name,
        featured: args.featured,
        ownerId: args.ownerId,
      },
    });

    return mapRestaurant(doc);
  },

  createSupportTicket: async (
    _: unknown,
    args: {
      subject?: string;
      subjectKey?: string;
      description?: string;
      priority?: string;
      category?: string;
      requesterId?: string;
      restaurantId?: string;
      assigneeId?: string;
      note?: string;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return createSupportTicket({ ...args, authorId: admin._id.toString() });
  },

  updateSupportTicket: async (
    _: unknown,
    args: {
      id: string;
      status?: string;
      priority?: string;
      category?: string;
      subject?: string;
      subjectKey?: string;
      description?: string;
      assigneeId?: string | null;
      restaurantId?: string | null;
      requesterId?: string | null;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const { id, ...input } = args;
    return updateSupportTicket(id, input, admin._id.toString());
  },

  addSupportNote: async (
    _: unknown,
    args: { ticketId: string; body: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return addSupportNote(args.ticketId, admin._id.toString(), args.body);
  },

  updateSupportNote: async (
    _: unknown,
    args: { ticketId: string; noteId: string; body: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return updateSupportNote(args.ticketId, args.noteId, args.body, {
      id: admin._id.toString(),
      role: admin.role,
    });
  },

  deleteSupportNote: async (
    _: unknown,
    args: { ticketId: string; noteId: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return deleteSupportNote(args.ticketId, args.noteId, {
      id: admin._id.toString(),
      role: admin.role,
    });
  },

  addSupportAttachment: async (
    _: unknown,
    args: {
      ticketId: string;
      url: string;
      key?: string;
      filename: string;
      contentType: string;
      size?: number;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const { ticketId, ...input } = args;
    return addSupportAttachment(ticketId, admin._id.toString(), input);
  },

  updateSupportAttachment: async (
    _: unknown,
    args: { ticketId: string; attachmentId: string; filename: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return updateSupportAttachment(
      args.ticketId,
      args.attachmentId,
      { filename: args.filename },
      { id: admin._id.toString(), role: admin.role },
    );
  },

  removeSupportAttachment: async (
    _: unknown,
    args: { ticketId: string; attachmentId: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    return removeSupportAttachment(args.ticketId, args.attachmentId, {
      id: admin._id.toString(),
      role: admin.role,
    });
  },

  updateEmailTemplate: async (
    _: unknown,
    args: {
      key: string;
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      name?: string;
    },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const doc = await updateEmailTemplate(args.key, args, admin._id.toString());
    await logAudit({
      actorId: admin._id.toString(),
      action: 'updateEmailTemplate',
      resource: 'EmailTemplate',
      details: { key: args.key },
    });
    return mapEmailTemplate(doc);
  },

  flagReview: async (
    _: unknown,
    args: { id: string; reason?: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const doc = await Review.findByIdAndUpdate(
      args.id,
      {
        flagged: true,
        flagReason: args.reason || 'Flagged by admin',
        flaggedAt: new Date(),
        flaggedById: admin._id,
      },
      { new: true },
    );
    if (!doc) throw new Error('Review not found');
    return mapFlaggedReview(doc);
  },

  unflagReview: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    const doc = await Review.findByIdAndUpdate(
      args.id,
      { flagged: false, flagReason: null, flaggedAt: null, flaggedById: null },
      { new: true },
    );
    if (!doc) throw new Error('Review not found');
    return mapFlaggedReview(doc);
  },

  setReviewHiddenAdmin: async (
    _: unknown,
    args: { id: string; hidden: boolean },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const doc = await Review.findByIdAndUpdate(
      args.id,
      { hidden: args.hidden },
      { new: true },
    );
    if (!doc) throw new Error('Review not found');
    return mapFlaggedReview(doc);
  },

  flagMessage: async (
    _: unknown,
    args: { id: string; reason?: string },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const doc = await Message.findByIdAndUpdate(
      args.id,
      {
        flagged: true,
        flagReason: args.reason || 'Flagged by admin',
        flaggedAt: new Date(),
        flaggedById: admin._id,
      },
      { new: true },
    );
    if (!doc) throw new Error('Message not found');
    return mapFlaggedMessage(doc);
  },

  unflagMessage: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    const doc = await Message.findByIdAndUpdate(
      args.id,
      { flagged: false, flagReason: null, flaggedAt: null, flaggedById: null },
      { new: true },
    );
    if (!doc) throw new Error('Message not found');
    return mapFlaggedMessage(doc);
  },

  setMessageHidden: async (
    _: unknown,
    args: { id: string; hidden: boolean },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const doc = await Message.findByIdAndUpdate(
      args.id,
      { hidden: args.hidden },
      { new: true },
    );
    if (!doc) throw new Error('Message not found');
    return mapFlaggedMessage(doc);
  },

  exportAdminCsv: async (
    _: unknown,
    args: { type: string; period?: string },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const period = args.period ?? new Date().toISOString().slice(0, 7);

    if (args.type === 'users') {
      const users = await User.find().sort({ createdAt: -1 }).limit(5000);
      const content = toCsv(
        ['id', 'email', 'firstName', 'lastName', 'role', 'loyaltyPoints', 'createdAt'],
        users.map((u) => [
          u._id.toString(),
          u.email,
          u.firstName,
          u.lastName,
          u.role,
          u.loyaltyPoints,
          (u as any).createdAt?.toISOString?.() ?? '',
        ]),
      );
      return { filename: `users-${period}.csv`, content, rowCount: users.length };
    }

    if (args.type === 'invoices') {
      const invoices = await Invoice.find(
        args.period ? { billingPeriod: period } : {},
      )
        .sort({ dueDate: -1 })
        .limit(5000);
      const restaurants = await Restaurant.find({
        _id: { $in: invoices.map((i) => i.restaurantId) },
      }).select('name');
      const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));
      const content = toCsv(
        ['number', 'restaurant', 'status', 'period', 'totalCents', 'dueDate', 'paidAt'],
        invoices.map((i) => [
          i.number,
          nameById.get(i.restaurantId.toString()) ?? '',
          i.status,
          i.billingPeriod,
          i.totalCents,
          i.dueDate?.toISOString?.() ?? '',
          i.paidAt?.toISOString?.() ?? '',
        ]),
      );
      return { filename: `invoices-${period}.csv`, content, rowCount: invoices.length };
    }

    if (args.type === 'revenue') {
      const report = await getPlatformRevenueReport(period);
      const content = toCsv(
        ['metric', 'value'],
        [
          ['period', report.period],
          ['mrrCents', report.mrrCents],
          ['arrCents', report.arrCents],
          ['billedCents', report.billedCents],
          ['paidCents', report.paidCents],
          ['outstandingCents', report.outstandingCents],
          ['coverFeeCents', report.coverFeeCents],
          ['activeSubscriptions', report.activeSubscriptions],
          ['trialingSubscriptions', report.trialingSubscriptions],
          ['pastDueSubscriptions', report.pastDueSubscriptions],
          ['cancelledSubscriptions', report.cancelledSubscriptions],
        ],
      );
      return { filename: `revenue-${period}.csv`, content, rowCount: 11 };
    }

    if (args.type === 'subscriptions') {
      const subs = await Subscription.find().sort({ updatedAt: -1 }).limit(5000);
      const restaurants = await Restaurant.find({
        _id: { $in: subs.map((s) => s.restaurantId) },
      }).select('name');
      const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));
      const content = toCsv(
        ['restaurant', 'plan', 'status', 'monthlyPriceCents', 'trialEndsAt', 'cancelledAt'],
        subs.map((s) => [
          nameById.get(s.restaurantId.toString()) ?? '',
          s.plan,
          s.status,
          s.monthlyPriceCents,
          s.trialEndsAt?.toISOString?.() ?? '',
          s.cancelledAt?.toISOString?.() ?? '',
        ]),
      );
      return {
        filename: `subscriptions-${period}.csv`,
        content,
        rowCount: subs.length,
      };
    }

    throw new Error('Unsupported export type. Use users, invoices, revenue, or subscriptions.');
  },

  syncStripeInvoices: async (
    _: unknown,
    args: { limit?: number },
    ctx: GraphQLContext,
  ) => {
    const admin = requireAdmin(ctx);
    const { invoices, stub } = await listRecentStripeInvoices(args.limit ?? 50);
    if (stub) {
      return {
        synced: 0,
        message: 'Stripe is not configured — webhook sync will activate when keys are set.',
      };
    }
    let synced = 0;
    for (const inv of invoices) {
      const result = await syncStripeInvoice(inv as any);
      if (result) synced += 1;
    }
    await logAudit({
      actorId: admin._id.toString(),
      action: 'syncStripeInvoices',
      resource: 'Invoice',
      details: { synced, fetched: invoices.length },
    });
    return {
      synced,
      message: `Synced ${synced} of ${invoices.length} Stripe invoices.`,
    };
  },
};

export async function applyPlatformConfigFeatureFlags(
  doc: Awaited<ReturnType<typeof getPlatformConfig>>,
  featureFlags?: Record<string, boolean | undefined>,
) {
  if (!featureFlags) return;
  if (!(doc as any).featureFlags) (doc as any).featureFlags = {};
  for (const [key, value] of Object.entries(featureFlags)) {
    if (typeof value === 'boolean') {
      (doc as any).featureFlags[key] = value;
    }
  }
  doc.markModified('featureFlags');
}

export { mapPlatformConfig, getPlatformConfig };
