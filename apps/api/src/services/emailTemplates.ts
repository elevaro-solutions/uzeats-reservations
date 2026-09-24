import {
  DEFAULT_EMAIL_TEMPLATES,
  EmailTemplate,
  type EmailTemplateDocument,
} from '../models/EmailTemplate.js';
import { isEmailDeliveryConfigured, sendEmail } from './notifications.js';

/** Sample substitution values for preview and admin test sends. */
export const SAMPLE_EMAIL_TEMPLATE_VARS: Record<string, string> = {
  firstName: 'Alex',
  restaurantName: 'Cedar & Salt',
  resetUrl: 'https://tablevera.online/reset?token=preview',
  bookUrl: 'https://tablevera.online/restaurants/cedar-salt',
  inviteUrl: 'https://dashboard.tablevera.online/accept-invite?token=preview',
  role: 'Manager',
  date: 'Saturday, Sep 12 · 7:30 PM',
  partySize: '4',
  reason: 'Change of plans',
  messageSection:
    '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1a1816;"><strong>Message:</strong> Running late from work — sorry!</p>',
  messageText: '\nMessage: Running late from work — sorry!',
  dashboardUrl: 'https://dashboard.tablevera.online',
  plan: 'Growth',
  invoiceNumber: 'INV-1042',
  amount: '$149.00',
  dueDate: 'Sep 15, 2026',
  billingUrl: 'https://dashboard.tablevera.online/billing',
  period: 'Sep 2026',
  invoiceUrl: 'https://dashboard.tablevera.online/invoices/INV-1042',
  code: '123456',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function renderTemplateString(
  template: string,
  vars: Record<string, string | number | undefined | null>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

export function renderEmailTemplateContent(
  content: { subject: string; bodyHtml: string; bodyText?: string },
  vars: Record<string, string | number | undefined | null> = SAMPLE_EMAIL_TEMPLATE_VARS,
) {
  return {
    subject: renderTemplateString(content.subject, vars),
    bodyHtml: renderTemplateString(content.bodyHtml, vars),
    bodyText: renderTemplateString(content.bodyText || '', vars),
  };
}

export async function ensureDefaultEmailTemplates() {
  for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
    const { key, ...fields } = tpl;
    await EmailTemplate.updateOne(
      { key },
      { $setOnInsert: { key, ...fields } },
      { upsert: true },
    );
    // Keep built-in templates current until an admin customizes them.
    await EmailTemplate.updateOne({ key, updatedById: { $exists: false } }, { $set: fields });
  }
  // Shorten legacy display name that overflowed the admin templates list.
  await EmailTemplate.updateOne(
    { key: 'restaurant_created', name: 'Restaurant created — onboarding & invoice' },
    { $set: { name: 'Restaurant created' } },
  );
}

export async function listEmailTemplates() {
  await ensureDefaultEmailTemplates();
  return EmailTemplate.find().sort({ name: 1 });
}

export async function getEmailTemplate(key: string) {
  await ensureDefaultEmailTemplates();
  const doc = await EmailTemplate.findOne({ key });
  if (!doc) throw new Error(`Email template not found: ${key}`);
  return doc;
}

export async function updateEmailTemplate(
  key: string,
  input: { subject?: string; bodyHtml?: string; bodyText?: string; name?: string },
  updatedById?: string,
) {
  const doc = await getEmailTemplate(key);
  if (input.subject !== undefined) doc.subject = input.subject;
  if (input.bodyHtml !== undefined) doc.bodyHtml = input.bodyHtml;
  if (input.bodyText !== undefined) doc.bodyText = input.bodyText;
  if (input.name !== undefined) doc.name = input.name;
  if (updatedById) doc.updatedById = updatedById as any;
  await doc.save();
  return doc;
}

export async function renderEmailTemplate(
  key: string,
  vars: Record<string, string | number | undefined | null>,
) {
  const doc = await getEmailTemplate(key);
  return renderEmailTemplateContent(
    {
      subject: doc.subject,
      bodyHtml: doc.bodyHtml,
      bodyText: doc.bodyText || '',
    },
    vars,
  );
}

/**
 * Send a sample-rendered template to `to`. Prefer draft content from the editor when provided;
 * otherwise load the saved template by key.
 */
export async function sendTestEmailTemplate(args: {
  key: string;
  to: string;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
}) {
  if (!isEmailDeliveryConfigured()) {
    throw new Error('Email is not configured. Set SENDGRID_API_KEY on the API.');
  }

  const to = args.to.trim();
  if (!EMAIL_RE.test(to)) {
    throw new Error('Enter a valid email address');
  }

  await getEmailTemplate(args.key);

  const hasDraft =
    typeof args.subject === 'string' &&
    args.subject.length > 0 &&
    typeof args.bodyHtml === 'string' &&
    args.bodyHtml.length > 0;

  const rendered = hasDraft
    ? renderEmailTemplateContent({
        subject: args.subject!,
        bodyHtml: args.bodyHtml!,
        bodyText: args.bodyText ?? '',
      })
    : await renderEmailTemplate(args.key, SAMPLE_EMAIL_TEMPLATE_VARS);

  const subject = rendered.subject.startsWith('[Test]')
    ? rendered.subject
    : `[Test] ${rendered.subject}`;

  await sendEmail(to, subject, rendered.bodyText || rendered.subject, {
    htmlBody: rendered.bodyHtml,
  });

  return { success: true as const, to, subject };
}

export function mapEmailTemplate(doc: EmailTemplateDocument) {
  return {
    id: doc._id.toString(),
    key: doc.key,
    name: doc.name,
    subject: doc.subject,
    bodyHtml: doc.bodyHtml,
    bodyText: doc.bodyText ?? '',
    description: doc.description ?? '',
    updatedAt: (doc as any).updatedAt,
  };
}
