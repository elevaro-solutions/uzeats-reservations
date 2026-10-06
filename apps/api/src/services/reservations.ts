import mongoose from 'mongoose';
import {
  resolveRedeemPoints,
  RESTAURANT_LOYALTY,
  resolveRestaurantRedeemPoints,
  isPlatformAdmin,
  formatDateTimeInTimeZone,
  isoDateInTimeZone,
  restaurantTimeZone,
  bookingRequiresManualApproval,
  resolveBookingCharges,
  BOOKING_CARD_HOLD_MINUTES,
  isLateCancellation,
  splitReservationCancellationReason,
  OCCASION_LABELS,
  resolveDinerReservationSource,
  type Occasion,
} from '@reservations/shared';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { CoverFee } from '../models/CoverFee.js';
import { Message } from '../models/Message.js';
import { findAvailableTable, getTurnTimeMinutes } from './availability.js';
import { smartAssignTable } from './smartAssign.js';
import {
  refundDeposit,
  createPrepaymentIntent,
  createCardGuaranteeSetupIntent,
  describeBookingIntent,
  ensureDinerStripeCustomer,
  cancelBookingIntent,
  isSetupIntentId,
  type BookingIntentState,
} from './stripe.js';
import {
  captureLegacyHold,
  chargeNoShowFee,
  isIncompleteBookingPayment,
  notifyNoShowFeeOutcome,
  releaseCardGuarantee,
  releaseLegacyHold,
} from './bookingPayments.js';
import { earnPoints, redeemPoints, refundRedeemedPoints, awardDepositPoints, awardFirstBookingBonus, awardCompletedVisitPoints, reverseDepositPoints } from './loyalty.js';
import { getLoyaltyProgram } from './loyaltyProgram.js';
import {
  awardRestaurantVisitPoints,
  getRestaurantLoyaltyBalance,
  redeemRestaurantPoints,
  refundRestaurantRedeemedPoints,
} from './restaurantLoyalty.js';
import {
  notifyRestaurantManagers,
  notifyUser,
  scheduleReservationReminders,
} from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';
import {
  EMAIL_BRAND,
  appendEmailButtonsIfMissing,
  emailDetailBox,
  emailParagraph,
  escapeHtml,
} from './emailBranding.js';
import { buildIcsAttachment, googleCalendarUrl } from './calendarInvite.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { checkAccessRules } from './accessRules.js';
import { updateGuestProfileAfterVisit, sendSurveyInvitation } from './guests.js';
import {
  resolvePromotionForBooking,
  recordPromotionRedemption,
  unrecordPromotionRedemption,
} from './promotionCodes.js';
import { redeemGiftCardBalance, resolveGiftCardDiscount, restoreGiftCardBalance } from './giftCards.js';
import { BoostCampaign } from '../models/Marketing.js';
import { claimTableSlots, releaseTableSlotClaims } from './tableSlotClaims.js';
import { getBookableTables } from './floorPlanOps.js';
import {
  markWaitlistBookedForReservation,
  notifyNextWaitlistForSlot,
} from './waitlist.js';
import { listBookmarkUserIds } from './restaurantBookmarks.js';
import { RestaurantPackage } from '../models/RestaurantPackage.js';
import { PrivateDiningSpace } from '../models/PrivateDining.js';
import { Experience } from '../models/Experience.js';

/** ObjectId.equals without throwing when the ref is missing or not an ObjectId. */
function refEquals(value: unknown, id: string): boolean {
  if (!value || typeof value !== 'object' || !('equals' in value)) return false;
  const equals = (value as { equals?: unknown }).equals;
  return typeof equals === 'function' && (value as { equals: (other: string) => boolean }).equals(id);
}

/** Only alert favorites when the freed slot is soon (same urgency as walk-in demand). */
const AVAILABILITY_ALERT_MAX_HOURS = 48;
const AVAILABILITY_ALERT_USER_CAP = 5;

function formatReservationWhen(
  slotStart: Date,
  restaurant?: Parameters<typeof restaurantTimeZone>[0] | null,
) {
  return formatDateTimeInTimeZone(slotStart, restaurantTimeZone(restaurant ?? {}));
}

function publicWebBaseUrl() {
  return (env.WEB_APP_URL || EMAIL_BRAND.siteUrl).replace(/\/+$/, '');
}

function formatOccasionForEmail(occasion: string | null | undefined) {
  if (!occasion) return OCCASION_LABELS.none;
  return OCCASION_LABELS[occasion as Occasion] ?? occasion;
}

