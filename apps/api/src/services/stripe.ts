import Stripe from 'stripe';
import { addPlanDuration, isHardDeclineCode, toStripeRecurring } from '@reservations/shared';
import { env } from '../config/env.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { User } from '../models/User.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type StripeMode = 'test' | 'live';

class PaymentUnavailableError extends AppError {
  constructor(message = 'Payment processing unavailable') {
    super(message, 'PAYMENT_UNAVAILABLE', 503);
  }
}

/**
 * Maps Stripe SDK errors to AppError so GraphQL keeps a useful message in production.
 * Returns null for non-Stripe errors.
 */
export function formatStripeError(err: unknown): AppError | null {
  if (!(err instanceof Stripe.errors.StripeError)) return null;
  const details = err.code ? { stripeCode: err.code } : undefined;
  switch (err.type) {
    case 'StripeCardError':
      return new AppError(err.message || 'Your card was declined.', 'PAYMENT_DECLINED', 402, details);
    case 'StripeInvalidRequestError':
      return new AppError(
        `Payment provider rejected the request: ${err.message}`,
        'PAYMENT_PROVIDER_ERROR',
        400,
        details,
      );
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      return new PaymentUnavailableError(
        'Payment processing is misconfigured. Please contact support.',
      );
    case 'StripeRateLimitError':
    case 'StripeConnectionError':
    case 'StripeAPIError':
      return new PaymentUnavailableError(
        'Payment provider is temporarily unavailable. Please try again in a moment.',
      );
    default:
      return new AppError(
        'Payment provider error. Please try again or contact support.',
        'PAYMENT_PROVIDER_ERROR',
        502,
        details,
      );
  }
}

/** Process-local cache of PlatformConfig.stripeMode (refreshed from DB on TTL / setActiveStripeMode). */
let activeMode: StripeMode | null = null;
let modeCachedAt = 0;
const MODE_CACHE_TTL_MS = 5_000;
const clients = new Map<StripeMode, Stripe>();

export function defaultStripeMode(): StripeMode {
  return env.NODE_ENV === 'production' ? 'live' : 'test';
}

export function resolveStripeMode(stored?: string | null): StripeMode {
  if (stored === 'test' || stored === 'live') return stored;
  return defaultStripeMode();
}

export function setActiveStripeMode(mode: StripeMode) {
  activeMode = mode;
  modeCachedAt = Date.now();
}

export function getActiveStripeMode(): StripeMode {
  return activeMode ?? defaultStripeMode();
}

async function refreshActiveMode(): Promise<StripeMode> {
  if (activeMode && Date.now() - modeCachedAt < MODE_CACHE_TTL_MS) {
    return activeMode;
  }
  try {
    const doc = await PlatformConfig.findOne({ key: 'default' })
      .select('stripeMode')
      .lean<{ stripeMode?: string | null }>();
    const mode = resolveStripeMode(doc?.stripeMode);
    setActiveStripeMode(mode);
    return mode;
  } catch {
    return getActiveStripeMode();
  }
}

function secretForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_SECRET_KEY_TEST : env.STRIPE_SECRET_KEY_LIVE;
  if (specific) return specific;
  const legacy = env.STRIPE_SECRET_KEY;
  if (!legacy) return '';
  if (mode === 'test' && legacy.startsWith('sk_live_')) return '';
  if (mode === 'live' && legacy.startsWith('sk_test_')) return '';
  return legacy;
}

function webhookSecretForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_WEBHOOK_SECRET_TEST : env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (specific) return specific;
  return env.STRIPE_WEBHOOK_SECRET || '';
}

function publishableForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_PUBLISHABLE_KEY_TEST : env.STRIPE_PUBLISHABLE_KEY_LIVE;
  if (specific) return specific;
  const legacy = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!legacy) return '';
  if (mode === 'test' && legacy.startsWith('pk_live_')) return '';
  if (mode === 'live' && legacy.startsWith('pk_test_')) return '';
  return legacy;
}

export function isStripeModeConfigured(mode: StripeMode): boolean {
  return Boolean(secretForMode(mode));
}

export function getStripePublishableKey(mode?: StripeMode): string {
  return publishableForMode(mode ?? getActiveStripeMode());
}

export async function getStripeClientConfig() {
  const mode = await refreshActiveMode();
  const publishableKey = publishableForMode(mode) || null;
  return {
    mode,
    publishableKey,
    sandboxConfigured: isStripeModeConfigured('test'),
    productionConfigured: isStripeModeConfigured('live'),
  };
}

async function getStripe() {
  const mode = await refreshActiveMode();
  const secret = secretForMode(mode);
  if (!secret) return null;
  let client = clients.get(mode);
  if (!client) {
    client = new Stripe(secret, { timeout: 20_000, maxNetworkRetries: 1 });
    clients.set(mode, client);
  }
  return client;
}

export async function createDepositIntent(input: {
  amountCents: number;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `pi_dev_${Date.now()}`;
    return {
      id,
      client_secret: `${id}_secret_dev`,
      status: 'requires_payment_method',
      isStub: true as const,
    };
  }

  const intent = await client.paymentIntents.create({
    amount: input.amountCents,
    currency: env.STRIPE_CURRENCY,
    capture_method: 'manual',
    metadata: input.metadata,
    automatic_payment_methods: { enabled: true },
  });
  return { ...intent, isStub: false as const };
}

/** Stripe customer for a diner's saved booking card in the active mode (created on first use). */
export async function ensureDinerStripeCustomer(dinerId: string): Promise<string> {
  const mode = await refreshActiveMode();
  const client = await getStripe();
  if (!client) return `cus_dev_${dinerId}`;
  const user = await User.findById(dinerId).select('email firstName lastName stripeCustomerIds');
  if (!user) throw new ValidationError('Diner not found');
  const existing = user.stripeCustomerIds?.[mode];
  if (existing) return existing;
  const customer = await client.customers.create({
    email: user.email ?? undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    metadata: { dinerId },
  });
  await User.updateOne({ _id: dinerId }, { $set: { [`stripeCustomerIds.${mode}`]: customer.id } });
  return customer.id;
}

/**
 * Payment method types we save for an off-session no-show / late-cancel fee.
 * Automatic methods can save region-locked wallets (e.g. BLIK is PLN-only) that
 * Stripe later refuses to charge in our currency.
 */
const OFF_SESSION_FEE_PAYMENT_METHOD_TYPES = ['card'];

/** Saved method types an off-session fee can charge (includes Link saved before card-only collection). */
const OFF_SESSION_FEE_CHARGEABLE_TYPES = new Set(['card', 'link']);

/**
 * Charge-now booking payment (prepaid deposit / add-ons). When the booking also
 * carries a no-show fee, the same card is saved for a later off-session charge.
 */
export async function createPrepaymentIntent(input: {
  amountCents: number;
  metadata: Record<string, string>;
  customerId?: string;
  saveCardForOffSession?: boolean;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `pi_dev_${Date.now()}`;
    return { id, client_secret: `${id}_secret_dev`, isStub: true as const };
  }
  const intent = await client.paymentIntents.create({
    amount: input.amountCents,
    currency: env.STRIPE_CURRENCY,
    metadata: input.metadata,
    customer: input.customerId,
    ...(input.saveCardForOffSession
      ? {
          setup_future_usage: 'off_session' as const,
          payment_method_types: OFF_SESSION_FEE_PAYMENT_METHOD_TYPES,
        }
      : { automatic_payment_methods: { enabled: true } }),
  });
  return { ...intent, isStub: false as const };
}

