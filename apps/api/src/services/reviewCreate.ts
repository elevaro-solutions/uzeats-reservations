import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import type { Reservation } from '../models/Reservation.js';
import type { UserDocument } from '../models/User.js';
import { logger } from '../lib/logger.js';
import { awardReviewPoints } from './loyalty.js';
import { notifyRestaurantManagers } from './notifications.js';
import { cancelReviewRequestEmail } from './reviewRequest.js';
import { recomputePublicReviewStats } from './reviewStats.js';

type ReservationDoc = InstanceType<typeof Reservation>;

export type ReservationReviewInput = {
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
  photos?: string[] | null;
};

/**
 * Store the diner's public review for a visit and run the side effects every review gets
 * (rating totals, loyalty points, manager alert). Callers check eligibility and duplicates.
 */
export async function publishReservationReview(
  reservation: ReservationDoc,
  user: Pick<UserDocument, '_id' | 'firstName' | 'lastName'>,
  input: ReservationReviewInput,
) {
  const review = await Review.create({
    restaurantId: reservation.restaurantId,
    dinerId: user._id,
    reservationId: reservation._id,
    rating: input.rating,
    ...(input.foodRating != null ? { foodRating: input.foodRating } : {}),
    ...(input.serviceRating != null ? { serviceRating: input.serviceRating } : {}),
    ...(input.atmosphereRating != null ? { atmosphereRating: input.atmosphereRating } : {}),
    comment: input.comment ?? '',
    photos: input.photos ?? [],
  });

  void cancelReviewRequestEmail(reservation._id.toString());
  await recomputePublicReviewStats(reservation.restaurantId);

  try {
    await awardReviewPoints(user._id.toString(), reservation._id.toString());
  } catch (err) {
    // Review must succeed even when loyalty writes fail (standalone Mongo
    // rejects multi-doc transactions; production masks that as 500).
    logger.error(
      { err, reservationId: reservation._id.toString() },
      '[review] loyalty award failed',
    );
  }

  const dinerName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'A guest';
  const commentPreview = (input.comment ?? '').trim().slice(0, 120);
  const restaurant = await Restaurant.findById(reservation.restaurantId).select('name').lean();
  const venueSuffix = restaurant?.name ? ` — ${restaurant.name}` : '';
  await notifyRestaurantManagers(reservation.restaurantId.toString(), {
    type: 'new_review',
    title: 'New review',
    body: commentPreview
      ? `${input.rating}★ from ${dinerName}: ${commentPreview}${venueSuffix}`
      : `${input.rating}★ from ${dinerName}${venueSuffix}`,
    data: {
      reviewId: review._id.toString(),
      reservationId: reservation._id.toString(),
    },
  });

  return review;
}
