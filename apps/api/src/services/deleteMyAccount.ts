import mongoose from 'mongoose';
import {
  GuestProfile,
  LoyaltyTransaction,
  Message,
  Notification,
  PrivateDiningInquiry,
  Reservation,
  RestaurantBookmark,
  RestaurantInquiry,
  Review,
  ReviewReaction,
  SearchEvent,
  SurveyResponse,
  Ticket,
  User,
  UserSearchHistory,
  WaitlistEntry,
} from '../models/index.js';
import { RestaurantLoyaltyTransaction } from '../models/RestaurantLoyalty.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logAudit } from './audit.js';
import { assertDinerClearOfBookingObligations } from './dinerObligations.js';
import { releaseCardGuarantee } from './bookingPayments.js';
import { refundDeposit } from './stripe.js';
import { releaseTableSlotClaims } from './tableSlotClaims.js';
import { cancelReservationReminders } from './notifications.js';
import { logger } from '../lib/logger.js';

const TOMBSTONE_FIRST_NAME = 'Guest';

async function cancelUpcomingForAccountDeletion(userId: mongoose.Types.ObjectId) {
  const upcoming = await Reservation.find({
    dinerId: userId,
    status: { $in: ['pending', 'confirmed'] },
  });

  for (const reservation of upcoming) {
    try {
      if (reservation.stripePaymentIntentId && reservation.depositStatus === 'authorized') {
        await refundDeposit(reservation.stripePaymentIntentId);
        reservation.depositStatus = 'refunded';
      } else if (
        reservation.stripePaymentIntentId &&
        reservation.depositStatus === 'captured'
      ) {
        const remaining =
          reservation.depositAmountCents - (reservation.depositRefundedCents ?? 0);
        if (remaining > 0) {
          await refundDeposit(reservation.stripePaymentIntentId, remaining);
        }
        reservation.depositStatus = 'refunded';
        reservation.depositRefundedCents = reservation.depositAmountCents;
      }
      releaseCardGuarantee(reservation);
      reservation.status = 'cancelled';
      reservation.cancelledAt = new Date();
      reservation.cancellationReason = 'Account deleted';
      reservation.guestNotes = '';
      await reservation.save();
      await releaseTableSlotClaims(reservation._id);
      try {
        await cancelReservationReminders(reservation._id.toString());
      } catch (remindErr) {
        logger.warn(
          { err: remindErr, reservationId: reservation._id.toString() },
          '[deleteMyAccount] reminder cancel skipped',
        );
      }
    } catch (err) {
      logger.error(
        { err, reservationId: reservation._id.toString() },
        '[deleteMyAccount] failed to cancel upcoming reservation',
      );
      throw new ValidationError(
        'Could not cancel an upcoming reservation. Try again or contact support.',
      );
    }
  }
}

async function anonymizeRestaurantVisibleHistory(userId: mongoose.Types.ObjectId) {
  await Reservation.updateMany(
    { dinerId: userId },
    { $set: { guestNotes: '' } },
  );

  await WaitlistEntry.updateMany(
    { dinerId: userId, status: { $in: ['waiting', 'notified'] } },
    { $set: { status: 'cancelled' } },
  );
  await WaitlistEntry.updateMany(
    { dinerId: userId },
    {
      $set: {
        guestName: TOMBSTONE_FIRST_NAME,
        guestPhone: '',
      },
      $unset: { dinerId: 1 },
    },
  );

  await RestaurantInquiry.updateMany(
    { userId },
    {
      $set: {
        senderName: TOMBSTONE_FIRST_NAME,
        senderEmail: 'deleted@tablevera.invalid',
        message: '[Deleted]',
      },
      $unset: { userId: 1 },
    },
  );

  await PrivateDiningInquiry.updateMany(
    { dinerId: userId },
    {
      $set: {
        contactPhone: '',
        specialRequests: '',
      },
    },
  );

  // Reviews stay for restaurant ratings; author resolves to tombstone "Guest".
  await Review.updateMany({ dinerId: userId }, { $set: { photos: [] } });
}

export async function deleteMyAccount(actorId: string) {
  const user = await User.findById(actorId);
  if (!user) throw new NotFoundError('User');
  if (user.deletedAt) {
    throw new ValidationError('This account is already deleted');
  }
  if (user.role !== 'diner') {
    throw new ForbiddenError(
      'Only diner accounts can self-delete here. Restaurant owners must delete venues in Partner Hub first.',
    );
  }

  await assertDinerClearOfBookingObligations(actorId);
  await cancelUpcomingForAccountDeletion(user._id);
  await anonymizeRestaurantVisibleHistory(user._id);

  const oid = user._id;
  await GuestProfile.deleteMany({ dinerId: oid });
  await Message.deleteMany({ $or: [{ dinerId: oid }, { senderId: oid }] });
  await LoyaltyTransaction.deleteMany({ userId: oid });
  await RestaurantLoyaltyTransaction.deleteMany({ dinerId: oid });
  await Notification.deleteMany({ userId: oid });
  await RestaurantBookmark.deleteMany({ userId: oid });
  await UserSearchHistory.deleteMany({ userId: oid });
  await SearchEvent.deleteMany({ userId: oid });
  await ReviewReaction.deleteMany({ userId: oid });
  await SurveyResponse.deleteMany({ dinerId: oid });
  await Ticket.deleteMany({ dinerId: oid });

  user.firstName = TOMBSTONE_FIRST_NAME;
  user.lastName = '';
  user.avatarUrl = undefined;
  user.address = undefined;
  user.passwordHash = undefined;
  user.googleId = undefined;
  user.email = undefined;
  user.phone = undefined;
  user.emailVerified = false;
  user.phoneVerified = false;
  user.loyaltyPoints = 0;
  user.loyaltyCompletedVisits = 0;
  user.loyaltyPointsExpireAt = undefined;
  user.referralCode = undefined;
  user.referredByUserId = undefined;
  user.pushTokens = [];
  user.telegramChatId = undefined;
  user.refreshTokens = [];
  user.refreshTokenGrace = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.stripeCustomerIds = undefined;
  user.restaurantIds = [];
  user.deletedAt = new Date();
  await user.save();

  await logAudit({
    actorId,
    action: 'deleteMyAccount',
    resource: 'User',
    resourceId: actorId,
    details: { anonymized: true },
  });

  return {
    success: true,
    deletedUserId: actorId,
    message:
      'Account deleted. Restaurants no longer see your name or contact details on past bookings.',
  };
}
