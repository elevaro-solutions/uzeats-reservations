import { isPlatformAdmin, reviewReportResponseInputSchema } from '@reservations/shared';
import { env } from '../config/env.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { textToEmailHtml, wrapEmailHtml } from './emailBranding.js';
import { notifyUser } from './notifications.js';

function dashboardReviewsUrl(restaurantId: string) {
  const base = (env.DASHBOARD_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/reviews?restaurant=${encodeURIComponent(restaurantId)}`;
}

function dashboardModerationUrl(reviewId: string) {
  const base = (env.DASHBOARD_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/admin/moderation/${reviewId}?type=review`;
}

function previewText(
  body: string,
  attachments: Array<{ filename: string; url: string }>,
) {
  const preview =
    body.slice(0, 280) ||
    (attachments.length === 1
      ? 'Attached 1 image'
      : `Attached ${attachments.length} images`);
  const attachmentLines = attachments
    .map((attachment) => `${attachment.filename}: ${attachment.url}`)
    .join('\n');
  return { preview, attachmentLines };
}

async function appendReportMessage(input: {
  reviewId: string;
  authorId: string;
  body: string;
  attachments?: unknown;
  fromReporter: boolean;
}) {
  const parsed = reviewReportResponseInputSchema.safeParse({
    body: input.body,
    attachments: input.attachments ?? [],
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid response');
  }

  const review = await Review.findById(input.reviewId);
  if (!review) throw new NotFoundError('Review');
  if (!review.flaggedById) {
    throw new ValidationError('This report has no reporter thread');
  }
  if (!review.flagged) {
    throw new ValidationError('This report was closed');
  }

  review.reportResponses.push({
    body: parsed.data.body,
    attachments: parsed.data.attachments.map((attachment) => ({
      url: attachment.url,
      key: attachment.key,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
    })),
    authorId: input.authorId as never,
    fromReporter: input.fromReporter,
    createdAt: new Date(),
  } as never);
  await review.save();
  return { review, parsed: parsed.data };
}

/** Platform admin reply to the partner who reported the review. */
export async function respondToReviewReport(input: {
  reviewId: string;
  adminId: string;
  body: string;
  attachments?: unknown;
}) {
  const { review, parsed } = await appendReportMessage({
    reviewId: input.reviewId,
    authorId: input.adminId,
    body: input.body,
    attachments: input.attachments,
    fromReporter: false,
  });

  const reporterId = review.flaggedById!.toString();
  const restaurant = await Restaurant.findById(review.restaurantId).select('name');
  const venue = restaurant?.name?.trim();
  const { preview, attachmentLines } = previewText(parsed.body, parsed.attachments);
  const reviewsUrl = dashboardReviewsUrl(review.restaurantId.toString());
  const text = [
    preview,
    attachmentLines ? `\n\n${attachmentLines}` : '',
    `\n\nView the review in Partner Hub: ${reviewsUrl}`,
  ].join('');

  try {
    await notifyUser(reporterId, {
      type: 'review_report_response',
      title: venue
        ? `Response to your review report — ${venue}`
        : 'Response to your review report',
      body: text,
      htmlBody: wrapEmailHtml(textToEmailHtml(text)),
      data: {
        restaurantId: review.restaurantId.toString(),
        reviewId: review._id.toString(),
      },
    });
  } catch {
    // The reply is saved even if delivery fails.
  }

  return review;
}

/**
 * Partner follow-up on a review report. Any owner/manager with venue access may
 * reply while the report is still open. Notifies the last Tablevera admin who
 * replied, when one exists.
 */
export async function replyToReviewReport(input: {
  reviewId: string;
  userId: string;
  userRole: string;
  body: string;
  attachments?: unknown;
}) {
  const review = await Review.findById(input.reviewId);
  if (!review) throw new NotFoundError('Review');
  if (!review.flaggedById) {
    throw new ValidationError('This review has no open report thread');
  }
  if (!review.flagged) {
    throw new ValidationError('This report was closed');
  }

  if (!isPlatformAdmin(input.userRole as never)) {
    const restaurant = await Restaurant.findById(review.restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant');
    const isOwner = restaurant.ownerId.equals(input.userId);
    if (!isOwner) {
      const user = await User.findById(input.userId).select('restaurantIds');
      const allowed = user?.restaurantIds?.some((id) => id.equals(review.restaurantId));
      if (!allowed) throw new ForbiddenError('Forbidden');
    }
  }

  const { review: saved, parsed } = await appendReportMessage({
    reviewId: input.reviewId,
    authorId: input.userId,
    body: input.body,
    attachments: input.attachments,
    fromReporter: true,
  });

  const reporterId = saved.flaggedById!.toString();
  const lastAdminId = [...(saved.reportResponses ?? [])]
    .reverse()
    .map((item: { authorId?: { toString(): string } }) => item.authorId?.toString())
    .find((authorId) => authorId && authorId !== reporterId);

  if (lastAdminId) {
    const restaurant = await Restaurant.findById(saved.restaurantId).select('name');
    const venue = restaurant?.name?.trim();
    const { preview, attachmentLines } = previewText(parsed.body, parsed.attachments);
    const moderationUrl = dashboardModerationUrl(saved._id.toString());
    const text = [
      preview,
      attachmentLines ? `\n\n${attachmentLines}` : '',
      `\n\nOpen the report: ${moderationUrl}`,
    ].join('');
    try {
      await notifyUser(lastAdminId, {
        type: 'review_report_response',
        title: venue
          ? `New message on a review report — ${venue}`
          : 'New message on a review report',
        body: text,
        htmlBody: wrapEmailHtml(textToEmailHtml(text)),
        data: {
          restaurantId: saved.restaurantId.toString(),
          reviewId: saved._id.toString(),
          href: `/admin/moderation/${saved._id.toString()}?type=review`,
        },
      });
    } catch {
      // The reply is saved even if delivery fails.
    }
  }

  return saved;
}
