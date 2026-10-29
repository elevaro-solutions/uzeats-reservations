import {
  FAIL_TO_PAY_DEFAULTS,
  failToPayNoticeKeyForDay,
  failToPayStageFromDaysPastDue,
  financeChargeAssessmentsDue,
  financeChargeCentsForTotal,
  isEnforcementFeeLineKind,
  isFailToPayPubliclyListed,
  partnerMayCreateNewCover,
  partnerMayHonorExisting,
  utcCalendarDaysBetween,
  type FailToPayStage,
} from '@reservations/shared';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { logAudit } from './audit.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { notifyUser } from './notifications.js';
import { getPlatformConfig, mapPlatformConfig } from './platformConfig.js';
import { scheduleSubscriptionCancel } from './subscriptionLifecycle.js';

const OPEN_INVOICE_STATUSES = ['upcoming', 'pending', 'overdue'] as const;

type InvoiceDoc = InstanceType<typeof Invoice>;
type SubDoc = SubscriptionDocument;

type EnforcementState = {
  stage?: FailToPayStage;
  pausedAt?: Date | null;
  pauseReason?: string | null;
  graceExtendedUntil?: Date | null;
  unlistedAt?: Date | null;
  restrictedAt?: Date | null;
  terminatedAt?: Date | null;
  lastNoticeKey?: string | null;
  lastNoticeAt?: Date | null;
  oldestUnpaidDueDate?: Date | null;
  outstandingCents?: number | null;
};

export type FailToPaySettings = {
  financeChargeBps: number;
  declinedFeeCents: number;
};

export type VenueEnforcementSnapshot = {
  stage: FailToPayStage;
  daysPastDue: number | null;
  oldestUnpaidDueDate: Date | null;
  outstandingCents: number;
  paused: boolean;
  pauseReason: string | null;
  pausedAt: Date | null;
  graceExtendedUntil: Date | null;
  unlistedAt: Date | null;
  restrictedAt: Date | null;
  terminatedAt: Date | null;
  publiclyListed: boolean;
};

function envOf(sub: { billingEnforcement?: EnforcementState | null }): EnforcementState {
  return (sub.billingEnforcement ?? {}) as EnforcementState;
}

export async function getFailToPaySettings(): Promise<FailToPaySettings> {
  const mapped = mapPlatformConfig(await getPlatformConfig()) as {
    failToPay?: { financeChargeBps?: number; declinedFeeCents?: number };
  };
  const raw = mapped.failToPay;
  const bps = raw?.financeChargeBps;
  const fee = raw?.declinedFeeCents;
  return {
    financeChargeBps:
      typeof bps === 'number' && bps >= 0 ? bps : FAIL_TO_PAY_DEFAULTS.financeChargeBps,
    declinedFeeCents:
      typeof fee === 'number' && fee >= 0 ? fee : FAIL_TO_PAY_DEFAULTS.declinedFeeCents,
  };
}

export function enforcementFeeLines<T extends { kind?: string | null }>(lines: T[]): T[] {
  return lines.filter((line) => isEnforcementFeeLineKind(line.kind ?? null));
}

export function usageInvoiceLines<T extends { kind?: string | null }>(lines: T[]): T[] {
  return lines.filter((line) => !isEnforcementFeeLineKind(line.kind ?? null));
}

function sumLines(lines: Array<{ amountCents: number }>) {
  return lines.reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
}

export function recalcInvoiceTotals(doc: InvoiceDoc) {
  const lines = (doc.lines ?? []) as Array<{ amountCents: number; kind?: string | null }>;
  const usage = sumLines(usageInvoiceLines(lines));
  const fees = sumLines(enforcementFeeLines(lines));
  doc.subtotalCents = usage;
  doc.totalCents = usage + fees;
  return doc.totalCents;
}

async function unpaidInvoicesForRestaurant(restaurantId: string) {
  return Invoice.find({
    restaurantId,
    status: { $in: [...OPEN_INVOICE_STATUSES] },
    totalCents: { $gt: 0 },
  }).sort({ dueDate: 1 });
}

