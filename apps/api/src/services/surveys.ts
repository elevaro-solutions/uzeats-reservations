import { htmlToPlainText } from '@reservations/shared';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';
import { SurveyResponse } from '../models/Survey.js';
import type { UserDocument } from '../models/User.js';
import { isFeatureEnabled } from './platformConfig.js';
import { publishReservationReview } from './reviewCreate.js';

export type SurveySubmitInput = {
  reservationId: string;
  overallRating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  ambienceRating?: number | null;
  valueRating?: number | null;
  wouldRecommend?: boolean | null;
  feedback?: string | null;
};

function rating(value: number | null | undefined, field: string) {
  if (value == null) return undefined;
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationError(`${field} must be between 1 and 5`);
  }
  return value;
}

function isDuplicateKeyError(err: unknown) {
  return Boolean(err && typeof err === 'object' && (err as { code?: number }).code === 11000);
}

/**
 * Post-visit survey. The survey's overall rating and comment also become the visit's public
 * review unless the diner already reviewed it.
 */
export async function submitSurvey(user: UserDocument, input: SurveySubmitInput) {
  const reservation = await Reservation.findById(input.reservationId);
  if (!reservation || !reservation.dinerId.equals(user._id)) {
    throw new NotFoundError('Reservation');
  }
  if (reservation.status !== 'completed') {
    throw new ValidationError('Surveys are available after a completed visit');
  }
  const overallRating = rating(input.overallRating, 'Overall rating');
  if (!overallRating) throw new ValidationError('Overall rating is required');
  const foodRating = rating(input.foodRating, 'Food rating');
  const serviceRating = rating(input.serviceRating, 'Service rating');
  const ambienceRating = rating(input.ambienceRating, 'Ambience rating');
  const valueRating = rating(input.valueRating, 'Value rating');
  const feedback = input.feedback?.trim() || undefined;
  if (feedback && feedback.length > 2000) {
    throw new ValidationError('Feedback must be 2000 characters or fewer');
  }

  const existing = await SurveyResponse.findOne({ reservationId: reservation._id });
  if (existing) throw new ConflictError('You already submitted a survey for this visit');

  let doc;
  try {
    doc = await SurveyResponse.create({
      restaurantId: reservation.restaurantId,
      reservationId: reservation._id,
      dinerId: user._id,
      overallRating,
      foodRating,
      serviceRating,
      ambienceRating,
      valueRating,
      wouldRecommend: input.wouldRecommend ?? undefined,
      feedback,
      submittedAt: new Date(),
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ConflictError('You already submitted a survey for this visit');
    }
    throw err;
  }

  try {
    const reviewed = await Review.exists({ reservationId: reservation._id });
    if (!reviewed && (await isFeatureEnabled('reviews'))) {
      await publishReservationReview(reservation, user, {
        rating: overallRating,
        foodRating,
        serviceRating,
        atmosphereRating: ambienceRating,
        comment: feedback ? htmlToPlainText(feedback) : undefined,
      });
    }
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      logger.error(
        { err, reservationId: reservation._id.toString() },
        '[survey] could not publish survey as review',
      );
    }
  }

  return doc;
}
