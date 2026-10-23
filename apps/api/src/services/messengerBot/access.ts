import mongoose from 'mongoose';
import { GraphQLError } from 'graphql';
import { isPlatformAdmin, type UserRole } from '@reservations/shared';
import {
  MessengerBotFeeCharge,
  MessengerLink,
  Restaurant,
  User,
} from '../../models/index.js';
import {
  getBotPlatformConfig,
  restaurantBotActive,
  restaurantBotAvailable,
  restaurantBotChargeCents,
  restaurantBotFeeCents,
  type BotPlatformConfig,
} from './config.js';
import {
  matchActionPreset,
  normalizeAllowedActions,
  profileForRole,
  type BotActionCode,
  type BotProfile,
} from './profiles.js';

function forbidden(message = 'Forbidden'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

export type RestaurantBotAccess = {
  restaurant: {
    _id: mongoose.Types.ObjectId;
    name: string;
    ownerId?: mongoose.Types.ObjectId;
    messengerBotAccess?: string;
    messengerBotEnabled?: boolean;
    messengerBotFeeCentsOverride?: number | null;
  };
  callerId: string;
  callerRole: string;
  canActivate: boolean;
  canManageTeam: boolean;
};

export async function requireRestaurantBotAccess(
  caller: { _id: mongoose.Types.ObjectId | string; role: string },
  restaurantId: string,
): Promise<RestaurantBotAccess> {
  if (!mongoose.isValidObjectId(restaurantId)) throw new GraphQLError('Restaurant not found');
  const callerId = String(caller._id);
  const restaurant = await Restaurant.findById(restaurantId)
    .select('name ownerId messengerBotAccess messengerBotEnabled messengerBotFeeCentsOverride')
    .lean<RestaurantBotAccess['restaurant'] | null>();
  if (!restaurant) throw new GraphQLError('Restaurant not found');

  const isAdmin = isPlatformAdmin(caller.role as UserRole);
  const isOwner = restaurant.ownerId != null && String(restaurant.ownerId) === callerId;
  if (isAdmin || isOwner) {
    return {
      restaurant,
      callerId,
      callerRole: caller.role,
      canActivate: true,
      canManageTeam: true,
    };
  }

  const user = await User.findById(callerId).select('restaurantIds role').lean();
  const onTeam = user?.restaurantIds?.some((id) => String(id) === restaurantId);
  if (!onTeam) throw forbidden();

  const role = user?.role ?? caller.role;
  return {
    restaurant,
    callerId,
    callerRole: role,
    canActivate: false,
    canManageTeam: role === 'manager',
  };
}

type LinkLean = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  channel: string;
  chatId: string;
  displayName?: string | null;
  label?: string | null;
  profileOverride?: BotProfile | null;
  allowedActions?: BotActionCode[] | null;
  linkedAt: Date;
  lastSeenAt?: Date | null;
  paused: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapLinkInfo(l: LinkLean, roleProfile: BotProfile | null) {
  const effectiveProfile = l.profileOverride ?? roleProfile;
  const allowedActions =
    effectiveProfile != null ? normalizeAllowedActions(effectiveProfile, l.allowedActions) : null;
  return {
    id: String(l._id),
    channel: l.channel,
    chatId: l.chatId,
    displayName: l.displayName ?? null,
    label: l.label ?? null,
    profileOverride: l.profileOverride ?? null,
    effectiveProfile,
    allowedActions,
    actionPreset:
      effectiveProfile != null ? matchActionPreset(effectiveProfile, allowedActions) : null,
    linkedAt: l.linkedAt,
    lastSeenAt: l.lastSeenAt ?? null,
    paused: l.paused === true,
    createdAt: l.createdAt ?? l.linkedAt,
    updatedAt: l.updatedAt ?? l.linkedAt,
  };
}

export async function restaurantTeamUserIds(restaurant: {
  _id: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
}): Promise<mongoose.Types.ObjectId[]> {
  const staff = await User.find({ restaurantIds: restaurant._id }).select('_id').lean();
  const ids = staff.map((s) => s._id);
  if (restaurant.ownerId) ids.push(restaurant.ownerId);
  return ids;
}

export async function buildRestaurantMessengerBotView(access: RestaurantBotAccess) {
  const cfg = await getBotPlatformConfig();
  const { restaurant, callerId } = access;
  const ownerId = restaurant.ownerId ? String(restaurant.ownerId) : null;

  const staffUsers = await User.find({
    $or: [{ _id: restaurant.ownerId }, { restaurantIds: restaurant._id }],
  })
    .select('_id firstName lastName email role canActViaMessenger')
    .lean();

  type Row = {
    userId: string;
    role: string;
    canActViaMessenger: boolean;
    name: string | null;
    email: string | null;
  };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const u of staffUsers) {
    const id = String(u._id);
    if (seen.has(id)) continue;
    seen.add(id);
    const isOwner = ownerId === id;
    rows.push({
      userId: id,
      role: isOwner ? 'OWNER' : u.role,
      canActViaMessenger: isOwner ? true : u.canActViaMessenger !== false,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      email: u.email ?? null,
    });
  }

  const visible = access.canManageTeam ? rows : rows.filter((r) => r.userId === callerId);
  const userOids = visible.map((r) => new mongoose.Types.ObjectId(r.userId));

  const [links, charges] = await Promise.all([
    MessengerLink.find({
      restaurantId: restaurant._id,
      userId: { $in: userOids },
      isActive: true,
    })
      .sort({ linkedAt: -1 })
      .lean<LinkLean[]>(),
    MessengerBotFeeCharge.find({ restaurantId: restaurant._id })
      .sort({ periodStart: -1 })
      .limit(24)
      .lean(),
  ]);

  const unitFeeCents = restaurantBotFeeCents(cfg, restaurant);
  const linkedAccountCount = links.length;
  const totalMonthlyCents = restaurantBotChargeCents(cfg, restaurant, linkedAccountCount);
  const feePerAccountCents =
    cfg.feePricingMode === 'PER_ACCOUNT'
      ? unitFeeCents
      : linkedAccountCount > 0
        ? Math.round(totalMonthlyCents / linkedAccountCount)
        : unitFeeCents;

  return {
    restaurantId: String(restaurant._id),
    restaurantName: restaurant.name,
    available: restaurantBotAvailable(cfg, restaurant),
    enabled: restaurantBotActive(cfg, restaurant),
    botUsername: cfg.telegramUsername,
    botUrl: cfg.telegramUsername ? `https://t.me/${cfg.telegramUsername}` : null,
    feeMonthlyCents: unitFeeCents,
    feePricingMode: cfg.feePricingMode,
    feePerAccountCents,
    linkedAccountCount,
    totalMonthlyCents,
    billingMethod: cfg.billingMethod,
    canActivate: access.canActivate,
    canManageTeam: access.canManageTeam,
    invoices: charges.map((c) => ({
      id: String(c._id),
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      billingPeriod: c.billingPeriod,
      amountCents: c.amountCents,
      status: c.status,
      billingMethod: c.billingMethod,
      billedAt: c.billedAt ?? null,
      createdAt: c.createdAt,
    })),
    members: visible.map((r) => {
      const roleProfile = r.role === 'OWNER' ? ('FOH' as const) : profileForRole(r.role);
      return {
        userId: r.userId,
        name: r.name,
        email: r.email,
        role: r.role,
        profile: roleProfile,
        canActViaMessenger: r.canActViaMessenger,
        isYou: r.userId === callerId,
        links: links
          .filter((l) => String(l.userId) === r.userId)
          .map((l) => mapLinkInfo(l, roleProfile)),
      };
    }),
  };
}