function formatPartySizeForEmail(partySize: number) {
  return `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
}

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function notifyDinerBookingConfirmed(input: {
  dinerId: string;
  restaurantId: string;
  reservationId: string;
  restaurantName: string;
  slotStart: Date;
  slotEnd?: Date | null;
  partySize: number;
  guestNotes?: string | null;
  restaurant?: Parameters<typeof restaurantTimeZone>[0] | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
}) {
  const [diner, reservation] = await Promise.all([
    User.findById(input.dinerId),
    Reservation.findById(input.reservationId),
  ]);
  const tables = reservation
    ? await Table.find({ _id: { $in: reservation.tableIds } }).select('name')
    : [];
  const when = formatReservationWhen(input.slotStart, input.restaurant);
  const end = input.slotEnd
    ? new Date(input.slotEnd)
    : new Date(input.slotStart.getTime() + 90 * 60_000);
  const location = [
    input.address?.line1,
    input.address?.city,
    input.address?.state,
    input.address?.zip,
  ]
    .filter(Boolean)
    .join(', ');
  const guestName = [diner?.firstName, diner?.lastName].filter(Boolean).join(' ').trim();
  const occasion = formatOccasionForEmail(reservation?.occasion);
  const partySizeLabel = formatPartySizeForEmail(input.partySize);
  const tableName = tables
    .map((t) => t.name)
    .filter(Boolean)
    .join(', ');
  const guestNotes = (reservation?.guestNotes ?? input.guestNotes ?? '').trim();
  const event = {
    title: `Dinner at ${input.restaurantName}`,
    description: [`Party of ${input.partySize}`, guestNotes ? `Notes: ${guestNotes}` : null]
      .filter(Boolean)
      .join('\n'),
    location,
    start: input.slotStart,
    end,
    uid: `${input.reservationId}@tablevera.online`,
  };
  const reservationUrl = `${publicWebBaseUrl()}/reservations/${input.reservationId}`;

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: guestName || diner?.firstName || 'Guest' },
  ];
  if (diner?.email?.trim()) {
    detailRows.push({ label: 'Email', value: diner.email.trim() });
  }
  detailRows.push({ label: 'Restaurant', value: input.restaurantName });
  if (location) detailRows.push({ label: 'Address', value: location });
  detailRows.push(
    { label: 'Date & time', value: when },
    { label: 'Party size', value: partySizeLabel },
    { label: 'Occasion', value: occasion },
  );
  if (tableName) detailRows.push({ label: 'Table', value: tableName });
  if (reservation?.packageTitle) {
    const packagePrice = reservation.packagePriceCents ?? 0;
    detailRows.push({
      label: 'Package',
      value:
        packagePrice > 0
          ? `${reservation.packageTitle} (+${formatUsdCents(packagePrice)})`
          : reservation.packageTitle,
    });
  }
  if (reservation?.privateDiningSpaceName) {
    const privatePrice = reservation.privateDiningPriceCents ?? 0;
    detailRows.push({
      label: 'Private room',
      value:
        privatePrice > 0
          ? `${reservation.privateDiningSpaceName} (+${formatUsdCents(privatePrice)})`
          : reservation.privateDiningSpaceName,
    });
  }
  if (reservation?.experienceTitle) {
    const experiencePrice = reservation.experiencePriceCents ?? 0;
    detailRows.push({
      label: 'Experience',
      value:
        experiencePrice > 0
          ? `${reservation.experienceTitle} (+${formatUsdCents(experiencePrice)})`
          : reservation.experienceTitle,
    });
  }
  if (guestNotes) detailRows.push({ label: 'Special requests', value: guestNotes });
  if ((reservation?.depositAmountCents ?? 0) > 0) {
    detailRows.push({
      label: 'Deposit',
      value: formatUsdCents(reservation!.depositAmountCents),
    });
  }

  const calendarUrl = googleCalendarUrl(event);
  const rendered = await renderEmailTemplate('booking_confirmation', {
    firstName: diner?.firstName || 'there',
    guestName: guestName || diner?.firstName || 'Guest',
    restaurantName: input.restaurantName,
    date: when,
    partySize: partySizeLabel,
    occasion,
    guestNotes: guestNotes || 'None',
    address: location || '—',
    detailBox: emailDetailBox(detailRows),
    reservationUrl,
    calendarUrl,
  });
  const htmlBody = appendEmailButtonsIfMissing(
    rendered.bodyHtml,
    [
      { href: calendarUrl, label: 'Add to Google Calendar' },
      { href: reservationUrl, label: 'View reservation' },
    ],
    reservationUrl,
  );

  await notifyUser(
    input.dinerId,
    {
      type: 'reservation_confirmed',
      title: rendered.subject,
      body:
        rendered.bodyText ||
        `Your reservation at ${input.restaurantName} on ${when} for ${partySizeLabel} is confirmed.`,
      htmlBody,
      attachments: [buildIcsAttachment(event)],
      data: { reservationId: input.reservationId },
    },
    { smsRestaurantId: input.restaurantId },
  );
}

async function notifyDinerBookingCancelled(input: {
  dinerId: string;
  restaurantId: string;
  reservationId: string;
  restaurantName: string;
  slotStart: Date;
  cancellationReason?: string | null;
  restaurant?: Parameters<typeof restaurantTimeZone>[0] | null;
}) {
  const diner = await User.findById(input.dinerId);
  const when = formatReservationWhen(input.slotStart, input.restaurant);
  const { reason, message } = splitReservationCancellationReason(input.cancellationReason);
  const reasonLabel = reason || 'Not provided';
  const messageSection = message
    ? emailParagraph(`<strong>Message:</strong> ${escapeHtml(message)}`)
    : '';
  const messageText = message ? `\nMessage: ${message}` : '';
  const reservationUrl = `${publicWebBaseUrl()}/reservations/${input.reservationId}`;
  const rendered = await renderEmailTemplate('booking_cancelled', {
    firstName: diner?.firstName || 'there',
    restaurantName: input.restaurantName,
    date: when,
    reason: reasonLabel,
    messageSection,
    messageText,
    reservationUrl,
  });
  const htmlBody = appendEmailButtonsIfMissing(
    rendered.bodyHtml,
    [{ href: reservationUrl, label: 'View reservation' }],
    reservationUrl,
  );
  const body =
    rendered.bodyText ||
    `Your reservation at ${input.restaurantName} on ${when} was cancelled.${
      reason ? ` Reason: ${reason}.` : ''
    }${message ? ` Message: ${message}` : ''}`;

  await notifyUser(
    input.dinerId,
    {
      type: 'reservation_cancelled',
      title: rendered.subject,
      body,
      htmlBody,
      data: {
        reservationId: input.reservationId,
        reason: reason || undefined,
        message: message || undefined,
      },
    },
    { smsRestaurantId: input.restaurantId },
  );
}

async function notifyDinerBookingPendingApproval(input: {
  dinerId: string;
  restaurantId: string;
  reservationId: string;
  restaurantName: string;
  slotStart: Date;
  partySize: number;
  restaurant?: Parameters<typeof restaurantTimeZone>[0] | null;
}) {
  const diner = await User.findById(input.dinerId).select('firstName');
  const when = formatReservationWhen(input.slotStart, input.restaurant);
  const reservationUrl = `${publicWebBaseUrl()}/reservations/${input.reservationId}`;
  const partySizeLabel = formatPartySizeForEmail(input.partySize);
  const rendered = await renderEmailTemplate('booking_pending', {
    firstName: diner?.firstName || 'there',
    restaurantName: input.restaurantName,
    date: when,
    partySize: partySizeLabel,
    reservationUrl,
  });
  await notifyUser(
    input.dinerId,
    {
      type: 'reservation_pending_approval',
      title: rendered.subject,
      body: rendered.bodyText || `Your party of ${input.partySize} on ${when} is awaiting restaurant confirmation.`,
      htmlBody: appendEmailButtonsIfMissing(
        rendered.bodyHtml,
        [{ href: reservationUrl, label: 'View request' }],
        reservationUrl,
      ),
      data: { reservationId: input.reservationId },
    },
    { smsRestaurantId: input.restaurantId },
  );
}

async function notifyRestaurantBookingNeedsApproval(input: {
  restaurantId: string;
  reservationId: string;
  restaurantName: string;
  slotStart: Date;
  partySize: number;
  restaurant?: Parameters<typeof restaurantTimeZone>[0] | null;
}) {
  await notifyRestaurantManagers(input.restaurantId, {
    type: 'reservation_needs_approval',
    title: 'Reservation needs approval',
    body: `Party of ${input.partySize} at ${formatReservationWhen(input.slotStart, input.restaurant)} — ${input.restaurantName}`,
    data: { reservationId: input.reservationId },
  });
}

async function reserveExperienceTickets(experienceId: string, quantity: number) {
  const exp = await Experience.findById(experienceId);
  if (!exp) throw new ValidationError('Experience is not available');
  const available = exp.maxGuests - (exp.ticketsSold ?? 0);
  if (available < quantity) {
    throw new ValidationError('Not enough experience tickets available');
  }
  await Experience.findByIdAndUpdate(experienceId, { $inc: { ticketsSold: quantity } });
  const updated = await Experience.findById(experienceId);
  if (updated && updated.ticketsSold >= updated.maxGuests) {
    updated.status = 'sold_out';
    await updated.save();
  }
}

async function releaseExperienceTickets(experienceId: string, quantity: number) {
  if (!quantity) return;
  await Experience.findByIdAndUpdate(experienceId, { $inc: { ticketsSold: -quantity } });
  const exp = await Experience.findById(experienceId);
  if (exp && exp.status === 'sold_out' && exp.ticketsSold < exp.maxGuests) {
    exp.status = 'published';
    await exp.save();
  }
}

async function findOrCreateDiner(guest: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
}) {
  let diner = null;
  if (guest.email) diner = await User.findOne({ email: guest.email.toLowerCase() });
  if (!diner && guest.phone) diner = await User.findOne({ phone: guest.phone });
  // Link the reservation to an existing diner when email/phone matches, but never
  // overwrite their profile from unauthenticated guest input.
  if (diner) return diner;

  return User.create({
    email: guest.email?.toLowerCase(),
    phone: guest.phone,
    firstName: guest.firstName,
    // Owner guest input allows omitting last name; User.lastName may be empty.
    lastName: guest.lastName?.trim() || '',
    role: 'diner',
  });
}

async function resolveTable(input: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  slotEnd: Date;
  dinerId?: string;
  tableId?: string;
  useSmartAssign?: boolean;
  /** Restrict auto-assign to these tables (private dining). */
  tableIds?: string[];
}) {
  if (input.tableId) {
    const table = await Table.findOne({
      _id: input.tableId,
      restaurantId: input.restaurantId,
      active: true,
    });
    if (!table) throw new NotFoundError('Table');
    if (table.minCapacity > input.partySize || table.maxCapacity < input.partySize) {
      throw new ValidationError('Table capacity does not fit this party size');
    }
    if (
      input.tableIds &&
      input.tableIds.length > 0 &&
      !input.tableIds.some((id) => table._id.equals(id))
    ) {
      throw new ValidationError('Selected table is not part of this private room');
    }
    const bookable = await getBookableTables({
      restaurantId: input.restaurantId,
      partySize: input.partySize,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      tableIds: input.tableIds,
    });
    if (!bookable.some((t) => t._id.equals(table._id))) {
      throw new ConflictError('Selected table is not available for this time');
    }
    return table;
  }

  if (input.useSmartAssign !== false && input.dinerId) {
    return smartAssignTable({
      restaurantId: input.restaurantId,
      partySize: input.partySize,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      dinerId: input.dinerId,
      tableIds: input.tableIds,
    });
  }

  return findAvailableTable({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
    tableIds: input.tableIds,
  });
}

export async function createReservation(input: {
  dinerId: string;
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  occasion?: string;
  guestNotes?: string;
  redeemPoints?: number;
  redeemRestaurantPoints?: number;
  promoCode?: string;
  giftCardCode?: string;
  source?: string;
  tableId?: string;
  packageId?: string;
  privateDiningSpaceId?: string;
  experienceId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPath?: string;
  originUrl?: string;
  referrer?: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new ValidationError('Restaurant not available');
  }

  if (restaurant.reservationsEnabled === false) {
    throw new ValidationError('This restaurant is not accepting online reservations');
  }

  if (input.slotStart.getTime() <= Date.now()) {
    throw new ValidationError('That time is no longer available — pick a future slot');
  }

  if (input.tableId && !restaurant.allowGuestTableSelection) {
    throw new ValidationError('Table selection is not enabled for this restaurant');
  }

  const accessViolation = await checkAccessRules({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
  });
  if (accessViolation) throw new ValidationError(accessViolation);

  let packageTitle: string | undefined;
  let packagePriceCents = 0;
  let packageId: string | undefined;
  let packageRequiresManualApproval = false;
  if (input.packageId) {
    const pkg = await RestaurantPackage.findById(input.packageId);
    if (!pkg || pkg.restaurantId.toString() !== input.restaurantId || !pkg.active) {
      throw new ValidationError('Package is not available');
    }
    const occasion = input.occasion ?? 'none';
    const packageOccasions = (pkg.occasions ?? []) as string[];
    if (
      packageOccasions.length &&
      occasion !== 'none' &&
      !packageOccasions.includes(occasion)
    ) {
      throw new ValidationError('This package is not available for the selected occasion');
    }
    if (pkg.minPartySize != null && input.partySize < pkg.minPartySize) {
      throw new ValidationError(`This package requires at least ${pkg.minPartySize} guests`);
    }
    if (pkg.maxPartySize != null && input.partySize > pkg.maxPartySize) {
      throw new ValidationError(`This package allows at most ${pkg.maxPartySize} guests`);
    }
    packageId = pkg._id.toString();
    packageTitle = pkg.title;
    packagePriceCents = pkg.pricePerGuest
      ? pkg.priceCents * input.partySize
      : pkg.priceCents;
    packageRequiresManualApproval = pkg.requiresManualApproval === true;
  }

  let privateDiningSpaceName: string | undefined;
  let privateDiningPriceCents = 0;
  let privateDiningSpaceId: string | undefined;
  let privateDiningRequiresManualApproval = false;
  let privateDiningTableIds: string[] | undefined;
  if (input.privateDiningSpaceId) {
    const space = await PrivateDiningSpace.findById(input.privateDiningSpaceId);
    if (!space || space.restaurantId.toString() !== input.restaurantId || !space.active) {
      throw new ValidationError('Private room is not available');
    }
    if (input.partySize < space.minGuests) {
      throw new ValidationError(`This private room requires at least ${space.minGuests} guests`);
    }
    if (input.partySize > space.maxGuests) {
      throw new ValidationError(`This private room allows at most ${space.maxGuests} guests`);
    }
    const { ensurePrivateDiningBackingTables } = await import('./privateDining.js');
    const backing = await ensurePrivateDiningBackingTables(space);
    privateDiningTableIds = backing.map(String);
    privateDiningSpaceId = space._id.toString();
    privateDiningSpaceName = space.name;
    privateDiningPriceCents = space.rentalFeeCents ?? 0;
    privateDiningRequiresManualApproval = space.requiresManualApproval === true;
  }

  let experienceTitle: string | undefined;
  let experiencePriceCents = 0;
  let experienceId: string | undefined;
  let experienceTicketQty = 0;
  let experienceRequiresManualApproval = false;
  if (input.experienceId) {
    const exp = await Experience.findById(input.experienceId);
    if (!exp || exp.restaurantId.toString() !== input.restaurantId) {
      throw new ValidationError('Experience is not available');
    }
    if (exp.status !== 'published') {
      throw new ValidationError('Experience is not available for booking');
    }
    const tz = restaurantTimeZone(restaurant);
    const slotDay = isoDateInTimeZone(input.slotStart, tz);
    const expStart = isoDateInTimeZone(exp.date, tz);
    const expEnd = isoDateInTimeZone(exp.endDate ?? exp.date, tz);
    if (slotDay < expStart || slotDay > expEnd) {
      throw new ValidationError('Experience is not available on the selected date');
    }
    const minGuests = exp.minGuests ?? 1;
    if (input.partySize < minGuests) {
      throw new ValidationError(`This experience requires at least ${minGuests} guests`);
    }
    if (input.partySize > exp.maxGuests) {
      throw new ValidationError(`This experience allows at most ${exp.maxGuests} guests`);
    }
    const available = exp.maxGuests - (exp.ticketsSold ?? 0);
    if (available < input.partySize) {
      throw new ValidationError('Not enough experience tickets for your party size');
    }
    experienceId = exp._id.toString();
    experienceTitle = exp.title;
    experienceTicketQty = input.partySize;
    experiencePriceCents = exp.ticketPriceCents * input.partySize;
    experienceRequiresManualApproval = exp.requiresManualApproval === true;
  }

  const turn = await getTurnTimeMinutes(input.restaurantId, input.slotStart);
  const slotEnd = new Date(input.slotStart.getTime() + turn * 60_000);

  // Last line of defence against replayed / double-submitted bookings: a diner
  // cannot hold two live reservations for the same venue and start time.
  const duplicate = await Reservation.findOne({
    dinerId: input.dinerId,
    restaurantId: input.restaurantId,
    slotStart: input.slotStart,
    status: { $in: ['pending', 'confirmed', 'seated'] },
  }).select('_id');
  if (duplicate) {
    throw new ConflictError('You already have a reservation at this restaurant for that time');
  }

  const table = await resolveTable({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd,
    dinerId: input.dinerId,
    tableId: input.tableId,
    useSmartAssign: restaurant.useSmartAssign !== false,
    tableIds: privateDiningTableIds,
  });
  if (!table) throw new ConflictError('No tables available for this time');

  const needsManualApproval = bookingRequiresManualApproval({
    restaurant: {
      enabled: restaurant.manualApprovalEnabled === true,
      partySizeOp: restaurant.manualApprovalPartySizeOp === 'gt' ? 'gt' : 'gte',
      partySize: restaurant.manualApprovalPartySize ?? null,
    },
    partySize: input.partySize,
    resourceRequiresApproval: [
      table.requiresManualApproval === true,
      packageRequiresManualApproval,
      privateDiningRequiresManualApproval,
      experienceRequiresManualApproval,
    ],
  });

  const priorReservations = await Reservation.countDocuments({ dinerId: input.dinerId });

  const { prepaidGrossCents: grossDepositCents, noShowFeeCents } = resolveBookingCharges({
    restaurant,
    table,
    partySize: input.partySize,
    addOnsCents: packagePriceCents + privateDiningPriceCents + experiencePriceCents,
  });

  let pointsToRedeem = 0;
  let restaurantPointsToRedeem = 0;
  let depositAmountCents = grossDepositCents;
  if (input.redeemPoints && input.redeemPoints > 0) {
    const diner = await User.findById(input.dinerId).select('loyaltyPoints');
    if (!diner) throw new NotFoundError('User');
    const program = await getLoyaltyProgram();
    const redeem = resolveRedeemPoints(
      input.redeemPoints,
      grossDepositCents,
      diner.loyaltyPoints ?? 0,
      {
        minRedeemPoints: program.minRedeemPoints,
        redeemPointsPerDollar: program.redeemPointsPerDollar,
      },
    );
    if (!redeem) {
      throw new ValidationError(`Minimum redeem is ${program.minRedeemPoints} points`);
    }
    pointsToRedeem = redeem.pointsToRedeem;
    depositAmountCents = grossDepositCents - redeem.discountCents;
  }

  if (input.redeemRestaurantPoints && input.redeemRestaurantPoints > 0) {
    if (!restaurant.loyaltyEnabled) {
      throw new ValidationError('Restaurant loyalty is not enabled');
    }
    const minRedeem =
      restaurant.loyaltyMinRedeemPoints ?? RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
    const balance = await getRestaurantLoyaltyBalance(input.restaurantId, input.dinerId);
    const redeem = resolveRestaurantRedeemPoints(
      input.redeemRestaurantPoints,
      depositAmountCents,
      balance,
      minRedeem,
    );
    if (!redeem) {
      throw new ValidationError(`Minimum redeem is ${minRedeem} restaurant points`);
    }
    restaurantPointsToRedeem = redeem.pointsToRedeem;
    depositAmountCents -= redeem.discountCents;
  }

  let promotionId: string | undefined;
  let promoDiscountCents = 0;
  const promo = await resolvePromotionForBooking({
    restaurantId: input.restaurantId,
    code: input.promoCode,
    slotStart: input.slotStart,
    depositCents: depositAmountCents,
  });
  if (promo) {
    promotionId = promo.promotion._id.toString();
    promoDiscountCents = promo.discountCents;
    depositAmountCents -= promoDiscountCents;
  }

  let giftCardId: string | undefined;
  let giftCardDiscountCents = 0;
  if (input.giftCardCode?.trim()) {
    const giftCard = await resolveGiftCardDiscount({
      restaurantId: input.restaurantId,
      code: input.giftCardCode,
      depositCents: depositAmountCents,
    });
    giftCardId = giftCard.giftCard._id.toString();
    giftCardDiscountCents = giftCard.discountCents;
    depositAmountCents -= giftCardDiscountCents;
  }

  let depositStatus: 'none' | 'requires_payment' | 'captured' = 'none';
  let cardGuaranteeStatus: 'none' | 'requires_card' | 'card_saved' = 'none';
  let stripePaymentIntentId: string | undefined;
  let stripeSetupIntentId: string | undefined;
  let stripeCustomerId: string | undefined;
  let stripePaymentMethodId: string | undefined;
  let clientSecret: string | undefined;
  let requiresPayment = false;

  const intentMetadata = { restaurantId: input.restaurantId, dinerId: input.dinerId };
  if (noShowFeeCents > 0) {
    stripeCustomerId = await ensureDinerStripeCustomer(input.dinerId);
  }

  // One card step: a prepayment also saves the card for the fee; otherwise a SetupIntent only saves it.
  if (depositAmountCents > 0) {
    const intent = await createPrepaymentIntent({
      amountCents: depositAmountCents,
      metadata: intentMetadata,
      customerId: stripeCustomerId,
      saveCardForOffSession: noShowFeeCents > 0,
    });
    stripePaymentIntentId = intent.id;
    clientSecret = intent.client_secret ?? undefined;
    depositStatus = intent.isStub ? 'captured' : 'requires_payment';
    if (noShowFeeCents > 0) cardGuaranteeStatus = intent.isStub ? 'card_saved' : 'requires_card';
    requiresPayment = !intent.isStub;
  } else if (noShowFeeCents > 0 && stripeCustomerId) {
    const intent = await createCardGuaranteeSetupIntent({
      customerId: stripeCustomerId,
      metadata: intentMetadata,
    });
    stripeSetupIntentId = intent.id;
    clientSecret = intent.client_secret ?? undefined;
    cardGuaranteeStatus = intent.isStub ? 'card_saved' : 'requires_card';
    requiresPayment = !intent.isStub;
  }
  if (cardGuaranteeStatus === 'card_saved') stripePaymentMethodId = 'pm_dev';

  const reservation = await Reservation.create({
    restaurantId: input.restaurantId,
    dinerId: input.dinerId,
    tableIds: [table._id],
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd,
    status: requiresPayment || needsManualApproval ? 'pending' : 'confirmed',
    requiresManualApproval: needsManualApproval,
    occasion: input.occasion ?? 'none',
    guestNotes: input.guestNotes ?? '',
    source: resolveDinerReservationSource({
      source: input.source,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
    }),
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
    landingPath: input.landingPath,
    originUrl: input.originUrl,
    referrer: input.referrer,
    packageId,
    packageTitle,
    packagePriceCents,
    privateDiningSpaceId,
    privateDiningSpaceName,
    privateDiningPriceCents,
    experienceId,
    experienceTitle,
    experiencePriceCents,
    experienceTicketQty,
    depositAmountCents,
    stripePaymentIntentId,
    depositStatus,
    noShowFeeCents: cardGuaranteeStatus === 'none' ? 0 : noShowFeeCents,
    cardGuaranteeStatus,
    stripeCustomerId,
    stripeSetupIntentId,
    stripePaymentMethodId,
    loyaltyPointsRedeemed: pointsToRedeem,
    restaurantLoyaltyPointsRedeemed: restaurantPointsToRedeem,
    promotionId,
    promoDiscountCents,
    giftCardId,
    giftCardDiscountCents,
  });

  try {
    await claimTableSlots({
      restaurantId: input.restaurantId,
      tableId: table._id,
      reservationId: reservation._id,
      slotStart: input.slotStart,
      slotEnd,
    });

    if (pointsToRedeem > 0) {
      await redeemPoints(input.dinerId, pointsToRedeem, reservation._id.toString());
    }
    if (restaurantPointsToRedeem > 0) {
      await redeemRestaurantPoints({
        restaurantId: input.restaurantId,
        dinerId: input.dinerId,
        points: restaurantPointsToRedeem,
        reservationId: reservation._id.toString(),
        minRedeem:
          restaurant.loyaltyMinRedeemPoints ?? RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS,
      });
    }
    if (promotionId) {
      await recordPromotionRedemption(promotionId);
    }
    if (giftCardId && giftCardDiscountCents > 0) {
      await redeemGiftCardBalance(giftCardId, giftCardDiscountCents);
    }
    if (experienceId && experienceTicketQty > 0) {
      await reserveExperienceTickets(experienceId, experienceTicketQty);
    }
  } catch (err) {
    await releaseTableSlotClaims(reservation._id);
    await Reservation.deleteOne({ _id: reservation._id });
    throw err;
  }

  // The booking is already saved. A side-effect failure here must not return an
  // error, or the diner retries and hits the duplicate-reservation guard.
  const reservationId = reservation._id.toString();
  const softFail = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      logger.error({ err, reservationId }, `[reservations] ${label} after create failed`);
    }
  };

  if (depositStatus === 'captured') {
    await softFail('deposit points', () =>
      awardDepositPoints({
        dinerId: input.dinerId,
        reservationId,
        depositAmountCents,
        depositStatus,
      }),
    );
  }

  // Card-hold / prepaid bookings are not placed until the diner finishes Stripe.
  if (!requiresPayment) {
    if (priorReservations === 0) {
      await softFail('first booking bonus', () => awardFirstBookingBonus(input.dinerId));
    }
    await softFail('waitlist convert', () =>
      markWaitlistBookedForReservation({
        dinerId: input.dinerId,
        restaurantId: input.restaurantId,
        slotStart: input.slotStart,
        reservationId,
      }),
    );
  }

  // Redis / SendGrid must not keep the GraphQL mutation open. The booking is
  // already saved; the client needs clientSecret immediately for the card step.
  void (async () => {
    if (reservation.status === 'confirmed') {
      await softFail('reminder scheduling', () => scheduleReservationReminders(reservationId));
      await softFail('diner confirmation', () =>
        notifyDinerBookingConfirmed({
          dinerId: input.dinerId,
          restaurantId: input.restaurantId,
          reservationId,
          restaurantName: restaurant.name,
          slotStart: input.slotStart,
          slotEnd: reservation.slotEnd,
          partySize: input.partySize,
          guestNotes: reservation.guestNotes,
          restaurant,
          address: restaurant.address,
        }),
      );
      await softFail('manager notification', () =>
        notifyRestaurantManagers(input.restaurantId, {
          type: 'new_reservation',
          title: 'New reservation',
          body: `Party of ${input.partySize} at ${formatReservationWhen(input.slotStart, restaurant)} — ${restaurant.name}`,
          data: { reservationId },
        }),
      );
    } else if (needsManualApproval && !requiresPayment) {
      await softFail('diner pending-approval notice', () =>
        notifyDinerBookingPendingApproval({
          dinerId: input.dinerId,
          restaurantId: input.restaurantId,
          reservationId,
          restaurantName: restaurant.name,
          slotStart: input.slotStart,
          partySize: input.partySize,
          restaurant,
        }),
      );
      await softFail('restaurant approval notice', () =>
        notifyRestaurantBookingNeedsApproval({
          restaurantId: input.restaurantId,
          reservationId,
          restaurantName: restaurant.name,
          slotStart: input.slotStart,
          partySize: input.partySize,
          restaurant,
        }),
      );
    }
  })();

  return { reservation, clientSecret: requiresPayment ? clientSecret : null };
}

function findReservationByBookingIntent(intentId: string) {
  return isSetupIntentId(intentId)
    ? Reservation.findOne({ stripeSetupIntentId: intentId })
    : Reservation.findOne({ stripePaymentIntentId: intentId });
}

function bookingPaymentSettled(reservation: {
  depositStatus?: string | null;
  cardGuaranteeStatus?: string | null;
}) {
  return (
    reservation.depositStatus !== 'requires_payment' &&
    reservation.cardGuaranteeStatus !== 'requires_card'
  );
}

function isIntentComplete(status: string) {
  // `requires_capture` only occurs for legacy manual-capture deposits.
  return status === 'succeeded' || status === 'requires_capture';
}

/**
 * Confirm the booking card step after Stripe succeeds (or stub confirm).
 * Accepts a PaymentIntent id (prepayment) or SetupIntent id (card guarantee).
 */
export async function confirmDepositPayment(input: {
  paymentIntentId: string;
  dinerId: string;
}) {
  const reservation = await findReservationByBookingIntent(input.paymentIntentId);
  if (!reservation) throw new NotFoundError('Reservation for payment');
  if (!reservation.dinerId.equals(input.dinerId)) throw new ForbiddenError();
  if (bookingPaymentSettled(reservation)) return reservation;

  const state = await describeBookingIntent(input.paymentIntentId);
  if (!isIntentComplete(state.status)) {
    throw new ValidationError(`Payment not completed (status: ${state.status})`);
  }
  return (await confirmDeposit(input.paymentIntentId, state)) ?? reservation;
}

async function rollbackIncompleteBooking(reservation: InstanceType<typeof Reservation>) {
  const reservationId = reservation._id.toString();
  if (reservation.experienceId && reservation.experienceTicketQty > 0) {
    await releaseExperienceTickets(
      reservation.experienceId.toString(),
      reservation.experienceTicketQty,
    );
  }
  if (reservation.loyaltyPointsRedeemed > 0) {
    await refundRedeemedPoints(
      reservation.dinerId.toString(),
      reservation.loyaltyPointsRedeemed,
      reservationId,
    );
  }
  if (reservation.restaurantLoyaltyPointsRedeemed > 0) {
    await refundRestaurantRedeemedPoints({
      restaurantId: reservation.restaurantId.toString(),
      dinerId: reservation.dinerId.toString(),
      points: reservation.restaurantLoyaltyPointsRedeemed,
      reservationId,
    });
  }
  if (reservation.promotionId) {
    await unrecordPromotionRedemption(reservation.promotionId.toString());
  }
  if (reservation.giftCardId && reservation.giftCardDiscountCents > 0) {
    await restoreGiftCardBalance(
      reservation.giftCardId.toString(),
      reservation.giftCardDiscountCents,
    );
  }
  await releaseTableSlotClaims(reservation._id);
  const intentId = reservation.stripeSetupIntentId || reservation.stripePaymentIntentId;
  if (intentId) {
    await cancelBookingIntent(intentId);
  }
  await Reservation.deleteOne({ _id: reservation._id });
}

/**
 * Discard a booking that never finished the Stripe card form so it is not a placed reservation.
 * If Stripe already succeeded, confirm instead of deleting.
 */
export async function abandonIncompleteBooking(input: {
  reservationId: string;
  dinerId?: string;
}) {
  const reservation = await Reservation.findById(input.reservationId);
  if (!reservation) throw new NotFoundError('Reservation');
  if (input.dinerId && !reservation.dinerId.equals(input.dinerId)) throw new ForbiddenError();
  if (!isIncompleteBookingPayment(reservation)) {
    return reservation;
  }

  const intentId = reservation.stripeSetupIntentId || reservation.stripePaymentIntentId;
  if (intentId) {
    try {
      const state = await describeBookingIntent(intentId);
      if (isIntentComplete(state.status)) {
        return (await confirmDeposit(intentId, state)) ?? reservation;
      }
    } catch (err) {
      logger.warn(
        { err, reservationId: reservation._id },
        '[reservations] could not read booking intent; discarding incomplete hold',
      );
    }
  }

  await rollbackIncompleteBooking(reservation);
  return null;
}

/** Drop card-hold bookings the diner never finished, so the table is not held forever. */
export async function expireAbandonedIncompleteBookings(now = new Date()) {
  const cutoff = new Date(now.getTime() - BOOKING_CARD_HOLD_MINUTES * 60_000);
  const stale = await Reservation.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
    $or: [
      { depositStatus: 'requires_payment' },
      { cardGuaranteeStatus: 'requires_card' },
    ],
  }).select('_id');
  let expired = 0;
  for (const row of stale) {
    try {
      await abandonIncompleteBooking({ reservationId: row._id.toString() });
      expired += 1;
    } catch (err) {
      logger.error({ err, reservationId: row._id }, '[reservations] expire incomplete booking failed');
    }
  }
  return { expired };
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  actorId: string,
  reason?: string,
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner = Boolean(
    restaurant &&
      (refEquals(restaurant.ownerId, actorId) ||
        user?.restaurantIds?.some((id) => refEquals(id, restaurant._id.toString()))),
  );
  const isDiner = refEquals(reservation.dinerId, actorId);
  const isAdmin = user ? isPlatformAdmin(user.role) : false;

  if (!isOwner && !isDiner && !isAdmin) throw new ForbiddenError();

  // Retries, double-clicks, and UIs that offer Confirm on already-confirmed
  // bookings should not fail — most reservations skip pending entirely.
  if (reservation.status === status) return reservation;

  // Floor offers Complete on an arriving (not yet seated) party. Staff may
  // close those out; diners still have to follow seat → complete.
  const isStaff = isOwner || isAdmin;
  const allowed: Record<string, string[]> = {
    pending: isStaff
      ? ['confirmed', 'cancelled', 'completed']
      : ['confirmed', 'cancelled'],
    confirmed: isStaff
      ? ['seated', 'cancelled', 'no_show', 'completed']
      : ['seated', 'cancelled', 'no_show'],
    seated: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (!allowed[reservation.status]?.includes(status)) {
    throw new ValidationError(`Cannot transition from ${reservation.status} to ${status}`);
  }

  const previousStatus = reservation.status;
  reservation.status = status as typeof reservation.status;
  let feeOutcome: Awaited<ReturnType<typeof chargeNoShowFee>> = 'skipped';

  if (status === 'seated') {
    reservation.seatedAt = new Date();
    releaseCardGuarantee(reservation);
  }

  if (status === 'cancelled') {
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason;
    if (reservation.experienceId && reservation.experienceTicketQty > 0) {
      await releaseExperienceTickets(
        reservation.experienceId.toString(),
        reservation.experienceTicketQty,
      );
    }
    // Restaurant-side cancels and on-time diner cancels are free; a diner cancelling a
    // confirmed booking inside the window forfeits prepayment and pays the guaranteed fee.
    const lateDinerCancel =
      isDiner &&
      !isStaff &&
      previousStatus === 'confirmed' &&
      isLateCancellation(reservation.slotStart);
    if (lateDinerCancel) {
      feeOutcome = await chargeNoShowFee(reservation, 'late_cancel');
    } else {
      if (reservation.stripePaymentIntentId && reservation.depositStatus === 'authorized') {
        await refundDeposit(reservation.stripePaymentIntentId);
        reservation.depositStatus = 'refunded';
      } else if (reservation.stripePaymentIntentId && reservation.depositStatus === 'captured') {
        const remaining = reservation.depositAmountCents - (reservation.depositRefundedCents ?? 0);
        if (remaining > 0) {
          await refundDeposit(reservation.stripePaymentIntentId, remaining);
        }
        reservation.depositStatus = 'refunded';
        reservation.depositRefundedCents = reservation.depositAmountCents;
      }
      releaseCardGuarantee(reservation);
    }
    if (reservation.loyaltyPointsRedeemed > 0) {
      await refundRedeemedPoints(
        reservation.dinerId.toString(),
        reservation.loyaltyPointsRedeemed,
        reservation._id.toString(),
      );
    }
    if (reservation.restaurantLoyaltyPointsRedeemed > 0) {
      await refundRestaurantRedeemedPoints({
        restaurantId: reservation.restaurantId.toString(),
        dinerId: reservation.dinerId.toString(),
        points: reservation.restaurantLoyaltyPointsRedeemed,
        reservationId: reservation._id.toString(),
      });
    }
    await reverseDepositPoints(
      reservation.dinerId.toString(),
      reservation._id.toString(),
    );
  }

  if (status === 'no_show') {
    await captureLegacyHold(reservation);
    feeOutcome = await chargeNoShowFee(reservation, 'no_show');
  }

  if (status === 'completed') {
    releaseCardGuarantee(reservation);
    try {
      await releaseLegacyHold(reservation);
    } catch (err) {
      logger.error({ err, reservationId }, '[reservations] legacy hold release on complete failed');
    }
  }

  if (status === 'completed' && reservation.dinerId) {
    try {
      const points = await awardCompletedVisitPoints(
        reservation.dinerId.toString(),
        reservation._id.toString(),
      );
      reservation.loyaltyPointsEarned = points;

      const restaurantDoc = await Restaurant.findById(reservation.restaurantId).select(
        'loyaltyEnabled loyaltyPointsPerVisit',
      );
      if (restaurantDoc?.loyaltyEnabled) {
        const restaurantPoints = await awardRestaurantVisitPoints({
          restaurantId: reservation.restaurantId.toString(),
          dinerId: reservation.dinerId.toString(),
          reservationId: reservation._id.toString(),
          pointsPerVisit:
            restaurantDoc.loyaltyPointsPerVisit ?? RESTAURANT_LOYALTY.DEFAULT_POINTS_PER_VISIT,
        });
        reservation.restaurantLoyaltyPointsEarned = restaurantPoints;
      }
    } catch (err) {
      // Points must not block close-out. A loyalty/transaction failure was
      // surfacing as a masked Internal server error on the Complete button.
      logger.error({ err, reservationId }, '[reservations] loyalty award on complete failed');
    }

    await recordCoverFee(reservation);
    await attributeBoostCampaign(reservation);
  }

  await reservation.save();

  await notifyNoShowFeeOutcome(reservation, feeOutcome, restaurant?.name ?? 'the restaurant');

  if (status === 'cancelled' || status === 'completed' || status === 'no_show') {
    try {
      await releaseTableSlotClaims(reservation._id);
    } catch (err) {
      logger.error({ err, reservationId }, '[reservations] failed to release table slots');
    }
  }

  if (status === 'confirmed') {
    await scheduleReservationReminders(reservation._id.toString());
    await notifyDinerBookingConfirmed({
      dinerId: reservation.dinerId.toString(),
      restaurantId: reservation.restaurantId.toString(),
      reservationId: reservation._id.toString(),
      restaurantName: restaurant?.name ?? 'the restaurant',
      slotStart: reservation.slotStart,
      slotEnd: reservation.slotEnd,
      partySize: reservation.partySize,
      guestNotes: reservation.guestNotes,
      restaurant,
      address: restaurant?.address,
    });
  }

  if (status === 'cancelled') {
    const restaurantName = restaurant?.name ?? 'the restaurant';
    await notifyDinerBookingCancelled({
      dinerId: reservation.dinerId.toString(),
      restaurantId: reservation.restaurantId.toString(),
      reservationId: reservation._id.toString(),
      restaurantName,
      slotStart: reservation.slotStart,
      cancellationReason: reservation.cancellationReason,
      restaurant,
    });
    if (isDiner) {
      const { reason, message } = splitReservationCancellationReason(reservation.cancellationReason);
      const reasonSuffix = reason
        ? ` Reason: ${reason}${message ? ` — ${message}` : ''}.`
        : '';
      await notifyRestaurantManagers(reservation.restaurantId.toString(), {
        type: 'reservation_cancelled',
        title: 'Reservation cancelled',
        body: `A guest cancelled their reservation at ${restaurantName}.${reasonSuffix}`,
        data: {
          reservationId: reservation._id.toString(),
          reason: reason || undefined,
          message: message || undefined,
        },
      });
    }
  }

  if (status === 'cancelled' || status === 'no_show') {
    try {
      await notifyNextWaitlistForSlot({
        restaurantId: reservation.restaurantId,
        partySize: reservation.partySize,
        slotStart: reservation.slotStart,
      });
    } catch (err) {
      logger.error(
        { err, reservationId },
        '[reservations] waitlist notify on cancellation failed',
      );
    }
    await notifyFavoriteDinersOnCancellation(reservation);
  }

  if (status === 'completed') {
    try {
      await updateGuestProfileAfterVisit(reservation);
    } catch (err) {
      logger.error({ err, reservationId }, '[reservations] guest profile update on complete failed');
    }
    await sendSurveyInvitation(reservation);
  }

  return reservation;
}

/**
 * Attribute a completed network cover to the restaurant's active boost
 * campaign (pay-per-cover marketing) and charge the campaign budget.
 */
async function attributeBoostCampaign(reservation: any) {
  try {
    if (reservation.source !== 'network' || reservation.boostCampaignId) return;
    const today = new Date().toISOString().slice(0, 10);
    const campaign = await BoostCampaign.findOne({
      restaurantId: reservation.restaurantId,
      status: 'active',
      startDate: { $lte: today },
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: today } }],
    });
    if (!campaign) return;

    const cost = campaign.costPerCoverCents * reservation.partySize;
    campaign.coversAttributed += reservation.partySize;
    campaign.spentCents += cost;
    if (campaign.spentCents >= campaign.budgetCents) campaign.status = 'exhausted';
    await campaign.save();
    reservation.boostCampaignId = campaign._id;
  } catch (err) {
    console.error('Failed to attribute boost campaign:', err);
  }
}

/**
 * Ping diners who favorited the restaurant when a near-term table frees up.
 * Complements waitlist (explicit intent) with favorites (high interest, no date prefs).
 */
async function notifyFavoriteDinersOnCancellation(reservation: {
  restaurantId: mongoose.Types.ObjectId;
  dinerId: mongoose.Types.ObjectId;
  partySize: number;
  slotStart: Date;
}) {
  const hoursUntil = (reservation.slotStart.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < 0 || hoursUntil > AVAILABILITY_ALERT_MAX_HOURS) return;

  const userIds = await listBookmarkUserIds(reservation.restaurantId.toString(), 'favorite', {
    excludeUserId: reservation.dinerId.toString(),
    limit: AVAILABILITY_ALERT_USER_CAP,
  });
  if (userIds.length === 0) return;

  const restaurant = await Restaurant.findById(reservation.restaurantId).select('name slug address location');
  const restaurantName = restaurant?.name ?? 'a restaurant you favorited';
  const when = formatReservationWhen(reservation.slotStart, restaurant);

  await Promise.all(
    userIds.map((userId) =>
      notifyUser(userId, {
        type: 'saved_restaurant_available',
        title: 'A table opened up!',
        body: `${restaurantName} has an opening ${when} (${reservation.partySize} guests). Book before it's gone.`,
        data: {
          restaurantId: reservation.restaurantId.toString(),
          slug: restaurant?.slug ?? null,
          slot: reservation.slotStart.toISOString(),
          partySize: reservation.partySize,
          timeZone: restaurantTimeZone(restaurant ?? {}),
        },
      }),
    ),
  );
}

