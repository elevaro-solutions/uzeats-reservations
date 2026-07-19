import mongoose from 'mongoose';
import { LOYALTY, CANCELLATION_REFUND_HOURS } from '@reservations/shared';
import { ConflictError } from '../lib/errors.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import { WaitlistEntry } from '../models/Waitlist.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { CoverFee } from '../models/CoverFee.js';
import { findAvailableTable, getTurnTimeMinutes } from './availability.js';
import { smartAssignTable } from './smartAssign.js';
import {
  createDepositIntent,
  refundDeposit,
  captureDeposit,
  isStubPaymentIntent,
} from './stripe.js';
import { earnPoints, redeemPoints } from './loyalty.js';
import {
  notifyRestaurantStaff,
  notifyUser,
  scheduleReservationReminders,
} from './notifications.js';
import { checkAccessRules } from './accessRules.js';
import { updateGuestProfileAfterVisit, sendSurveyInvitation } from './guests.js';
import { BoostCampaign } from '../models/Marketing.js';
import { claimTableSlots, releaseTableSlotClaims } from './tableSlotClaims.js';

async function findOrCreateDiner(guest: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
}) {
  let diner = null;
  if (guest.email) diner = await User.findOne({ email: guest.email.toLowerCase() });
  if (!diner && guest.phone) diner = await User.findOne({ phone: guest.phone });
  if (diner) {
    const updates: Record<string, string> = {};
    if (guest.firstName && diner.firstName !== guest.firstName) updates.firstName = guest.firstName;
    if (guest.lastName !== undefined && diner.lastName !== guest.lastName) {
      updates.lastName = guest.lastName;
    }
    if (guest.phone && !diner.phone) updates.phone = guest.phone;
    if (guest.email && !diner.email) updates.email = guest.email.toLowerCase();
    if (Object.keys(updates).length > 0) {
      Object.assign(diner, updates);
      await diner.save();
    }
    return diner;
  }

  return User.create({
    email: guest.email?.toLowerCase(),
    phone: guest.phone,
    firstName: guest.firstName,
    lastName: guest.lastName ?? '',
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
}) {
  if (input.tableId) {
    const table = await Table.findOne({
      _id: input.tableId,
      restaurantId: input.restaurantId,
      active: true,
    });
    if (!table) throw new Error('Table not found');
    if (table.minCapacity > input.partySize || table.maxCapacity < input.partySize) {
      throw new Error('Table capacity does not fit this party size');
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
    });
  }

  return findAvailableTable({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
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
  source?: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new Error('Restaurant not available');
  }

  const accessViolation = await checkAccessRules({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
  });
  if (accessViolation) throw new Error(accessViolation);

  const turn = await getTurnTimeMinutes(input.restaurantId, input.slotStart);
  const slotEnd = new Date(input.slotStart.getTime() + turn * 60_000);

  const useSmartAssign = restaurant.useSmartAssign !== false;
  const table = useSmartAssign
    ? await smartAssignTable({
        restaurantId: input.restaurantId,
        partySize: input.partySize,
        slotStart: input.slotStart,
        slotEnd,
        dinerId: input.dinerId,
      })
    : await findAvailableTable({
        restaurantId: input.restaurantId,
        partySize: input.partySize,
        slotStart: input.slotStart,
        slotEnd,
      });
  if (!table) throw new ConflictError('No tables available for this time');

  let depositAmountCents = 0;
  let depositStatus: 'none' | 'requires_payment' | 'authorized' = 'none';
  let stripePaymentIntentId: string | undefined;
  let clientSecret: string | undefined;
  let requiresPayment = false;

  if (restaurant.depositRequired && restaurant.depositAmountCents > 0) {
    depositAmountCents = restaurant.depositAmountCents * input.partySize;
    const intent = await createDepositIntent({
      amountCents: depositAmountCents,
      metadata: {
        restaurantId: input.restaurantId,
        dinerId: input.dinerId,
      },
    });
    stripePaymentIntentId = intent.id;
    clientSecret = intent.client_secret ?? undefined;

    if (intent.isStub) {
      depositStatus = 'authorized';
    } else {
      depositStatus = 'requires_payment';
      requiresPayment = true;
    }
  }

  const reservation = await Reservation.create({
    restaurantId: input.restaurantId,
    dinerId: input.dinerId,
    tableIds: [table._id],
    partySize: input.partySize,
    slotStart: input.slotStart,
    slotEnd,
    status: requiresPayment ? 'pending' : 'confirmed',
    occasion: input.occasion ?? 'none',
    guestNotes: input.guestNotes ?? '',
    source: input.source ?? 'network',
    depositAmountCents,
    stripePaymentIntentId,
    depositStatus,
    loyaltyPointsRedeemed: input.redeemPoints ?? 0,
  });

  try {
    await claimTableSlots({
      restaurantId: input.restaurantId,
      tableId: table._id,
      reservationId: reservation._id,
      slotStart: input.slotStart,
      slotEnd,
    });

    if (input.redeemPoints && input.redeemPoints > 0) {
      await redeemPoints(input.dinerId, input.redeemPoints);
    }
  } catch (err) {
    await releaseTableSlotClaims(reservation._id);
    await Reservation.deleteOne({ _id: reservation._id });
    throw err;
  }

  if (reservation.status === 'confirmed') {
    await scheduleReservationReminders(reservation._id.toString());
    await notifyUser(
      input.dinerId,
      {
        type: 'reservation_confirmed',
        title: 'Reservation confirmed',
        body: `Your reservation at ${restaurant.name} is confirmed.`,
        data: { reservationId: reservation._id.toString() },
      },
      { smsRestaurantId: input.restaurantId },
    );
    await notifyRestaurantStaff(input.restaurantId, {
      type: 'new_reservation',
      title: 'New reservation',
      body: `Party of ${input.partySize} at ${input.slotStart.toLocaleString()} — ${restaurant.name}`,
      data: { reservationId: reservation._id.toString() },
    });
  }

  return { reservation, clientSecret: requiresPayment ? clientSecret : null };
}

/** Confirm deposit after Stripe PaymentElement succeeds (or stub confirm). */
export async function confirmDepositPayment(input: {
  paymentIntentId: string;
  dinerId: string;
}) {
  const reservation = await Reservation.findOne({
    stripePaymentIntentId: input.paymentIntentId,
  });
  if (!reservation) throw new Error('Reservation not found for payment');
  if (!reservation.dinerId.equals(input.dinerId)) throw new Error('Forbidden');

  if (reservation.status === 'confirmed' && reservation.depositStatus === 'authorized') {
    return reservation;
  }

  if (!isStubPaymentIntent(input.paymentIntentId)) {
    // Real Stripe: webhook usually confirms; this is a client-side fallback after Elements.
  }

  return confirmDeposit(input.paymentIntentId);
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  actorId: string,
  reason?: string,
) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new Error('Reservation not found');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isDiner = reservation.dinerId.equals(actorId);
  const isAdmin = user?.role === 'admin';

  if (!isOwner && !isDiner && !isAdmin) throw new Error('Forbidden');

  const allowed: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (!allowed[reservation.status]?.includes(status)) {
    throw new Error(`Cannot transition from ${reservation.status} to ${status}`);
  }

  reservation.status = status as typeof reservation.status;

  if (status === 'cancelled') {
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason;
    const hoursUntil =
      (reservation.slotStart.getTime() - Date.now()) / (1000 * 60 * 60);
    if (
      reservation.stripePaymentIntentId &&
      reservation.depositStatus === 'authorized' &&
      hoursUntil >= CANCELLATION_REFUND_HOURS
    ) {
      await refundDeposit(reservation.stripePaymentIntentId);
      reservation.depositStatus = 'refunded';
    }
  }

  if (status === 'no_show' && reservation.stripePaymentIntentId) {
    await captureDeposit(reservation.stripePaymentIntentId);
    reservation.depositStatus = 'captured';
  }

  if (status === 'completed') {
    const points = await earnPoints(
      reservation.dinerId.toString(),
      LOYALTY.POINTS_PER_COMPLETED_VISIT,
      reservation._id.toString(),
      'Completed reservation',
    );
    reservation.loyaltyPointsEarned = points;
    await recordCoverFee(reservation);
    await attributeBoostCampaign(reservation);
  }

  await reservation.save();

  if (status === 'cancelled' || status === 'completed' || status === 'no_show') {
    await releaseTableSlotClaims(reservation._id);
  }

  if (status === 'cancelled') {
    await notifyWaitlistOnCancellation(reservation);
  }

  if (status === 'completed') {
    await updateGuestProfileAfterVisit(reservation);
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

async function notifyWaitlistOnCancellation(reservation: {
  restaurantId: mongoose.Types.ObjectId;
  partySize: number;
  slotStart: Date;
}) {
  const date = reservation.slotStart.toISOString().slice(0, 10);
  const entries = await WaitlistEntry.find({
    restaurantId: reservation.restaurantId,
    preferredDate: date,
    partySize: { $lte: reservation.partySize + 2, $gte: Math.max(1, reservation.partySize - 2) },
    status: 'waiting',
  }).limit(5);

  for (const entry of entries) {
    entry.status = 'notified';
    entry.notifiedAt = new Date();
    entry.notifiedSlot = reservation.slotStart;
    await entry.save();
    if (!entry.dinerId) continue; // in-house entries have no account to notify
    await notifyUser(
      entry.dinerId.toString(),
      {
        type: 'waitlist_available',
        title: 'A table opened up!',
        body: `A table is available on ${date}. Book now before it's gone.`,
        data: {
          restaurantId: reservation.restaurantId.toString(),
          slot: reservation.slotStart.toISOString(),
        },
      },
      { smsRestaurantId: reservation.restaurantId.toString() },
    );
  }
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

export async function confirmDeposit(paymentIntentId: string) {
  const reservation = await Reservation.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!reservation) return null;
  const wasPending = reservation.status === 'pending';
  reservation.depositStatus = 'authorized';
  reservation.status = 'confirmed';
  await reservation.save();
  await scheduleReservationReminders(reservation._id.toString());

  if (wasPending) {
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    await notifyUser(
      reservation.dinerId.toString(),
      {
        type: 'reservation_confirmed',
        title: 'Reservation confirmed',
        body: `Your reservation at ${restaurant?.name ?? 'the restaurant'} is confirmed.`,
        data: { reservationId: reservation._id.toString() },
      },
      { smsRestaurantId: reservation.restaurantId.toString() },
    );
    await notifyRestaurantStaff(reservation.restaurantId.toString(), {
      type: 'new_reservation',
      title: 'New reservation',
      body: `Party of ${reservation.partySize} at ${reservation.slotStart.toLocaleString()}${
        restaurant ? ` — ${restaurant.name}` : ''
      }`,
      data: { reservationId: reservation._id.toString() },
    });
  }

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
}) {
  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw new Error('Restaurant not available');
  }

  const diner = await findOrCreateDiner(input.guest);
  const dinerId = diner._id.toString();

  const accessViolation = await checkAccessRules({
    restaurantId: input.restaurantId,
    partySize: input.partySize,
    slotStart: input.slotStart,
  });
  if (accessViolation) throw new Error(accessViolation);

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
    await notifyUser(
      dinerId,
      {
        type: 'reservation_confirmed',
        title: 'Reservation confirmed',
        body: `Your reservation at ${restaurant.name} is confirmed.`,
        data: { reservationId: reservation._id.toString() },
      },
      { smsRestaurantId: input.restaurantId },
    );
    await notifyRestaurantStaff(input.restaurantId, {
      type: 'new_reservation',
      title: 'New reservation',
      body: `Party of ${input.partySize} at ${input.slotStart.toLocaleString()} — ${restaurant.name}`,
      data: { reservationId: reservation._id.toString() },
    });
  }

  return reservation;
}