/** Saves a card for a no-show fee without charging or holding anything. */
export async function createCardGuaranteeSetupIntent(input: {
  customerId: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `seti_dev_${Date.now()}`;
    return { id, client_secret: `${id}_secret_dev`, isStub: true as const };
  }
  const intent = await client.setupIntents.create({
    customer: input.customerId,
    usage: 'off_session',
    metadata: input.metadata,
    payment_method_types: OFF_SESSION_FEE_PAYMENT_METHOD_TYPES,
  });
  return { ...intent, isStub: false as const };
}

export function isSetupIntentId(intentId: string) {
  return intentId.startsWith('seti_');
}

export type BookingIntentState = {
  kind: 'payment' | 'setup';
  /** `succeeded` = paid or card saved; `requires_capture` = legacy authorization hold. */
  status: string;
  paymentMethodId: string | null;
};

/** Current Stripe state of a booking PaymentIntent or SetupIntent (stubs read as succeeded). */
export async function describeBookingIntent(intentId: string): Promise<BookingIntentState> {
  const kind = isSetupIntentId(intentId) ? 'setup' : 'payment';
  if (intentId.startsWith('pi_dev_') || intentId.startsWith('seti_dev_')) {
    if (env.NODE_ENV === 'production') throw new ValidationError('Invalid payment intent');
    return { kind, status: 'succeeded', paymentMethodId: 'pm_dev' };
  }
  const client = await getStripe();
  if (!client) throw new PaymentUnavailableError();
  const intent =
    kind === 'setup'
      ? await client.setupIntents.retrieve(intentId)
      : await client.paymentIntents.retrieve(intentId);
  const pm = intent.payment_method;
  return {
    kind,
    status: intent.status,
    paymentMethodId: typeof pm === 'string' ? pm : pm?.id ?? null,
  };
}

/** Drop an unused booking SetupIntent / PaymentIntent when the diner abandons the card form. */
export async function cancelBookingIntent(intentId: string) {
  if (intentId.startsWith('pi_dev_') || intentId.startsWith('seti_dev_')) return;
  const client = await getStripe();
  if (!client) return;
  try {
    if (isSetupIntentId(intentId)) {
      await client.setupIntents.cancel(intentId);
    } else {
      await client.paymentIntents.cancel(intentId);
    }
  } catch (err) {
    logger.warn({ err, intentId }, '[stripe] cancel booking intent failed');
  }
}

/** Statuses Stripe Elements can initialize with a PaymentIntent / SetupIntent client secret. */
const ELEMENTS_USABLE_INTENT_STATUSES = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
]);

export async function retrieveSetupIntentClientSecret(setupIntentId: string) {
  if (setupIntentId.startsWith('seti_dev_')) return `${setupIntentId}_secret_dev`;
  const client = await getStripe();
  if (!client) return null;
  const intent = await client.setupIntents.retrieve(setupIntentId);
  // Terminal SetupIntents (succeeded/canceled) cannot initialize Elements.
  if (!ELEMENTS_USABLE_INTENT_STATUSES.has(intent.status)) return null;
  return intent.client_secret ?? null;
}

export type OffSessionChargeResult =
  | { ok: true; paymentIntentId: string }
  | { ok: false; error: string; paymentIntentId?: string };

/**
 * Charge a saved card without the diner present (no-show / late-cancel fee).
 * Never throws for card problems — declines and SCA requirements come back as `ok: false`.
 */
export async function chargeOffSessionFee(input: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<OffSessionChargeResult> {
  const client = await getStripe();
  if (!client || input.customerId.startsWith('cus_dev_') || input.paymentMethodId === 'pm_dev') {
    return { ok: true, paymentIntentId: `pi_dev_fee_${Date.now()}` };
  }
  try {
    const paymentMethod = await client.paymentMethods.retrieve(input.paymentMethodId);
    if (!OFF_SESSION_FEE_CHARGEABLE_TYPES.has(paymentMethod.type)) {
      return {
        ok: false,
        error: `The guest's saved payment method (${paymentMethod.type}) can't be charged in ${env.STRIPE_CURRENCY.toUpperCase()}. Collect the fee another way.`,
      };
    }
    const intent = await client.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: env.STRIPE_CURRENCY,
        customer: input.customerId,
        payment_method: input.paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: input.metadata,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (intent.status === 'succeeded') return { ok: true, paymentIntentId: intent.id };
    return {
      ok: false,
      error: `Charge not completed (status: ${intent.status})`,
      paymentIntentId: intent.id,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      const raw = err.raw as { payment_intent?: { id?: string } } | undefined;
      return {
        ok: false,
        error: err.message || 'Card was declined',
        paymentIntentId: raw?.payment_intent?.id,
      };
    }
    throw err;
  }
}

/** One-off invoice payment (automatic capture). Saves the card when a Stripe customer is provided. */
export async function createInvoicePaymentIntent(input: {
  amountCents: number;
  currency?: string;
  metadata: Record<string, string>;
  customerId?: string | null;
  /** When set with customerId, confirms immediately for auto-charge. */
  paymentMethodId?: string | null;
  offSession?: boolean;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `pi_dev_${Date.now()}`;
    return {
      id,
      client_secret: `${id}_secret_dev`,
      status: input.offSession ? 'succeeded' : 'requires_payment_method',
      payment_method: input.paymentMethodId ?? `pm_dev_${Date.now()}`,
      isStub: true as const,
    };
  }

  const customerId =
    input.customerId && !input.customerId.startsWith('cus_dev_') ? input.customerId : undefined;
  const paymentMethodId =
    input.paymentMethodId && !input.paymentMethodId.startsWith('pm_dev_')
      ? input.paymentMethodId
      : undefined;

  const intent = await client.paymentIntents.create({
    amount: input.amountCents,
    currency: (input.currency || env.STRIPE_CURRENCY).toLowerCase(),
    metadata: input.metadata,
    ...(customerId ? { customer: customerId } : {}),
    ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
    ...(customerId && !input.offSession
      ? { setup_future_usage: 'off_session' as const }
      : {}),
    ...(input.offSession && paymentMethodId
      ? { confirm: true, off_session: true }
      : { automatic_payment_methods: { enabled: true } }),
  });
  return { ...intent, isStub: false as const };
}

/** Persist the card used on a PaymentIntent as the customer's default / preferred method. */
export async function saveInvoicePaymentMethodAsPreferred(input: {
  customerId: string;
  paymentIntentId: string;
  subscriptionId?: string | null;
}): Promise<string | null> {
  if (
    !input.customerId ||
    input.customerId.startsWith('cus_dev_') ||
    isStubPaymentIntent(input.paymentIntentId)
  ) {
    return input.paymentIntentId.startsWith('pi_dev_') ? `pm_dev_preferred` : null;
  }
  const client = await getStripe();
  if (!client) return null;

  const intent = await client.paymentIntents.retrieve(input.paymentIntentId);
  const paymentMethodId =
    typeof intent.payment_method === 'string'
      ? intent.payment_method
      : intent.payment_method?.id ?? null;
  if (!paymentMethodId) {
    await attachLatestCardAsDefault(input.customerId, input.subscriptionId ?? undefined);
    const cards = await client.paymentMethods.list({
      customer: input.customerId,
      type: 'card',
      limit: 1,
    });
    return cards.data[0]?.id ?? null;
  }

  try {
    await client.paymentMethods.attach(paymentMethodId, { customer: input.customerId });
  } catch (err) {
    // Already attached is fine.
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err;
  }
  await client.customers.update(input.customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  if (input.subscriptionId && !input.subscriptionId.startsWith('sub_dev_')) {
    await client.subscriptions.update(input.subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }
  return paymentMethodId;
}

export async function resolveCustomerDefaultPaymentMethodId(
  customerId: string,
): Promise<string | null> {
  if (!customerId || customerId.startsWith('cus_dev_')) return null;
  const client = await getStripe();
  if (!client) return null;
  const customer = await client.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === 'string') return defaultPm;
  if (defaultPm && typeof defaultPm === 'object' && 'id' in defaultPm) return defaultPm.id;
  const cards = await client.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return cards.data[0]?.id ?? null;
}

export function isStubPaymentIntent(paymentIntentId: string) {
  return paymentIntentId.startsWith('pi_dev_');
}

/**
 * Ensures a PaymentIntent was actually authorized/paid before confirming a booking.
 * Stub intents (`pi_dev_*`) are only allowed outside production.
 */
export async function assertPaymentIntentAuthorized(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    if (env.NODE_ENV === 'production') {
      throw new ValidationError('Invalid payment intent');
    }
    return;
  }

  const client = await getStripe();
  if (!client) {
    throw new PaymentUnavailableError();
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  // Manual-capture deposits land in requires_capture; auto-capture / tickets may be succeeded.
  if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
    throw new ValidationError(`Payment not completed (status: ${intent.status})`);
  }
}

/** Invoice payments use automatic capture — require succeeded. */
export async function assertPaymentIntentSucceeded(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    if (env.NODE_ENV === 'production') {
      throw new ValidationError('Invalid payment intent');
    }
    return;
  }

  const client = await getStripe();
  if (!client) {
    throw new PaymentUnavailableError();
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new ValidationError(`Payment not completed (status: ${intent.status})`);
  }
}