async function recordCoverFee(reservation: any) {
  try {
    const existing = await CoverFee.findOne({ reservationId: reservation._id });
    if (existing) return;

    const source: string = reservation.source ?? 'network';

    // Phone and walk-in sources always have zero fees
    if (source === 'phone' || source === 'walkin') {
      await CoverFee.create({
        restaurantId: reservation.restaurantId,
        reservationId: reservation._id,
        dinerId: reservation.dinerId,
        partySize: reservation.partySize,
        source,
        feeCents: 0,
        status: 'waived',
        billingPeriod: new Date().toISOString().slice(0, 7),
      });
      return;
    }

    const sub = await Subscription.findOne({ restaurantId: reservation.restaurantId });
    if (!sub) return;
    const { applyPendingPlanChangeIfDue } = await import('./planChange.js');
    await applyPendingPlanChangeIfDue(sub);

    let feeCents: number;
    if (source === 'website' || source === 'widget') {
      // Core and Pro plans: website/widget covers are free
      if (sub.plan === 'core' || sub.plan === 'pro') {
        feeCents = 0;
      } else {
        feeCents = (sub.websiteCoverFeeCents ?? 0) * reservation.partySize;
      }
    } else {
      feeCents = sub.networkCoverFeeCents * reservation.partySize;
    }

    await CoverFee.create({
      restaurantId: reservation.restaurantId,
      reservationId: reservation._id,
      dinerId: reservation.dinerId,
      partySize: reservation.partySize,
      source,
      feeCents,
      status: feeCents === 0 ? 'waived' : 'pending',
      billingPeriod: new Date().toISOString().slice(0, 7),
    });
  } catch (err: any) {
    if (err?.code === 11000) return;
    console.error('Failed to record cover fee:', err);
  }
}

