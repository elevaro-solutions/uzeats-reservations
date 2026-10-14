import { User } from '../models/User.js';
import { Reservation } from '../models/Reservation.js';
import { sendEmail } from './notifications.js';
import { logger } from '../lib/logger.js';
import { ValidationError } from '../lib/errors.js';

export type PlatformEngagementAudience = {
  /** Limit to diners who booked this restaurant (optional). */
  restaurantId?: string | null;
  /** Reservation statuses that qualify a diner (default: completed). */
  reservationStatuses?: string[] | null;
  /** Max recipients for a single send (hard cap). */
  limit?: number | null;
};

const HARD_CAP = 500;

export async function resolvePlatformEngagementRecipients(audience: PlatformEngagementAudience) {
  const limit = Math.min(Math.max(1, audience.limit ?? 100), HARD_CAP);
  const statuses = audience.reservationStatuses?.length
    ? audience.reservationStatuses
    : ['completed'];

  let dinerIds: string[] | null = null;
  if (audience.restaurantId) {
    const rows = await Reservation.distinct('dinerId', {
      restaurantId: audience.restaurantId,
      status: { $in: statuses },
    });
    dinerIds = rows.map((id) => id.toString());
    if (dinerIds.length === 0) return [];
  }

  const filter: Record<string, unknown> = {
    role: 'diner',
    email: { $exists: true, $ne: null },
  };
  if (dinerIds) filter._id = { $in: dinerIds };

  return User.find(filter).select('email firstName').limit(limit).lean();
}

export async function sendPlatformEngagementEmail(input: {
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  audience: PlatformEngagementAudience;
  actorId: string;
}) {
  const subject = input.subject.trim();
  const bodyHtml = input.bodyHtml.trim();
  if (!subject || subject.length < 3) {
    throw new ValidationError('Subject is required');
  }
  if (!bodyHtml || bodyHtml.length < 10) {
    throw new ValidationError('Email body is required');
  }

  const recipients = await resolvePlatformEngagementRecipients(input.audience);
  let sent = 0;
  for (const user of recipients) {
    if (!user.email) continue;
    const html = bodyHtml.replaceAll('{{firstName}}', user.firstName?.trim() || 'there');
    const text = (input.bodyText ?? '')
      .replaceAll('{{firstName}}', user.firstName?.trim() || 'there');
    try {
      await sendEmail(user.email, subject, text || html.replace(/<[^>]+>/g, ' '), {
        htmlBody: html,
      });
      sent += 1;
    } catch (err) {
      logger.error({ err, email: user.email }, '[platform-engagement] send failed');
    }
  }

  logger.info(
    { actorId: input.actorId, sent, audience: input.audience },
    '[platform-engagement] campaign sent',
  );
  return { sent, recipientCount: recipients.length };
}