/**
 * Resume info for an existing PaymentIntent.
 * `clientSecret` is only set when Elements can safely mount (non-terminal).
 */
export async function retrievePaymentIntentForCheckout(paymentIntentId: string): Promise<{
  status: string;
  clientSecret: string | null;
} | null> {
  if (isStubPaymentIntent(paymentIntentId)) {
    return {
      status: 'requires_payment_method',
      clientSecret: `${paymentIntentId}_secret_dev`,
    };
  }
  const client = await getStripe();
  if (!client) return null;
  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  const usable = ELEMENTS_USABLE_INTENT_STATUSES.has(intent.status);
  return {
    status: intent.status,
    clientSecret: usable ? intent.client_secret ?? null : null,
  };
}

export async function retrievePaymentIntentClientSecret(paymentIntentId: string) {
  const info = await retrievePaymentIntentForCheckout(paymentIntentId);
  return info?.clientSecret ?? null;
}

/**
 * Release or refund a deposit PaymentIntent.
 * Manual-capture holds (`requires_capture`) are cancelled (full release only).
 * Captured charges support optional partial `amountCents`.
 */
export async function refundDeposit(
  paymentIntentId: string,
  amountCents?: number,
) {
  if (isStubPaymentIntent(paymentIntentId)) {
    return {
      id: 're_dev',
      mode: 'stub' as const,
      amountCents: amountCents ?? null,
    };
  }
  const client = await getStripe();
  if (!client) {
    return {
      id: 're_dev',
      mode: 'stub' as const,
      amountCents: amountCents ?? null,
    };
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  if (intent.status === 'canceled') {
    return { id: paymentIntentId, mode: 'already_canceled' as const, amountCents: null };
  }
  // Uncaptured authorization — cancel to release the hold (cannot partial-refund).
  if (intent.status === 'requires_capture') {
    if (amountCents != null && amountCents < intent.amount) {
      throw new ValidationError('Cannot partially release an authorization hold; release the full hold or capture first');
    }
    await client.paymentIntents.cancel(paymentIntentId);
    return { id: paymentIntentId, mode: 'released' as const, amountCents: intent.amount };
  }
  if (intent.status === 'succeeded') {
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amountCents != null) {
      if (amountCents <= 0) throw new ValidationError('Refund amount must be greater than 0');
      if (amountCents > intent.amount) {
        throw new ValidationError('Refund amount exceeds deposit');
      }
      params.amount = amountCents;
    }
    const refund = await client.refunds.create(params);
    return {
      id: refund.id,
      mode: 'refunded' as const,
      amountCents: refund.amount,
    };
  }
  throw new ValidationError(`Cannot refund payment intent in status ${intent.status}`);
}

export async function captureDeposit(paymentIntentId: string) {
  const client = await getStripe();
  if (!client || paymentIntentId.startsWith('pi_dev_')) return { id: paymentIntentId };
  return client.paymentIntents.capture(paymentIntentId);
}

export async function createStripeCustomer(input: {
  email?: string;
  name: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    return { id: `cus_dev_${Date.now()}`, isStub: true as const };
  }
  const customer = await client.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });
  return { ...customer, isStub: false as const };
}

export type StripeSubscriptionPayment = {
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
};

const SUBSCRIPTION_PAYMENT_EXPAND = [
  'latest_invoice.payment_intent',
  'latest_invoice.confirmation_secret',
  'pending_setup_intent',
];

function extractSubscriptionPayment(sub: Stripe.Subscription): StripeSubscriptionPayment {
  const setup = sub.pending_setup_intent;
  if (setup && typeof setup === 'object' && setup.client_secret) {
    return { clientSecret: setup.client_secret, paymentMode: 'setup' };
  }
  const invoice = sub.latest_invoice;
  if (invoice && typeof invoice === 'object') {
    const raw = invoice as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
      confirmation_secret?: { client_secret?: string | null } | null;
    };
    const pi = raw.payment_intent;
    if (pi && typeof pi === 'object' && pi.client_secret) {
      return { clientSecret: pi.client_secret, paymentMode: 'payment' };
    }
    const confirmationSecret = raw.confirmation_secret?.client_secret;
    if (confirmationSecret) {
      return { clientSecret: confirmationSecret, paymentMode: 'payment' };
    }
  }
  return { clientSecret: null, paymentMode: null };
}

export type ElementsPaymentSecret = StripeSubscriptionPayment & {
  /** Charge already completed — do not mount Elements or collect again. */
  paymentSettled: boolean;
  /** Stripe is finishing the charge; do not create a second PaymentIntent. */
  paymentProcessing: boolean;
};

function intentIdFromClientSecret(secret: string): string | null {
  const id = secret.split('_secret')[0] ?? '';
  if (id.startsWith('pi_') || id.startsWith('seti_')) return id;
  return null;
}

/**
 * Stripe still returns client secrets for succeeded/canceled intents.
 * Elements rejects those ("terminal state"). Drop them and say whether the charge already landed.
 */