/** Idempotent: called by the client confirm mutation and by Stripe webhooks. */
export async function confirmDeposit(intentId: string, known?: BookingIntentState) {
  const reservation = await findReservationByBookingIntent(intentId);
  if (!reservation) return null;
  if (bookingPaymentSettled(reservation)) return reservation;
  const state = known ?? (await describeBookingIntent(intentId));
  if (!isIntentComplete(state.status)) return reservation;

  const wasPending = reservation.status === 'pending';
  const needsManualApproval = reservation.requiresManualApproval === true;
  if (state.kind === 'payment' && reservation.depositStatus === 'requires_payment') {
    reservation.depositStatus = state.status === 'requires_capture' ? 'authorized' : 'captured';
  }
  if (reservation.cardGuaranteeStatus === 'requires_card') {
    if (state.paymentMethodId) {
      reservation.stripePaymentMethodId = state.paymentMethodId;
      reservation.cardGuaranteeStatus = 'card_saved';
    } else {
      logger.warn({ intentId }, '[reservations] booking intent has no payment method; fee not guaranteed');
      reservation.cardGuaranteeStatus = 'released';
    }
  }
  if (!needsManualApproval) {
    reservation.status = 'confirmed';
  }
  await reservation.save();
  await awardDepositPoints({
    dinerId: reservation.dinerId.toString(),
    reservationId: reservation._id.toString(),
    depositAmountCents: reservation.depositAmountCents,
    depositStatus: reservation.depositStatus,
  });

  const reservationId = reservation._id.toString();
  void (async () => {
    try {
      await awardFirstBookingBonus(reservation.dinerId.toString());
      await markWaitlistBookedForReservation({
        dinerId: reservation.dinerId.toString(),
        restaurantId: reservation.restaurantId.toString(),
        slotStart: reservation.slotStart,
        reservationId,
      });
      if (wasPending && !needsManualApproval) {
        await scheduleReservationReminders(reservationId);
        const restaurant = await Restaurant.findById(reservation.restaurantId);
        await notifyDinerBookingConfirmed({
          dinerId: reservation.dinerId.toString(),
          restaurantId: reservation.restaurantId.toString(),
          reservationId,
          restaurantName: restaurant?.name ?? 'the restaurant',
          slotStart: reservation.slotStart,
          slotEnd: reservation.slotEnd,
          partySize: reservation.partySize,
          guestNotes: reservation.guestNotes,
          restaurant,
          address: restaurant?.address,
        });
        await notifyRestaurantManagers(reservation.restaurantId.toString(), {
          type: 'new_reservation',
          title: 'New reservation',
          body: `Party of ${reservation.partySize} at ${formatReservationWhen(reservation.slotStart, restaurant)}${
            restaurant ? ` — ${restaurant.name}` : ''
          }`,
          data: {
            restaurantId: reservation.restaurantId.toString(),
            reservationId,
          },
        });
      } else if (wasPending && needsManualApproval) {
        const restaurant = await Restaurant.findById(reservation.restaurantId);
        await notifyDinerBookingPendingApproval({
          dinerId: reservation.dinerId.toString(),
          restaurantId: reservation.restaurantId.toString(),
          reservationId,
          restaurantName: restaurant?.name ?? 'the restaurant',
          slotStart: reservation.slotStart,
          partySize: reservation.partySize,
          restaurant,
        });
        await notifyRestaurantBookingNeedsApproval({
          restaurantId: reservation.restaurantId.toString(),
          reservationId,
          restaurantName: restaurant?.name ?? 'the restaurant',
          slotStart: reservation.slotStart,
          partySize: reservation.partySize,
          restaurant,
        });
      }
    } catch (err) {
      logger.error({ err, reservationId }, '[reservations] notify after card confirm failed');
    }
  })();

  return reservation;
}