const EDITABLE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

/** Owner/staff edit of party size, time, table, notes, or occasion. */
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
  if (!reservation) throw new Error('Reservation not found');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user?.role === 'admin';
  if (!isOwner && !isAdmin) throw new Error('Forbidden');

  if (!EDITABLE_STATUSES.has(reservation.status)) {
    throw new Error(`Cannot edit a ${reservation.status} reservation`);
  }

  const partySize = input.partySize ?? reservation.partySize;
  const slotStart = input.slotStart ?? reservation.slotStart;
  const turn = await getTurnTimeMinutes(reservation.restaurantId.toString(), slotStart);
  const slotEnd = new Date(slotStart.getTime() + turn * 60_000);

  const timeOrPartyChanged =
    partySize !== reservation.partySize ||
    slotStart.getTime() !== reservation.slotStart.getTime() ||
    Boolean(input.tableId);

  if (timeOrPartyChanged) {
    const accessViolation = await checkAccessRules({
      restaurantId: reservation.restaurantId.toString(),
      partySize,
      slotStart,
    });
    if (accessViolation) throw new Error(accessViolation);

    await releaseTableSlotClaims(reservation._id);

    const table = await resolveTable({
      restaurantId: reservation.restaurantId.toString(),
      partySize,
      slotStart,
      slotEnd,
      dinerId: reservation.dinerId.toString(),
      tableId: input.tableId,
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
    reservation.partySize = partySize;
    reservation.slotStart = slotStart;
    reservation.slotEnd = slotEnd;
  }

  if (input.occasion !== undefined) {
    reservation.occasion = input.occasion as typeof reservation.occasion;
  }
  if (input.guestNotes !== undefined) reservation.guestNotes = input.guestNotes;

  await reservation.save();
  return reservation;
}

/** Permanently remove a reservation. Active bookings get deposit/claim cleanup first. */
export async function deleteReservation(reservationId: string, actorId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw new Error('Reservation not found');

  const restaurant = await Restaurant.findById(reservation.restaurantId);
  const user = await User.findById(actorId);
  const isOwner =
    restaurant &&
    (restaurant.ownerId.equals(actorId) ||
      user?.restaurantIds?.some((id) => id.equals(restaurant._id)));
  const isAdmin = user?.role === 'admin';
  if (!isOwner && !isAdmin) throw new Error('Forbidden');

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