async function elementsReadyPayment(
  client: Stripe,
  payment: StripeSubscriptionPayment,
): Promise<ElementsPaymentSecret> {
  const secret = payment.clientSecret;
  if (!secret || secret.includes('_secret_dev')) {
    return { ...payment, paymentSettled: false, paymentProcessing: false };
  }
  const id = intentIdFromClientSecret(secret);
  if (!id) return { ...payment, paymentSettled: false, paymentProcessing: false };
  try {
    if (id.startsWith('seti_')) {
      const setup = await client.setupIntents.retrieve(id);
      if (ELEMENTS_USABLE_INTENT_STATUSES.has(setup.status)) {
        return { ...payment, paymentSettled: false, paymentProcessing: false };
      }
      return {
        clientSecret: null,
        paymentMode: null,
        paymentSettled: setup.status === 'succeeded',
        paymentProcessing: false,
      };
    }
    const intent = await client.paymentIntents.retrieve(id);
    if (ELEMENTS_USABLE_INTENT_STATUSES.has(intent.status)) {
      return { ...payment, paymentSettled: false, paymentProcessing: false };
    }
    return {
      clientSecret: null,
      paymentMode: null,
      paymentSettled: intent.status === 'succeeded',
      paymentProcessing: intent.status === 'processing',
    };
  } catch (err) {
    logger.warn({ err, intentId: id }, '[stripe] could not check intent before Elements');
    return { clientSecret: null, paymentMode: null, paymentSettled: false, paymentProcessing: false };
  }
}

export async function createStripeSubscription(input: {
  customerId: string;
  priceAmountCents: number;
  trialDays?: number;
  metadata: Record<string, string>;
  /** When true, create an incomplete subscription and return a client secret for Payment Element. */
  collectPaymentMethod?: boolean;
  durationUnit?: string | null;
  durationCount?: number | null;
}) {
  const client = await getStripe();
  const recurring = toStripeRecurring(input.durationUnit, input.durationCount);
  if (!client) {
    const now = new Date();
    const periodEnd = addPlanDuration(now, input.durationUnit, input.durationCount);
    const trialEnd = input.trialDays
      ? new Date(now.getTime() + input.trialDays * 86_400_000)
      : undefined;
    return {
      id: `sub_dev_${Date.now()}`,
      status: input.trialDays ? ('trialing' as const) : ('active' as const),
      current_period_start: Math.floor(now.getTime() / 1000),
      current_period_end: Math.floor(periodEnd.getTime() / 1000),
      trial_end: trialEnd ? Math.floor(trialEnd.getTime() / 1000) : null,
      isStub: true as const,
      clientSecret: null as string | null,
      paymentMode: null as 'payment' | 'setup' | null,
    };
  }

  const collectPaymentMethod = Boolean(input.collectPaymentMethod) && input.priceAmountCents > 0;

  const price = await client.prices.create({
    currency: env.STRIPE_CURRENCY,
    unit_amount: input.priceAmountCents,
    recurring: { interval: recurring.interval, interval_count: recurring.interval_count },
    product_data: { name: 'Tablevera Plan' },
  });

  const subscription = await client.subscriptions.create({
    customer: input.customerId,
    items: [{ price: price.id }],
    trial_period_days: input.trialDays || undefined,
    payment_behavior: collectPaymentMethod ? 'default_incomplete' : undefined,
    payment_settings: collectPaymentMethod
      ? { save_default_payment_method: 'on_subscription' }
      : undefined,
    metadata: input.metadata,
    expand: collectPaymentMethod ? SUBSCRIPTION_PAYMENT_EXPAND : undefined,
  });
  const payment = collectPaymentMethod
    ? await elementsReadyPayment(client, extractSubscriptionPayment(subscription))
    : { clientSecret: null, paymentMode: null, paymentSettled: false, paymentProcessing: false };
  return { ...subscription, isStub: false as const, ...payment };
}

/** True when Stripe has no object for this id (deleted, or created under the other test/live mode). */
export function isStripeResourceMissing(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing'
  );
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, status: 'cancelled' };
  }
  try {
    return await client.subscriptions.cancel(subscriptionId);
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      logger.warn(
        { subscriptionId, stripeMode: getActiveStripeMode() },
        'Stripe subscription already missing on cancel (mode switch or deleted)',
      );
      return { id: subscriptionId, status: 'cancelled' };
    }
    throw err;
  }
}

/** Soft cancel — access continues until the current Stripe period ends. */
export async function scheduleStripeCancelAtPeriodEnd(subscriptionId: string) {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, cancel_at_period_end: true, status: 'active' };
  }
  try {
    return await client.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      logger.warn(
        { subscriptionId, stripeMode: getActiveStripeMode() },
        'Stripe subscription missing on schedule cancel (mode switch or deleted)',
      );
      return { id: subscriptionId, cancel_at_period_end: true, status: 'active' };
    }
    throw err;
  }
}

/** Undo soft cancel so the subscription renews again. */
export async function clearStripeCancelAtPeriodEnd(subscriptionId: string) {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, cancel_at_period_end: false, status: 'active' };
  }
  try {
    return await client.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      logger.warn(
        { subscriptionId, stripeMode: getActiveStripeMode() },
        'Stripe subscription missing on resume (mode switch or deleted)',
      );
      return { id: subscriptionId, cancel_at_period_end: false, status: 'active' };
    }
    throw err;
  }
}

/** False when the id is absent from the active Stripe mode (common after sandbox ↔ live switch). */
export async function stripeSubscriptionExists(subscriptionId: string): Promise<boolean> {
  if (!subscriptionId || subscriptionId.startsWith('sub_dev_')) return false;
  const client = await getStripe();
  if (!client) return false;
  try {
    await client.subscriptions.retrieve(subscriptionId);
    return true;
  } catch (err) {
    if (isStripeResourceMissing(err)) return false;
    throw err;
  }
}

export async function stripeCustomerExists(customerId: string): Promise<boolean> {
  if (!customerId || customerId.startsWith('cus_dev_')) return false;
  const client = await getStripe();
  if (!client) return false;
  try {
    const customer = await client.customers.retrieve(customerId);
    return !customer.deleted;
  } catch (err) {
    if (isStripeResourceMissing(err)) return false;
    throw err;
  }
}

function isMissingPaymentMethodError(err: unknown) {
  if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'missing') {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /no attached payment source or default payment method/i.test(msg)
    || /no `?default_payment_method`? set/i.test(msg);
}

async function customerHasPaymentMethod(client: Stripe, customerId: string) {
  if (!customerId || customerId.startsWith('cus_dev_')) return false;
  const customer = await client.customers.retrieve(customerId);
  if (customer.deleted) return false;
  if (customer.invoice_settings?.default_payment_method) return true;
  if (customer.default_source) return true;
  const cards = await client.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return cards.data.length > 0;
}

async function createCustomerSetupIntent(client: Stripe, customerId: string) {
  const setup = await client.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
  });
  return {
    clientSecret: setup.client_secret ?? null,
    paymentMode: 'setup' as const,
  };
}

/** Collect a card for an existing Stripe customer (or a stub secret when Stripe is off). */
export async function createCardCollectionSecret(
  customerId?: string | null,
): Promise<StripeSubscriptionPayment> {
  if (!customerId || customerId.startsWith('cus_dev_')) {
    return { clientSecret: `seti_dev_${Date.now()}_secret_dev`, paymentMode: 'setup' };
  }
  const client = await getStripe();
  if (!client) {
    return { clientSecret: `seti_dev_${Date.now()}_secret_dev`, paymentMode: 'setup' };
  }
  return createCustomerSetupIntent(client, customerId);
}