/** Owner/staff manual booking (phone or walk-in). Skips online deposit collection. */
export async function createOwnerReservation(input: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  occasion?: string;
  guestNotes?: string;
  source?: 'phone' | 'walkin';
  guest: { firstName: string; lastName?: string; phone?: string; email?: string };
  tableId?: string;
  seatImmediately?: boolean;
  /** When seating an online waitlist diner, reuse their account. */
  dinerId?: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new ValidationError('Restaurant not available');
  }

  const diner = input.dinerId
    ? await User.findById(input.dinerId)
    : await findOrCreateDiner(input.guest);
  if (!diner) throw new NotFoundError('Guest');
  const dinerId = diner._id.toString();

  const accessViolation = await checkAccessRules({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
  });
  if (accessViolation) throw new ValidationError(accessViolation);

  const turn = await getTurnTimeMinutes(input.restaurantId, input.slotStart);
  const slotEnd = new Date(input.slotStart.getTime() + turn * 60_000);

  const table = await resolveTable({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd,
    dinerId,
    tableId: input.tableId,
    useSmartAssign: restaurant.useSmartAssign !== false,
  });
  if (!table) throw new ConflictError('No tables available for this time');

  const source = input.source ?? 'phone';
  const status =
    input.seatImmediately || source === 'walkin' ? 'seated' : 'confirmed';

  const reservation = await Reservation.create({
    restaurantId: input.restaurantId,
    dinerId,
    tableIds: [table._id],
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd,
    status,
    occasion: input.occasion ?? 'none',
    guestNotes: input.guestNotes ?? '',
    source,
    depositAmountCents: 0,
    depositStatus: 'none',
    seatedAt: status === 'seated' ? new Date() : undefined,
  });

  try {
    await claimTableSlots({
      restaurantId: input.restaurantId,
      tableId: table._id,
      reservationId: reservation._id,
      slotStart: input.slotStart,
      slotEnd,
    });
  } catch (err) {
    await releaseTableSlotClaims(reservation._id);
    await Reservation.deleteOne({ _id: reservation._id });
    throw err;
  }

  if (status === 'confirmed') {
    await scheduleReservationReminders(reservation._id.toString());
    await notifyDinerBookingConfirmed({
      dinerId,
      restaurantId: input.restaurantId,
      reservationId: reservation._id.toString(),
      restaurantName: restaurant.name,
      slotStart: input.slotStart,
      slotEnd,
      partySize: input.partySize,
      guestNotes: input.guestNotes,
      restaurant,
      address: restaurant.address,
    });
    await notifyRestaurantManagers(input.restaurantId, {
      type: 'new_reservation',
      title: 'New reservation',
      body: `Party of ${input.partySize} at ${formatReservationWhen(input.slotStart, restaurant)} — ${restaurant.name}`,
      data: { reservationId: reservation._id.toString() },
    });
  }

  return reservation;
}