function clockDueDate(
  invoices: Array<{ dueDate: Date; status: string }>,
  sub: SubscriptionDocument,
  now: Date,
): Date | null {
  const dueNow = invoices.filter((inv) => inv.dueDate.getTime() <= now.getTime());
  if (dueNow.length) return dueNow[0]!.dueDate;
  if (
    (sub.status === 'past_due' || (sub.amountDueCents ?? 0) > 0) &&
    invoices.length === 0
  ) {
    return sub.pastDueSince ?? sub.currentPeriodEnd ?? now;
  }
  return null;
}

function applyGraceExtension(
  stage: FailToPayStage,
  graceExtendedUntil: Date | null | undefined,
  now: Date,
): FailToPayStage {
  if (!graceExtendedUntil || graceExtendedUntil.getTime() <= now.getTime()) return stage;
  if (stage === 'current') return stage;
  return 'grace';
}

export async function getVenueEnforcementSnapshot(
  restaurantId: string,
  now = new Date(),
  subDoc?: SubscriptionDocument | null,
): Promise<VenueEnforcementSnapshot> {
  const sub =
    subDoc ?? (await Subscription.findOne({ restaurantId }));
  const empty: VenueEnforcementSnapshot = {
    stage: 'current',
    daysPastDue: null,
    oldestUnpaidDueDate: null,
    outstandingCents: 0,
    paused: false,
    pauseReason: null,
    pausedAt: null,
    graceExtendedUntil: null,
    unlistedAt: null,
    restrictedAt: null,
    terminatedAt: null,
    publiclyListed: false,
  };
  if (!sub) return empty;

  const persisted = envOf(sub);
  if (persisted.stage === 'terminated' && sub.status === 'cancelled') {
    const remaining = await unpaidInvoicesForRestaurant(restaurantId);
    const remainingCents = remaining.reduce((sum, inv) => sum + (inv.totalCents ?? 0), 0);
    return {
      stage: 'terminated',
      daysPastDue: persisted.oldestUnpaidDueDate
        ? utcCalendarDaysBetween(persisted.oldestUnpaidDueDate, now)
        : FAIL_TO_PAY_DEFAULTS.terminateDays,
      oldestUnpaidDueDate: persisted.oldestUnpaidDueDate ?? remaining[0]?.dueDate ?? null,
      outstandingCents: remainingCents,
      paused: Boolean(persisted.pausedAt),
      pauseReason: persisted.pauseReason ?? null,
      pausedAt: persisted.pausedAt ?? null,
      graceExtendedUntil: persisted.graceExtendedUntil ?? null,
      unlistedAt: persisted.unlistedAt ?? null,
      restrictedAt: persisted.restrictedAt ?? null,
      terminatedAt: persisted.terminatedAt ?? null,
      publiclyListed: false,
    };
  }

  const invoices = await unpaidInvoicesForRestaurant(restaurantId);
  const outstandingCents = invoices.reduce((sum, inv) => sum + (inv.totalCents ?? 0), 0);
  const stripeDue = sub.amountDueCents ?? 0;
  const oldestUnpaidDueDate = clockDueDate(invoices, sub, now);
  const daysPastDue =
    oldestUnpaidDueDate != null ? utcCalendarDaysBetween(oldestUnpaidDueDate, now) : null;
  let stage = failToPayStageFromDaysPastDue(daysPastDue);
  stage = applyGraceExtension(stage, persisted.graceExtendedUntil, now);

  const paused = Boolean(persisted.pausedAt);
  if (paused) {
    const frozen = (persisted.stage as FailToPayStage | undefined) ?? 'current';
    const frozenStage =
      frozen === 'terminated' ? 'terminated' : frozen;
    return {
      stage: frozenStage,
      daysPastDue,
      oldestUnpaidDueDate,
      outstandingCents: Math.max(outstandingCents, stripeDue),
      paused: true,
      pauseReason: persisted.pauseReason ?? null,
      pausedAt: persisted.pausedAt ?? null,
      graceExtendedUntil: persisted.graceExtendedUntil ?? null,
      unlistedAt: persisted.unlistedAt ?? null,
      restrictedAt: persisted.restrictedAt ?? null,
      terminatedAt: persisted.terminatedAt ?? null,
      publiclyListed: isFailToPayPubliclyListed(frozenStage),
    };
  }

  return {
    stage,
    daysPastDue,
    oldestUnpaidDueDate,
    outstandingCents: Math.max(outstandingCents, stripeDue),
    paused: false,
    pauseReason: null,
    pausedAt: null,
    graceExtendedUntil: persisted.graceExtendedUntil ?? null,
    unlistedAt: persisted.unlistedAt ?? null,
    restrictedAt: persisted.restrictedAt ?? null,
    terminatedAt: persisted.terminatedAt ?? null,
    publiclyListed: isFailToPayPubliclyListed(stage),
  };
}

