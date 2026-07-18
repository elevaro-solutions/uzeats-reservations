import mongoose from 'mongoose';
import { LOYALTY, CANCELLATION_REFUND_HOURS } from '@reservations/shared';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
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
import { notifyUser, scheduleReservationReminders } from './notifications.js';
import { checkAccessRules } from './accessRules.js';
import { updateGuestProfileAfterVisit, sendSurveyInvitation } from './guests.js';
import { BoostCampaign } from '../models/Marketing.js';
import { claimTableSlots, releaseTableSlotClaims } from './tableSlotClaims.js';

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
  if (!table) throw new Error('No tables available for this time');

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
  reservation.depositStatus = 'authorized';
  reservation.status = 'confirmed';
  await reservation.save();
  await scheduleReservationReminders(reservation._id.toString());
  return reservation;
}