const EDITABLE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

/** Owner/staff/diner edit of party size, time, table, notes, or occasion. */
export async function updateReservationDetails(
  reservationId: string,
  actorId: string,
  input: {
    partySize?: number;
    slotStart?: Date;
    occasion?: string;
    guestNotes?: string;
    tableId?: string;
  },
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');

  const originalSlotStartMs = reservation.slotStart.getTime();
  const originalSlotEndMs = reservation.slotEnd.getTime();

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user ? isPlatformAdmin(user.role) : false;
  const isDiner = reservation.dinerId.equals(actorId);
  if (!isOwner && !isAdmin && !isDiner) throw new ForbiddenError();

  if (!EDITABLE_STATUSES.has(reservation.status)) {
    throw new ValidationError(`Cannot edit a ${reservation.status} reservation`);
  }

  const requestedTableId =
    isDiner && restaurant?.allowGuestTableSelection === false ? undefined : input.tableId;

  const partySize = input.partySize ?? reservation.partySize;
  const slotStart = input.slotStart ?? reservation.slotStart;
  const turn = await getTurnTimeMinutes(reservation.restaurantId.toString(), slotStart);
  const slotEnd = new Date(slotStart.getTime() + turn * 60_000);

  const timeOrPartyChanged =
    partySize !== reservation.partySize ||
    slotStart.getTime() !== reservation.slotStart.getTime() ||
    Boolean(requestedTableId);

  if (timeOrPartyChanged) {
    const accessViolation = await checkAccessRules({
      restaurantId: reservation.restaurantId.toString(),
      partySize,
      slotStart,
    });
    if (accessViolation) throw new ValidationError(accessViolation);

    await releaseTableSlotClaims(reservation._id);

    const table = await resolveTable({
      restaurantId: reservation.restaurantId.toString(),
      partySize,
      slotStart,
      slotEnd,
      dinerId: reservation.dinerId.toString(),
      tableId: requestedTableId,
      useSmartAssign: restaurant?.useSmartAssign !== false,
    });
    if (!table) {
      const originalTableId = reservation.tableIds[0];
      if (originalTableId) {
        await claimTableSlots({
          restaurantId: reservation.restaurantId,
          tableId: originalTableId,
          reservationId: reservation._id,
          slotStart: reservation.slotStart,
          slotEnd: reservation.slotEnd,
        });
      }
      throw new ConflictError('No tables available for this time');
    }

    try {
      await claimTableSlots({
        restaurantId: reservation.restaurantId,
        tableId: table._id,
        reservationId: reservation._id,
        slotStart,
        slotEnd,
      });
    } catch (err) {
      const originalTableId = reservation.tableIds[0];
      if (originalTableId) {
        await claimTableSlots({
          restaurantId: reservation.restaurantId,
          tableId: originalTableId,
          reservationId: reservation._id,
          slotStart: reservation.slotStart,
          slotEnd: reservation.slotEnd,
        });
      }
      throw err;
    }

    reservation.tableIds = [table._id] as typeof reservation.tableIds;
    if (reservation.noShowFeeCents > 0 && partySize !== reservation.partySize) {
      // The fee is per guest; keep the booked per-guest rate when the party changes.
      reservation.noShowFeeCents = Math.round(
        (reservation.noShowFeeCents / reservation.partySize) * partySize,
      );
    }
    reservation.partySize = partySize;
    reservation.slotStart = slotStart;
    reservation.slotEnd = slotEnd;
  }

  if (input.occasion !== undefined) {
    reservation.occasion = input.occasion as typeof reservation.occasion;
  }
  if (input.guestNotes !== undefined) reservation.guestNotes = input.guestNotes;

  await reservation.save();

  if (
    reservation.slotStart.getTime() !== originalSlotStartMs ||
    reservation.slotEnd.getTime() !== originalSlotEndMs
  ) {
    await scheduleReservationReminders(reservation._id.toString());
  }

  const restaurantName = restaurant?.name ?? 'the restaurant';
  const when = formatReservationWhen(reservation.slotStart, restaurant);
  if (isDiner) {
    await notifyRestaurantManagers(reservation.restaurantId.toString(), {
      type: 'reservation_updated',
      title: 'Reservation updated',
      body: `A guest updated their reservation at ${restaurantName} (${when}, party of ${reservation.partySize}).`,
      data: {
        restaurantId: reservation.restaurantId.toString(),
        reservationId: reservation._id.toString(),
      },
    });
  } else {
    const diner = await User.findById(reservation.dinerId).select('firstName');
    const reservationUrl = `${publicWebBaseUrl()}/reservations/${reservation._id.toString()}`;
    const rendered = await renderEmailTemplate('booking_updated', {
      firstName: diner?.firstName || 'there',
      restaurantName,
      date: when,
      partySize: formatPartySizeForEmail(reservation.partySize),
      reservationUrl,
    });
    await notifyUser(
      reservation.dinerId.toString(),
      {
        type: 'reservation_updated',
        title: rendered.subject,
        body: rendered.bodyText || `Your reservation at ${restaurantName} was updated.`,
        htmlBody: appendEmailButtonsIfMissing(
          rendered.bodyHtml,
          [{ href: reservationUrl, label: 'View reservation' }],
          reservationUrl,
        ),
        data: { reservationId: reservation._id.toString() },
      },
      { smsRestaurantId: reservation.restaurantId.toString() },
    );
  }

  return reservation;
}