export function mapBillingEnforcement(snapshot: VenueEnforcementSnapshot) {
  return {
    stage: snapshot.stage,
    daysPastDue: snapshot.daysPastDue,
    oldestUnpaidDueDate: snapshot.oldestUnpaidDueDate,
    outstandingCents: snapshot.outstandingCents,
    paused: snapshot.paused,
    pauseReason: snapshot.pauseReason,
    pausedAt: snapshot.pausedAt,
    graceExtendedUntil: snapshot.graceExtendedUntil,
    unlistedAt: snapshot.unlistedAt,
    restrictedAt: snapshot.restrictedAt,
    terminatedAt: snapshot.terminatedAt,
    publiclyListed: snapshot.publiclyListed,
  };
}

export async function assertPartnerMayCreateCover(
  restaurantId: string,
  opts?: { honorExisting?: boolean },
) {
  const snapshot = await getVenueEnforcementSnapshot(restaurantId);
  if (opts?.honorExisting) {
    if (!partnerMayHonorExisting(snapshot.stage)) {
      throw new ValidationError(
        'This restaurant’s subscription ended because of unpaid invoices. Pay the balance on Billing to continue.',
      );
    }
    return snapshot;
  }
  if (!partnerMayCreateNewCover(snapshot.stage)) {
    throw new ValidationError(
      'New reservations are paused until outstanding invoices are paid. You can still honor existing bookings. Pay now on Billing.',
    );
  }
  return snapshot;
}

function isCardDeclineError(err: unknown): boolean {
  const anyErr = err as { code?: string; decline_code?: string; message?: string };
  const code = String(anyErr?.code ?? '').toLowerCase();
  const decline = String(anyErr?.decline_code ?? '').toLowerCase();
  const message = String(anyErr?.message ?? '').toLowerCase();
  if (code === 'card_declined' || decline) return true;
  return /declined|insufficient_funds|lost_card|stolen_card|expired_card|incorrect_cvc|do_not_honor/.test(
    message,
  );
}

export async function assessDeclinedCardFee(invoiceId: string, err: unknown) {
  if (!isCardDeclineError(err)) return false;
  const doc = await Invoice.findById(invoiceId);
  if (!doc || doc.status === 'paid' || doc.status === 'canceled') return false;
  if (doc.declinedFeeAssessedAt) return false;
  const settings = await getFailToPaySettings();
  if (settings.declinedFeeCents <= 0) {
    doc.declinedFeeAssessedAt = new Date();
    await doc.save();
    return false;
  }
  const lines = [...(doc.lines ?? [])];
  lines.push({
    description: 'Declined card fee',
    quantity: 1,
    unitAmountCents: settings.declinedFeeCents,
    amountCents: settings.declinedFeeCents,
    kind: 'declined_fee',
  } as InvoiceDoc['lines'][number]);
  doc.lines = lines as InvoiceDoc['lines'];
  doc.declinedFeeAssessedAt = new Date();
  recalcInvoiceTotals(doc);
  await doc.save();
  return true;
}

