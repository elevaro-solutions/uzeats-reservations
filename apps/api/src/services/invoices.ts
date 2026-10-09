import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  getPlanPriceDisplay,
  planForBillingPeriod,
  type BillingPeriod,
} from '@reservations/shared';
import { CoverFee } from '../models/CoverFee.js';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { env } from '../config/env.js';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { type ExportPayload } from './adminExport.js';
import { brandedInvoiceExportPayload } from './invoicePdf.js';
import {
  isEmailDeliveryConfigured,
  sendEmail,
} from './notifications.js';
import {
  getAnnualBillingSettings,
  getEffectivePlan,
  getPlatformConfig,
  mapPlatformConfig,
} from './platformConfig.js';
import { getPlatformServicesByIds } from './platformServices.js';
import {
  buildVirtualRoomInvoiceLines,
  markVirtualRoomFeesCharged,
  syncVirtualRoomBilledMonths,
} from './virtualRoom.js';
import { logger } from '../lib/logger.js';
import {
  assertPaymentIntentSucceeded,
  createInvoicePaymentIntent as createStripeInvoicePaymentIntent,
  createStripeCustomer,
  isStubPaymentIntent,
  resolveCustomerDefaultPaymentMethodId,
  retrievePaymentIntentClientSecret,
  saveInvoicePaymentMethodAsPreferred,
} from './stripe.js';
import { User } from '../models/User.js';

const COVER_SOURCE_ORDER = ['network', 'website', 'widget', 'phone', 'walkin'] as const;
const COVER_SOURCE_LABELS: Record<(typeof COVER_SOURCE_ORDER)[number], string> = {
  network: 'Network cover',
  website: 'Website cover',
  widget: 'Widget cover',
  phone: 'Phone cover',
  walkin: 'Walk-in cover',
};

type PeriodInvoiceLine = {
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export function utcBillingPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function previousUtcBillingPeriod(date = new Date()) {
  return utcBillingPeriod(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

function periodBounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) throw new ValidationError('billingPeriod must be YYYY-MM');
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  // Usage (cover fees) is complete when the month closes — due on the 1st of the next month.
  const dueDate = new Date(Date.UTC(year, month, 1));
  return { start, end, dueDate };
}

function isDuplicateKeyError(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000);
}

function isRefreshableAutoInvoice(doc: {
  stripeInvoiceId?: string | null;
  status?: string | null;
  serviceIds?: unknown[] | null;
  number?: string | null;
}) {
  if (doc.stripeInvoiceId) return false;
  if (doc.status === 'paid' || doc.status === 'canceled') return false;
  if (Array.isArray(doc.serviceIds) && doc.serviceIds.length > 0) return false;
  const number = String(doc.number ?? '');
  if (/-M\d+$/.test(number) || number.includes('-STRIPE-')) return false;
  return true;
}

export function buildCoverFeeLines(
  fees: Array<{ source?: string | null; partySize: number; feeCents: number }>,
): PeriodInvoiceLine[] {
  const groups = new Map<string, { covers: number; reservations: number; feeCents: number }>();
  for (const fee of fees) {
    if (!fee.feeCents) continue;
    const source = COVER_SOURCE_ORDER.includes(fee.source as (typeof COVER_SOURCE_ORDER)[number])
      ? (fee.source as (typeof COVER_SOURCE_ORDER)[number])
      : 'network';
    const cur = groups.get(source) ?? { covers: 0, reservations: 0, feeCents: 0 };
    cur.covers += fee.partySize;
    cur.reservations += 1;
    cur.feeCents += fee.feeCents;
    groups.set(source, cur);
  }

  const lines: PeriodInvoiceLine[] = [];
  for (const source of COVER_SOURCE_ORDER) {
    const group = groups.get(source);
    if (!group || group.feeCents <= 0) continue;
    const unit = group.covers > 0 ? Math.round(group.feeCents / group.covers) : group.feeCents;
    const coverLabel = group.covers === 1 ? '1 cover' : `${group.covers} covers`;
    lines.push({
      description: `${COVER_SOURCE_LABELS[source]} (${coverLabel})`,
      quantity: group.covers,
      unitAmountCents: unit,
      amountCents: group.feeCents,
    });
  }
  return lines;
}

function invoiceStatusForDueDate(
  dueDate: Date,
  now = new Date(),
): 'upcoming' | 'pending' | 'overdue' {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dueDate > startOfToday) return 'upcoming';
  const graceMs = 7 * 24 * 60 * 60 * 1000;
  if (now.getTime() - dueDate.getTime() > graceMs) return 'overdue';
  return 'pending';
}

function newPayToken() {
  return crypto.randomBytes(24).toString('hex');
}

