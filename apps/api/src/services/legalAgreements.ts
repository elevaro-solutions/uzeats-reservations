import {
  PARTNER_AGREEMENT_REACCEPT_GRACE_DAYS,
  sanitizeBlogHtml,
  type AgreementSignatureInput,
} from '@reservations/shared';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import {
  DEFAULT_LEGAL_AGREEMENTS,
  LegalAgreement,
  LEGAL_AGREEMENT_KEYS,
  type LegalAgreementDocument,
  type LegalAgreementKey,
} from '../models/LegalAgreement.js';
import { UserAgreementAcceptance } from '../models/UserAgreementAcceptance.js';
import { LegalAgreementVersion } from '../models/LegalAgreementVersion.js';
import { User } from '../models/User.js';
import {
  legalAgreementPdfFilename,
  renderLegalAgreementPdf,
} from './legalAgreementPdf.js';
import { signatureDataUrlToPdfImage } from './signatureImage.js';
import { notifyUser } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';

export type AgreementComplianceStatus = 'current' | 'grace' | 'blocked';

export type AgreementCompliance = {
  agreementKey: LegalAgreementKey;
  required: boolean;
  status: AgreementComplianceStatus;
  currentVersion: number;
  acceptedVersion: number | null;
  versionPublishedAt: string | null;
  graceEndsAt: string | null;
  daysRemaining: number | null;
  agreementName: string;
  agreement: ReturnType<typeof mapLegalAgreement>;
};

function dashboardBase() {
  return (env.DASHBOARD_APP_URL || 'https://dashboard.tablevera.online').replace(/\/$/, '');
}

function webBase() {
  return (env.WEB_APP_URL || process.env.WEB_URL || 'https://tablevera.online').replace(/\/$/, '');
}

export function isLegalAgreementKey(value: string): value is LegalAgreementKey {
  return (LEGAL_AGREEMENT_KEYS as readonly string[]).includes(value);
}

export async function ensureDefaultLegalAgreements() {
  for (const tpl of DEFAULT_LEGAL_AGREEMENTS) {
    const { key, ...fields } = tpl;
    await LegalAgreement.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          version: 1,
          versionPublishedAt: new Date(),
          ...fields,
        },
      },
      { upsert: true },
    );
    await LegalAgreement.updateOne(
      { key, updatedById: { $exists: false } },
      { $set: fields },
    );
    const doc = await LegalAgreement.findOne({ key });
    // Built-in copy may still be refreshed in place, so keep its snapshot in sync until customized.
    if (doc) await snapshotAgreementVersion(doc, { overwrite: !doc.updatedById });
  }
}

async function snapshotAgreementVersion(
  doc: LegalAgreementDocument,
  opts: { overwrite: boolean },
) {
  const fields = {
    name: doc.name,
    bodyHtml: doc.bodyHtml,
    publishedAt: doc.versionPublishedAt ?? (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
  };
  await LegalAgreementVersion.updateOne(
    { key: doc.key, version: doc.version ?? 1 },
    opts.overwrite ? { $set: fields } : { $setOnInsert: fields },
    { upsert: true },
  );
}

/** Text of a specific published version (falls back to the live doc for the current version). */
export async function getAgreementVersionContent(key: LegalAgreementKey, version: number) {
  const snapshot = await LegalAgreementVersion.findOne({ key, version }).lean();
  if (snapshot) {
    return {
      name: snapshot.name,
      bodyHtml: snapshot.bodyHtml,
      publishedAt: snapshot.publishedAt ?? null,
    };
  }
  const doc = await getLegalAgreement(key);
  return {
    name: doc.name,
    bodyHtml: doc.bodyHtml,
    publishedAt: doc.versionPublishedAt ?? null,
  };
}

export async function listLegalAgreements() {
  await ensureDefaultLegalAgreements();
  return LegalAgreement.find().sort({ name: 1 });
}

export async function getLegalAgreement(key: string) {
  if (!isLegalAgreementKey(key)) {
    throw new ValidationError('Unknown agreement key', { field: 'key' });
  }
  let doc = await LegalAgreement.findOne({ key });
  if (!doc) {
    await ensureDefaultLegalAgreements();
    doc = await LegalAgreement.findOne({ key });
  }
  if (!doc) throw new NotFoundError(`Agreement not found: ${key}`);
  return doc;
}

export async function updateLegalAgreement(
  key: string,
  input: { name?: string; description?: string; bodyHtml?: string },
  updatedById: string,
) {
  const doc = await getLegalAgreement(key);
  // Freeze the outgoing version before its text is replaced.
  await snapshotAgreementVersion(doc, { overwrite: false });
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Name is required', { field: 'name' });
    doc.name = name;
  }
  if (input.description !== undefined) {
    doc.description = input.description.trim();
  }
  if (input.bodyHtml !== undefined) {
    const bodyHtml = sanitizeBlogHtml(input.bodyHtml);
    if (!bodyHtml) {
      throw new ValidationError('Agreement content is required', { field: 'bodyHtml' });
    }
    doc.bodyHtml = bodyHtml;
    doc.version = (doc.version ?? 1) + 1;
    doc.versionPublishedAt = new Date();
  }
  doc.updatedById = updatedById as unknown as LegalAgreementDocument['updatedById'];
  await doc.save();
  await snapshotAgreementVersion(doc, { overwrite: true });
  return doc;
}