async function assessFinanceChargesForInvoice(
  doc: InvoiceDoc,
  now: Date,
  settings: FailToPaySettings,
) {
  if (doc.status === 'paid' || doc.status === 'canceled' || doc.totalCents <= 0) return false;
  const days = utcCalendarDaysBetween(doc.dueDate, now);
  const due = financeChargeAssessmentsDue(days);
  const already = doc.financeChargeCount ?? 0;
  if (due <= already) return false;
  let changed = false;
  const lines = [...(doc.lines ?? [])];
  for (let n = already; n < due; n += 1) {
    recalcInvoiceTotals(Object.assign(doc, { lines }) as InvoiceDoc);
    const charge = financeChargeCentsForTotal(doc.totalCents, settings.financeChargeBps);
    if (charge <= 0) break;
    const when = now.toISOString().slice(0, 10);
    lines.push({
      description: `Finance charge (1.5% overdue) — ${when}`,
      quantity: 1,
      unitAmountCents: charge,
      amountCents: charge,
      kind: 'finance_charge',
    } as InvoiceDoc['lines'][number]);
    doc.financeChargeCount = n + 1;
    doc.lastFinanceChargeAt = now;
    changed = true;
  }
  if (changed) {
    doc.lines = lines as InvoiceDoc['lines'];
    recalcInvoiceTotals(doc);
    if (doc.status !== 'overdue' && days > FAIL_TO_PAY_DEFAULTS.graceDays) {
      doc.status = 'overdue';
    }
    await doc.save();
  }
  return changed;
}

export async function assessFinanceChargesForRestaurant(restaurantId: string, now = new Date()) {
  const settings = await getFailToPaySettings();
  if (settings.financeChargeBps <= 0) return 0;
  const invoices = await unpaidInvoicesForRestaurant(restaurantId);
  let count = 0;
  for (const doc of invoices) {
    if (await assessFinanceChargesForInvoice(doc, now, settings)) count += 1;
  }
  return count;
}

function writeEnforcement(sub: SubscriptionDocument, next: EnforcementState) {
  sub.billingEnforcement = {
    stage: next.stage ?? 'current',
    outstandingCents: next.outstandingCents ?? 0,
    ...next,
  } as SubscriptionDocument['billingEnforcement'];
}

async function persistEnforcement(
  sub: SubscriptionDocument,
  snapshot: VenueEnforcementSnapshot,
  extras?: Partial<EnforcementState>,
) {
  const prev = envOf(sub);
  writeEnforcement(sub, {
    stage: snapshot.stage,
    pausedAt: snapshot.pausedAt ?? undefined,
    pauseReason: snapshot.pauseReason ?? undefined,
    graceExtendedUntil: snapshot.graceExtendedUntil ?? undefined,
    unlistedAt:
      snapshot.stage === 'unlisted' ||
      snapshot.stage === 'restricted' ||
      snapshot.stage === 'terminated'
        ? (prev.unlistedAt ?? extras?.unlistedAt ?? new Date())
        : undefined,
    restrictedAt:
      snapshot.stage === 'restricted' || snapshot.stage === 'terminated'
        ? (prev.restrictedAt ?? extras?.restrictedAt ?? new Date())
        : undefined,
    terminatedAt:
      snapshot.stage === 'terminated'
        ? (prev.terminatedAt ?? extras?.terminatedAt ?? new Date())
        : undefined,
    lastNoticeKey: extras?.lastNoticeKey ?? prev.lastNoticeKey,
    lastNoticeAt: extras?.lastNoticeAt ?? prev.lastNoticeAt,
    oldestUnpaidDueDate: snapshot.oldestUnpaidDueDate ?? undefined,
    outstandingCents: snapshot.outstandingCents,
  });
  await sub.save();
}