export async function attachLatestCardAsDefault(customerId: string, subscriptionId?: string) {
  const client = await getStripe();
  if (!client || customerId.startsWith('cus_dev_')) return;
  const cards = await client.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  const paymentMethodId = cards.data[0]?.id;
  if (!paymentMethodId) return;
  await client.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  if (subscriptionId && !subscriptionId.startsWith('sub_dev_')) {
    await client.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }
}

/** Card-only SetupIntent for the venue's default off-session card (renewals, invoices, add-ons). */
export async function createDefaultCardSetupIntent(input: {
  customerId: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client || input.customerId.startsWith('cus_dev_')) {
    if (!client && env.NODE_ENV === 'production') throw new PaymentUnavailableError();
    const id = `seti_dev_${Date.now()}`;
    return { id, client_secret: `${id}_secret_dev`, isStub: true as const };
  }
  const intent = await client.setupIntents.create({
    customer: input.customerId,
    usage: 'off_session',
    metadata: input.metadata,
    payment_method_types: OFF_SESSION_FEE_PAYMENT_METHOD_TYPES,
  });
  return { ...intent, isStub: false as const };
}

/** Saved card from a succeeded SetupIntent; rejects intents that belong to another customer. */
export async function retrieveSetupIntentPaymentMethod(input: {
  setupIntentId: string;
  customerId: string;
}): Promise<string> {
  if (input.setupIntentId.startsWith('seti_dev_')) {
    if (env.NODE_ENV === 'production') throw new ValidationError('Invalid card setup');
    return `pm_dev_${Date.now()}`;
  }
  const client = await getStripe();
  if (!client) throw new PaymentUnavailableError();
  const intent = await client.setupIntents.retrieve(input.setupIntentId);
  const intentCustomer =
    typeof intent.customer === 'string' ? intent.customer : intent.customer?.id ?? null;
  if (intentCustomer !== input.customerId) {
    throw new ValidationError('Card setup does not match this restaurant');
  }
  if (intent.status !== 'succeeded') {
    throw new ValidationError('Card was not saved. Try again.');
  }
  const pm = intent.payment_method;
  const paymentMethodId = typeof pm === 'string' ? pm : pm?.id ?? null;
  if (!paymentMethodId) throw new ValidationError('Card was not saved. Try again.');
  return paymentMethodId;
}

/** Make a card the default for the customer's invoices and the Stripe subscription renewal. */
export async function setDefaultPaymentMethod(input: {
  customerId: string;
  paymentMethodId: string;
  subscriptionId?: string | null;
}) {
  if (input.customerId.startsWith('cus_dev_') || input.paymentMethodId.startsWith('pm_dev_')) {
    return;
  }
  const client = await getStripe();
  if (!client) return;
  try {
    await client.paymentMethods.attach(input.paymentMethodId, { customer: input.customerId });
  } catch (err) {
    // Already attached is fine.
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err;
  }
  await client.customers.update(input.customerId, {
    invoice_settings: { default_payment_method: input.paymentMethodId },
  });
  if (input.subscriptionId && !input.subscriptionId.startsWith('sub_dev_')) {
    try {
      await client.subscriptions.update(input.subscriptionId, {
        default_payment_method: input.paymentMethodId,
      });
    } catch (err) {
      if (!isStripeResourceMissing(err)) throw err;
    }
  }
}

export type PaymentCardSummary = {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export async function describePaymentCard(paymentMethodId: string): Promise<PaymentCardSummary> {
  const empty = { brand: null, last4: null, expMonth: null, expYear: null };
  if (paymentMethodId.startsWith('pm_dev_')) return empty;
  const client = await getStripe();
  if (!client) return empty;
  try {
    const pm = await client.paymentMethods.retrieve(paymentMethodId);
    return {
      brand: pm.card?.brand ?? pm.type ?? null,
      last4: pm.card?.last4 ?? null,
      expMonth: pm.card?.exp_month ?? null,
      expYear: pm.card?.exp_year ?? null,
    };
  } catch (err) {
    logger.warn({ err, paymentMethodId }, '[stripe] could not describe payment method');
    return empty;
  }
}

export async function payOpenSubscriptionInvoice(subscriptionId: string) {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) return;
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });
  const invoice = sub.latest_invoice;
  if (!invoice || typeof invoice !== 'object') return;
  if (invoice.status === 'open' && (invoice.amount_due ?? 0) > 0 && invoice.id) {
    await client.invoices.pay(invoice.id);
  }
}

async function currentSubscriptionUnitAmount(client: Stripe, subscriptionId: string) {
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  const price = sub.items.data[0]?.price;
  return typeof price === 'object' ? price.unit_amount ?? null : null;
}

export async function syncPaidSubscriptionAfterCard(input: {
  customerId?: string;
  subscriptionId?: string;
  monthlyPriceCents: number;
}) {
  if (input.customerId) {
    await attachLatestCardAsDefault(input.customerId, input.subscriptionId);
  }
  if (!input.subscriptionId || input.monthlyPriceCents <= 0) return;
  const client = await getStripe();
  if (client && !input.subscriptionId.startsWith('sub_dev_')) {
    const current = await currentSubscriptionUnitAmount(client, input.subscriptionId);
    if (current !== input.monthlyPriceCents) {
      await updateStripeSubscription(input.subscriptionId, input.monthlyPriceCents, {
        prorationBehavior: 'create_prorations',
      });
    }
  }
  await payOpenSubscriptionInvoice(input.subscriptionId);
}

export function stripeSubscriptionIsTrialing(
  sub: { status?: string | null; trial_end?: number | null },
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (sub.status === 'trialing') return true;
  return typeof sub.trial_end === 'number' && sub.trial_end > nowSec;
}

/** Stripe rejects `trial_end` later than `billing_cycle_anchor`. */
export function stripeTrialEndAfterAnchor(
  trialEndUnix: number,
  billingCycleAnchor: number | null | undefined,
): boolean {
  return typeof billingCycleAnchor === 'number' && trialEndUnix > billingCycleAnchor;
}

