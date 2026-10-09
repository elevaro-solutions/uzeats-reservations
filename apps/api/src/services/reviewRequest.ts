import {
  REVIEW_REQUEST_MIN_HOURS_AFTER_VISIT,
  REVIEW_REQUEST_PREFERRED_LOCAL_HOUR,
  addCalendarDays,
  formatDateTimeInTimeZone,
  isoDateInTimeZone,
  restaurantTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { NotFoundError, PlanFeatureError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getLoyaltyProgram } from './loyaltyProgram.js';
import { getFeatures } from './plans.js';
import { isFeatureEnabled } from './platformConfig.js';
import { notifyUser, reminderQueue } from './notifications.js';
import { renderReviewRequestEmail } from './reviewRequestEmail.js';

function reviewRequestJobId(reservationId: string) {
  return `review-request-${reservationId}`;
}

/** Same rules as `isReservationReviewable` (kept local to avoid circular imports). */
function isReviewable(reservation: {
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

/**
 * Industry-standard send time: 10:00 AM restaurant-local on the first morning
 * that is at least {@link REVIEW_REQUEST_MIN_HOURS_AFTER_VISIT} after the visit ends.
 */
export function computeReviewRequestSendAt(
  slotEnd: Date,
  timeZone: string,
  now: Date = new Date(),
): Date {
  const minAfterVisitMs = REVIEW_REQUEST_MIN_HOURS_AFTER_VISIT * 60 * 60 * 1000;
  const earliest = new Date(
    Math.max(slotEnd.getTime() + minAfterVisitMs, now.getTime() + 60_000),
  );
  const preferredHm = `${String(REVIEW_REQUEST_PREFERRED_LOCAL_HOUR).padStart(2, '0')}:00`;
  let dateIso = isoDateInTimeZone(earliest, timeZone);
  let sendAt = zonedWallClockToUtc(dateIso, preferredHm, timeZone);
  if (sendAt < earliest) {
    dateIso = addCalendarDays(dateIso, 1);
    sendAt = zonedWallClockToUtc(dateIso, preferredHm, timeZone);
  }
  return sendAt;
}

async function campaignsEnabledForRestaurant(restaurantId: string): Promise<boolean> {
  if (!(await isFeatureEnabled('campaigns'))) return false;
  const features = await getFeatures(restaurantId);
  return Boolean(features.emailCampaigns);
}

export async function requireCampaignsForReviewRequest(restaurantId: string) {
  if (!(await isFeatureEnabled('campaigns'))) {
    throw new PlanFeatureError('Email campaigns are currently disabled on the platform.');
  }
  const features = await getFeatures(restaurantId);
  if (!features.emailCampaigns) {
    throw new PlanFeatureError(
      'Automated email campaigns is not included in your current plan. Upgrade to unlock it.',
    );
  }
}

export async function cancelReviewRequestEmail(reservationId: string) {
  const jobId = reviewRequestJobId(reservationId);
  try {
    const job = await reminderQueue.getJob(jobId);
    if (job) await job.remove();
  } catch (err) {
    logger.warn({ err, jobId }, '[review-request] failed to remove job');
  }
}

/** Schedule a delayed review-request email after a completed visit (no-op if campaigns off). */
export async function scheduleReviewRequestEmail(reservationId: string) {
  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation?.dinerId || reservation.status !== 'completed') return;

    const restaurantId = reservation.restaurantId.toString();
    if (!(await campaignsEnabledForRestaurant(restaurantId))) return;

    const existing = await Review.findOne({ reservationId }).select('_id').lean();
    if (existing) return;

    const restaurant = await Restaurant.findById(restaurantId).select('address location');
    const timeZone = restaurantTimeZone(restaurant ?? {});
    const slotEnd = reservation.slotEnd ?? reservation.slotStart;
    const sendAt = computeReviewRequestSendAt(slotEnd, timeZone);
    const delay = Math.max(0, sendAt.getTime() - Date.now());

    await cancelReviewRequestEmail(reservationId);
    await reminderQueue.add(
      'review-request',
      { reservationId },
      { delay, jobId: reviewRequestJobId(reservationId) },
    );
  } catch (err) {
    logger.error({ err, reservationId }, '[review-request] schedule failed');
  }
}

/** Deliver the review-request notification (worker + manual ask). */
export async function sendReviewRequestEmail(reservationId: string): Promise<boolean> {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation?.dinerId) return false;
  if (!isReviewable(reservation)) return false;

  const restaurantId = reservation.restaurantId.toString();
  if (!(await campaignsEnabledForRestaurant(restaurantId))) return false;

  const existing = await Review.findOne({ reservationId }).select('_id').lean();
  if (existing) return false;

  const [restaurant, diner, program] = await Promise.all([
    Restaurant.findById(restaurantId),
    User.findById(reservation.dinerId).select('firstName'),
    getLoyaltyProgram(),
  ]);
  const timeZone = restaurantTimeZone(restaurant ?? {});
  const when = formatDateTimeInTimeZone(
    reservation.slotStart,
    timeZone,
  );
  const points = program.pointsPerReview;
  const restaurantName = restaurant?.name ?? 'the restaurant';
  const email = await renderReviewRequestEmail({
    firstName: diner?.firstName,
    restaurantName,
    when,
    reservationId,
    points,
  });

  await notifyUser(
    reservation.dinerId.toString(),
    {
      type: 'review_request',
      title: `How was ${restaurantName}?`,
      emailSubject: email.subject,
      body: `Leave a review for ${restaurantName} and earn ${points} loyalty points: ${email.reviewUrl}`,
      htmlBody: email.htmlBody,
      emailText: email.emailText,
      data: {
        reservationId,
        restaurantId,
        reviewUrl: email.reviewUrl,
        points,
      },
    },
    { smsRestaurantId: restaurantId },
  );
  return true;
}

/**
 * Partner-initiated: find the guest's latest reviewable visit without a review
 * and send the ask-for-review email immediately.
 */
export async function askGuestForReview(input: {
  restaurantId: string;
  dinerId: string;
}): Promise<{
  sent: boolean;
  reservationId: string;
  pointsForReview: number;
  message: string;
}> {
  await requireCampaignsForReviewRequest(input.restaurantId);

  const program = await getLoyaltyProgram();
  const pointsForReview = program.pointsPerReview;

  const reservations = await Reservation.find({
    restaurantId: input.restaurantId,
    dinerId: input.dinerId,
    status: { $in: ['completed', 'confirmed', 'seated'] },
  })
    .sort({ slotStart: -1 })
    .limit(25);

  const reviewable = reservations.filter((r) => isReviewable(r));
  if (reviewable.length === 0) {
    throw new ValidationError('This guest has no recent visit that can be reviewed yet.');
  }

  const reviewedIds = new Set(
    (
      await Review.find({
        reservationId: { $in: reviewable.map((r) => r._id) },
      })
        .select('reservationId')
        .lean()
    ).map((r) => r.reservationId.toString()),
  );

  const target = reviewable.find((r) => !reviewedIds.has(r._id.toString()));
  if (!target) {
    throw new ValidationError('This guest already reviewed their recent visits.');
  }

  const diner = await User.findById(input.dinerId).select('_id email');
  if (!diner) throw new NotFoundError('Guest not found');

  await cancelReviewRequestEmail(target._id.toString());
  const sent = await sendReviewRequestEmail(target._id.toString());
  if (!sent) {
    throw new ValidationError('Could not send the review request. Try again later.');
  }

  return {
    sent: true,
    reservationId: target._id.toString(),
    pointsForReview,
    message: `Review request sent. They can earn ${pointsForReview} loyalty points.`,
  };
}
