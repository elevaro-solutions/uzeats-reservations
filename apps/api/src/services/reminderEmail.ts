import { EMAIL_BRAND } from './emailBranding.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../models/EmailTemplate.js';
import { renderEmailTemplate, renderEmailTemplateContent } from './emailTemplates.js';

export type ReservationReminderEmailInput = {
  firstName?: string | null;
  restaurantName: string;
  when: string;
  partySize: number;
  reservationId: string;
  askLate: boolean;
};

function dinerReservationUrl(reservationId: string) {
  const base = (env.WEB_APP_URL || EMAIL_BRAND.siteUrl).replace(/\/+$/, '');
  return `${base}/reservations/${reservationId}`;
}

function formatPartySizeLabel(partySize: number) {
  return `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
}

export function reminderTemplateKey(askLate: boolean) {
  return askLate ? 'booking_reminder_late' : 'booking_reminder';
}

export function reservationReminderTemplateVars(input: ReservationReminderEmailInput) {
  const restaurantName = input.restaurantName.trim() || 'the restaurant';
  const reservationUrl = dinerReservationUrl(input.reservationId);
  return {
    key: reminderTemplateKey(input.askLate),
    reservationUrl,
    vars: {
      firstName: input.firstName?.trim() || 'there',
      restaurantName,
      date: input.when,
      partySize: formatPartySizeLabel(input.partySize),
      reservationUrl,
      lateUrl: `${reservationUrl}?runningLate=1`,
    },
  };
}

/** Render the built-in reminder template. Used when the saved template cannot be loaded. */
export function renderDefaultReservationReminderEmail(input: ReservationReminderEmailInput) {
  const { key, reservationUrl, vars } = reservationReminderTemplateVars(input);
  const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === key);
  if (!template) throw new Error(`Email template not found: ${key}`);
  const rendered = renderEmailTemplateContent(template, vars);
  return {
    subject: rendered.subject,
    htmlBody: rendered.bodyHtml,
    emailText: rendered.bodyText,
    reservationUrl,
  };
}

/** Render the admin-editable reminder template, falling back to the built-in copy. */
export async function renderReservationReminderEmail(input: ReservationReminderEmailInput) {
  const { key, reservationUrl, vars } = reservationReminderTemplateVars(input);
  try {
    const rendered = await renderEmailTemplate(key, vars);
    return {
      subject: rendered.subject,
      htmlBody: rendered.bodyHtml,
      emailText: rendered.bodyText,
      reservationUrl,
    };
  } catch (err) {
    logger.warn({ err, key }, '[reminders] template render failed; using built-in copy');
    return renderDefaultReservationReminderEmail(input);
  }
}
