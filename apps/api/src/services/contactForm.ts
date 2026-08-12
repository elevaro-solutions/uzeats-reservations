import { randomUUID } from 'node:crypto';
import {
  CONTACT_FORM_TOPICS,
  contactFormInputSchema,
  type ContactFormInput,
} from '@reservations/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { sendEmail } from './notifications.js';
import {
  emailDetailBox,
  emailGreeting,
  emailParagraph,
  emailSignature,
  escapeHtml,
} from './emailBranding.js';

const SUPPORT_EMAIL = 'support@tablevera.online';

const TOPIC_LABELS: Record<(typeof CONTACT_FORM_TOPICS)[number], string> = {
  general: 'General inquiry',
  restaurant: 'Restaurant partnership',
  support: 'Account & booking support',
  privacy: 'Privacy & data requests',
  legal: 'Legal & terms',
};

function getTopicEmail() {
  return SUPPORT_EMAIL;
}

function getTopicLabel(topic: ContactFormInput['topic']) {
  return TOPIC_LABELS[topic];
}

async function sendContactNotificationEmail(input: ContactFormInput) {
  const topicLabel = getTopicLabel(input.topic);
  const recipient = getTopicEmail();
  const subject = `[Tablevera] ${topicLabel}`;
  const body = [
    `New contact form submission`,
    ``,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Topic: ${topicLabel}`,
    ``,
    `Message:`,
    input.message,
  ].join('\n');

  const htmlBody = [
    emailParagraph('<strong>New contact form submission</strong>'),
    emailDetailBox([
      { label: 'Name', value: input.name },
      { label: 'Email', value: input.email },
      { label: 'Topic', value: topicLabel },
    ]),
    emailParagraph('<strong>Message:</strong>'),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(input.message)}</span>`),
  ].join('');

  await sendEmail(recipient, subject, body, { htmlBody });
}

async function sendContactConfirmationEmail(input: ContactFormInput) {
  const topicLabel = getTopicLabel(input.topic);
  const subject = 'We received your message — Tablevera';
  const body = [
    `Hi ${input.name},`,
    ``,
    `Thanks for contacting Tablevera. We received your message about "${topicLabel}" and will get back to you within 1–2 business days.`,
    ``,
    `Your message:`,
    input.message,
    ``,
    `— The Tablevera team`,
  ].join('\n');

  const htmlBody = [
    emailGreeting(input.name),
    emailParagraph(
      `Thanks for contacting Tablevera. We received your message about <strong>${escapeHtml(topicLabel)}</strong> and will get back to you within 1–2 business days.`,
    ),
    emailParagraph('<strong>Your message:</strong>'),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(input.message)}</span>`),
    emailSignature(),
  ].join('');

  await sendEmail(input.email, subject, body, { htmlBody });
}

async function ingestElevaroLead(input: ContactFormInput, externalId: string) {
  if (!env.ELEVARO_LEADS_API_KEY) {
    logger.warn('[contact] ELEVARO_LEADS_API_KEY not set — skipping lead ingest');
    return;
  }

  const response = await fetch('https://api.elevarosolutions.com/ingest/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ELEVARO_LEADS_API_KEY,
      'x-referrer-domain': env.ELEVARO_LEADS_REFERRER_DOMAIN,
    },
    body: JSON.stringify({
      contactName: input.name,
      email: input.email,
      topic: getTopicLabel(input.topic),
      message: input.message,
      externalId,
      source: env.ELEVARO_LEADS_SOURCE,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Lead ingest failed (${response.status})`);
  }

  const result = (await response.json()) as {
    success?: boolean;
    created?: boolean;
    leadId?: string;
    message?: string;
  };
  logger.info({ leadId: result.leadId, externalId }, '[contact] Elevaro lead ingested');
}

export async function submitContactForm(rawInput: unknown) {
  const input = contactFormInputSchema.parse(rawInput);
  const externalId = `tablevera-contact-${randomUUID()}`;

  await Promise.all([
    sendContactNotificationEmail(input),
    sendContactConfirmationEmail(input),
  ]);

  try {
    await ingestElevaroLead(input, externalId);
  } catch (err) {
    logger.error({ err, externalId, email: input.email }, '[contact] Elevaro lead ingest failed');
  }

  return {
    success: true,
    message: 'Your message has been sent. We will respond within 1–2 business days.',
  };
}