export async function syncSubscriptionPastDueFlag(restaurantId: string, now = new Date()) {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) return null;
  if (sub.status === 'cancelled' || sub.status === 'paused') return sub;
  const snapshot = await getVenueEnforcementSnapshot(restaurantId, now, sub);
  const hasDebt = snapshot.outstandingCents > 0 && snapshot.stage !== 'current';
  if (hasDebt && snapshot.daysPastDue != null && snapshot.daysPastDue >= 0) {
    if (sub.status !== 'past_due') {
      sub.status = 'past_due';
      if (!sub.pastDueSince) sub.pastDueSince = now;
      sub.amountDueCents = snapshot.outstandingCents;
      await sub.save();
    } else if (sub.amountDueCents !== snapshot.outstandingCents) {
      sub.amountDueCents = snapshot.outstandingCents;
      await sub.save();
    }
    return sub;
  }
  if (sub.status === 'past_due') {
    sub.status = 'active';
    sub.amountDueCents = 0;
    sub.pastDueSince = undefined;
    await sub.save();
  }
  return sub;
}

type NoticeCopy = { headline: string; body: string; template: string };

function noticeCopyForDay(daysPastDue: number): NoticeCopy {
  if (daysPastDue === 1 || daysPastDue === 3 || daysPastDue === 7) {
    return {
      template: 'invoice_payment_reminder',
      headline: 'Your Tablevera invoice is due',
      body: 'We could not collect payment. Please pay now to keep your listing and Partner Hub current.',
    };
  }
  if (daysPastDue === 8) {
    return {
      template: 'invoice_overdue',
      headline: 'Your invoice is overdue — finance charges now apply',
      body: 'A 1.5% monthly finance charge has been added. Pay today to avoid further fees and listing restrictions.',
    };
  }
  if (daysPastDue === 13) {
    return {
      template: 'invoice_enforcement',
      headline: 'Tomorrow your diner listing will be hidden',
      body: 'If this invoice is still unpaid tomorrow, guests will not see your restaurant in search or be able to make new online bookings. Existing reservations stay on the books.',
    };
  }
  if (daysPastDue === 14) {
    return {
      template: 'invoice_enforcement',
      headline: 'Your diner listing is now hidden',
      body: 'Guests cannot find you in search or make new online bookings until this invoice is paid. You can still honor existing reservations in Partner Hub.',
    };
  }
  if (daysPastDue === 21) {
    return {
      template: 'invoice_enforcement',
      headline: 'Your listing is still hidden',
      body: 'Pay your overdue invoice to restore diner search and new bookings. Partner Hub access will be limited if this remains unpaid.',
    };
  }
  if (daysPastDue === 29) {
    return {
      template: 'invoice_enforcement',
      headline: 'Tomorrow Partner Hub will be limited to billing',
      body: 'If this invoice is still unpaid tomorrow, staff will only be able to use Billing and honor existing reservations.',
    };
  }
  if (daysPastDue === 30) {
    return {
      template: 'invoice_enforcement',
      headline: 'Partner Hub is limited — 30 days to pay before we end the listing',
      body: 'New in-product reservations are paused. Pay within 30 days or we will cancel the subscription and remaining upcoming diner bookings.',
    };
  }
  if (daysPastDue === 45) {
    return {
      template: 'invoice_enforcement',
      headline: 'Pay now to keep your Tablevera subscription',
      body: 'Your account is still restricted. If the balance is not paid, we will end the subscription and cancel remaining upcoming reservations.',
    };
  }
  if (daysPastDue === 59) {
    return {
      template: 'invoice_enforcement',
      headline: 'Final day: pay by tomorrow to keep this location',
      body: 'Tomorrow we will cancel the subscription and remaining upcoming diner reservations. Pay today to stay on Tablevera.',
    };
  }
  return {
    template: 'invoice_enforcement',
    headline: 'Your Tablevera subscription has ended',
    body: 'The subscription was cancelled because invoices were not paid. Remaining upcoming reservations were cancelled. Pay the balance, then choose a plan to list again.',
  };
}

