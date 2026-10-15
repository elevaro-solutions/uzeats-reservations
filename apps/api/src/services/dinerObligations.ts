import { Reservation, Restaurant } from '../models/index.js';
import { ValidationError } from '../lib/errors.js';

/**
 * Blocks diner account deletion while the guest still owes money or is mid-visit.
 * Settled no-shows (`charged` / `refunded` / released guarantees) do not block.
 */
export async function assertDinerClearOfBookingObligations(userId: string) {
  const seated = await Reservation.exists({
    dinerId: userId,
    status: 'seated',
  });
  if (seated) {
    throw new ValidationError(
      'Finish or ask the restaurant to complete your current visit before deleting your account.',
    );
  }

  const unpaidFee = await Reservation.exists({
    dinerId: userId,
    noShowFeeCents: { $gt: 0 },
    cardGuaranteeStatus: { $in: ['failed', 'card_saved'] },
    status: { $in: ['no_show', 'cancelled', 'confirmed', 'pending'] },
  });
  if (unpaidFee) {
    throw new ValidationError(
      'Settle outstanding no-show or late-cancel fees before deleting your account.',
    );
  }

  const openDeposit = await Reservation.exists({
    dinerId: userId,
    $or: [
      { depositStatus: 'authorized' },
      {
        status: 'pending',
        depositStatus: { $in: ['requires_payment', 'failed'] },
      },
      {
        status: 'pending',
        cardGuaranteeStatus: 'requires_card',
      },
    ],
  });
  if (openDeposit) {
    throw new ValidationError(
      'Complete or cancel bookings with an open payment or card hold before deleting your account.',
    );
  }

  const ownsVenue = await Restaurant.exists({ ownerId: userId });
  if (ownsVenue) {
    throw new ValidationError(
      'Delete your restaurant venues in Partner Hub before deleting this account.',
    );
  }
}