/**
 * Guest taps "Yes" on a running-late reminder — posts a structured message
 * and notifies restaurant managers (same channel as sendMessage).
 */
export async function reportRunningLate(
  reservationId: string,
  dinerId: string,
  etaMinutes?: number | null,
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');
  if (!reservation.dinerId.equals(dinerId)) throw new ForbiddenError();
  if (!['confirmed', 'pending'].includes(reservation.status)) {
    throw new ValidationError('Can only report running late for an upcoming reservation');
  }

  const eta =
    typeof etaMinutes === 'number' && Number.isFinite(etaMinutes)
      ? Math.min(180, Math.max(1, Math.round(etaMinutes)))
      : null;
  const body = eta
    ? `I'm running late — about ${eta} minutes.`
    : "I'm running late.";

  const doc = await Message.create({
    restaurantId: reservation.restaurantId,
    dinerId: reservation.dinerId,
    reservationId: reservation._id,
    senderType: 'diner',
    senderId: dinerId,
    body,
  });

  await notifyRestaurantManagers(reservation.restaurantId.toString(), {
    type: 'new_message',
    title: 'Guest running late',
    body: body.slice(0, 200),
    data: {
      restaurantId: reservation.restaurantId.toString(),
      dinerId: reservation.dinerId.toString(),
      reservationId: reservation._id.toString(),
      runningLate: true,
      ...(eta != null ? { etaMinutes: eta } : {}),
    },
  });

  return doc;
}

/** Seat a guest at a specific table in one operation (floor ops). */
export async function seatReservationAtTable(
  reservationId: string,
  tableId: string,
  actorId: string,
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user ? isPlatformAdmin(user.role) : false;
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  if (!['pending', 'confirmed'].includes(reservation.status)) {
    throw new ValidationError(`Cannot seat reservation with status ${reservation.status}`);
  }

  const table = await Table.findOne({
    _id: tableId,
    restaurantId: reservation.restaurantId,
    active: true,
  });
  if (!table) throw new NotFoundError('Table');
  if (table.minCapacity > reservation.partySize || table.maxCapacity < reservation.partySize) {
    throw new ValidationError('Table capacity does not fit this party size');
  }

  const bookable = await getBookableTables({
    restaurantId: reservation.restaurantId.toString(),
    partySize: reservation.partySize,
    slotStart: reservation.slotStart,
    slotEnd: reservation.slotEnd,
  });
  const currentTableId = reservation.tableIds[0]?.toString();
  const isCurrentTable = currentTableId === tableId;
  if (!isCurrentTable && !bookable.some((t) => t._id.toString() === tableId)) {
    throw new ConflictError('Selected table is not available');
  }

  if (!isCurrentTable) {
    await releaseTableSlotClaims(reservation._id);
    try {
      await claimTableSlots({
        restaurantId: reservation.restaurantId,
        tableId: table._id,
        reservationId: reservation._id,
        slotStart: reservation.slotStart,
        slotEnd: reservation.slotEnd,
      });
    } catch (err) {
      if (currentTableId) {
        await claimTableSlots({
          restaurantId: reservation.restaurantId,
          tableId: reservation.tableIds[0]!,
          reservationId: reservation._id,
          slotStart: reservation.slotStart,
          slotEnd: reservation.slotEnd,
        });
      }
      throw err;
    }
    reservation.tableIds = [table._id] as typeof reservation.tableIds;
  }

  reservation.status = 'seated';
  reservation.seatedAt = new Date();
  await reservation.save();
  return reservation;
}

/**
 * Partner/admin manual deposit refund (or authorization release).
 * Allowed when deposit is `authorized` (full hold release) or `captured` with remaining balance.
 * Optional `amountCents` for partial refund of captured deposits only.
 */
export async function refundReservationDeposit(
  reservationId: string,
  actorId: string,
  reason?: string,
  amountCents?: number,
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user ? isPlatformAdmin(user.role) : false;
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  if (!reservation.stripePaymentIntentId) {
    throw new ValidationError('No deposit payment to refund');
  }

  const alreadyRefunded = reservation.depositRefundedCents ?? 0;
  const remaining = Math.max(0, reservation.depositAmountCents - alreadyRefunded);

  if (reservation.depositStatus === 'authorized') {
    if (amountCents != null && amountCents !== reservation.depositAmountCents) {
      throw new ValidationError(
        'Authorization holds can only be released in full',
      );
    }
    await refundDeposit(reservation.stripePaymentIntentId);
    return applyDepositRefund(reservation, {
      refundCents: reservation.depositAmountCents,
      reason,
      restaurantName: restaurant?.name,
      notify: true,
      fullRelease: true,
    });
  }

  if (reservation.depositStatus === 'captured') {
    if (remaining <= 0) {
      throw new ValidationError('Deposit is already fully refunded');
    }
    const refundCents =
      amountCents == null ? remaining : Math.round(amountCents);
    if (!Number.isFinite(refundCents) || refundCents <= 0) {
      throw new ValidationError('Refund amount must be greater than $0');
    }
    if (refundCents > remaining) {
      throw new ValidationError(
        `Refund amount exceeds remaining deposit ($${(remaining / 100).toFixed(2)})`,
      );
    }
    await refundDeposit(reservation.stripePaymentIntentId, refundCents);
    return applyDepositRefund(reservation, {
      refundCents,
      reason,
      restaurantName: restaurant?.name,
      notify: true,
      fullRelease: false,
    });
  }

  throw new ValidationError(
    `Cannot refund deposit with status ${reservation.depositStatus}`,
  );
}