export async function updateStripeSubscription(
  subscriptionId: string,
  priceAmountCents: number,
  options?: {
    prorationBehavior?: 'create_prorations' | 'none';
    collectPayment?: boolean;
    /** Bill a new cycle from now (full new price; unused time is not credited). */
    resetBillingCycle?: boolean;
    durationUnit?: string | null;
    durationCount?: number | null;
  },
): Promise<{
  id: string;
  status?: string;
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
  paymentSettled: boolean;
}> {
  const collectPayment = Boolean(options?.collectPayment && priceAmountCents > 0);
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return {
      id: subscriptionId,
      status: collectPayment ? 'incomplete' : 'active',
      clientSecret: collectPayment ? `pi_dev_${Date.now()}_secret_dev` : null,
      paymentMode: collectPayment ? 'setup' : null,
      paymentSettled: false,
    };
  }
  const recurring = toStripeRecurring(options?.durationUnit, options?.durationCount);
  const price = await client.prices.create({
    currency: env.STRIPE_CURRENCY,
    unit_amount: priceAmountCents,
    recurring: { interval: recurring.interval, interval_count: recurring.interval_count },
    product_data: { name: 'Tablevera Plan' },
  });

  const sub = await client.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) throw new AppError('Stripe subscription has no items', 'PAYMENT_PROVIDER_ERROR', 502);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const hasPm = Boolean(
    collectPayment &&
      (sub.default_payment_method || (customerId && (await customerHasPaymentMethod(client, customerId)))),
  );

  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [{ id: itemId, price: price.id }],
    proration_behavior: options?.prorationBehavior ?? 'create_prorations',
  };
  if (options?.resetBillingCycle) {
    updateParams.billing_cycle_anchor = 'now';
    updateParams.proration_behavior = options.prorationBehavior ?? 'none';
    // Stripe: trial_end cannot be after billing_cycle_anchor. Ending the trial
    // is required to start a paid cycle now (immediate plan switch).
    if (stripeSubscriptionIsTrialing(sub)) {
      updateParams.trial_end = 'now';
    }
  }
  if (collectPayment) {
    // pending_if_incomplete cannot include payment_settings, and it requires a card on file.
    updateParams.payment_behavior = hasPm ? 'pending_if_incomplete' : 'allow_incomplete';
    updateParams.expand = SUBSCRIPTION_PAYMENT_EXPAND;
  }

  let updated: Stripe.Subscription;
  try {
    updated = await client.subscriptions.update(subscriptionId, updateParams);
  } catch (err) {
    if (collectPayment && customerId && isMissingPaymentMethodError(err)) {
      const setup = await createCustomerSetupIntent(client, customerId);
      return {
        id: subscriptionId,
        status: 'incomplete',
        clientSecret: setup.clientSecret,
        paymentMode: setup.paymentMode,
        paymentSettled: false,
      };
    }
    throw err;
  }

  if (!collectPayment) {
    return {
      id: updated.id,
      status: updated.status,
      clientSecret: null,
      paymentMode: null,
      paymentSettled: false,
    };
  }

  let payment = await elementsReadyPayment(client, extractSubscriptionPayment(updated));
  // Card on file already paid this invoice — do not hand the succeeded PaymentIntent to Elements.
  if (payment.paymentSettled) {
    return {
      id: updated.id,
      status: updated.status,
      clientSecret: null,
      paymentMode: null,
      paymentSettled: true,
    };
  }
  if (!payment.clientSecret && customerId && !payment.paymentProcessing) {
    const setup = await createCustomerSetupIntent(client, customerId);
    payment = { ...setup, paymentSettled: false, paymentProcessing: false };
  }
  return {
    id: updated.id,
    status: updated.status,
    clientSecret: payment.clientSecret,
    paymentMode: payment.paymentMode,
    paymentSettled: false,
  };
}

export type StripePaidPeriodResult = {
  id: string;
  status?: string;
  /** Set when the Stripe sub was replaced; persist the new id, then cancel this one. */
  previousSubscriptionId?: string;
  /** Stripe has no subscription for this id under the active mode. */
  missing?: boolean;
};

async function createStripeSubscriptionForTrial(
  client: Stripe,
  existing: Stripe.Subscription,
  trialEndUnix: number,
): Promise<Stripe.Subscription> {
  const item = existing.items.data[0];
  const priceId = typeof item?.price === 'string' ? item.price : item?.price?.id;
  if (!priceId) {
    throw new AppError('Stripe subscription has no items', 'PAYMENT_PROVIDER_ERROR', 502);
  }
  const customerId = typeof existing.customer === 'string' ? existing.customer : existing.customer?.id;
  if (!customerId) {
    throw new AppError('Stripe subscription has no customer', 'PAYMENT_PROVIDER_ERROR', 502);
  }
  const defaultPm = existing.default_payment_method;
  return client.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_end: trialEndUnix,
    metadata: existing.metadata ?? undefined,
    default_payment_method:
      typeof defaultPm === 'string' ? defaultPm : defaultPm?.id ?? undefined,
    proration_behavior: 'none',
  });
}

/**
 * Align Stripe trial / first charge with a superadmin-set paid-period start.
 * Future dates set `trial_end`. Ending a trial uses `trial_end: now` (may invoice).
 * Already-paid subs are left alone so resetting the cycle does not bill again.
 * When `trial_end` would be after `billing_cycle_anchor`, Stripe cannot update in
 * place — we create a replacement subscription (caller must cancel the previous id).
 */
export async function updateStripePaidPeriodStart(
  subscriptionId: string,
  paidPeriodStart: Date,
  options: { now?: Date; currentlyTrialing: boolean },
): Promise<StripePaidPeriodResult | null> {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) return null;

  const now = options.now ?? new Date();
  const future = paidPeriodStart.getTime() > now.getTime();
  const params: Stripe.SubscriptionUpdateParams = {
    proration_behavior: 'none',
  };
  if (future) {
    const trialEndUnix = Math.floor(paidPeriodStart.getTime() / 1000);
    params.trial_end = trialEndUnix;
    let existing: Stripe.Subscription;
    try {
      existing = await client.subscriptions.retrieve(subscriptionId);
    } catch (err) {
      if (isStripeResourceMissing(err)) return { id: subscriptionId, missing: true };
      throw err;
    }
    if (stripeTrialEndAfterAnchor(trialEndUnix, existing.billing_cycle_anchor)) {
      try {
        const created = await createStripeSubscriptionForTrial(client, existing, trialEndUnix);
        return { id: created.id, status: created.status, previousSubscriptionId: existing.id };
      } catch (err) {
        const mapped = formatStripeError(err);
        throw mapped ?? err;
      }
    }
  } else if (options.currentlyTrialing) {
    params.trial_end = 'now';
    params.billing_cycle_anchor = 'now';
  } else {
    return null;
  }

  try {
    const updated = await client.subscriptions.update(subscriptionId, params);
    return { id: updated.id, status: updated.status };
  } catch (err) {
    if (isStripeResourceMissing(err)) return { id: subscriptionId, missing: true };
    const mapped = formatStripeError(err);
    throw mapped ?? err;
  }
}

export async function getOpenSubscriptionPayment(subscriptionId: string): Promise<{
  amountDueCents: number;
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
  paymentSettled: boolean;
  paymentProcessing: boolean;
  /** Stripe has no subscription for this id under the active mode. */
  missing?: boolean;
}> {
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return {
      amountDueCents: 0,
      clientSecret: null,
      paymentMode: null,
      paymentSettled: false,
      paymentProcessing: false,
    };
  }
  try {
    const sub = await client.subscriptions.retrieve(subscriptionId, {
      expand: SUBSCRIPTION_PAYMENT_EXPAND,
    });
    const invoice = sub.latest_invoice;
    const invoicePaid = Boolean(invoice && typeof invoice === 'object' && invoice.status === 'paid');
    const amountDueCents =
      invoice && typeof invoice === 'object' && invoice.status === 'open'
        ? invoice.amount_due ?? 0
        : 0;
    const payment = await elementsReadyPayment(client, extractSubscriptionPayment(sub));
    // A paid invoice's PaymentIntent is terminal. Never reuse it for Elements.
    if (amountDueCents <= 0) {
      return {
        amountDueCents: 0,
        clientSecret: null,
        paymentMode: null,
        paymentSettled: payment.paymentSettled || invoicePaid,
        paymentProcessing: payment.paymentProcessing,
      };
    }
    return { amountDueCents, ...payment };
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      logger.warn(
        { subscriptionId, stripeMode: getActiveStripeMode() },
        'Stripe subscription missing when loading open payment (mode switch or deleted)',
      );
      return {
        amountDueCents: 0,
        clientSecret: null,
        paymentMode: null,
        paymentSettled: false,
        paymentProcessing: false,
        missing: true,
      };
    }
    throw err;
  }
}