function invoicePayUrl(payToken: string) {
  const base =
    env.WEB_APP_URL || env.CORS_ORIGINS.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/invoice/${payToken}`;
}

export function mapInvoice(doc: any, restaurantName?: string) {
  const originalTotalCents =
    doc.originalTotalCents != null ? doc.originalTotalCents : null;
  const totalCents = doc.totalCents ?? 0;
  const payToken = doc.payToken ?? null;
  return {
    id: doc._id.toString(),
    number: doc.number,
    restaurantId: doc.restaurantId.toString(),
    restaurantName: restaurantName ?? null,
    subscriptionId: doc.subscriptionId?.toString() ?? null,
    status: doc.status,
    billingPeriod: doc.billingPeriod,
    currency: doc.currency,
    subtotalCents: doc.subtotalCents,
    totalCents,
    originalTotalCents,
    isDiscounted: Boolean(
      originalTotalCents != null && originalTotalCents > totalCents,
    ),
    lines: (doc.lines ?? []).map((l: any) => ({
      description: l.description,
      quantity: l.quantity ?? 1,
      unitAmountCents: l.unitAmountCents,
      amountCents: l.amountCents,
      originalAmountCents: l.originalAmountCents ?? null,
    })),
    dueDate: doc.dueDate,
    paidAt: doc.paidAt ?? null,
    canceledAt: doc.canceledAt ?? null,
    notes: doc.notes ?? null,
    packageDurationMonths: doc.packageDurationMonths ?? null,
    planKey: doc.planKey ?? null,
    billingCycle: doc.billingCycle ?? null,
    serviceIds: (doc.serviceIds ?? []).map((id: any) => id.toString()),
    payToken,
    payUrl: payToken ? invoicePayUrl(payToken) : null,
    emailSentAt: doc.emailSentAt ?? null,
    emailSentTo: doc.emailSentTo ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function ensureSubscriptionStripeCustomer(sub: {
  _id: unknown;
  restaurantId: unknown;
  stripeCustomerId?: string | null;
}) {
  if (sub.stripeCustomerId) return sub.stripeCustomerId;
  const restaurant = await Restaurant.findById(sub.restaurantId).select('name ownerId');
  if (!restaurant) return null;
  const owner = restaurant.ownerId
    ? await User.findById(restaurant.ownerId).select('email')
    : null;
  const customer = await createStripeCustomer({
    email: owner?.email ?? undefined,
    name: restaurant.name,
    metadata: { restaurantId: String(sub.restaurantId) },
  });
  await Subscription.updateOne(
    { _id: sub._id },
    { $set: { stripeCustomerId: customer.id } },
  );
  return customer.id;
}

/** Email unpaid invoices to the owner once (skips if already emailed or email is not configured). */
export async function maybeEmailInvoiceToOwner(
  invoiceId: string,
  options?: { force?: boolean },
): Promise<{ sent: boolean; to?: string; skipped?: string }> {
  if (!isEmailDeliveryConfigured()) {
    return { sent: false, skipped: 'email_not_configured' };
  }
  const doc = await Invoice.findById(invoiceId);
  if (!doc) return { sent: false, skipped: 'not_found' };
  if (doc.status === 'canceled') return { sent: false, skipped: 'canceled' };
  if (doc.totalCents <= 0) return { sent: false, skipped: 'zero_balance' };
  if (doc.emailSentAt && !options?.force) return { sent: false, skipped: 'already_sent' };

  try {
    const result = await sendInvoiceEmail(doc._id.toString());
    return { sent: true, to: result.to };
  } catch (err) {
    logger.warn({ err, invoiceId }, 'invoice owner email failed');
    return { sent: false, skipped: 'send_failed' };
  }
}

function parseDueDate(value: Date | string) {
  const dueDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dueDate.getTime())) throw new ValidationError('dueDate must be a valid date');
  return dueDate;
}

function durationLabel(months: number) {
  return months === 1 ? '1 month' : `${months} months`;
}

async function resolvePlanCatalogPrice(
  planKey: string,
  billingCycle: BillingPeriod,
): Promise<{
  amountCents: number;
  originalCents: number;
  description: string;
  durationMonths: number;
}> {
  const plan = await getEffectivePlan(planKey);
  if (!plan) throw new ValidationError(`Unknown plan: ${planKey}`);
  const annualBilling = await getAnnualBillingSettings();
  const priced = planForBillingPeriod(plan, billingCycle, {
    annualBilling,
    planKey: plan.key,
  });
  const display = getPlanPriceDisplay(priced);
  const amountCents = display.primaryCents;
  const originalCents =
    display.originalCents != null && display.originalCents > amountCents
      ? display.originalCents
      : amountCents;
  const durationMonths = billingCycle === 'annual' ? 12 : 1;
  const cycleLabel = billingCycle === 'annual' ? 'annual' : 'monthly';
  return {
    amountCents,
    originalCents,
    description: `${plan.name} plan (${cycleLabel})`,
    durationMonths,
  };
}

export async function createManualInvoice(input: {
  restaurantId: string;
  billingPeriod: string;
  dueDate: Date | string;
  amountCents: number;
  originalAmountCents?: number | null;
  packageDurationMonths?: number | null;
  planKey?: string | null;
  billingCycle?: 'monthly' | 'annual' | null;
  serviceIds?: string[] | null;
  notes?: string | null;
  description?: string | null;
  markPaid?: boolean | null;
  paidJustification?: string | null;
  forceCreate?: boolean | null;
  replaceExisting?: boolean | null;
  duplicateJustification?: string | null;
}) {
  const period = input.billingPeriod.trim();
  periodBounds(period);

  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    throw new ValidationError('amountCents must be a non-negative integer');
  }

  const restaurant = await Restaurant.findById(input.restaurantId).select('name');
  if (!restaurant) throw new NotFoundError('Restaurant');

  // Prefer a non-canceled invoice for the period (unique index is restaurant+period).
  const existing =
    (await Invoice.findOne({
      restaurantId: input.restaurantId,
      billingPeriod: period,
      status: { $ne: 'canceled' },
    })) ||
    (await Invoice.findOne({
      restaurantId: input.restaurantId,
      billingPeriod: period,
    }));
  const forceCreate = Boolean(input.forceCreate);
  const replaceExisting = Boolean(input.replaceExisting);
  const duplicateJustification = input.duplicateJustification?.trim() || '';
  if (existing && !forceCreate) {
    throw new ConflictError(
      `An invoice already exists for this restaurant and period (${existing.number}).`,
      {
        invoiceId: existing._id.toString(),
        invoiceNumber: existing.number,
        status: existing.status,
        totalCents: existing.totalCents,
        currency: existing.currency || 'usd',
        billingPeriod: existing.billingPeriod,
      },
    );
  }
  if (existing && forceCreate && duplicateJustification.length < 3) {
    throw new ValidationError(
      'Justification is required to create an invoice when one already exists for this period',
    );
  }

  const dueDate = parseDueDate(input.dueDate);
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';
  const markPaid = Boolean(input.markPaid);
  const paidJustification = input.paidJustification?.trim() || '';
  if (markPaid && paidJustification.length < 3) {
    throw new ValidationError('Justification is required when marking an invoice as paid');
  }
  const status = markPaid ? 'paid' : invoiceStatusForDueDate(dueDate);
  const noteParts = [
    existing && forceCreate && replaceExisting
      ? `Replaced ${existing.number}: ${duplicateJustification}`
      : existing && forceCreate
        ? `Created despite ${existing.number} (canceled): ${duplicateJustification}`
        : null,
    markPaid ? `Marked paid: ${paidJustification}` : null,
    input.notes?.trim() || null,
  ].filter(Boolean);
  const notes = noteParts.length ? noteParts.join('\n') : undefined;

  const billingCycle =
    input.billingCycle === 'annual' || input.billingCycle === 'monthly'
      ? input.billingCycle
      : null;
  const planKey = input.planKey?.trim() || null;
  const serviceIds = [...new Set((input.serviceIds ?? []).filter(Boolean))];

  type Line = {
    description: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
    originalAmountCents?: number;
  };
  const lines: Line[] = [];
  let catalogTotal = 0;
  let packageDurationMonths =
    input.packageDurationMonths != null
      ? Math.round(Number(input.packageDurationMonths))
      : null;

  if (planKey) {
    const cycle = billingCycle ?? 'monthly';
    const planLine = await resolvePlanCatalogPrice(planKey, cycle);
    lines.push({
      description: planLine.description,
      quantity: 1,
      unitAmountCents: planLine.amountCents,
      amountCents: planLine.amountCents,
      originalAmountCents:
        planLine.originalCents > planLine.amountCents ? planLine.originalCents : undefined,
    });
    catalogTotal += planLine.originalCents;
    if (packageDurationMonths == null || packageDurationMonths < 1) {
      packageDurationMonths = planLine.durationMonths;
    }
  }

  if (serviceIds.length) {
    const services = await getPlatformServicesByIds(serviceIds);
    if (services.length !== serviceIds.length) {
      throw new ValidationError('One or more services were not found');
    }
    for (const svc of services) {
      lines.push({
        description: svc.name + (svc.priceCents === 0 ? ' (free)' : ''),
        quantity: 1,
        unitAmountCents: svc.priceCents,
        amountCents: svc.priceCents,
      });
      catalogTotal += svc.priceCents;
    }
  }

  if (!lines.length) {
    const duration =
      packageDurationMonths && packageDurationMonths >= 1
        ? durationLabel(packageDurationMonths)
        : null;
    const description =
      input.description?.trim() ||
      `Custom invoice - ${period}${duration ? ` (${duration})` : ''}`;
    lines.push({
      description,
      quantity: 1,
      unitAmountCents: amountCents,
      amountCents,
    });
    catalogTotal = amountCents;
  }

  if (packageDurationMonths != null && packageDurationMonths < 1) {
    throw new ValidationError('packageDurationMonths must be at least 1');
  }

  const originalFromInput =
    input.originalAmountCents != null
      ? Math.round(Number(input.originalAmountCents))
      : catalogTotal;
  const originalTotalCents =
    Number.isFinite(originalFromInput) && originalFromInput > amountCents
      ? originalFromInput
      : catalogTotal > amountCents
        ? catalogTotal
        : undefined;

  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });

  if (existing && forceCreate && replaceExisting) {
    existing.subscriptionId = sub?._id;
    existing.status = status;
    existing.currency = currency;
    existing.subtotalCents = amountCents;
    existing.totalCents = amountCents;
    existing.originalTotalCents = originalTotalCents;
    existing.set('lines', lines);
    existing.dueDate = dueDate;
    existing.paidAt = markPaid ? new Date() : undefined;
    existing.canceledAt = undefined;
    existing.notes = notes;
    existing.packageDurationMonths = packageDurationMonths ?? undefined;
    existing.planKey = planKey ?? undefined;
    existing.billingCycle = billingCycle ?? undefined;
    existing.serviceIds = serviceIds.map((id) => new Types.ObjectId(id));
    if (!existing.payToken) existing.payToken = newPayToken();
    existing.stripePaymentIntentId = undefined;
    await existing.save();
    const replaced = mapInvoice(existing, restaurant.name);
    if (!markPaid && replaced.totalCents > 0) {
      await maybeEmailInvoiceToOwner(replaced.id, { force: true });
    }
    return replaced;
  }

  if (existing && forceCreate && !replaceExisting) {
    // Free the unique (restaurantId, billingPeriod) slot so a new invoice can be created.
    const cancelNote = `Canceled for duplicate-period create: ${duplicateJustification}`;
    existing.status = 'canceled';
    existing.canceledAt = existing.canceledAt ?? new Date();
    existing.notes = existing.notes?.trim()
      ? `${existing.notes.trim()}\n${cancelNote}`
      : cancelNote;
    // Move canceled invoice off the period key so the unique index allows the new doc.
    existing.billingPeriod = `${period}~canceled-${existing.number}`;
    await existing.save();
  }

  const countForPeriod = await Invoice.countDocuments({ billingPeriod: period });
  const seq = String(countForPeriod + 1).padStart(4, '0');
  const number = `${prefix}-${period.replace('-', '')}-M${seq}`;
  const payToken = newPayToken();

  const doc = await Invoice.create({
    number,
    restaurantId: input.restaurantId,
    subscriptionId: sub?._id,
    status,
    billingPeriod: period,
    currency,
    subtotalCents: amountCents,
    totalCents: amountCents,
    originalTotalCents,
    lines,
    dueDate,
    paidAt: markPaid ? new Date() : undefined,
    notes,
    packageDurationMonths: packageDurationMonths ?? undefined,
    planKey: planKey ?? undefined,
    billingCycle: billingCycle ?? undefined,
    serviceIds,
    payToken,
  });

  const mapped = mapInvoice(doc, restaurant.name);
  if (!markPaid && mapped.totalCents > 0) {
    await maybeEmailInvoiceToOwner(mapped.id);
  }
  return mapped;
}

async function buildPeriodInvoiceLines(
  sub: {
    plan: string;
    status: string;
    trialEndsAt?: Date | null;
    monthlyPriceCents: number;
    restaurantId: unknown;
  },
  period: string,
  dueDate: Date,
): Promise<{ lines: PeriodInvoiceLine[]; subtotalCents: number }> {
  const lines: PeriodInvoiceLine[] = [];
  const planName = String(sub.plan).charAt(0).toUpperCase() + String(sub.plan).slice(1);
  const trialStillRunning =
    sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > dueDate;

  if (trialStillRunning) {
    lines.push({
      description: `${planName} plan trial - ${period}`,
      quantity: 1,
      unitAmountCents: 0,
      amountCents: 0,
    });
  } else {
    lines.push({
      description: `${planName} plan - ${period}`,
      quantity: 1,
      unitAmountCents: sub.monthlyPriceCents,
      amountCents: sub.monthlyPriceCents,
    });
  }

  const coverFees = await CoverFee.find({
    restaurantId: sub.restaurantId,
    billingPeriod: period,
    status: { $in: ['pending', 'charged'] },
  });
  lines.push(...buildCoverFeeLines(coverFees));
  lines.push(...(await buildVirtualRoomInvoiceLines(sub, period)));

  const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  return { lines, subtotalCents };
}

async function markCoverFeesCharged(restaurantId: unknown, period: string) {
  await CoverFee.updateMany(
    {
      restaurantId,
      billingPeriod: period,
      status: 'pending',
      feeCents: { $gt: 0 },
    },
    { $set: { status: 'charged' } },
  );
  await markVirtualRoomFeesCharged(restaurantId, period);
}

async function applyPeriodInvoiceLines(
  existing: InstanceType<typeof Invoice>,
  input: {
    lines: PeriodInvoiceLine[];
    subtotalCents: number;
    dueDate: Date;
    nextStatus: 'paid' | ReturnType<typeof invoiceStatusForDueDate>;
    paidAt?: Date;
  },
) {
  existing.set('lines', input.lines);
  existing.subtotalCents = input.subtotalCents;
  existing.totalCents = input.subtotalCents;
  existing.dueDate = input.dueDate;
  existing.status = input.nextStatus;
  if (input.paidAt && !existing.paidAt) existing.paidAt = input.paidAt;
  if (!existing.payToken) existing.payToken = newPayToken();
  await existing.save();
}

/** Re-price this restaurant's unpaid auto invoice now instead of waiting for the daily job. */
export async function refreshPeriodInvoiceForRestaurant(
  restaurantId: string,
  period = utcBillingPeriod(),
) {
  const [sub, existing] = await Promise.all([
    Subscription.findOne({ restaurantId, status: { $in: ['trialing', 'active', 'past_due'] } }),
    Invoice.findOne({ restaurantId, billingPeriod: period }),
  ]);
  if (!sub || !existing || !isRefreshableAutoInvoice(existing)) return false;
  const { dueDate } = periodBounds(period);
  const { lines, subtotalCents } = await buildPeriodInvoiceLines(sub, period, dueDate);
  const nextStatus = subtotalCents === 0 ? 'paid' : invoiceStatusForDueDate(dueDate);
  await applyPeriodInvoiceLines(existing, {
    lines,
    subtotalCents,
    dueDate,
    nextStatus,
    paidAt: nextStatus === 'paid' ? new Date() : undefined,
  });
  await markCoverFeesCharged(sub.restaurantId, period);
  return true;
}

export async function generateInvoicesForPeriod(period: string) {
  const { dueDate } = periodBounds(period);
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';

  const subs = await Subscription.find({
    status: { $in: ['trialing', 'active', 'past_due'] },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let emailed = 0;

  for (const sub of subs) {
    const { lines, subtotalCents } = await buildPeriodInvoiceLines(sub, period, dueDate);
    const nextStatus = subtotalCents === 0 ? 'paid' : invoiceStatusForDueDate(dueDate);
    const paidAt = nextStatus === 'paid' ? new Date() : undefined;

    const existing = await Invoice.findOne({
      restaurantId: sub.restaurantId,
      billingPeriod: period,
    });

    if (existing) {
      if (!isRefreshableAutoInvoice(existing)) {
        skipped += 1;
        continue;
      }
      const wasUnsent = !existing.emailSentAt;
      await applyPeriodInvoiceLines(existing, { lines, subtotalCents, dueDate, nextStatus, paidAt });
      await markCoverFeesCharged(sub.restaurantId, period);
      updated += 1;
      if (wasUnsent && nextStatus !== 'paid' && subtotalCents > 0) {
        const mail = await maybeEmailInvoiceToOwner(existing._id.toString());
        if (mail.sent) emailed += 1;
      }
      continue;
    }

    const seq = String(created + updated + skipped + 1).padStart(4, '0');
    const number = `${prefix}-${period.replace('-', '')}-${seq}`;

    try {
      const doc = await Invoice.create({
        number,
        restaurantId: sub.restaurantId,
        subscriptionId: sub._id,
        status: nextStatus,
        billingPeriod: period,
        currency,
        subtotalCents,
        totalCents: subtotalCents,
        lines,
        dueDate,
        paidAt,
        payToken: newPayToken(),
      });
      await markCoverFeesCharged(sub.restaurantId, period);
      created += 1;
      if (nextStatus !== 'paid' && subtotalCents > 0) {
        const mail = await maybeEmailInvoiceToOwner(doc._id.toString());
        if (mail.sent) emailed += 1;
      }
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  return { created, updated, skipped, emailed, period };
}

/** Current + previous calendar months (UTC). Idempotent; refreshes unpaid auto invoices. */
export async function generateDuePeriodInvoices(now = new Date()) {
  await syncVirtualRoomBilledMonths(now);
  const current = utcBillingPeriod(now);
  const previous = previousUtcBillingPeriod(now);
  const previousResult = await generateInvoicesForPeriod(previous);
  const currentResult =
    current === previous ? previousResult : await generateInvoicesForPeriod(current);
  const charged = await autoChargeDueInvoices(now);
  return { previous: previousResult, current: currentResult, autoCharge: charged };
}

/**
 * Ensure a period invoice exists (or is refreshed) for one restaurant — used after admin
 * enables Virtual 3D so a subscription plan invoice is generated immediately.
 */
export async function ensurePeriodInvoiceForRestaurant(
  restaurantId: string,
  period = utcBillingPeriod(),
  options?: { emailOwner?: boolean },
) {
  const sub = await Subscription.findOne({
    restaurantId,
    status: { $in: ['trialing', 'active', 'past_due'] },
  });
  if (!sub) return null;

  const { dueDate } = periodBounds(period);
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';
  const { lines, subtotalCents } = await buildPeriodInvoiceLines(sub, period, dueDate);
  const nextStatus = subtotalCents === 0 ? 'paid' : invoiceStatusForDueDate(dueDate);
  const paidAt = nextStatus === 'paid' ? new Date() : undefined;

  let existing = await Invoice.findOne({ restaurantId, billingPeriod: period });
  if (existing) {
    if (isRefreshableAutoInvoice(existing)) {
      await applyPeriodInvoiceLines(existing, { lines, subtotalCents, dueDate, nextStatus, paidAt });
      await markCoverFeesCharged(sub.restaurantId, period);
    }
  } else {
    const countForPeriod = await Invoice.countDocuments({ billingPeriod: period });
    const seq = String(countForPeriod + 1).padStart(4, '0');
    existing = await Invoice.create({
      number: `${prefix}-${period.replace('-', '')}-${seq}`,
      restaurantId,
      subscriptionId: sub._id,
      status: nextStatus,
      billingPeriod: period,
      currency,
      subtotalCents,
      totalCents: subtotalCents,
      lines,
      dueDate,
      paidAt,
      payToken: newPayToken(),
    });
    await markCoverFeesCharged(sub.restaurantId, period);
  }

  const restaurant = await Restaurant.findById(restaurantId).select('name');
  const mapped = mapInvoice(existing, restaurant?.name);
  if (options?.emailOwner !== false && mapped.status !== 'paid' && mapped.totalCents > 0) {
    await maybeEmailInvoiceToOwner(mapped.id);
  }
  return mapped;
}

export async function listInvoices(input: {
  status?: string;
  search?: string;
  restaurantId?: string;
  billingPeriod?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.restaurantId?.trim()) filter.restaurantId = input.restaurantId.trim();
  if (input.billingPeriod?.trim()) filter.billingPeriod = input.billingPeriod.trim();

  if (input.search?.trim()) {
    const q = input.search.trim();
    if (filter.restaurantId) {
      filter.number = { $regex: q, $options: 'i' };
    } else {
      const restaurants = await Restaurant.find({
        name: { $regex: q, $options: 'i' },
      }).select('_id');
      filter.$or = [
        { number: { $regex: q, $options: 'i' } },
        { restaurantId: { $in: restaurants.map((r) => r._id) } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit),
    Invoice.countDocuments(filter),
  ]);

  const restaurantIds = [...new Set(items.map((i) => i.restaurantId.toString()))];
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select('name');
  const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

  return {
    total,
    items: items.map((doc) => mapInvoice(doc, nameById.get(doc.restaurantId.toString()))),
  };
}

/** Unpaid invoices with a balance (sidebar badge / admin open-invoice stats). */
export async function countOpenInvoices(restaurantId?: string) {
  const filter: Record<string, unknown> = {
    status: { $in: ['pending', 'overdue', 'upcoming'] },
    totalCents: { $gt: 0 },
  };
  if (restaurantId?.trim()) filter.restaurantId = restaurantId.trim();
  return Invoice.countDocuments(filter);
}

export type InvoiceStatusValue = 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue';

export async function setInvoiceStatus(id: string, status: InvoiceStatusValue) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new NotFoundError('Invoice');
  doc.status = status;
  if (status === 'paid') {
    doc.paidAt = new Date();
    doc.canceledAt = undefined;
  } else if (status === 'canceled') {
    doc.canceledAt = new Date();
  } else {
    doc.paidAt = undefined;
    doc.canceledAt = undefined;
  }
  await doc.save();
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function setInvoiceStatuses(ids: string[], status: InvoiceStatusValue) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new ValidationError('No invoices selected');

  const items = [];
  for (const id of uniqueIds) {
    items.push(await setInvoiceStatus(id, status));
  }
  return { updated: items.length, items };
}

export async function ensureInvoicePayLink(id: string) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new NotFoundError('Invoice');
  if (!doc.payToken) {
    doc.payToken = newPayToken();
    await doc.save();
  }
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function getInvoiceById(id: string) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new NotFoundError('Invoice');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function getInvoiceByPayToken(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new NotFoundError('Invoice');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function exportInvoicePdf(id: string): Promise<ExportPayload> {
  const doc = await Invoice.findById(id);
  if (!doc) throw new NotFoundError('Invoice');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name address');
  const mapped = mapInvoice(doc, restaurant?.name);
  return buildInvoicePdf(mapped, formatRestaurantAddress(restaurant?.address));
}

export async function exportInvoicePdfByToken(token: string): Promise<ExportPayload> {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new NotFoundError('Invoice');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name address');
  const mapped = mapInvoice(doc, restaurant?.name);
  return buildInvoicePdf(mapped, formatRestaurantAddress(restaurant?.address));
}

function formatRestaurantAddress(address: any): string | null {
  if (!address) return null;
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function buildInvoicePdf(
  invoice: ReturnType<typeof mapInvoice>,
  restaurantAddress?: string | null,
): Promise<ExportPayload> {
  const config = mapPlatformConfig(await getPlatformConfig());
  const websiteUrl =
    env.WEB_APP_URL || env.CORS_ORIGINS.split(',')[0]?.trim() || 'https://tablevera.online';

  return brandedInvoiceExportPayload({
    number: invoice.number,
    restaurantName: invoice.restaurantName,
    restaurantId: invoice.restaurantId,
    restaurantAddress: restaurantAddress ?? null,
    status: invoice.status,
    billingPeriod: invoice.billingPeriod,
    currency: invoice.currency || config.currency || 'usd',
    totalCents: invoice.totalCents,
    originalTotalCents: invoice.originalTotalCents,
    isDiscounted: invoice.isDiscounted,
    lines: invoice.lines.map(
      (l: {
        description: string;
        quantity: number;
        amountCents: number;
        originalAmountCents?: number | null;
      }) => ({
        description: l.description,
        quantity: l.quantity,
        amountCents: l.amountCents,
        originalAmountCents: l.originalAmountCents,
      }),
    ),
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    notes: invoice.notes,
    packageDurationMonths: invoice.packageDurationMonths,
    planKey: invoice.planKey,
    billingCycle: invoice.billingCycle,
    payUrl: invoice.payUrl,
    brandName: 'Tablevera',
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
    companyAddress: '20844 Waterbeach Place, Sterling, VA 20165, USA',
    websiteUrl,
  });
}

export async function sendInvoiceEmail(
  id: string,
  toEmail?: string | null,
): Promise<{ sent: boolean; to: string; stubbed: boolean }> {
  if (!isEmailDeliveryConfigured()) {
    throw new AppError(
      'Email is not configured. Set SENDGRID_API_KEY on the API.',
      'SERVICE_UNAVAILABLE',
      503,
    );
  }

  const doc = await Invoice.findById(id);
  if (!doc) throw new NotFoundError('Invoice');

  const restaurant = await Restaurant.findById(doc.restaurantId).select('name address ownerId');
  if (!restaurant) throw new NotFoundError('Restaurant');

  let to = toEmail?.trim().toLowerCase() || '';
  if (!to) {
    const owner = await User.findById(restaurant.ownerId).select('email');
    to = owner?.email?.trim().toLowerCase() || '';
  }
  if (!to) {
    throw new ValidationError('No recipient email found for this restaurant owner');
  }

  const invoice = mapInvoice(doc, restaurant.name);
  if (!invoice.payUrl) {
    const withLink = await ensureInvoicePayLink(id);
    Object.assign(invoice, withLink);
  }

  const pdf = await buildInvoicePdf(invoice, formatRestaurantAddress(restaurant.address));
  const amount = (invoice.totalCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (invoice.currency || 'usd').toUpperCase(),
  });
  const due = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
    : '—';
  const payUrl = invoice.payUrl || '';

  const subject = `Invoice ${invoice.number} from Tablevera`;
  const text = [
    `Hello,`,
    ``,
    `Please find invoice ${invoice.number} for ${restaurant.name}.`,
    `Amount due: ${amount}`,
    `Due date: ${due}`,
    `Billing period: ${invoice.billingPeriod}`,
    payUrl ? `Pay online: ${payUrl}` : null,
    ``,
    `The PDF invoice is attached.`,
    ``,
    `— Tablevera`,
  ]
    .filter((line) => line != null)
    .join('\n');

  const htmlBody = `
    <p>Hello,</p>
    <p>Please find invoice <strong>${invoice.number}</strong> for <strong>${restaurant.name}</strong>.</p>
    <ul>
      <li><strong>Amount due:</strong> ${amount}</li>
      <li><strong>Due date:</strong> ${due}</li>
      <li><strong>Billing period:</strong> ${invoice.billingPeriod}</li>
    </ul>
    ${
      payUrl
        ? `<p><a href="${payUrl}" style="display:inline-block;padding:10px 16px;background:#0b3d2e;color:#fff;text-decoration:none;border-radius:6px;">Pay invoice</a></p>
           <p style="font-size:12px;color:#666;">Or open: <a href="${payUrl}">${payUrl}</a></p>`
        : ''
    }
    <p>The PDF invoice is attached to this email.</p>
    <p>— Tablevera</p>
  `;

  await sendEmail(to, subject, text, {
    htmlBody,
    attachments: [
      {
        filename: pdf.filename,
        contentBase64: pdf.content,
        contentType: 'application/pdf',
      },
    ],
  });

  doc.emailSentAt = new Date();
  doc.emailSentTo = to;
  await doc.save();

  return {
    sent: true,
    to,
    stubbed: false,
  };
}

export { isEmailDeliveryConfigured };

export async function startInvoicePayment(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new NotFoundError('Invoice');
  if (doc.status === 'paid') throw new ConflictError('Invoice is already paid');
  if (doc.status === 'canceled') throw new ConflictError('Invoice is canceled');
  if (doc.totalCents <= 0) {
    doc.status = 'paid';
    doc.paidAt = new Date();
    await doc.save();
    const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
    return {
      invoice: mapInvoice(doc, restaurant?.name),
      clientSecret: null as string | null,
      paymentIntentId: null as string | null,
      alreadyPaid: true,
      isStub: false,
    };
  }

  // Drop leftover stub intents so a real Stripe key (or a fresh stub) can be used.
  if (doc.stripePaymentIntentId && isStubPaymentIntent(doc.stripePaymentIntentId)) {
    doc.stripePaymentIntentId = undefined;
  }

  const sub = await Subscription.findOne({ restaurantId: doc.restaurantId });
  const customerId = sub ? await ensureSubscriptionStripeCustomer(sub) : null;

  const intent = await createStripeInvoicePaymentIntent({
    amountCents: doc.totalCents,
    currency: doc.currency || 'usd',
    customerId,
    metadata: {
      invoiceId: doc._id.toString(),
      invoiceNumber: doc.number,
      restaurantId: doc.restaurantId.toString(),
      payToken: token,
      savePaymentMethod: customerId ? '1' : '0',
    },
  });

  doc.stripePaymentIntentId = intent.id;
  await doc.save();

  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return {
    invoice: mapInvoice(doc, restaurant?.name),
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    alreadyPaid: false,
    isStub: Boolean(intent.isStub) || isStubPaymentIntent(intent.id),
  };
}

async function persistPreferredPaymentMethodFromInvoice(input: {
  restaurantId: unknown;
  paymentIntentId: string;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) return;
  const customerId = await ensureSubscriptionStripeCustomer(sub);
  if (!customerId) return;

  const paymentMethodId = await saveInvoicePaymentMethodAsPreferred({
    customerId,
    paymentIntentId: input.paymentIntentId,
    subscriptionId: sub.stripeSubscriptionId,
  });
  if (!paymentMethodId) return;

  sub.preferredPaymentMethodId = paymentMethodId;
  sub.autoChargeInvoices = true;
  if (sub.status === 'past_due') {
    sub.status = 'active';
    sub.amountDueCents = 0;
  }
  await sub.save();
}

export async function confirmInvoicePayment(token: string, paymentIntentId: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new NotFoundError('Invoice');
  if (doc.status === 'paid') {
    const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
    return mapInvoice(doc, restaurant?.name);
  }

  await assertPaymentIntentSucceeded(paymentIntentId);

  if (doc.stripePaymentIntentId && doc.stripePaymentIntentId !== paymentIntentId) {
    throw new ValidationError('Payment intent does not match this invoice');
  }

  doc.status = 'paid';
  doc.paidAt = new Date();
  doc.canceledAt = undefined;
  doc.stripePaymentIntentId = paymentIntentId;
  doc.autoChargeError = undefined;
  await doc.save();

  try {
    await persistPreferredPaymentMethodFromInvoice({
      restaurantId: doc.restaurantId,
      paymentIntentId,
    });
  } catch (err) {
    logger.warn(
      { err, invoiceId: doc._id.toString() },
      'failed to save preferred payment method after invoice pay',
    );
  }

  await Subscription.updateOne(
    { restaurantId: doc.restaurantId, status: 'past_due' },
    { $set: { amountDueCents: 0, status: 'active' } },
  );

  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

/** Auto-charge unpaid due invoices using the restaurant's preferred / default card. */
export async function autoChargeDueInvoices(now = new Date()) {
  const due = await Invoice.find({
    status: { $in: ['pending', 'overdue', 'upcoming'] },
    totalCents: { $gt: 0 },
    dueDate: { $lte: now },
  }).limit(200);

  let attempted = 0;
  let charged = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of due) {
    const sub = await Subscription.findOne({
      restaurantId: doc.restaurantId,
      status: { $in: ['trialing', 'active', 'past_due'] },
      autoChargeInvoices: { $ne: false },
    });
    if (!sub) {
      skipped += 1;
      continue;
    }

    const customerId = await ensureSubscriptionStripeCustomer(sub);
    if (!customerId) {
      skipped += 1;
      continue;
    }

    let paymentMethodId = sub.preferredPaymentMethodId ?? null;
    if (!paymentMethodId) {
      paymentMethodId = await resolveCustomerDefaultPaymentMethodId(customerId);
    }
    if (!paymentMethodId) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    doc.autoChargeAttemptedAt = new Date();
    try {
      const intent = await createStripeInvoicePaymentIntent({
        amountCents: doc.totalCents,
        currency: doc.currency || 'usd',
        customerId,
        paymentMethodId,
        offSession: true,
        metadata: {
          invoiceId: doc._id.toString(),
          invoiceNumber: doc.number,
          restaurantId: doc.restaurantId.toString(),
          autoCharge: '1',
        },
      });

      if (intent.status !== 'succeeded' && !isStubPaymentIntent(intent.id)) {
        throw new Error(`PaymentIntent status ${intent.status}`);
      }

      doc.status = 'paid';
      doc.paidAt = new Date();
      doc.canceledAt = undefined;
      doc.stripePaymentIntentId = intent.id;
      doc.autoChargeError = undefined;
      await doc.save();

      if (!sub.preferredPaymentMethodId) {
        sub.preferredPaymentMethodId = paymentMethodId;
        await sub.save();
      }
      await Subscription.updateOne(
        { restaurantId: doc.restaurantId, status: 'past_due' },
        { $set: { amountDueCents: 0, status: 'active' } },
      );
      charged += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : 'Auto-charge failed';
      doc.autoChargeError = message.slice(0, 500);
      if (doc.status === 'upcoming') doc.status = 'pending';
      await doc.save();
      await Subscription.updateOne(
        { restaurantId: doc.restaurantId, status: { $in: ['trialing', 'active'] } },
        { $set: { status: 'past_due', amountDueCents: doc.totalCents } },
      );
      logger.warn(
        { err, invoiceId: doc._id.toString(), restaurantId: String(doc.restaurantId) },
        'invoice auto-charge failed',
      );
    }
  }

  return { attempted, charged, failed, skipped };
}

/** Re-fetch client secret for an existing invoice payment intent (e.g. page refresh). */
export async function resumeInvoicePayment(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new NotFoundError('Invoice');
  if (doc.status === 'paid') {
    const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
    return {
      invoice: mapInvoice(doc, restaurant?.name),
      clientSecret: null as string | null,
      paymentIntentId: null as string | null,
      alreadyPaid: true,
      isStub: false,
    };
  }

  const sub = await Subscription.findOne({ restaurantId: doc.restaurantId }).select(
    'preferredPaymentMethodId stripeCustomerId',
  );
  // Recreate when we still need to capture a preferred card (legacy PIs had no customer).
  const needsSaveableIntent = Boolean(sub && !sub.preferredPaymentMethodId);

  // Never resume stub intents into Stripe Elements — recreate instead.
  if (
    !needsSaveableIntent &&
    doc.stripePaymentIntentId &&
    !isStubPaymentIntent(doc.stripePaymentIntentId)
  ) {
    const clientSecret = await retrievePaymentIntentClientSecret(doc.stripePaymentIntentId);
    if (clientSecret) {
      const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
      return {
        invoice: mapInvoice(doc, restaurant?.name),
        clientSecret,
        paymentIntentId: doc.stripePaymentIntentId,
        alreadyPaid: false,
        isStub: false,
      };
    }
  }

  if (needsSaveableIntent && doc.stripePaymentIntentId) {
    doc.stripePaymentIntentId = undefined;
    await doc.save();
  }

  return startInvoicePayment(token);
}

export async function getPlatformRevenueReport(period?: string) {
  const now = new Date();
  const currentPeriod = period ?? now.toISOString().slice(0, 7);

  const [
    activeSubs,
    trialingSubs,
    pastDueSubs,
    cancelledSubs,
    invoiceAgg,
    coverAgg,
    invoicesByStatus,
  ] = await Promise.all([
    Subscription.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'trialing' }),
    Subscription.countDocuments({ status: 'past_due' }),
    Subscription.countDocuments({ status: 'cancelled' }),
    Invoice.aggregate([
      { $match: { billingPeriod: currentPeriod, status: { $ne: 'canceled' } } },
      {
        $group: {
          _id: null,
          billedCents: { $sum: '$totalCents' },
          paidCents: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalCents', 0] },
          },
          outstandingCents: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'upcoming', 'overdue']] },
                '$totalCents',
                0,
              ],
            },
          },
          invoiceCount: { $sum: 1 },
        },
      },
    ]),
    CoverFee.aggregate([
      { $match: { billingPeriod: currentPeriod } },
      {
        $group: {
          _id: null,
          coverFeeCents: { $sum: '$feeCents' },
          covers: { $sum: '$partySize' },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { billingPeriod: currentPeriod } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalCents: { $sum: '$totalCents' } } },
    ]),
  ]);

  const mrrAgg = await Subscription.aggregate([
    { $match: { status: { $in: ['active', 'past_due'] } } },
    { $group: { _id: null, mrrCents: { $sum: '$monthlyPriceCents' } } },
  ]);

  const byPlan = await Subscription.aggregate([
    { $match: { status: { $in: ['active', 'trialing', 'past_due'] } } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        mrrCents: {
          $sum: {
            $cond: [{ $eq: ['$status', 'trialing'] }, 0, '$monthlyPriceCents'],
          },
        },
      },
    },
  ]);

  const inv = invoiceAgg[0] ?? {
    billedCents: 0,
    paidCents: 0,
    outstandingCents: 0,
    invoiceCount: 0,
  };
  const cover = coverAgg[0] ?? { coverFeeCents: 0, covers: 0 };

  return {
    period: currentPeriod,
    mrrCents: mrrAgg[0]?.mrrCents ?? 0,
    arrCents: (mrrAgg[0]?.mrrCents ?? 0) * 12,
    activeSubscriptions: activeSubs,
    trialingSubscriptions: trialingSubs,
    pastDueSubscriptions: pastDueSubs,
    cancelledSubscriptions: cancelledSubs,
    billedCents: inv.billedCents,
    paidCents: inv.paidCents,
    outstandingCents: inv.outstandingCents,
    invoiceCount: inv.invoiceCount,
    coverFeeCents: cover.coverFeeCents,
    covers: cover.covers,
    byPlan: byPlan.map((p) => ({
      plan: p._id,
      count: p.count,
      mrrCents: p.mrrCents,
    })),
    byInvoiceStatus: invoicesByStatus.map((s) => ({
      status: s._id,
      count: s.count,
      totalCents: s.totalCents,
    })),
  };
}