function validateSignature(signature: AgreementSignatureInput, field: string) {
  if (signature.method === 'typed') {
    if (signature.fullName.trim().length < 2) {
      throw new ValidationError('Type your full legal name to sign', { field });
    }
    return;
  }
  if (!signature.signatureDataUrl?.startsWith('data:image/')) {
    throw new ValidationError('Draw your signature to sign', { field });
  }
}

/** Load current version and validate a type-or-draw signature for signup / re-sign. */
export async function requireAgreementSignature(
  agreementKey: LegalAgreementKey,
  signature: AgreementSignatureInput | undefined,
  field: string,
) {
  if (!signature) {
    throw new ValidationError('You must sign the agreement to continue', { field });
  }
  validateSignature(signature, field);
  const doc = await getLegalAgreement(agreementKey);
  return {
    key: agreementKey,
    version: doc.version ?? 1,
    name: doc.name,
    signature,
  };
}

export async function recordAgreementAcceptance(opts: {
  userId: string;
  agreementKey: LegalAgreementKey;
  version: number;
  signature: AgreementSignatureInput;
  ip?: string;
  userAgent?: string;
}) {
  const signedFullName =
    opts.signature.method === 'typed'
      ? opts.signature.fullName.trim()
      : (opts.signature.fullName ?? '').trim();
  const signatureDataUrl =
    opts.signature.method === 'drawn' ? opts.signature.signatureDataUrl : '';

  try {
    await UserAgreementAcceptance.create({
      userId: opts.userId,
      agreementKey: opts.agreementKey,
      version: opts.version,
      acceptedAt: new Date(),
      signatureMethod: opts.signature.method,
      signedFullName,
      signatureDataUrl: signatureDataUrl?.slice(0, 600_000) ?? '',
      ip: opts.ip?.slice(0, 80) ?? '',
      userAgent: opts.userAgent?.slice(0, 400) ?? '',
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return;
    }
    throw err;
  }
}

function startOfUtcDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function daysBetweenUtc(from: Date, to: Date) {
  return Math.floor((startOfUtcDay(to) - startOfUtcDay(from)) / 86_400_000);
}

export async function getLatestAcceptance(userId: string, agreementKey: LegalAgreementKey) {
  return UserAgreementAcceptance.findOne({ userId, agreementKey })
    .sort({ version: -1 })
    .lean();
}

export async function getAgreementCompliance(
  userId: string,
  agreementKey: LegalAgreementKey,
  opts?: { required?: boolean },
): Promise<AgreementCompliance> {
  const doc = await getLegalAgreement(agreementKey);
  const currentVersion = doc.version ?? 1;
  const publishedAt = doc.versionPublishedAt ?? (doc as { updatedAt?: Date }).updatedAt ?? new Date();
  const acceptance = await getLatestAcceptance(userId, agreementKey);
  const acceptedVersion = acceptance?.version ?? null;
  const agreement = mapLegalAgreement(doc);
  const required = opts?.required ?? true;

  // Version 1 is the launch baseline: accounts created before signing existed are not
  // forced to sign until a superadmin publishes a new version.
  const isBaseline = currentVersion <= 1;
  if ((acceptedVersion != null && acceptedVersion >= currentVersion) || isBaseline) {
    return {
      agreementKey,
      required,
      status: 'current',
      currentVersion,
      acceptedVersion,
      versionPublishedAt: publishedAt.toISOString(),
      graceEndsAt: null,
      daysRemaining: null,
      agreementName: doc.name,
      agreement,
    };
  }

  const graceEnds = new Date(publishedAt);
  graceEnds.setUTCDate(graceEnds.getUTCDate() + PARTNER_AGREEMENT_REACCEPT_GRACE_DAYS);
  const now = new Date();
  const daysLeft = Math.max(0, daysBetweenUtc(now, graceEnds));
  const status: AgreementComplianceStatus = now.getTime() >= graceEnds.getTime() ? 'blocked' : 'grace';

  return {
    agreementKey,
    required,
    status,
    currentVersion,
    acceptedVersion,
    versionPublishedAt: publishedAt.toISOString(),
    graceEndsAt: graceEnds.toISOString(),
    daysRemaining: status === 'grace' ? Math.max(1, daysLeft) : 0,
    agreementName: doc.name,
    agreement,
  };
}

/** Partner Hub gate for restaurant owners. */
export async function getPartnerAgreementCompliance(userId: string, role: string) {
  if (role !== 'restaurant_owner') {
    const doc = await getLegalAgreement('partner_agreement');
    return {
      agreementKey: 'partner_agreement' as const,
      required: false,
      status: 'current' as const,
      currentVersion: doc.version ?? 1,
      acceptedVersion: doc.version ?? 1,
      versionPublishedAt: null,
      graceEndsAt: null,
      daysRemaining: null,
      agreementName: doc.name,
      agreement: mapLegalAgreement(doc),
    };
  }
  return getAgreementCompliance(userId, 'partner_agreement', { required: true });
}

export async function signCurrentAgreement(opts: {
  userId: string;
  role: string;
  agreementKey: LegalAgreementKey;
  signature: AgreementSignatureInput;
  ip?: string;
  userAgent?: string;
}) {
  if (opts.agreementKey === 'partner_agreement' && opts.role !== 'restaurant_owner') {
    throw new ForbiddenError('Only restaurant owners can sign the Partner Agreement');
  }

  const field =
    opts.agreementKey === 'partner_agreement' ? 'partnerAgreementSignature' : 'termsOfUseSignature';
  const ready = await requireAgreementSignature(opts.agreementKey, opts.signature, field);
  await recordAgreementAcceptance({
    userId: opts.userId,
    agreementKey: ready.key,
    version: ready.version,
    signature: ready.signature,
    ip: opts.ip,
    userAgent: opts.userAgent,
  });
  return getAgreementCompliance(opts.userId, opts.agreementKey, { required: true });
}

export async function exportLegalAgreementPdf(key: string) {
  const doc = await getLegalAgreement(key);
  const content = renderLegalAgreementPdf({
    key: doc.key as LegalAgreementKey,
    name: doc.name,
    version: doc.version ?? 1,
    bodyHtml: doc.bodyHtml,
    publishedAt: doc.versionPublishedAt ?? null,
  });
  return {
    filename: legalAgreementPdfFilename(doc.key as LegalAgreementKey, doc.version ?? 1),
    content,
    mimeType: 'application/pdf',
    encoding: 'base64' as const,
  };
}

/** Signed copy for a user's latest signature: frozen version text + signature block. */
export async function exportSignedLegalAgreementPdf(userId: string, key: string) {
  if (!isLegalAgreementKey(key)) {
    throw new ValidationError('Unknown agreement key', { field: 'key' });
  }
  const acceptance = await getLatestAcceptance(userId, key);
  if (!acceptance) {
    throw new NotFoundError('No signature on file for this agreement');
  }
  const content = await getAgreementVersionContent(key, acceptance.version);
  const user = await User.findById(userId).select('email').lean();
  const pdf = renderLegalAgreementPdf({
    key,
    name: content.name,
    version: acceptance.version,
    bodyHtml: content.bodyHtml,
    publishedAt: content.publishedAt,
    signature: {
      method: acceptance.signatureMethod === 'drawn' ? 'drawn' : 'typed',
      signedFullName: acceptance.signedFullName ?? '',
      image:
        acceptance.signatureMethod === 'drawn'
          ? signatureDataUrlToPdfImage(acceptance.signatureDataUrl)
          : null,
      signedAt: acceptance.acceptedAt,
      email: user?.email ?? null,
      ip: acceptance.ip ?? null,
      userAgent: acceptance.userAgent ?? null,
    },
  });
  return {
    filename: legalAgreementPdfFilename(key, acceptance.version, { signed: true }),
    content: pdf,
    mimeType: 'application/pdf',
    encoding: 'base64' as const,
  };
}

function agreementPageUrl(key: LegalAgreementKey) {
  if (key === 'partner_agreement') {
    return `${dashboardBase()}/agreements/sign`;
  }
  return `${webBase()}/agreements/sign`;
}

function agreementPdfUrl(key: LegalAgreementKey) {
  // Public GraphQL-backed download page helpers use the same routes with ?download=1
  if (key === 'partner_agreement') {
    return `${dashboardBase()}/agreements/sign?download=1`;
  }
  return `${webBase()}/agreements/sign?download=1`;
}

export async function sendAgreementReminderEmail(opts: {
  userId: string;
  agreementKey: LegalAgreementKey;
  daysRemaining: number;
  agreementName: string;
  version: number;
}) {
  const user = await User.findById(opts.userId);
  if (!user?.email || user.deletedAt) return { sent: false as const, reason: 'no_email' as const };

  const templateKey =
    opts.agreementKey === 'partner_agreement'
      ? 'partner_agreement_reminder'
      : 'terms_of_use_reminder';

  const firstName = user.firstName || 'there';
  const daysLabel =
    opts.daysRemaining <= 1 ? '1 day' : `${opts.daysRemaining} days`;
  const signUrl = agreementPageUrl(opts.agreementKey);
  const pdfUrl = agreementPdfUrl(opts.agreementKey);

  const { subject, bodyHtml, bodyText } = await renderEmailTemplate(templateKey, {
    firstName,
    agreementName: opts.agreementName,
    version: String(opts.version),
    daysRemaining: daysLabel,
    signUrl,
    pdfUrl,
    dashboardUrl: dashboardBase(),
  });

  await notifyUser(user._id.toString(), {
    type: templateKey,
    title: subject,
    body: bodyText || `Please re-sign ${opts.agreementName}.`,
    htmlBody: bodyHtml,
    emailSubject: subject,
    emailText: bodyText,
    data: {
      agreementKey: opts.agreementKey,
      version: opts.version,
      signUrl,
      pdfUrl,
    },
  });

  const reminderPath =
    opts.agreementKey === 'partner_agreement'
      ? 'agreementReminderSent.partner_agreement'
      : 'agreementReminderSent.terms_of_use';
  await User.findByIdAndUpdate(user._id, {
    $set: { [reminderPath]: opts.version },
  });

  return { sent: true as const };
}

/**
 * Daily job: email owners/diners 1–2 days before grace ends for unsigned new versions.
 */
export async function runAgreementReminderJob() {
  await ensureDefaultLegalAgreements();
  let sent = 0;

  for (const key of LEGAL_AGREEMENT_KEYS) {
    const doc = await getLegalAgreement(key);
    const currentVersion = doc.version ?? 1;
    if (currentVersion <= 1) continue;
    const publishedAt = doc.versionPublishedAt ?? (doc as { updatedAt?: Date }).updatedAt;
    if (!publishedAt) continue;

    const graceEnds = new Date(publishedAt);
    graceEnds.setUTCDate(graceEnds.getUTCDate() + PARTNER_AGREEMENT_REACCEPT_GRACE_DAYS);
    const now = new Date();
    if (now.getTime() >= graceEnds.getTime()) continue;

    const daysRemaining = Math.max(1, daysBetweenUtc(now, graceEnds));
    // "A day or two before" → remind when 1 or 2 days remain
    if (daysRemaining > 2) continue;

    const role = key === 'partner_agreement' ? 'restaurant_owner' : 'diner';
    const users = await User.find({
      role,
      deletedAt: { $exists: false },
      email: { $exists: true, $ne: null },
    })
      .select('_id email firstName agreementReminderSent')
      .lean();

    for (const u of users) {
      // Diners only get Terms reminders if they signed an earlier version (no mass mail to
      // Google / phone signups that never saw the signing step).
      if (key === 'terms_of_use') {
        const prior = await getLatestAcceptance(u._id.toString(), key);
        if (!prior) continue;
      }
      const already =
        key === 'partner_agreement'
          ? (u as { agreementReminderSent?: { partner_agreement?: number } }).agreementReminderSent
              ?.partner_agreement
          : (u as { agreementReminderSent?: { terms_of_use?: number } }).agreementReminderSent
              ?.terms_of_use;
      if (already === currentVersion) continue;

      const acceptance = await getLatestAcceptance(u._id.toString(), key);
      if (acceptance && acceptance.version >= currentVersion) continue;

      try {
        const result = await sendAgreementReminderEmail({
          userId: u._id.toString(),
          agreementKey: key,
          daysRemaining,
          agreementName: doc.name,
          version: currentVersion,
        });
        if (result.sent) sent += 1;
      } catch (err) {
        logger.warn({ err, userId: u._id.toString(), key }, '[legalAgreements] reminder failed');
      }
    }
  }

  return { sent };
}

export function mapLegalAgreement(doc: LegalAgreementDocument) {
  return {
    id: doc._id.toString(),
    key: doc.key,
    name: doc.name,
    description: doc.description ?? '',
    bodyHtml: doc.bodyHtml,
    version: doc.version ?? 1,
    versionPublishedAt: doc.versionPublishedAt
      ? doc.versionPublishedAt.toISOString()
      : (doc as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? null,
    updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? null,
  };
}

