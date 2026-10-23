import mongoose from 'mongoose';
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../graphql/context.js';
import { requireAdmin, requireAuth } from '../../graphql/context.js';
import { MessengerLink, PlatformConfig, Restaurant } from '../../models/index.js';
import {
  buildAdminRestaurantRow,
  buildRestaurantMessengerBotView,
  requireRestaurantBotAccess,
  restaurantTeamUserIds,
  type RestaurantBotAccess,
} from './access.js';
import {
  getBotPlatformConfig,
  invalidateBotPlatformConfig,
  messengerWebhookBaseUrl,
  restaurantBotActive,
  restaurantBotAvailable,
} from './config.js';
import { addTelegramLinkManual, createTelegramLinkInvite } from './linking.js';
import { botMemberForUser } from './members.js';
import {
  BOT_PROFILE_LABELS,
  normalizeAllowedActions,
  type BotProfile,
} from './profiles.js';
import { escapeTelegramHtml, sendTelegramText } from './telegramApi.js';
import {
  connectTelegramBot,
  disconnectTelegramBot,
  getTelegramTransportStatus,
} from './transport.js';

const PROFILES = new Set<BotProfile>(['FOH', 'HOST', 'APPROVER']);
const RESTAURANT_BOT_FIELDS =
  'name ownerId messengerBotAccess messengerBotEnabled messengerBotFeeCentsOverride';

function parseProfile(raw: unknown, field: string): BotProfile | null {
  if (raw == null || raw === '') return null;
  const p = String(raw).toUpperCase() as BotProfile;
  if (!PROFILES.has(p)) throw new GraphQLError(`${field} must be FOH, HOST, or APPROVER`);
  return p;
}

async function assertCanManageLinkUser(
  access: RestaurantBotAccess,
  linkUserId: string,
): Promise<void> {
  if (linkUserId === access.callerId) return;
  const team = await restaurantTeamUserIds(access.restaurant);
  if (!access.canManageTeam || !team.some((id) => String(id) === linkUserId)) {
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  }
}

const MAX_FEE_CENTS = 1_000_000;

function feeCents(raw: unknown, field: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_FEE_CENTS) {
    throw new GraphQLError(`${field} must be between 0 and ${MAX_FEE_CENTS} cents`);
  }
  return Math.round(n);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function buildAdminMessengerBot() {
  const cfg = await getBotPlatformConfig(true);
  const [transport, enabledRestaurants, linkedChatCount] = await Promise.all([
    getTelegramTransportStatus(),
    Restaurant.find({ messengerBotEnabled: true, status: 'approved' })
      .select('messengerBotAccess messengerBotEnabled')
      .lean(),
    MessengerLink.countDocuments({ isActive: true }),
  ]);
  return {
    enabled: cfg.enabled,
    availability: cfg.availability,
    feeMonthlyCents: cfg.feeMonthlyCents,
    feePricingMode: cfg.feePricingMode,
    billingMethod: cfg.billingMethod,
    telegramConnected: Boolean(cfg.telegramToken),
    telegramBotUsername: cfg.telegramUsername,
    telegramBotUrl: cfg.telegramUsername ? `https://t.me/${cfg.telegramUsername}` : null,
    transport,
    webhookBaseConfigured: messengerWebhookBaseUrl() != null,
    activeRestaurantCount: enabledRestaurants.filter((r) => restaurantBotActive(cfg, r)).length,
    linkedChatCount,
  };
}

