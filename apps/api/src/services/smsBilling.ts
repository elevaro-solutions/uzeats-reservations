import {
  normalizeSmsBillingConfig,
  smsMessagesForTopUpAmount,
  type SmsBillingConfig,
  type SmsBillingPackage,
} from '@reservations/shared';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { SmsCreditLedger } from '../models/SmsCreditLedger.js';
import { Subscription } from '../models/Subscription.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { getPlatformConfig, isFeatureEnabled, mapSmsBilling } from './platformConfig.js';
import { getFeatures } from './plans.js';
import {
  subscriptionGrantsEntitlements,
} from './subscriptionLifecycle.js';
import {
  assertPaymentIntentSucceeded,
  createInvoicePaymentIntent,
  isStubPaymentIntent,
} from './stripe.js';

function readBalance(sub: { addons?: { smsCredits?: { balance?: number | null } } } | null) {
  const n = Number(sub?.addons?.smsCredits?.balance ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function requirePurchasableSubscription(restaurantId: string) {
  if (!(await isFeatureEnabled('sms'))) {
    throw new ValidationError('Premium SMS is not available on this platform');
  }
  const restaurant = await Restaurant.findById(restaurantId).select('name');
  if (!restaurant) throw new NotFoundError('Restaurant');
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new ValidationError('No subscription found');
  if (!subscriptionGrantsEntitlements(sub)) {
    throw new ValidationError(
      'Premium SMS requires an active subscription. Choose a plan to re-enable SMS.',
    );
  }
  const features = await getFeatures(restaurantId);
  if (features.premiumSms) {
    throw new ValidationError('Premium SMS is already included in your plan');
  }
  // Basic is blocked; Core / Pro / custom packages without premiumSms can buy prepaid credits.
  if (sub.plan === 'basic') {
    throw new ValidationError('Premium SMS requires the Core plan or higher');
  }
  return { restaurant, sub, features };
}

async function creditMessages(input: {
  restaurantId: string;
  subId: unknown;
  deltaMessages: number;
  kind: 'purchase_package' | 'top_up' | 'refund' | 'admin_adjust';
  amountCents?: number;
  packageId?: string;
  packageName?: string;
  stripePaymentIntentId?: string;
  invoiceId?: unknown;
  note?: string;
  actorId?: string;
}) {
  if (input.deltaMessages <= 0) {
    throw new ValidationError('Credit amount must be positive');
  }
  const updated = await Subscription.findOneAndUpdate(
    { restaurantId: input.restaurantId },
    {
      $inc: { 'addons.smsCredits.balance': input.deltaMessages },
      $set: { 'addons.smsCredits.updatedAt': new Date() },
    },
    { new: true },
  );
  if (!updated) throw new NotFoundError('Subscription');
  const balanceAfter = readBalance(updated);
  await SmsCreditLedger.create({
    restaurantId: input.restaurantId,
    kind: input.kind,
    deltaMessages: input.deltaMessages,
    balanceAfter,
    amountCents: input.amountCents,
    packageId: input.packageId,
    packageName: input.packageName,
    stripePaymentIntentId: input.stripePaymentIntentId,
    invoiceId: input.invoiceId,
    note: input.note,
    actorId: input.actorId,
  });
  return balanceAfter;
}

async function createPaidSmsInvoice(input: {
  restaurantId: string;
  subscriptionId: unknown;
  description: string;
  amountCents: number;
  paymentIntentId: string;
  messageCount: number;
}) {
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const billingPeriod = `sms-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
  const number = `${prefix}-SMS-${stamp.slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const doc = await Invoice.create({
    number,
    restaurantId: input.restaurantId,
    subscriptionId: input.subscriptionId,
    status: 'paid',
    billingPeriod,
    currency,
    subtotalCents: input.amountCents,
    totalCents: input.amountCents,
    lines: [
      {
        description: input.description,
        quantity: 1,
        unitAmountCents: input.amountCents,
        amountCents: input.amountCents,
      },
    ],
    dueDate: now,
    paidAt: now,
    notes: `Prepaid SMS · ${input.messageCount} message${input.messageCount === 1 ? '' : 's'}`,
    stripePaymentIntentId: input.paymentIntentId,
  });
  return doc;
}

async function chargeOrCreateIntent(input: {
  restaurantId: string;
  amountCents: number;
  metadata: Record<string, string>;
  customerId?: string | null;
  paymentMethodId?: string | null;
}) {
  if (input.amountCents <= 0) {
    return { paid: true as const, paymentIntentId: `pi_dev_free_${Date.now()}`, clientSecret: null };
  }

  if (input.paymentMethodId && input.customerId) {
    const pi = await createInvoicePaymentIntent({
      amountCents: input.amountCents,
      customerId: input.customerId,
      paymentMethodId: input.paymentMethodId,
      offSession: true,
      metadata: input.metadata,
    });
    if (pi.status === 'succeeded' || isStubPaymentIntent(pi.id)) {
      return { paid: true as const, paymentIntentId: pi.id, clientSecret: null };
    }
  }

  const intent = await createInvoicePaymentIntent({
    amountCents: input.amountCents,
    customerId: input.customerId,
    metadata: input.metadata,
  });
  return {
    paid: false as const,
    paymentIntentId: intent.id,
    clientSecret: (intent.client_secret as string) ?? null,
  };
}

export async function getSmsBillingConfig(): Promise<SmsBillingConfig> {
  return mapSmsBilling(await getPlatformConfig());
}

export type SmsBillingStatus = {
  platformEnabled: boolean;
  includedInPlan: boolean;
  eligibleToPurchase: boolean;
  ineligibleReason: string | null;
  balance: number;
  catalog: SmsBillingConfig;
};

export async function getSmsBillingStatus(restaurantId: string): Promise<SmsBillingStatus> {
  const platformEnabled = await isFeatureEnabled('sms');
  const catalog = await getSmsBillingConfig();
  const sub = await Subscription.findOne({ restaurantId });
  const features = await getFeatures(restaurantId);
  const includedInPlan = Boolean(features.premiumSms);
  const balance = readBalance(sub);

  if (!platformEnabled) {
    return {
      platformEnabled: false,
      includedInPlan: false,
      eligibleToPurchase: false,
      ineligibleReason: 'Premium SMS is not available on this platform',
      balance: 0,
      catalog,
    };
  }

  if (!sub || !subscriptionGrantsEntitlements(sub)) {
    return {
      platformEnabled: true,
      includedInPlan: false,
      eligibleToPurchase: false,
      ineligibleReason: 'Active subscription required',
      balance,
      catalog,
    };
  }

  if (includedInPlan) {
    return {
      platformEnabled: true,
      includedInPlan: true,
      eligibleToPurchase: false,
      ineligibleReason: 'Included in your plan',
      balance,
      catalog,
    };
  }

  if (sub.plan === 'basic') {
    return {
      platformEnabled: true,
      includedInPlan: false,
      eligibleToPurchase: false,
      ineligibleReason: 'Available on Core (prepaid) or Pro (included)',
      balance,
      catalog,
    };
  }

  return {
    platformEnabled: true,
    includedInPlan: false,
    eligibleToPurchase: true,
    ineligibleReason: null,
    balance,
    catalog,
  };
}

export type SmsPurchaseResult = {
  status: SmsBillingStatus;
  paid: boolean;
  clientSecret: string | null;
  paymentMode: 'payment' | null;
  paymentIntentId: string | null;
  amountDueCents: number;
  messagesGranted: number;
};

async function finalizePackagePurchase(input: {
  restaurantId: string;
  subId: unknown;
  pkg: SmsBillingPackage;
  paymentIntentId: string;
  actorId?: string;
}) {
  // Idempotent: same PaymentIntent must not double-credit.
  const existing = await SmsCreditLedger.findOne({
    stripePaymentIntentId: input.paymentIntentId,
    kind: 'purchase_package',
  });
  if (existing) {
    return getSmsBillingStatus(input.restaurantId);
  }

  const invoice = await createPaidSmsInvoice({
    restaurantId: input.restaurantId,
    subscriptionId: input.subId,
    description: `SMS package · ${input.pkg.name} (${input.pkg.messageCount} messages)`,
    amountCents: input.pkg.priceCents,
    paymentIntentId: input.paymentIntentId,
    messageCount: input.pkg.messageCount,
  });

  await creditMessages({
    restaurantId: input.restaurantId,
    subId: input.subId,
    deltaMessages: input.pkg.messageCount,
    kind: 'purchase_package',
    amountCents: input.pkg.priceCents,
    packageId: input.pkg.id,
    packageName: input.pkg.name,
    stripePaymentIntentId: input.paymentIntentId,
    invoiceId: invoice._id,
    actorId: input.actorId,
  });

  // Clear legacy free-addon flag; credits are the source of truth.
  await Subscription.updateOne(
    { restaurantId: input.restaurantId },
    { $set: { 'features.premiumSmsAddon': true } },
  );

  return getSmsBillingStatus(input.restaurantId);
}

async function finalizeTopUp(input: {
  restaurantId: string;
  subId: unknown;
  amountCents: number;
  messages: number;
  paymentIntentId: string;
  actorId?: string;
}) {
  const existing = await SmsCreditLedger.findOne({
    stripePaymentIntentId: input.paymentIntentId,
    kind: 'top_up',
  });
  if (existing) {
    return getSmsBillingStatus(input.restaurantId);
  }

  const invoice = await createPaidSmsInvoice({
    restaurantId: input.restaurantId,
    subscriptionId: input.subId,
    description: `SMS top-up · ${input.messages} messages`,
    amountCents: input.amountCents,
    paymentIntentId: input.paymentIntentId,
    messageCount: input.messages,
  });

  await creditMessages({
    restaurantId: input.restaurantId,
    subId: input.subId,
    deltaMessages: input.messages,
    kind: 'top_up',
    amountCents: input.amountCents,
    stripePaymentIntentId: input.paymentIntentId,
    invoiceId: invoice._id,
    actorId: input.actorId,
  });

  await Subscription.updateOne(
    { restaurantId: input.restaurantId },
    { $set: { 'features.premiumSmsAddon': true } },
  );

  return getSmsBillingStatus(input.restaurantId);
}

export async function purchaseSmsPackage(input: {
  restaurantId: string;
  packageId: string;
  actorId?: string;
}): Promise<SmsPurchaseResult> {
  const { sub } = await requirePurchasableSubscription(input.restaurantId);
  const catalog = await getSmsBillingConfig();
  const pkg = catalog.packages.find((p) => p.id === input.packageId && p.active);
  if (!pkg) throw new ValidationError('SMS package not found or inactive');

  const metadata = {
    kind: 'sms_package',
    restaurantId: input.restaurantId,
    packageId: pkg.id,
    messageCount: String(pkg.messageCount),
  };

  const charge = await chargeOrCreateIntent({
    restaurantId: input.restaurantId,
    amountCents: pkg.priceCents,
    metadata,
    customerId: sub.stripeCustomerId,
    paymentMethodId: sub.preferredPaymentMethodId,
  });

  if (charge.paid) {
    const status = await finalizePackagePurchase({
      restaurantId: input.restaurantId,
      subId: sub._id,
      pkg,
      paymentIntentId: charge.paymentIntentId,
      actorId: input.actorId,
    });
    return {
      status,
      paid: true,
      clientSecret: null,
      paymentMode: null,
      paymentIntentId: charge.paymentIntentId,
      amountDueCents: 0,
      messagesGranted: pkg.messageCount,
    };
  }

  return {
    status: await getSmsBillingStatus(input.restaurantId),
    paid: false,
    clientSecret: charge.clientSecret,
    paymentMode: 'payment',
    paymentIntentId: charge.paymentIntentId,
    amountDueCents: pkg.priceCents,
    messagesGranted: 0,
  };
}

export async function confirmSmsPackagePurchase(input: {
  restaurantId: string;
  packageId: string;
  paymentIntentId: string;
  actorId?: string;
}): Promise<SmsBillingStatus> {
  const { sub } = await requirePurchasableSubscription(input.restaurantId);
  const catalog = await getSmsBillingConfig();
  const pkg = catalog.packages.find((p) => p.id === input.packageId && p.active);
  if (!pkg) throw new ValidationError('SMS package not found or inactive');
  await assertPaymentIntentSucceeded(input.paymentIntentId);
  return finalizePackagePurchase({
    restaurantId: input.restaurantId,
    subId: sub._id,
    pkg,
    paymentIntentId: input.paymentIntentId,
    actorId: input.actorId,
  });
}

export async function topUpSmsCredits(input: {
  restaurantId: string;
  amountCents: number;
  actorId?: string;
}): Promise<SmsPurchaseResult> {
  const { sub } = await requirePurchasableSubscription(input.restaurantId);
  const catalog = await getSmsBillingConfig();
  const pm = catalog.perMessage;
  if (!pm.enabled) {
    throw new ValidationError('Per-message SMS top-ups are not enabled on this platform');
  }

  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents)) {
    throw new ValidationError('Invalid top-up amount');
  }

  const isPreset = pm.topUpPresetsCents.includes(amountCents);
  if (!isPreset) {
    if (!pm.allowCustomTopUp) {
      throw new ValidationError('Custom top-up amounts are not allowed');
    }
    if (amountCents < pm.minCustomTopUpCents || amountCents > pm.maxCustomTopUpCents) {
      throw new ValidationError(
        `Top-up must be between $${(pm.minCustomTopUpCents / 100).toFixed(0)} and $${(pm.maxCustomTopUpCents / 100).toFixed(0)}`,
      );
    }
  }

  const messages = smsMessagesForTopUpAmount(amountCents, pm.priceCentsPerMessage);
  if (messages < 1) {
    throw new ValidationError('Top-up amount is too small for at least one message at the current rate');
  }

  const metadata = {
    kind: 'sms_top_up',
    restaurantId: input.restaurantId,
    amountCents: String(amountCents),
    messageCount: String(messages),
  };

  const charge = await chargeOrCreateIntent({
    restaurantId: input.restaurantId,
    amountCents,
    metadata,
    customerId: sub.stripeCustomerId,
    paymentMethodId: sub.preferredPaymentMethodId,
  });

  if (charge.paid) {
    const status = await finalizeTopUp({
      restaurantId: input.restaurantId,
      subId: sub._id,
      amountCents,
      messages,
      paymentIntentId: charge.paymentIntentId,
      actorId: input.actorId,
    });
    return {
      status,
      paid: true,
      clientSecret: null,
      paymentMode: null,
      paymentIntentId: charge.paymentIntentId,
      amountDueCents: 0,
      messagesGranted: messages,
    };
  }

  return {
    status: await getSmsBillingStatus(input.restaurantId),
    paid: false,
    clientSecret: charge.clientSecret,
    paymentMode: 'payment',
    paymentIntentId: charge.paymentIntentId,
    amountDueCents: amountCents,
    messagesGranted: 0,
  };
}

export async function confirmSmsTopUp(input: {
  restaurantId: string;
  amountCents: number;
  paymentIntentId: string;
  actorId?: string;
}): Promise<SmsBillingStatus> {
  const { sub } = await requirePurchasableSubscription(input.restaurantId);
  const catalog = await getSmsBillingConfig();
  const pm = catalog.perMessage;
  if (!pm.enabled) {
    throw new ValidationError('Per-message SMS top-ups are not enabled on this platform');
  }
  const amountCents = Math.round(Number(input.amountCents));
  const messages = smsMessagesForTopUpAmount(amountCents, pm.priceCentsPerMessage);
  if (messages < 1) throw new ValidationError('Invalid top-up amount');
  await assertPaymentIntentSucceeded(input.paymentIntentId);
  return finalizeTopUp({
    restaurantId: input.restaurantId,
    subId: sub._id,
    amountCents,
    messages,
    paymentIntentId: input.paymentIntentId,
    actorId: input.actorId,
  });
}

/**
 * Authorize one guest SMS send.
 * Plans with `premiumSms` included never consume credits.
 * Otherwise atomically decrements the prepaid balance.
 */
export async function consumeSmsCredit(restaurantId: string): Promise<boolean> {
  if (!(await isFeatureEnabled('sms'))) return false;
  const features = await getFeatures(restaurantId);
  if (features.premiumSms) return true;

  const sub = await Subscription.findOne({ restaurantId }).select(
    'status cancelAtPeriodEnd currentPeriodEnd',
  );
  if (!sub || !subscriptionGrantsEntitlements(sub)) return false;

  const updated = await Subscription.findOneAndUpdate(
    {
      restaurantId,
      'addons.smsCredits.balance': { $gte: 1 },
    },
    {
      $inc: { 'addons.smsCredits.balance': -1 },
      $set: { 'addons.smsCredits.updatedAt': new Date() },
    },
    { new: true },
  );
  if (!updated) return false;

  const balanceAfter = readBalance(updated);
  await SmsCreditLedger.create({
    restaurantId,
    kind: 'consume',
    deltaMessages: -1,
    balanceAfter,
  }).catch(() => {
    // Ledger write failure must not block delivery after the balance was taken.
  });
  return true;
}

/** Refund one credit after a failed Twilio send (best-effort). */
export async function refundSmsCredit(restaurantId: string, note?: string) {
  const features = await getFeatures(restaurantId);
  if (features.premiumSms) return;
  try {
    await creditMessages({
      restaurantId,
      subId: null,
      deltaMessages: 1,
      kind: 'refund',
      note: note ?? 'Refund after failed SMS send',
    });
  } catch {
    // ignore
  }
}

export async function listSmsCreditLedger(restaurantId: string, limit = 20) {
  const rows = await SmsCreditLedger.find({ restaurantId })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    kind: r.kind,
    deltaMessages: r.deltaMessages,
    balanceAfter: r.balanceAfter,
    amountCents: r.amountCents ?? null,
    packageId: r.packageId ?? null,
    packageName: r.packageName ?? null,
    note: r.note ?? null,
    createdAt: r.createdAt,
  }));
}