async function sendEnforcementNotice(input: {
  restaurantId: string;
  invoice: InvoiceDoc;
  daysPastDue: number;
  snapshot: VenueEnforcementSnapshot;
}) {
  const key = failToPayNoticeKeyForDay(input.daysPastDue);
  if (!key) return false;
  const sent = input.invoice.enforcementNoticesSent ?? [];
  if (sent.includes(key)) return false;

  const restaurant = await Restaurant.findById(input.restaurantId).select('name ownerId');
  if (!restaurant?.ownerId) {
    input.invoice.enforcementNoticesSent = [...sent, key];
    await input.invoice.save();
    return false;
  }
  const owner = await User.findById(restaurant.ownerId).select('firstName email');
  const copy = noticeCopyForDay(input.daysPastDue);
  const amount = (input.invoice.totalCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (input.invoice.currency || 'usd').toUpperCase(),
  });
  const due = input.invoice.dueDate.toLocaleDateString('en-US', { timeZone: 'UTC' });
  const vars = {
    firstName: owner?.firstName || 'there',
    restaurantName: restaurant.name,
    headline: copy.headline,
    body: copy.body,
    invoiceNumber: input.invoice.number,
    amount,
    dueDate: due,
    daysPastDue: String(input.daysPastDue),
    invoiceUrl: input.invoice.payToken
      ? `${process.env.WEB_APP_URL || 'https://tablevera.online'}/invoice/${input.invoice.payToken}`
      : '',
    billingUrl: `${process.env.DASHBOARD_URL || 'https://dashboard.tablevera.online'}/billing`,
    stageLabel: input.snapshot.stage,
  };

  let subject = copy.headline;
  let htmlBody: string | undefined;
  let emailText = `${copy.headline}\n\n${copy.body}\n\nInvoice ${input.invoice.number} · ${amount} · due ${due}`;
  try {
    const rendered = await renderEmailTemplate(copy.template, vars);
    subject = rendered.subject || subject;
    htmlBody = rendered.bodyHtml;
    emailText = rendered.bodyText || emailText;
  } catch {
    // Template may not exist yet in older DBs; fall back to inline copy.
  }

  await notifyUser(restaurant.ownerId.toString(), {
    type:
      copy.template === 'invoice_payment_reminder'
        ? 'invoice_payment_reminder'
        : copy.template === 'invoice_overdue'
          ? 'invoice_overdue'
          : 'invoice_enforcement',
    title: copy.headline,
    body: copy.body,
    emailSubject: subject,
    emailText,
    htmlBody,
    data: {
      restaurantId: input.restaurantId,
      invoiceId: input.invoice._id.toString(),
      stage: input.snapshot.stage,
    },
  });

  input.invoice.enforcementNoticesSent = [...sent, key];
  await input.invoice.save();
  return true;
}

async function cancelUpcomingReservations(restaurantId: string, actorId: string) {
  const { updateReservationStatus } = await import('./reservations.js');
  const upcoming = await Reservation.find({
    restaurantId,
    status: { $in: ['pending', 'confirmed'] },
    slotStart: { $gte: new Date() },
  }).select('_id');
  let cancelled = 0;
  for (const row of upcoming) {
    try {
      await updateReservationStatus(
        row._id.toString(),
        'cancelled',
        actorId,
        'Restaurant listing ended because of unpaid invoices',
      );
      cancelled += 1;
    } catch (err) {
      logger.warn(
        { err, reservationId: row._id.toString(), restaurantId },
        'fail-to-pay reservation cancel failed',
      );
    }
  }
  return cancelled;
}

async function terminateVenue(sub: SubscriptionDocument, actorId: string, now: Date) {
  if (sub.status !== 'cancelled') {
    try {
      await scheduleSubscriptionCancel({
        restaurantId: sub.restaurantId.toString(),
        actorId,
        immediate: true,
      });
    } catch (err) {
      logger.warn({ err, restaurantId: String(sub.restaurantId) }, 'fail-to-pay cancel sub failed');
      sub.status = 'cancelled';
      sub.cancelAtPeriodEnd = false;
      sub.cancelledAt = now;
      await sub.save();
    }
  }
  await cancelUpcomingReservations(sub.restaurantId.toString(), actorId);
}

