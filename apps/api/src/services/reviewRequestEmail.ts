import { EMAIL_BRAND } from './emailBranding.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../models/EmailTemplate.js';
import { renderEmailTemplate, renderEmailTemplateContent } from './emailTemplates.js';

export type ReviewRequestEmailInput = {
  firstName?: string | null;
  restaurantName: string;
  when: string;
  reservationId: string;
  points: number;
};

function dinerReviewUrl(reservationId: string) {
  const base = (env.WEB_APP_URL || EMAIL_BRAND.siteUrl).replace(/\/+$/, '');
  return `${base}/reservations/${reservationId}?review=1`;
}

export function reviewRequestTemplateVars(input: ReviewRequestEmailInput) {
  const restaurantName = input.restaurantName.trim() || 'the restaurant';
  const reviewUrl = dinerReviewUrl(input.reservationId);
  const points = String(Math.max(0, Math.round(input.points)));
  return {
    key: 'review_request' as const,
    reviewUrl,
    vars: {
      firstName: input.firstName?.trim() || 'there',
      restaurantName,
      date: input.when,
      points,
      reviewUrl,
      reservationUrl: reviewUrl,
    },
  };
}

export function renderDefaultReviewRequestEmail(input: ReviewRequestEmailInput) {
  const { key, reviewUrl, vars } = reviewRequestTemplateVars(input);
  const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === key);
  if (!template) throw new Error(`Email template not found: ${key}`);
  const rendered = renderEmailTemplateContent(template, vars);
  return {
    subject: rendered.subject,
    htmlBody: rendered.bodyHtml,
    emailText: rendered.bodyText,
    reviewUrl,
  };
}

/** Render the admin-editable review-request template, falling back to built-in copy. */
export async function renderReviewRequestEmail(input: ReviewRequestEmailInput) {
  const { key, reviewUrl, vars } = reviewRequestTemplateVars(input);
  try {
    const rendered = await renderEmailTemplate(key, vars);
    return {
      subject: rendered.subject,
      htmlBody: rendered.bodyHtml,
      emailText: rendered.bodyText,
      reviewUrl,
    };
  } catch (err) {
    logger.warn({ err, key }, '[review-request] template render failed; using built-in copy');
    return renderDefaultReviewRequestEmail(input);
  }
}