export async function buildAdminRestaurantRow(
  cfg: BotPlatformConfig,
  r: RestaurantBotAccess['restaurant'],
) {
  const teamIds = await restaurantTeamUserIds(r);
  const linkedChatCount = await MessengerLink.countDocuments({
    restaurantId: r._id,
    userId: { $in: teamIds },
    isActive: true,
  });
  const override = r.messengerBotFeeCentsOverride;
  const effectiveFeeCents = restaurantBotFeeCents(cfg, r);
  return {
    restaurantId: String(r._id),
    name: r.name,
    access: r.messengerBotAccess ?? 'DEFAULT',
    enabled: r.messengerBotEnabled === true,
    available: restaurantBotAvailable(cfg, r),
    active: restaurantBotActive(cfg, r),
    feeOverrideCents: typeof override === 'number' ? override : null,
    effectiveFeeCents,
    estimatedChargeCents: restaurantBotChargeCents(cfg, r, linkedChatCount),
    linkedChatCount,
  };
}

export async function buildAdminMessengerBotView() {
  const cfg = await getBotPlatformConfig(true);
  const { getTelegramTransportStatus } = await import('./transport.js');
  const transport = await getTelegramTransportStatus();
  return {
    enabled: cfg.enabled,
    availability: cfg.availability,
    botUsername: cfg.telegramUsername,
    botConnected: Boolean(cfg.telegramToken && cfg.telegramUsername),
    feeMonthlyCents: cfg.feeMonthlyCents,
    feePricingMode: cfg.feePricingMode,
    billingMethod: cfg.billingMethod,
    transport,
  };
}
