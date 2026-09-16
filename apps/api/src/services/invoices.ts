import crypto from 'crypto';
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
  assertPaymentIntentSucceeded,
  createInvoicePaymentIntent as createStripeInvoicePaymentIntent,
  isStubPaymentIntent,
  retrievePaymentIntentClientSecret,
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
  if (!year || !month) throw new Error('billingPeriod must be YYYY-MM');
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function parseDueDate(value: Date | string) {
  const dueDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dueDate.getTime())) throw new Error('dueDate must be a valid date');
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
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);
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
}) {
  const period = input.billingPeriod.trim();
  periodBounds(period);

  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer');
  }

  const restaurant = await Restaurant.findById(input.restaurantId).select('name');
  if (!restaurant) throw new Error('Restaurant not found');

  const existing = await Invoice.findOne({
    restaurantId: input.restaurantId,
    billingPeriod: period,
  });
  if (existing) {
    throw new Error(
      `Invoice already exists for this restaurant and period (${period}). Cancel or change period first.`,
    );
  }

  const dueDate = parseDueDate(input.dueDate);
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';
  const status = input.markPaid ? 'paid' : invoiceStatusForDueDate(dueDate);

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
      throw new Error('One or more services were not found');
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
    throw new Error('packageDurationMonths must be at least 1');
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

  // Scale line amounts to the editable total when lines came from catalog.
  if (lines.length && catalogTotal > 0 && amountCents !== catalogTotal) {
    // Keep line catalog amounts; put the negotiated total on the invoice totals.
    // Line display still shows catalog; invoice total is the charged amount.
  }

  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
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
    paidAt: input.markPaid ? new Date() : undefined,
    notes: input.notes?.trim() || undefined,
    packageDurationMonths: packageDurationMonths ?? undefined,
    planKey: planKey ?? undefined,
    billingCycle: billingCycle ?? undefined,
    serviceIds,
    payToken,
  });

  return mapInvoice(doc, restaurant.name);
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
      existing.set('lines', lines);
      existing.subtotalCents = subtotalCents;
      existing.totalCents = subtotalCents;
      existing.dueDate = dueDate;
      existing.status = nextStatus;
      if (paidAt && !existing.paidAt) existing.paidAt = paidAt;
      if (!existing.payToken) existing.payToken = newPayToken();
      await existing.save();
      await markCoverFeesCharged(sub.restaurantId, period);
      updated += 1;
      continue;
    }

    const seq = String(created + updated + skipped + 1).padStart(4, '0');
    const number = `${prefix}-${period.replace('-', '')}-${seq}`;

    try {
      await Invoice.create({
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
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  return { created, updated, skipped, period };
}

/** Current + previous calendar months (UTC). Idempotent; refreshes unpaid auto invoices. */
export async function generateDuePeriodInvoices(now = new Date()) {
  const current = utcBillingPeriod(now);
  const previous = previousUtcBillingPeriod(now);
  const previousResult = await generateInvoicesForPeriod(previous);
  const currentResult =
    current === previous ? previousResult : await generateInvoicesForPeriod(current);
  return { previous: previousResult, current: currentResult };
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

export type InvoiceStatusValue = 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue';

export async function setInvoiceStatus(id: string, status: InvoiceStatusValue) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');
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
  if (!uniqueIds.length) throw new Error('No invoices selected');

  const items = [];
  for (const id of uniqueIds) {
    items.push(await setInvoiceStatus(id, status));
  }
  return { updated: items.length, items };
}

export async function ensureInvoicePayLink(id: string) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');
  if (!doc.payToken) {
    doc.payToken = newPayToken();
    await doc.save();
  }
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function getInvoiceById(id: string) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function getInvoiceByPayToken(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new Error('Invoice not found');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function exportInvoicePdf(id: string): Promise<ExportPayload> {
  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name address');
  const mapped = mapInvoice(doc, restaurant?.name);
  return buildInvoicePdf(mapped, formatRestaurantAddress(restaurant?.address));
}

export async function exportInvoicePdfByToken(token: string): Promise<ExportPayload> {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new Error('Invoice not found');
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
    throw new Error(
      'Email is not configured. Set SENDGRID_API_KEY or RESEND_API_KEY on the API.',
    );
  }

  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');

  const restaurant = await Restaurant.findById(doc.restaurantId).select('name address ownerId');
  if (!restaurant) throw new Error('Restaurant not found');

  let to = toEmail?.trim().toLowerCase() || '';
  if (!to) {
    const owner = await User.findById(restaurant.ownerId).select('email');
    to = owner?.email?.trim().toLowerCase() || '';
  }
  if (!to) {
    throw new Error('No recipient email found for this restaurant owner');
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

  return {
    sent: true,
    to,
    stubbed: false,
  };
}

export { isEmailDeliveryConfigured };

export async function startInvoicePayment(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new Error('Invoice not found');
  if (doc.status === 'paid') throw new Error('Invoice is already paid');
  if (doc.status === 'canceled') throw new Error('Invoice is canceled');
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

  const intent = await createStripeInvoicePaymentIntent({
    amountCents: doc.totalCents,
    currency: doc.currency || 'usd',
    metadata: {
      invoiceId: doc._id.toString(),
      invoiceNumber: doc.number,
      restaurantId: doc.restaurantId.toString(),
      payToken: token,
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

export async function confirmInvoicePayment(token: string, paymentIntentId: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new Error('Invoice not found');
  if (doc.status === 'paid') {
    const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
    return mapInvoice(doc, restaurant?.name);
  }

  await assertPaymentIntentSucceeded(paymentIntentId);

  if (doc.stripePaymentIntentId && doc.stripePaymentIntentId !== paymentIntentId) {
    throw new Error('Payment intent does not match this invoice');
  }

  doc.status = 'paid';
  doc.paidAt = new Date();
  doc.canceledAt = undefined;
  doc.stripePaymentIntentId = paymentIntentId;
  await doc.save();

  await Subscription.updateOne(
    { restaurantId: doc.restaurantId, status: 'past_due' },
    { $set: { amountDueCents: 0, status: 'active' } },
  );

  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

/** Re-fetch client secret for an existing invoice payment intent (e.g. page refresh). */
export async function resumeInvoicePayment(token: string) {
  const doc = await Invoice.findOne({ payToken: token });
  if (!doc) throw new Error('Invoice not found');
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

  // Never resume stub intents into Stripe Elements — recreate instead.
  if (doc.stripePaymentIntentId && !isStubPaymentIntent(doc.stripePaymentIntentId)) {
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