export async function applyEnforcementForRestaurant(
  restaurantId: string,
  now = new Date(),
): Promise<VenueEnforcementSnapshot> {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) {
    return getVenueEnforcementSnapshot(restaurantId, now);
  }

  const paused = Boolean(envOf(sub).pausedAt);
  if (!paused) {
    await assessFinanceChargesForRestaurant(restaurantId, now);
  }

  const snapshot = await getVenueEnforcementSnapshot(restaurantId, now, sub);
  const previousStage = (envOf(sub).stage as FailToPayStage | undefined) ?? 'current';

  if (paused) {
    await persistEnforcement(sub, snapshot);
    return snapshot;
  }

  const extras: Partial<EnforcementState> = {};
  if (snapshot.stage === 'unlisted' && previousStage !== 'unlisted') {
    extras.unlistedAt = now;
  }
  if (snapshot.stage === 'restricted' && previousStage !== 'restricted') {
    extras.restrictedAt = now;
  }
  if (snapshot.stage === 'terminated' && previousStage !== 'terminated') {
    extras.terminatedAt = now;
    const actorId = (await Restaurant.findById(restaurantId).select('ownerId'))?.ownerId?.toString();
    await terminateVenue(sub, actorId || sub.id, now);
  }

  await persistEnforcement(sub, snapshot, extras);
  await syncSubscriptionPastDueFlag(restaurantId, now);

  if (snapshot.daysPastDue != null && snapshot.daysPastDue >= 0 && snapshot.outstandingCents > 0) {
    const invoices = await unpaidInvoicesForRestaurant(restaurantId);
    const oldest = invoices.find((inv) => inv.dueDate.getTime() <= now.getTime()) ?? invoices[0];
    if (oldest) {
      const sent = await sendEnforcementNotice({
        restaurantId,
        invoice: oldest,
        daysPastDue: snapshot.daysPastDue,
        snapshot,
      });
      if (sent) {
        const fresh = await Subscription.findOne({ restaurantId });
        if (fresh) {
          const key = failToPayNoticeKeyForDay(snapshot.daysPastDue);
          if (key) {
            writeEnforcement(fresh, {
              ...envOf(fresh),
              lastNoticeKey: key,
              lastNoticeAt: now,
            });
            await fresh.save();
          }
        }
      }
    }
  }

  return getVenueEnforcementSnapshot(restaurantId, now);
}

export async function runFailToPayEnforcementJob(now = new Date()) {
  const subs = await Subscription.find({
    status: { $in: ['trialing', 'active', 'past_due'] },
  }).select('restaurantId');
  const terminatedOpen = await Subscription.find({
    status: 'cancelled',
    'billingEnforcement.stage': { $in: ['restricted', 'terminated'] },
  }).select('restaurantId');

  const ids = new Set<string>();
  for (const sub of [...subs, ...terminatedOpen]) {
    ids.add(sub.restaurantId.toString());
  }
  const openInvoiceRestaurants = await Invoice.distinct('restaurantId', {
    status: { $in: [...OPEN_INVOICE_STATUSES] },
    totalCents: { $gt: 0 },
  });
  for (const id of openInvoiceRestaurants) ids.add(String(id));

  let processed = 0;
  for (const restaurantId of ids) {
    try {
      await applyEnforcementForRestaurant(restaurantId, now);
      processed += 1;
    } catch (err) {
      logger.warn({ err, restaurantId }, 'fail-to-pay enforcement failed');
    }
  }
  return { processed };
}

export async function pauseBillingEnforcement(input: {
  restaurantId: string;
  actorId: string;
  reason?: string;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new ValidationError('Subscription not found');
  const snapshot = await getVenueEnforcementSnapshot(input.restaurantId, new Date(), sub);
  writeEnforcement(sub, {
    ...envOf(sub),
    stage: snapshot.stage,
    pausedAt: new Date(),
    pauseReason: input.reason?.trim() || 'Paused by admin',
    outstandingCents: snapshot.outstandingCents,
    oldestUnpaidDueDate: snapshot.oldestUnpaidDueDate ?? undefined,
  });
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'pauseBillingEnforcement',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId, reason: input.reason },
  });
  return getVenueEnforcementSnapshot(input.restaurantId, new Date(), sub);
}