export async function constructStripeEvent(rawBody: Buffer, signature: string) {
  const mode = await refreshActiveMode();
  const orderedModes: StripeMode[] = mode === 'live' ? ['live', 'test'] : ['test', 'live'];
  const secrets = orderedModes
    .map((m) => webhookSecretForMode(m))
    .filter((s, i, arr) => Boolean(s) && arr.indexOf(s) === i);

  if (secrets.length === 0) {
    throw new Error('Stripe webhook not configured');
  }

  // Any Stripe instance can verify signatures; prefer the active-mode client.
  const client =
    (await getStripe()) ??
    (secretForMode('test')
      ? new Stripe(secretForMode('test'), { timeout: 20_000, maxNetworkRetries: 1 })
      : secretForMode('live')
        ? new Stripe(secretForMode('live'), { timeout: 20_000, maxNetworkRetries: 1 })
        : null);
  if (!client) {
    throw new Error('Stripe webhook not configured');
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid Stripe webhook signature');
}

export async function listRecentStripeInvoices(limit = 50) {
  const client = await getStripe();
  if (!client) {
    return { invoices: [] as any[], stub: true as const };
  }
  const result = await client.invoices.list({ limit: Math.min(limit, 100) });
  return { invoices: result.data, stub: false as const };
}

/** Metadata.source on Stripe invoices created from Tablevera Invoice docs. */
export const STRIPE_LOCAL_INVOICE_SOURCE = 'tablevera_local';

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function formatUtcDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type HostedStripeInvoiceLine = {
  description: string;
  amountCents: number;
};

export type HostedStripeInvoiceInput = {
  localInvoiceId: string;
  number: string;
  restaurantId: string;
  restaurantName?: string | null;
  billingPeriod: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  currency: string;
  customerId: string;
  lines: HostedStripeInvoiceLine[];
  existingStripeInvoiceId?: string | null;
  alreadyPaid?: boolean;
};

export function buildHostedStripeInvoiceContent(input: HostedStripeInvoiceInput) {
  const periodLabel = `${formatUtcDate(input.periodStart)} – ${formatUtcDate(input.periodEnd)}`;
  const dueLabel = formatUtcDate(input.dueDate);
  const venue = (input.restaurantName || 'Restaurant').slice(0, 140);
  const periodStartUnix = toUnixSeconds(input.periodStart);
  const periodEndUnix = Math.max(toUnixSeconds(input.periodEnd), periodStartUnix);
  const nowUnix = Math.floor(Date.now() / 1000);
  return {
    number: input.number,
    description: [`${input.number} · ${venue}`, `Period: ${periodLabel}`, `Due: ${dueLabel}`].join(
      '\n',
    ),
    customFields: [
      { name: 'Invoice number', value: input.number.slice(0, 140) },
      { name: 'Billing period', value: periodLabel.slice(0, 140) },
      { name: 'Due date', value: dueLabel.slice(0, 140) },
      { name: 'Restaurant', value: venue },
    ],
    metadata: {
      source: STRIPE_LOCAL_INVOICE_SOURCE,
      invoiceId: input.localInvoiceId,
      invoiceNumber: input.number,
      restaurantId: input.restaurantId,
      billingPeriod: input.billingPeriod,
    },
    dueDateUnix: Math.max(toUnixSeconds(input.dueDate), nowUnix + 60),
    period: { start: periodStartUnix, end: periodEndUnix },
    lines: input.lines
      .filter((line) => line.amountCents !== 0)
      .map((line) => ({
        description: line.description,
        amount: line.amountCents,
        period: { start: periodStartUnix, end: periodEndUnix },
      })),
  };
}

function isStubStripeInvoiceId(id?: string | null) {
  return Boolean(id && id.startsWith('in_dev_'));
}

async function replaceDraftInvoiceLines(
  client: Stripe,
  invoiceId: string,
  customerId: string,
  currency: string,
  lines: ReturnType<typeof buildHostedStripeInvoiceContent>['lines'],
) {
  const existing = await client.invoiceItems.list({ invoice: invoiceId, limit: 100 });
  for (const item of existing.data) {
    await client.invoiceItems.del(item.id);
  }
  for (const line of lines) {
    await client.invoiceItems.create({
      customer: customerId,
      invoice: invoiceId,
      currency,
      amount: line.amount,
      description: line.description,
      period: line.period,
    });
  }
}

async function createFinalizedStripeInvoice(
  client: Stripe,
  input: HostedStripeInvoiceInput,
  content: ReturnType<typeof buildHostedStripeInvoiceContent>,
) {
  const currency = (input.currency || env.STRIPE_CURRENCY).toLowerCase();
  const createParams: Stripe.InvoiceCreateParams = {
    customer: input.customerId,
    currency,
    collection_method: 'send_invoice',
    auto_advance: false,
    pending_invoice_items_behavior: 'exclude',
    description: content.description,
    footer: `Due ${formatUtcDate(input.dueDate)} · ${input.number}`,
    custom_fields: content.customFields,
    metadata: content.metadata,
    due_date: content.dueDateUnix,
  };
  let invoice: Stripe.Invoice;
  try {
    invoice = await client.invoices.create({ ...createParams, number: content.number });
  } catch (err) {
    logger.warn(
      { err, invoiceNumber: content.number },
      '[stripe] custom invoice number rejected; creating without number',
    );
    invoice = await client.invoices.create(createParams);
  }

  const createdId = requireInvoiceId(invoice);
  await replaceDraftInvoiceLines(client, createdId, input.customerId, currency, content.lines);

  invoice = await client.invoices.finalizeInvoice(createdId, { auto_advance: false });
  if (input.alreadyPaid && invoice.status !== 'paid') {
    invoice = await client.invoices.pay(requireInvoiceId(invoice), { paid_out_of_band: true });
  }
  return invoice;
}

function stripeInvoiceNeedsRebuild(
  invoice: Stripe.Invoice,
  content: ReturnType<typeof buildHostedStripeInvoiceContent>,
) {
  const total = content.lines.reduce((sum, line) => sum + line.amount, 0);
  if ((invoice.total ?? 0) !== total) return true;
  const lineCount = invoice.lines?.data?.length ?? 0;
  if (lineCount !== content.lines.length) return true;
  return false;
}

function requireInvoiceId(invoice: { id?: string | null }): string {
  if (!invoice.id) throw new Error('Stripe invoice is missing an id');
  return invoice.id;
}

/**
 * Mirror a Tablevera invoice onto Stripe so Dashboard / hosted invoice pages
 * show number, description, amount, billing period, and due date.
 * Collection stays on Tablevera (send_invoice, not auto-charged).
 */
export async function upsertHostedStripeInvoice(
  input: HostedStripeInvoiceInput,
): Promise<{ id: string; hostedInvoiceUrl: string | null; isStub: boolean } | null> {
  const content = buildHostedStripeInvoiceContent(input);
  if (content.lines.length === 0) return null;
  if (input.customerId.startsWith('cus_dev_')) {
    return { id: `in_dev_${input.localInvoiceId}`, hostedInvoiceUrl: null, isStub: true };
  }

  const client = await getStripe();
  if (!client) {
    return { id: `in_dev_${input.localInvoiceId}`, hostedInvoiceUrl: null, isStub: true };
  }

  const existingId =
    input.existingStripeInvoiceId && !isStubStripeInvoiceId(input.existingStripeInvoiceId)
      ? input.existingStripeInvoiceId
      : null;

  try {
    if (existingId) {
      try {
        const existing = await client.invoices.retrieve(existingId, { expand: ['lines'] });
        const existingInvoiceId = requireInvoiceId(existing);
        if (existing.status === 'draft') {
          await client.invoices.update(existingInvoiceId, {
            description: content.description,
            footer: `Due ${formatUtcDate(input.dueDate)} · ${input.number}`,
            custom_fields: content.customFields,
            metadata: content.metadata,
            due_date: content.dueDateUnix,
          });
          await replaceDraftInvoiceLines(
            client,
            existingInvoiceId,
            input.customerId,
            (input.currency || env.STRIPE_CURRENCY).toLowerCase(),
            content.lines,
          );
          let invoice = await client.invoices.finalizeInvoice(existingInvoiceId, {
            auto_advance: false,
          });
          if (input.alreadyPaid && invoice.status !== 'paid') {
            invoice = await client.invoices.pay(requireInvoiceId(invoice), {
              paid_out_of_band: true,
            });
          }
          return {
            id: requireInvoiceId(invoice),
            hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
            isStub: false,
          };
        }
        if (existing.status === 'open' && !input.alreadyPaid && !stripeInvoiceNeedsRebuild(existing, content)) {
          return {
            id: existingInvoiceId,
            hostedInvoiceUrl: existing.hosted_invoice_url ?? null,
            isStub: false,
          };
        }
        if (existing.status === 'paid' && input.alreadyPaid) {
          return {
            id: existingInvoiceId,
            hostedInvoiceUrl: existing.hosted_invoice_url ?? null,
            isStub: false,
          };
        }
        if (existing.status === 'open') {
          await voidOrDeleteStripeInvoice(client, existing);
        }
      } catch (err) {
        if (!(err instanceof Stripe.errors.StripeError && err.code === 'resource_missing')) {
          throw err;
        }
      }
    }

    const invoice = await createFinalizedStripeInvoice(client, input, content);
    return {
      id: requireInvoiceId(invoice),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      isStub: false,
    };
  } catch (err) {
    logger.warn(
      { err, invoiceId: input.localInvoiceId, invoiceNumber: input.number },
      '[stripe] failed to mirror local invoice',
    );
    return null;
  }
}

async function voidOrDeleteStripeInvoice(client: Stripe, invoice: Stripe.Invoice) {
  const id = requireInvoiceId(invoice);
  if (invoice.status === 'draft') {
    await client.invoices.del(id);
    return;
  }
  if (invoice.status === 'open') {
    await client.invoices.voidInvoice(id);
  }
}

export async function voidStripeInvoiceIfOpen(stripeInvoiceId: string) {
  if (!stripeInvoiceId || isStubStripeInvoiceId(stripeInvoiceId)) return;
  const client = await getStripe();
  if (!client) return;
  try {
    const invoice = await client.invoices.retrieve(stripeInvoiceId);
    await voidOrDeleteStripeInvoice(client, invoice);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === 'resource_missing') return;
    logger.warn({ err, stripeInvoiceId }, '[stripe] void mirrored invoice failed');
  }
}

