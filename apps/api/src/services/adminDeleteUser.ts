import crypto from 'node:crypto';
import type mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  AccessRule,
  Blackout,
  BoostCampaign,
  Campaign,
  CoverFee,
  Experience,
  GuestProfile,
  Integration,
  Invoice,
  LoyaltyTransaction,
  Menu,
  Message,
  Notification,
  PrivateDiningInquiry,
  PrivateDiningSpace,
  Promotion,
  Reservation,
  Restaurant,
  RestaurantGroup,
  Review,
  Shift,
  StaffInvite,
  Subscription,
  SupportTicket,
  SurveyConfig,
  SurveyResponse,
  Table,
  TableSlotClaim,
  Ticket,
  User,
  WaitlistEntry,
} from '../models/index.js';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { getPlatformConfig, mapPlatformConfig } from './platformConfig.js';
import { sendEmail } from './notifications.js';
import { logAudit } from './audit.js';

/** Platform admin inbox used for destructive-action 2FA codes. */
export const ADMIN_DELETE_2FA_EMAIL = 'support.uzeats@gmail.com';

const deleteCodeStore = new Map<
  string,
  { code: string; expiresAt: number; adminId: string; userId: string }
>();

function codeStoreKey(adminId: string, userId: string) {
  return `${adminId}:${userId}`;
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function bump(
  counts: Record<string, number>,
  key: string,
  result: { deletedCount?: number },
) {
  counts[key] = (counts[key] ?? 0) + (result.deletedCount ?? 0);
}

export async function isAdminDelete2FARequired(): Promise<boolean> {
  const config = await getPlatformConfig();
  return mapPlatformConfig(config).requireAdminDelete2FA;
}

export async function requestAdminDeleteUserCode(input: {
  adminId: string;
  userId: string;
}) {
  const target = await User.findById(input.userId);
  if (!target) throw new Error('User not found');
  if (target._id.toString() === input.adminId) {
    throw new Error('You cannot delete your own account');
  }

  const requires2FA = await isAdminDelete2FARequired();
  if (!requires2FA) {
    return {
      success: true,
      requires2FA: false,
      message: '2FA is disabled — confirm deletion to proceed.',
      emailedTo: null as string | null,
    };
  }

  const code = env.AUTH_DEV_OTP ? '123456' : generateCode();
  deleteCodeStore.set(codeStoreKey(input.adminId, input.userId), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    adminId: input.adminId,
    userId: input.userId,
  });

  const name = `${target.firstName} ${target.lastName}`.trim();
  await sendEmail(
    ADMIN_DELETE_2FA_EMAIL,
    'Tablevera admin — confirm user deletion',
    [
      'A platform admin requested deletion of a user account.',
      '',
      `User: ${name} (${target.email || target.phone || target._id})`,
      `Role: ${target.role}`,
      `User ID: ${target._id}`,
      '',
      `Confirmation code: ${code}`,
      '',
      'This code expires in 10 minutes. If you did not expect this, ignore the email.',
    ].join('\n'),
  );

  return {
    success: true,
    requires2FA: true,
    message: env.AUTH_DEV_OTP
      ? `Dev OTP sent to ${ADMIN_DELETE_2FA_EMAIL}: 123456`
      : `Confirmation code sent to ${ADMIN_DELETE_2FA_EMAIL}`,
    emailedTo: ADMIN_DELETE_2FA_EMAIL,
  };
}

function consumeDeleteCode(adminId: string, userId: string, code: string | null | undefined) {
  const key = codeStoreKey(adminId, userId);
  const stored = deleteCodeStore.get(key);
  if (!stored) throw new Error('No confirmation code requested — request a new code first');
  if (stored.expiresAt < Date.now()) {
    deleteCodeStore.delete(key);
    throw new Error('Confirmation code expired — request a new code');
  }
  if (!code || stored.code !== code.trim()) {
    throw new Error('Invalid confirmation code');
  }
  deleteCodeStore.delete(key);
}

async function deleteRestaurantCascade(restaurantIds: mongoose.Types.ObjectId[]) {
  const counts: Record<string, number> = {};
  if (restaurantIds.length === 0) return counts;

  const ids = restaurantIds;
  const reservations = await Reservation.find({ restaurantId: { $in: ids } }).select('_id');
  const reservationIds = reservations.map((r) => r._id);
  const experiences = await Experience.find({ restaurantId: { $in: ids } }).select('_id');
  const experienceIds = experiences.map((e) => e._id);

  await bump(counts, 'tableSlotClaims', await TableSlotClaim.deleteMany({ restaurantId: { $in: ids } }));
  if (reservationIds.length) {
    await bump(
      counts,
      'tableSlotClaims',
      await TableSlotClaim.deleteMany({ reservationId: { $in: reservationIds } }),
    );
  }
  await bump(counts, 'reservations', await Reservation.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'waitlist', await WaitlistEntry.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'reviews', await Review.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'messages', await Message.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'guestProfiles', await GuestProfile.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'menus', await Menu.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'tables', await Table.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'shifts', await Shift.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'blackouts', await Blackout.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'campaigns', await Campaign.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'promotions', await Promotion.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'boostCampaigns', await BoostCampaign.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'accessRules', await AccessRule.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'integrations', await Integration.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'subscriptions', await Subscription.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'invoices', await Invoice.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'coverFees', await CoverFee.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'surveyResponses', await SurveyResponse.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'surveyConfigs', await SurveyConfig.deleteMany({ restaurantId: { $in: ids } }));
  await bump(
    counts,
    'privateDiningInquiries',
    await PrivateDiningInquiry.deleteMany({ restaurantId: { $in: ids } }),
  );
  await bump(
    counts,
    'privateDiningSpaces',
    await PrivateDiningSpace.deleteMany({ restaurantId: { $in: ids } }),
  );
  if (experienceIds.length) {
    await bump(counts, 'tickets', await Ticket.deleteMany({ experienceId: { $in: experienceIds } }));
  }
  await bump(counts, 'experiences', await Experience.deleteMany({ restaurantId: { $in: ids } }));
  await bump(counts, 'supportTickets', await SupportTicket.deleteMany({ restaurantId: { $in: ids } }));
  await RestaurantGroup.updateMany({}, { $pull: { restaurantIds: { $in: ids } } });
  await User.updateMany({}, { $pull: { restaurantIds: { $in: ids } } });
  await bump(counts, 'restaurants', await Restaurant.deleteMany({ _id: { $in: ids } }));

  return counts;
}