export const messengerBotQueries = {
  adminMessengerBot: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    return buildAdminMessengerBot();
  },

  adminMessengerBotRestaurants: async (
    _: unknown,
    args: { search?: string | null; page?: number | null; pageSize?: number | null },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const cfg = await getBotPlatformConfig();
    const filter: Record<string, unknown> = {};
    const q = args.search?.trim();
    if (q) filter.name = { $regex: escapeRegex(q.slice(0, 80)), $options: 'i' };
    const size = Math.min(100, Math.max(1, Number(args.pageSize) || 20));
    const pageNum = Math.max(1, Number(args.page) || 1);
    const total = await Restaurant.countDocuments(filter);
    const rows = await Restaurant.find(filter)
      .sort({ messengerBotEnabled: -1, name: 1 })
      .skip((pageNum - 1) * size)
      .limit(size)
      .select(RESTAURANT_BOT_FIELDS)
      .lean<RestaurantBotAccess['restaurant'][]>();
    return {
      restaurants: await Promise.all(rows.map((r) => buildAdminRestaurantRow(cfg, r))),
      total,
      page: pageNum,
      pageSize: size,
    };
  },

  restaurantMessengerBot: async (
    _: unknown,
    { restaurantId }: { restaurantId: string },
    ctx: GraphQLContext,
  ) => {
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    return buildRestaurantMessengerBotView(access);
  },
};

