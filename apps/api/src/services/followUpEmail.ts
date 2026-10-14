import { formatDateTimeInTimeZone, restaurantTimeZone } from '@reservations/shared';
import { EMAIL_BRAND } from './emailBranding.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../models/EmailTemplate.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { renderEmailTemplate, renderEmailTemplateContent } from './emailTemplates.js';
import { notifyUser } from './notifications.js';

function reservationUrl(reservationId: string) {
  const base = (env.WEB_APP_URL || EMAIL_BRAND.siteUrl).replace(/\/+$/, '');
  return `${base}/reservations/${reservationId}`;
}

type FollowUpKind = 'booking_no_show' | 'booking_completed';

async function sendFollowUpEmail(params: {
  kind: FollowUpKind;
  dinerId: string;
  restaurantId: string;
  reservationId: string;
  slotStart: Date;
  partySize: number;
  title: string;
  bodyFallback: string;
}) {
  const [restaurant, diner] = await Promise.all([
    Restaurant.findById(params.restaurantId),
    User.findById(params.dinerId).select('firstName'),
  ]);
  const restaurantName = restaurant?.name ?? 'the restaurant';
  const when = formatDateTimeInTimeZone(
    params.slotStart,
    restaurantTimeZone(restaurant ?? {}),
  );
  const url = reservationUrl(params.reservationId);
  const vars = {
    firstName: diner?.firstName?.trim() || 'there',
    restaurantName,
    date: when,
    partySize: String(params.partySize),
    reservationUrl: url,
  };

  let subject = params.title;
  let htmlBody: string | undefined;
  let emailText = params.bodyFallback;
  try {
    const rendered = await renderEmailTemplate(params.kind, vars);
    subject = rendered.subject;
    htmlBody = rendered.bodyHtml;
    emailText = rendered.bodyText;
  } catch (err) {
    logger.warn({ err, kind: params.kind }, '[follow-up] template render failed; using built-in');
    const template = DEFAULT_EMAIL_TEMPLATES.find((t) => t.key === params.kind);
    if (template) {
      const rendered = renderEmailTemplateContent(template, vars);
      subject = rendered.subject;
      htmlBody = rendered.bodyHtml;
      emailText = rendered.bodyText;
    }
  }

  await notifyUser(
    params.dinerId,
    {
      type: params.kind,
      title: params.title,
      emailSubject: subject,
      body: params.bodyFallback,
      htmlBody,
      emailText,
      data: { reservationId: params.reservationId },
    },
    { smsRestaurantId: params.restaurantId },
  );
}

export async function sendNoShowFollowUpEmail(reservation: {
  _id: { toString(): string };
  dinerId: { toString(): string };
  restaurantId: { toString(): string };
  slotStart: Date;
  partySize: number;
}) {
  await sendFollowUpEmail({
    kind: 'booking_no_show',
    dinerId: reservation.dinerId.toString(),
    restaurantId: reservation.restaurantId.toString(),
    reservationId: reservation._id.toString(),
    slotStart: reservation.slotStart,
    partySize: reservation.partySize,
    title: 'We missed you',
    bodyFallback: 'We noticed you weren’t able to make your reservation. We hope to see you soon.',
  });
}

export async function sendCompletedFollowUpEmail(reservation: {
  _id: { toString(): string };
  dinerId: { toString(): string };
  restaurantId: { toString(): string };
  slotStart: Date;
  partySize: number;
}) {
  await sendFollowUpEmail({
    kind: 'booking_completed',
    dinerId: reservation.dinerId.toString(),
    restaurantId: reservation.restaurantId.toString(),
    reservationId: reservation._id.toString(),
    slotStart: reservation.slotStart,
    partySize: reservation.partySize,
    title: 'Thanks for dining with us',
    bodyFallback: 'Thanks for your visit — we hope you enjoyed it. We’d love to welcome you again.',
  });
}