async function deleteUserRelatedRecords(userId: mongoose.Types.ObjectId) {
  const counts: Record<string, number> = {};

  const ownedRestaurants = await Restaurant.find({ ownerId: userId }).select('_id');
  const ownedIds = ownedRestaurants.map((r) => r._id);
  const restaurantCounts = await deleteRestaurantCascade(ownedIds);
  for (const [key, value] of Object.entries(restaurantCounts)) {
    counts[key] = (counts[key] ?? 0) + value;
  }

  const dinerReservations = await Reservation.find({ dinerId: userId }).select('_id');
  const dinerReservationIds = dinerReservations.map((r) => r._id);
  if (dinerReservationIds.length) {
    await bump(
      counts,
      'tableSlotClaims',
      await TableSlotClaim.deleteMany({ reservationId: { $in: dinerReservationIds } }),
    );
  }
  await bump(counts, 'reservations', await Reservation.deleteMany({ dinerId: userId }));
  await bump(counts, 'waitlist', await WaitlistEntry.deleteMany({ dinerId: userId }));
  await bump(counts, 'reviews', await Review.deleteMany({ dinerId: userId }));
  await Review.updateMany({ flaggedById: userId }, { $unset: { flaggedById: 1 } });
  await bump(
    counts,
    'messages',
    await Message.deleteMany({ $or: [{ dinerId: userId }, { senderId: userId }] }),
  );
  await Message.updateMany({ flaggedById: userId }, { $unset: { flaggedById: 1 } });
  await bump(counts, 'guestProfiles', await GuestProfile.deleteMany({ dinerId: userId }));
  await bump(counts, 'loyalty', await LoyaltyTransaction.deleteMany({ userId }));
  await bump(counts, 'notifications', await Notification.deleteMany({ userId }));
  await bump(counts, 'tickets', await Ticket.deleteMany({ dinerId: userId }));
  await bump(
    counts,
    'privateDiningInquiries',
    await PrivateDiningInquiry.deleteMany({ dinerId: userId }),
  );
  await bump(counts, 'surveyResponses', await SurveyResponse.deleteMany({ dinerId: userId }));
  await bump(counts, 'coverFees', await CoverFee.deleteMany({ dinerId: userId }));
  await bump(
    counts,
    'staffInvites',
    await StaffInvite.deleteMany({ $or: [{ invitedById: userId }, { userId }] }),
  );
  await bump(counts, 'restaurantGroups', await RestaurantGroup.deleteMany({ ownerId: userId }));
  await RestaurantGroup.updateMany({}, { $pull: { adminUserIds: userId } });
  await SupportTicket.updateMany({ requesterId: userId }, { $unset: { requesterId: 1 } });
  await SupportTicket.updateMany({ assigneeId: userId }, { $unset: { assigneeId: 1 } });
  await EmailTemplate.updateMany({ updatedById: userId }, { $unset: { updatedById: 1 } });

  return counts;
}

export async function adminDeleteUser(input: {
  adminId: string;
  userId: string;
  code?: string | null;
}) {
  const target = await User.findById(input.userId);
  if (!target) throw new Error('User not found');
  if (target._id.toString() === input.adminId) {
    throw new Error('You cannot delete your own account');
  }

  if (target.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw new Error('Cannot delete the last admin account');
  }

  const requires2FA = await isAdminDelete2FARequired();
  if (requires2FA) {
    consumeDeleteCode(input.adminId, input.userId, input.code);
  }

  const deletedCounts = await deleteUserRelatedRecords(target._id);
  await User.deleteOne({ _id: target._id });
  deletedCounts.users = 1;

  await logAudit({
    actorId: input.adminId,
    action: 'adminDeleteUser',
    resource: 'User',
    resourceId: input.userId,
    details: {
      email: target.email,
      role: target.role,
      name: `${target.firstName} ${target.lastName}`,
      deletedCounts,
      requireAdminDelete2FA: requires2FA,
    },
  });

  const parts = Object.entries(deletedCounts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`);

  return {
    success: true,
    deletedUserId: input.userId,
    message: parts.length
      ? `Deleted user and related records (${parts.join(', ')})`
      : 'Deleted user',
  };
}