/**
 * Idempotent sync when Stripe reports a canceled PaymentIntent or refunded charge.
 * Pass `amountRefundedCents` from charge.refunded (total refunded on the charge).
 */
export async function syncDepositRefundedFromStripe(
  paymentIntentId: string,
  amountRefundedCents?: number,
) {
  if (!paymentIntentId) return null;
  const reservation = await Reservation.findOne({
    stripePaymentIntentId: paymentIntentId,
  });
  if (!reservation) {
    const feeReservation = await Reservation.findOne({ noShowFeePaymentIntentId: paymentIntentId });
    if (feeReservation?.cardGuaranteeStatus === 'charged' && amountRefundedCents != null) {
      feeReservation.cardGuaranteeStatus = 'refunded';
      await feeReservation.save();
    }
    return feeReservation;
  }
  if (reservation.depositStatus === 'refunded') return reservation;
  if (
    reservation.depositStatus !== 'authorized' &&
    reservation.depositStatus !== 'captured'
  ) {
    return reservation;
  }

  const restaurant = await Restaurant.findById(reservation.restaurantId).select('name');

  // Canceled hold → full release
  if (reservation.depositStatus === 'authorized') {
    return applyDepositRefund(reservation, {
      refundCents: reservation.depositAmountCents,
      restaurantName: restaurant?.name,
      notify: true,
      fullRelease: true,
    });
  }

  // Captured charge — sync cumulative refunded amount when provided
  const alreadyRefunded = reservation.depositRefundedCents ?? 0;
  const targetRefunded =
    amountRefundedCents != null
      ? Math.min(reservation.depositAmountCents, Math.max(0, amountRefundedCents))
      : reservation.depositAmountCents;
  const delta = targetRefunded - alreadyRefunded;
  if (delta <= 0) {
    if (targetRefunded >= reservation.depositAmountCents) {
      reservation.depositStatus = 'refunded';
      reservation.depositRefundedCents = reservation.depositAmountCents;
      await reservation.save();
    }
    return reservation;
  }

  return applyDepositRefund(reservation, {
    refundCents: delta,
    restaurantName: restaurant?.name,
    notify: true,
    fullRelease: false,
  });
}

async function applyDepositRefund(
  reservation: InstanceType<typeof Reservation>,
  opts: {
    refundCents: number;
    reason?: string;
    restaurantName?: string | null;
    notify: boolean;
    fullRelease: boolean;
  },
) {
  const prevRefunded = reservation.depositRefundedCents ?? 0;
  const nextRefunded = Math.min(
    reservation.depositAmountCents,
    prevRefunded + opts.refundCents,
  );
  reservation.depositRefundedCents = nextRefunded;

  const fullyRefunded =
    opts.fullRelease || nextRefunded >= reservation.depositAmountCents;
  if (fullyRefunded) {
    reservation.depositStatus = 'refunded';
    reservation.depositRefundedCents = reservation.depositAmountCents;
  } else {
    reservation.depositStatus = 'captured';
  }

  await reservation.save();

  if (fullyRefunded) {
    await reverseDepositPoints(
      reservation.dinerId.toString(),
      reservation._id.toString(),
    );
  }

  if (opts.notify) {
    const restaurantName = opts.restaurantName ?? 'the restaurant';
    const amountLabel = `$${(opts.refundCents / 100).toFixed(2)}`;
    const partialNote =
      !fullyRefunded && reservation.depositAmountCents > opts.refundCents
        ? ` (partial; $${(nextRefunded / 100).toFixed(2)} of $${(reservation.depositAmountCents / 100).toFixed(2)} refunded total)`
        : '';
    const reasonBit = opts.reason?.trim() ? ` ${opts.reason.trim()}` : '';
    const note = `${partialNote}.${reasonBit}`;
    const diner = await User.findById(reservation.dinerId).select('firstName');
    const reservationUrl = `${publicWebBaseUrl()}/reservations/${reservation._id.toString()}`;
    const rendered = await renderEmailTemplate('deposit_refunded', {
      firstName: diner?.firstName || 'there',
      restaurantName,
      amount: amountLabel,
      note,
      reservationUrl,
    });
    await notifyUser(reservation.dinerId.toString(), {
      type: 'deposit_refunded',
      title: fullyRefunded ? rendered.subject || 'Deposit refunded' : 'Partial deposit refund',
      body: rendered.bodyText,
      htmlBody: appendEmailButtonsIfMissing(
        rendered.bodyHtml,
        [{ href: reservationUrl, label: 'View reservation' }],
        reservationUrl,
      ),
      data: { reservationId: reservation._id.toString() },
    }).catch(() => undefined);
  }

  return reservation;
}

async function loadReservationForStaff(reservationId: string, actorId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');
  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user ? isPlatformAdmin(user.role) : false;
  if (!isOwner && !isAdmin) throw new ForbiddenError();
  return { reservation, restaurant };
}

/**
 * Staff charge of the card-guarantee fee on a no-show. Used when the automatic
 * no-show job flagged the booking (it never charges) or to retry a declined card.
 */
export async function chargeReservationNoShowFee(reservationId: string, actorId: string) {
  const { reservation, restaurant } = await loadReservationForStaff(reservationId, actorId);
  if (reservation.status !== 'no_show') {
    throw new ValidationError('Only no-show reservations can be charged the no-show fee');
  }
  if (reservation.cardGuaranteeStatus === 'failed') {
    reservation.cardGuaranteeStatus = 'card_saved';
  }
  if (reservation.cardGuaranteeStatus !== 'card_saved') {
    throw new ValidationError('This reservation has no saved card to charge');
  }
  const outcome = await chargeNoShowFee(reservation, 'no_show', `staff-${Date.now()}`);
  await reservation.save();
  await notifyNoShowFeeOutcome(reservation, outcome, restaurant?.name ?? 'the restaurant');
  if (outcome === 'failed') {
    throw new ValidationError(`Card was declined: ${reservation.noShowFeeError ?? 'unknown error'}`);
  }
  return reservation;
}

/** Staff waiver of a fee that was already charged (full refund). */
export async function refundReservationNoShowFee(
  reservationId: string,
  actorId: string,
  reason?: string,
) {
  const { reservation, restaurant } = await loadReservationForStaff(reservationId, actorId);
  if (reservation.cardGuaranteeStatus !== 'charged' || !reservation.noShowFeePaymentIntentId) {
    throw new ValidationError('No charged no-show fee to refund');
  }
  await refundDeposit(reservation.noShowFeePaymentIntentId);
  reservation.cardGuaranteeStatus = 'refunded';
  await reservation.save();
  const amount = `$${(reservation.noShowFeeCents / 100).toFixed(2)}`;
  const note = reason?.trim() ? `. ${reason.trim()}` : '.';
  const diner = await User.findById(reservation.dinerId).select('firstName');
  const restaurantName = restaurant?.name ?? 'The restaurant';
  const reservationUrl = `${publicWebBaseUrl()}/reservations/${reservation._id.toString()}`;
  const rendered = await renderEmailTemplate('no_show_fee_refunded', {
    firstName: diner?.firstName || 'there',
    restaurantName,
    amount,
    note,
    reservationUrl,
  });
  await notifyUser(reservation.dinerId.toString(), {
    type: 'no_show_fee_refunded',
    title: rendered.subject,
    body: rendered.bodyText,
    htmlBody: appendEmailButtonsIfMissing(
      rendered.bodyHtml,
      [{ href: reservationUrl, label: 'View reservation' }],
      reservationUrl,
    ),
    data: { reservationId: reservation._id.toString() },
  }).catch(() => undefined);
  return reservation;
}

/** Permanently remove a reservation. Active bookings get deposit/claim cleanup first. */
export async function deleteReservation(reservationId: string, actorId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user ? isPlatformAdmin(user.role) : false;
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  if (reservation.status === 'pending' || reservation.status === 'confirmed') {
    await updateReservationStatus(reservationId, 'cancelled', actorId, 'Deleted by restaurant');
  } else {
    if (
      reservation.stripePaymentIntentId &&
      reservation.depositStatus === 'authorized'
    ) {
      await refundDeposit(reservation.stripePaymentIntentId);
    }
    await releaseTableSlotClaims(reservation._id);
  }

  await Reservation.deleteOne({ _id: reservation._id });
  return true;
}

/** Diners may review completed visits, or past confirmed/seated visits staff never closed out. */
export function isReservationReviewable(reservation: {
  status: string;
  slotStart: Date;
  slotEnd?: Date | null;
}): boolean {
  if (reservation.status === 'completed') return true;
  if (reservation.status !== 'confirmed' && reservation.status !== 'seated') {
    return false;
  }
  const end = reservation.slotEnd ?? reservation.slotStart;
  return end.getTime() < Date.now();
}