export const messengerBotMutations = {
  adminUpdateMessengerBot: async (
    _: unknown,
    { input }: { input: Record<string, unknown> },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const update: Record<string, unknown> = {};
    if (typeof input.enabled === 'boolean') update.messengerBotEnabled = input.enabled;
    if (input.availability === 'ALL' || input.availability === 'SELECTED') {
      update.messengerBotAvailability = input.availability;
    }
    if (input.feeMonthlyCents != null) {
      update.messengerBotFeeMonthlyCents = feeCents(input.feeMonthlyCents, 'Monthly fee');
    }
    if (input.feePricingMode === 'PER_RESTAURANT' || input.feePricingMode === 'PER_ACCOUNT') {
      update.messengerBotFeePricingMode = input.feePricingMode;
    }
    if (input.billingMethod === 'MONTHLY_INVOICE') {
      update.messengerBotFeeBillingMethod = input.billingMethod;
    }
    if (Object.keys(update).length) {
      await PlatformConfig.updateOne(
        { key: 'default' },
        { $set: update, $setOnInsert: { key: 'default' } },
        { upsert: true },
      );
      invalidateBotPlatformConfig();
    }
    return buildAdminMessengerBot();
  },

  adminConnectTelegramBot: async (
    _: unknown,
    { botToken }: { botToken: string },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    try {
      await connectTelegramBot(botToken);
    } catch (err) {
      throw new GraphQLError(err instanceof Error ? err.message : 'Could not connect the bot');
    }
    return buildAdminMessengerBot();
  },

  adminDisconnectTelegramBot: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    requireAdmin(ctx);
    await disconnectTelegramBot();
    return buildAdminMessengerBot();
  },

  adminSetRestaurantMessengerBot: async (
    _: unknown,
    { input }: { input: Record<string, unknown> },
    ctx: GraphQLContext,
  ) => {
    requireAdmin(ctx);
    const restaurantId = String(input.restaurantId ?? '');
    if (!mongoose.isValidObjectId(restaurantId)) throw new GraphQLError('Restaurant not found');
    const update: Record<string, unknown> = {};
    if (input.access === 'DEFAULT' || input.access === 'ENABLED' || input.access === 'DISABLED') {
      update.messengerBotAccess = input.access;
    }
    if (typeof input.enabled === 'boolean') update.messengerBotEnabled = input.enabled;
    if (input.clearFeeOverride === true) {
      update.messengerBotFeeCentsOverride = null;
    } else if (input.feeOverrideCents != null) {
      update.messengerBotFeeCentsOverride = feeCents(input.feeOverrideCents, 'Fee override');
    }
    const r = await Restaurant.findByIdAndUpdate(restaurantId, { $set: update }, { new: true })
      .select(RESTAURANT_BOT_FIELDS)
      .lean<RestaurantBotAccess['restaurant'] | null>();
    if (!r) throw new GraphQLError('Restaurant not found');
    return buildAdminRestaurantRow(await getBotPlatformConfig(), r);
  },

  setRestaurantMessengerBotEnabled: async (
    _: unknown,
    { restaurantId, enabled }: { restaurantId: string; enabled: boolean },
    ctx: GraphQLContext,
  ) => {
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    if (!access.canActivate) {
      throw new GraphQLError('Only the restaurant owner can turn the bot on or off', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    if (enabled && !restaurantBotAvailable(await getBotPlatformConfig(), access.restaurant)) {
      throw new GraphQLError("The messenger bot isn't available for this restaurant yet.");
    }
    await Restaurant.updateOne(
      { _id: access.restaurant._id },
      { $set: { messengerBotEnabled: enabled } },
    );
    access.restaurant.messengerBotEnabled = enabled;
    return buildRestaurantMessengerBotView(access);
  },

  createMessengerLinkInvite: async (
    _: unknown,
    { restaurantId, userId }: { restaurantId: string; userId?: string | null },
    ctx: GraphQLContext,
  ) => {
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    const targetUserId = userId?.trim() || access.callerId;
    if (targetUserId !== access.callerId && !access.canManageTeam) {
      throw new GraphQLError('Only the owner or a manager can invite team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const cfg = await getBotPlatformConfig();
    if (!cfg.telegramUsername || !restaurantBotAvailable(cfg, access.restaurant)) {
      throw new GraphQLError("The messenger bot isn't available for this restaurant yet.");
    }
    if (!mongoose.isValidObjectId(targetUserId)) throw new GraphQLError('User not found');
    const member = await botMemberForUser(restaurantId, targetUserId);
    if (!member) {
      throw new GraphQLError(
        "This team member can't use the bot. Allow Messenger for them and ensure they have a venue role.",
      );
    }
    return createTelegramLinkInvite({
      botUsername: cfg.telegramUsername,
      restaurantId,
      userId: targetUserId,
      createdByUserId: access.callerId,
    });
  },

  addMessengerLinkManual: async (
    _: unknown,
    { input }: { input: Record<string, unknown> },
    ctx: GraphQLContext,
  ) => {
    const restaurantId = String(input.restaurantId ?? '');
    const userId = String(input.userId ?? '');
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    if (!mongoose.isValidObjectId(userId)) throw new GraphQLError('User not found');
    await assertCanManageLinkUser(access, userId);

    const cfg = await getBotPlatformConfig();
    if (!cfg.telegramToken || !restaurantBotAvailable(cfg, access.restaurant)) {
      throw new GraphQLError("The messenger bot isn't available for this restaurant yet.");
    }

    try {
      await addTelegramLinkManual({
        botToken: cfg.telegramToken,
        restaurantId,
        userId,
        chatId: String(input.chatId ?? ''),
        token: typeof input.token === 'string' ? input.token : null,
        label: typeof input.label === 'string' ? input.label : null,
        profileOverride: parseProfile(input.profileOverride, 'profileOverride'),
        allowedActions: Array.isArray(input.allowedActions)
          ? input.allowedActions.map(String)
          : null,
      });
    } catch (err) {
      throw new GraphQLError(err instanceof Error ? err.message : 'Could not link Telegram chat');
    }

    if (cfg.telegramToken) {
      const member = await botMemberForUser(restaurantId, userId);
      const role = member ? BOT_PROFILE_LABELS[member.profile] : 'team';
      await sendTelegramText(
        cfg.telegramToken,
        String(input.chatId).trim(),
        `✅ <b>Connected!</b> You'll get <b>${role}</b> reservation alerts for <b>${escapeTelegramHtml(access.restaurant.name)}</b>.`,
      ).catch(() => undefined);
    }

    return buildRestaurantMessengerBotView(access);
  },

  updateMessengerLink: async (
    _: unknown,
    { input }: { input: Record<string, unknown> },
    ctx: GraphQLContext,
  ) => {
    const restaurantId = String(input.restaurantId ?? '');
    const linkId = String(input.linkId ?? '');
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    if (!mongoose.isValidObjectId(linkId)) throw new GraphQLError('Link not found');
    const link = await MessengerLink.findById(linkId);
    if (!link || !link.isActive) throw new GraphQLError('Link not found');
    if (String(link.restaurantId) !== restaurantId) throw new GraphQLError('Link not found');
    await assertCanManageLinkUser(access, String(link.userId));

    const member = await botMemberForUser(restaurantId, String(link.userId));
    const roleProfile = member?.profile ?? null;
    const $set: Record<string, unknown> = {};

    if (input.clearLabel === true) $set.label = null;
    else if (typeof input.label === 'string') $set.label = input.label.trim().slice(0, 64) || null;

    if (input.clearProfileOverride === true) $set.profileOverride = null;
    else if (input.profileOverride !== undefined) {
      $set.profileOverride = parseProfile(input.profileOverride, 'profileOverride');
    }

    const nextProfile =
      ($set.profileOverride as BotProfile | null | undefined) !== undefined
        ? (($set.profileOverride as BotProfile | null) ?? roleProfile)
        : ((link.profileOverride as BotProfile | null) ?? roleProfile);

    if (input.clearAllowedActions === true) {
      $set.allowedActions = null;
    } else if (Array.isArray(input.allowedActions)) {
      if (!nextProfile) throw new GraphQLError('This team member has no bot profile.');
      $set.allowedActions = normalizeAllowedActions(
        nextProfile,
        input.allowedActions.map(String),
      );
    }

    if (typeof input.paused === 'boolean') $set.paused = input.paused;

    if (Object.keys($set).length) {
      await MessengerLink.updateOne({ _id: link._id }, { $set });
    }
    return buildRestaurantMessengerBotView(access);
  },

  removeMessengerLink: async (
    _: unknown,
    { restaurantId, linkId }: { restaurantId: string; linkId: string },
    ctx: GraphQLContext,
  ) => {
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    if (!mongoose.isValidObjectId(linkId)) return false;
    const link = await MessengerLink.findById(linkId).lean();
    if (!link || String(link.restaurantId) !== restaurantId) return false;
    await assertCanManageLinkUser(access, String(link.userId));
    await MessengerLink.updateOne({ _id: link._id }, { $set: { isActive: false } });
    const cfg = await getBotPlatformConfig();
    if (cfg.telegramToken && link.channel === 'TELEGRAM') {
      await sendTelegramText(
        cfg.telegramToken,
        link.chatId,
        '👋 This chat was disconnected from Tablevera reservation alerts.',
        { remove_keyboard: true },
      ).catch(() => undefined);
    }
    return true;
  },

  sendMessengerBotTest: async (
    _: unknown,
    { restaurantId }: { restaurantId: string },
    ctx: GraphQLContext,
  ) => {
    const user = requireAuth(ctx);
    const access = await requireRestaurantBotAccess(user, restaurantId);
    const cfg = await getBotPlatformConfig();
    if (!cfg.telegramToken) throw new GraphQLError("The messenger bot isn't connected yet.");
    const member = await botMemberForUser(restaurantId, access.callerId);
    const links = await MessengerLink.find({
      userId: new mongoose.Types.ObjectId(access.callerId),
      restaurantId: access.restaurant._id,
      channel: 'TELEGRAM',
      isActive: true,
    }).lean();
    const role = member ? BOT_PROFILE_LABELS[member.profile] : 'team';
    const text = `✅ <b>Test from Tablevera</b>\nYou're set up to receive <b>${role}</b> reservation alerts for <b>${escapeTelegramHtml(access.restaurant.name)}</b>.`;
    let sent = 0;
    for (const link of links) {
      try {
        await sendTelegramText(cfg.telegramToken, link.chatId, text);
        sent += 1;
      } catch {
        // unreachable chat
      }
    }
    return sent;
  },
};
