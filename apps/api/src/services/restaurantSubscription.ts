import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { getEffectivePlan } from './platformConfig.js';
import {
  createStripeCustomer,
  createStripeSubscription,
  type StripeSubscriptionPayment,
} from './stripe.js';
import { logAudit } from './audit.js';

export type CreatedRestaurantSubscription = SubscriptionDocument & StripeSubscriptionPayment;

export async function createRestaurantSubscription(input: {
  restaurantId: string;
  plan: string;
  customerEmail?: string;
  customerName: string;
  actorId?: string;
  collectPaymentMethod?: boolean;
}): Promise<CreatedRestaurantSubscription> {
  const planDef = await getEffectivePlan(input.plan);
  if (!planDef) throw new Error(`Invalid plan: ${input.plan}`);
  const planKey = planDef.key;

  const existing = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (existing) throw new Error('Subscription already exists for this restaurant');

  const customer = await createStripeCustomer({
    email: input.customerEmail,
    name: input.customerName,
    metadata: { restaurantId: input.restaurantId },
  });

  const collectPaymentMethod =
    Boolean(input.collectPaymentMethod) && planDef.monthlyPriceCents > 0;

  const stripeSub = await createStripeSubscription({
    customerId: customer.id,
    priceAmountCents: planDef.monthlyPriceCents,
    trialDays: planDef.trialDays || undefined,
    metadata: { restaurantId: input.restaurantId, plan: planKey },
    collectPaymentMethod,
  });

  const sub = await Subscription.create({
    restaurantId: input.restaurantId,
    plan: planKey,
    status: planDef.trialDays ? 'trialing' : 'active',
    stripeCustomerId: customer.id,
    stripeSubscriptionId: stripeSub.id,
    currentPeriodStart: stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : new Date(Date.now() + 30 * 86_400_000),
    trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : undefined,
    monthlyPriceCents: planDef.monthlyPriceCents,
    networkCoverFeeCents: planDef.networkCoverFeeCents,
    websiteCoverFeeCents: planDef.websiteCoverFeeCents,
    features: { ...planDef.features },
  });

  if (input.actorId) {
    await logAudit({
      actorId: input.actorId,
      action: 'createSubscription',
      resource: 'Subscription',
      resourceId: sub._id.toString(),
      details: { plan: planKey, restaurantId: input.restaurantId },
    });
  }

  return Object.assign(sub, {
    clientSecret: stripeSub.clientSecret ?? null,
    paymentMode: stripeSub.paymentMode ?? null,
  }) as CreatedRestaurantSubscription;
}
