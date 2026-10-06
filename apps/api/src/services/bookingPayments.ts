import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { EMAIL_BRAND, appendEmailButtonsIfMissing } from './emailBranding.js';
import { captureDeposit, chargeOffSessionFee, refundDeposit } from './stripe.js';

type ReservationDoc = InstanceType<typeof Reservation>;

/** Pending booking still waiting on the Stripe card form (not yet a placed reservation). */
export function isIncompleteBookingPayment(r: {
  status?: string | null;
  depositStatus?: string | null;
  cardGuaranteeStatus?: string | null;
}) {
  return (
    r.status === 'pending' &&
    (r.depositStatus === 'requires_payment' || r.cardGuaranteeStatus === 'requires_card')
  );
}

/** Mongo clause: hide incomplete card holds from diner/staff reservation lists. */
export const excludeIncompleteBookingPayment = {
  $nor: [
    { status: 'pending', depositStatus: 'requires_payment' },
    { status: 'pending', cardGuaranteeStatus: 'requires_card' },
  ],
};

export type NoShowFeeOutcome = 'charged' | 'failed' | 'skipped';

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Charge the card-guarantee fee off-session. Mutates `reservation`; the caller saves.
 * Card declines / SCA requirements are recorded as `failed`, never thrown.
 */
export async function chargeNoShowFee(
  reservation: ReservationDoc,
  reason: 'no_show' | 'late_cancel',
  /** Stripe replays a failed request for the same key, so staff retries need a fresh suffix. */
  attemptKey = 'auto',
): Promise<NoShowFeeOutcome> {
  if (
    reservation.cardGuaranteeStatus !== 'card_saved' ||
    !(reservation.noShowFeeCents > 0) ||
    !reservation.stripeCustomerId ||
    !reservation.stripePaymentMethodId
  ) {
    return 'skipped';
  }
  const reservationId = reservation._id.toString();
  const result = await chargeOffSessionFee({
    customerId: reservation.stripeCustomerId,
    paymentMethodId: reservation.stripePaymentMethodId,
    amountCents: reservation.noShowFeeCents,
    metadata: {
      reservationId,
      restaurantId: reservation.restaurantId.toString(),
      dinerId: reservation.dinerId.toString(),
      kind: reason === 'no_show' ? 'no_show_fee' : 'late_cancellation_fee',
    },
    idempotencyKey: `booking-fee-${reservationId}-${attemptKey}`,
  });
  reservation.noShowFeeReason = reason;
  if (result.paymentIntentId) reservation.noShowFeePaymentIntentId = result.paymentIntentId;
  if (result.ok) {
    reservation.cardGuaranteeStatus = 'charged';
    reservation.noShowFeeChargedAt = new Date();
    reservation.noShowFeeError = undefined;
    return 'charged';
  }
  reservation.cardGuaranteeStatus = 'failed';
  reservation.noShowFeeError = result.error;
  logger.warn({ reservationId, error: result.error }, '[booking-payments] fee charge failed');
  return 'failed';
}

/** Booking honoured or cancelled in time — the saved card is no longer a guarantee. */
export function releaseCardGuarantee(reservation: ReservationDoc) {
  if (
    reservation.cardGuaranteeStatus === 'card_saved' ||
    reservation.cardGuaranteeStatus === 'requires_card'
  ) {
    reservation.cardGuaranteeStatus = 'released';
  }
}

/** Legacy manual-capture holds: capture on no-show (old policy). */
export async function captureLegacyHold(reservation: ReservationDoc) {
  if (reservation.stripePaymentIntentId && reservation.depositStatus === 'authorized') {
    await captureDeposit(reservation.stripePaymentIntentId);
    reservation.depositStatus = 'captured';
  }
}

/** Legacy manual-capture holds: release when the visit happened. */
export async function releaseLegacyHold(reservation: ReservationDoc) {
  if (reservation.stripePaymentIntentId && reservation.depositStatus === 'authorized') {
    await refundDeposit(reservation.stripePaymentIntentId);
    reservation.depositStatus = 'refunded';
    reservation.depositRefundedCents = reservation.depositAmountCents;
  }
}

/** Tell the diner (charged) or the restaurant (failed) what happened to the fee. */
export async function notifyNoShowFeeOutcome(
  reservation: ReservationDoc,
  outcome: NoShowFeeOutcome,
  restaurantName: string,
) {
  if (outcome === 'skipped') return;
  const { notifyUser, notifyRestaurantManagers } = await import('./notifications.js');
  const reservationId = reservation._id.toString();
  const amount = formatUsd(reservation.noShowFeeCents);
  const label = reservation.noShowFeeReason === 'late_cancel' ? 'late cancellation' : 'no-show';
  try {
    if (outcome === 'charged') {
      const { renderEmailTemplate } = await import('./emailTemplates.js');
      const diner = await User.findById(reservation.dinerId).select('firstName');
      const base = (env.WEB_APP_URL || EMAIL_BRAND.siteUrl).replace(/\/+$/, '');
      const reservationUrl = `${base}/reservations/${reservationId}`;
      const feeTitle = label === 'no-show' ? 'No-show fee charged' : 'Late cancellation fee charged';
      const rendered = await renderEmailTemplate('no_show_fee_charged', {
        firstName: diner?.firstName || 'there',
        restaurantName,
        amount,
        feeLabel: label,
        feeTitle,
        reservationUrl,
      });
      await notifyUser(reservation.dinerId.toString(), {
        type: 'no_show_fee_charged',
        title: rendered.subject || feeTitle,
        body: rendered.bodyText,
        htmlBody: appendEmailButtonsIfMissing(
          rendered.bodyHtml,
          [{ href: reservationUrl, label: 'View reservation' }],
          reservationUrl,
        ),
        data: { reservationId },
      });
    } else {
      await notifyRestaurantManagers(reservation.restaurantId.toString(), {
        type: 'no_show_fee_failed',
        title: 'No-show fee could not be charged',
        body: `The ${amount} ${label} fee was declined: ${reservation.noShowFeeError ?? 'card error'}.`,
        data: { reservationId },
      });
    }
  } catch (err) {
    logger.error({ err, reservationId }, '[booking-payments] fee notification failed');
  }
}
