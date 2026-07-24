import {
  DEFAULT_EMAIL_TEMPLATES,
  EmailTemplate,
  type EmailTemplateDocument,
} from '../models/EmailTemplate.js';

export function renderTemplateString(
  template: string,
  vars: Record<string, string | number | undefined | null>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
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
  return {
    subject: renderTemplateString(doc.subject, vars),
    bodyHtml: renderTemplateString(doc.bodyHtml, vars),
    bodyText: renderTemplateString(doc.bodyText || '', vars),
  };
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
