import {
  AccessRule,
  AuditLog,
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

export type ClearSeedDataResult = {
  deletedCounts: Record<string, number>;
  preservedAdminCount: number;
  message: string;
};

async function bump(
  counts: Record<string, number>,
  key: string,
  result: { deletedCount?: number },
) {
  counts[key] = (counts[key] ?? 0) + (result.deletedCount ?? 0);
}

/**
 * Wipe demo / seed operational data while leaving platform admin accounts
 * (and platform config / email templates) untouched.
 */
export async function clearSeedData(): Promise<ClearSeedDataResult> {
  const counts: Record<string, number> = {};

  await bump(counts, 'tableSlotClaims', await TableSlotClaim.deleteMany({}));
  await bump(counts, 'reservations', await Reservation.deleteMany({}));
  await bump(counts, 'waitlist', await WaitlistEntry.deleteMany({}));
  await bump(counts, 'reviews', await Review.deleteMany({}));
  await bump(counts, 'messages', await Message.deleteMany({}));
  await bump(counts, 'guestProfiles', await GuestProfile.deleteMany({}));
  await bump(counts, 'menus', await Menu.deleteMany({}));
  await bump(counts, 'tables', await Table.deleteMany({}));
  await bump(counts, 'shifts', await Shift.deleteMany({}));
  await bump(counts, 'blackouts', await Blackout.deleteMany({}));
  await bump(counts, 'campaigns', await Campaign.deleteMany({}));
  await bump(counts, 'promotions', await Promotion.deleteMany({}));
  await bump(counts, 'boostCampaigns', await BoostCampaign.deleteMany({}));
  await bump(counts, 'accessRules', await AccessRule.deleteMany({}));
  await bump(counts, 'integrations', await Integration.deleteMany({}));
  await bump(counts, 'subscriptions', await Subscription.deleteMany({}));
  await bump(counts, 'invoices', await Invoice.deleteMany({}));
  await bump(counts, 'coverFees', await CoverFee.deleteMany({}));
  await bump(counts, 'surveyResponses', await SurveyResponse.deleteMany({}));
  await bump(counts, 'surveyConfigs', await SurveyConfig.deleteMany({}));
  await bump(counts, 'privateDiningInquiries', await PrivateDiningInquiry.deleteMany({}));
  await bump(counts, 'privateDiningSpaces', await PrivateDiningSpace.deleteMany({}));
  await bump(counts, 'tickets', await Ticket.deleteMany({}));
  await bump(counts, 'experiences', await Experience.deleteMany({}));
  await bump(counts, 'supportTickets', await SupportTicket.deleteMany({}));
  await bump(counts, 'staffInvites', await StaffInvite.deleteMany({}));
  await bump(counts, 'restaurantGroups', await RestaurantGroup.deleteMany({}));
  await bump(counts, 'loyalty', await LoyaltyTransaction.deleteMany({}));
  await bump(counts, 'notifications', await Notification.deleteMany({}));
  await bump(counts, 'auditLogs', await AuditLog.deleteMany({}));
  await bump(counts, 'restaurants', await Restaurant.deleteMany({}));

  const preservedAdminCount = await User.countDocuments({ role: 'admin' });
  await bump(counts, 'users', await User.deleteMany({ role: { $ne: 'admin' } }));
  await User.updateMany({ role: 'admin' }, { $set: { restaurantIds: [] } });

  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`);

  return {
    deletedCounts: counts,
    preservedAdminCount,
    message: parts.length
      ? `Cleared seed data (${parts.join(', ')}); preserved ${preservedAdminCount} admin account(s)`
      : `No seed data to clear; preserved ${preservedAdminCount} admin account(s)`,
  };
}