/** Returns false when Stripe could not be updated (caller should retry so Stripe stops charging). */
export async function markStripeInvoicePaidOutOfBand(stripeInvoiceId: string): Promise<boolean> {
  if (!stripeInvoiceId || isStubStripeInvoiceId(stripeInvoiceId)) return true;
  const client = await getStripe();
  if (!client) return true;
  try {
    const invoice = await client.invoices.retrieve(stripeInvoiceId);
    if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'uncollectible') {
      return true;
    }
    const id = requireInvoiceId(invoice);
    if (invoice.status !== 'open') {
      await client.invoices.finalizeInvoice(id, { auto_advance: false });
    }
    await client.invoices.pay(id, { paid_out_of_band: true });
    return true;
  } catch (err) {
    logger.warn({ err, stripeInvoiceId }, '[stripe] mark mirrored invoice paid failed');
    return false;
  }
}

export type ChargeFailure = {
  /** Owner-facing reason, e.g. "Insufficient funds". */
  reason: string;
  declineCode: string | null;
  /** Same card will not succeed on retry. */
  hardDecline: boolean;
  /** Bank wants the cardholder to authenticate (3D Secure). */
  actionRequired: boolean;
};

const DECLINE_REASONS: Record<string, string> = {
  insufficient_funds: 'Insufficient funds',
  lost_card: 'The card was reported lost',
  stolen_card: 'The card was reported stolen',
  expired_card: 'The card has expired',
  incorrect_number: 'The card number is incorrect',
  invalid_number: 'The card number is invalid',
  incorrect_cvc: 'The security code is incorrect',
  processing_error: 'The bank had a processing error',
  do_not_honor: 'The bank declined the charge',
  generic_decline: 'The bank declined the charge',
  card_velocity_exceeded: 'The card hit its spending limit',
  withdrawal_count_limit_exceeded: 'The card hit its spending limit',
  authentication_required: 'The bank needs you to confirm this payment',
};

/** Map a Stripe charge error (or non-succeeded PaymentIntent status) to an owner-facing failure. */
export function describeChargeFailure(err: unknown): ChargeFailure {
  const anyErr = err as {
    code?: string;
    decline_code?: string;
    message?: string;
    payment_intent?: { status?: string } | null;
  };
  const code = String(anyErr?.code ?? '').toLowerCase();
  const declineCode = String(anyErr?.decline_code ?? '').toLowerCase() || null;
  const message = String(anyErr?.message ?? '');
  const actionRequired =
    code === 'authentication_required' ||
    declineCode === 'authentication_required' ||
    anyErr?.payment_intent?.status === 'requires_action' ||
    /requires_action/.test(message);
  const key = declineCode ?? (code && code !== 'card_declined' ? code : '');
  const reason = actionRequired
    ? DECLINE_REASONS.authentication_required!
    : (key && DECLINE_REASONS[key]) ||
      (code === 'card_declined' ? 'The bank declined the charge' : message || 'The charge failed');
  return {
    reason,
    declineCode: declineCode ?? (code || null),
    hardDecline: !actionRequired && (isHardDeclineCode(declineCode) || isHardDeclineCode(code)),
    actionRequired,
  };
}

/** Stripe card decline / authentication error (safe to fall back to an on-session card form). */
export function isStripeCardError(err: unknown): boolean {
  if (err instanceof Stripe.errors.StripeCardError) return true;
  const code = String((err as { code?: string })?.code ?? '');
  return code === 'card_declined' || code === 'authentication_required' || code === 'expired_card';
}

export { getStripe };