export async function resumeBillingEnforcement(input: {
  restaurantId: string;
  actorId: string;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new ValidationError('Subscription not found');
  writeEnforcement(sub, {
    ...envOf(sub),
    pausedAt: undefined,
    pauseReason: undefined,
  });
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'resumeBillingEnforcement',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId },
  });
  return applyEnforcementForRestaurant(input.restaurantId);
}

export async function extendBillingGrace(input: {
  restaurantId: string;
  actorId: string;
  until: Date;
}) {
  if (Number.isNaN(input.until.getTime())) {
    throw new ValidationError('Grace extension must be a valid date');
  }
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new ValidationError('Subscription not found');
  writeEnforcement(sub, {
    ...envOf(sub),
    graceExtendedUntil: input.until,
  });
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'extendBillingGrace',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId, until: input.until.toISOString() },
  });
  return applyEnforcementForRestaurant(input.restaurantId);
}

export async function forceRestoreBillingAccess(input: {
  restaurantId: string;
  actorId: string;
  reason?: string;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new ValidationError('Subscription not found');
  if (sub.status === 'cancelled') {
    throw new ValidationError(
      'This subscription has ended. The owner must pay outstanding invoices and start a new plan.',
    );
  }
  writeEnforcement(sub, {
    stage: 'current',
    pausedAt: new Date(),
    pauseReason: input.reason?.trim() || 'Force-restored by admin',
    graceExtendedUntil: undefined,
    unlistedAt: undefined,
    restrictedAt: undefined,
    terminatedAt: undefined,
    outstandingCents: envOf(sub).outstandingCents ?? 0,
    oldestUnpaidDueDate: envOf(sub).oldestUnpaidDueDate,
  });
  if (sub.status === 'past_due') {
    sub.status = 'active';
  }
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'forceRestoreBillingAccess',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId, reason: input.reason },
  });
  return getVenueEnforcementSnapshot(input.restaurantId, new Date(), sub);
}

export async function waiveInvoiceEnforcementFees(input: {
  invoiceId: string;
  actorId: string;
  financeCharges?: boolean;
  declinedFee?: boolean;
}) {
  const doc = await Invoice.findById(input.invoiceId);
  if (!doc) throw new ValidationError('Invoice not found');
  const waiveFinance = input.financeCharges !== false;
  const waiveDeclined = input.declinedFee !== false;
  const kept = (doc.lines ?? []).filter((line) => {
    const kind = (line as { kind?: string }).kind;
    if (waiveFinance && kind === 'finance_charge') return false;
    if (waiveDeclined && kind === 'declined_fee') return false;
    return true;
  });
  doc.lines = kept as InvoiceDoc['lines'];
  if (waiveFinance) {
    const days = utcCalendarDaysBetween(doc.dueDate, new Date());
    doc.financeChargeCount = financeChargeAssessmentsDue(days);
  }
  if (waiveDeclined) {
    doc.declinedFeeAssessedAt = new Date();
  }
  recalcInvoiceTotals(doc);
  await doc.save();
  await logAudit({
    actorId: input.actorId,
    action: 'waiveInvoiceEnforcementFees',
    resource: 'Invoice',
    resourceId: doc._id.toString(),
    details: {
      financeCharges: waiveFinance,
      declinedFee: waiveDeclined,
    },
  });
  await applyEnforcementForRestaurant(doc.restaurantId.toString());
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return { invoice: doc, restaurantName: restaurant?.name ?? null };
}

export function resetBillingEnforcementFields(sub: SubscriptionDocument) {
  writeEnforcement(sub, {
    stage: 'current',
    outstandingCents: 0,
  });
  sub.pastDueSince = undefined;
}
