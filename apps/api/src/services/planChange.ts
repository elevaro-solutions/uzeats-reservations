import { Subscription } from '../models/Subscription.js';
import { getEffectivePlan } from './platformConfig.js';
import {
  getOpenSubscriptionPayment,
  syncPaidSubscriptionAfterCard,
  updateStripeSubscription,
} from './stripe.js';
import { logAudit } from './audit.js';
import { evaluatePlanChange, type PlanChangeDecision, type PlanSnapshot } from './planChangePolicy.js';

async function toSnapshot(planKey: string): Promise<PlanSnapshot> {
  const plan = await getEffectivePlan(planKey);
  if (!plan) throw new Error(`Invalid plan: ${planKey}`);
  return {
    key: plan.key,
    name: plan.name,
    monthlyPriceCents: plan.monthlyPriceCents,
    networkCoverFeeCents: plan.networkCoverFeeCents,
    websiteCoverFeeCents: plan.websiteCoverFeeCents,
    features: plan.features,
  };
}

function clearPending(sub: { pendingPlan?: string | null; pendingPlanEffectiveAt?: Date | null }) {
  sub.pendingPlan = null;
  sub.pendingPlanEffectiveAt = null;
}

function applyPlanFields(
  sub: {
    plan: string;
    monthlyPriceCents: number;
    networkCoverFeeCents: number;
    websiteCoverFeeCents?: number;
    features?: unknown;
  },
  snapshot: PlanSnapshot,
) {
  sub.plan = snapshot.key;
  sub.monthlyPriceCents = snapshot.monthlyPriceCents;
  sub.networkCoverFeeCents = snapshot.networkCoverFeeCents;
  sub.websiteCoverFeeCents = snapshot.websiteCoverFeeCents;
  const premiumSmsAddon = Boolean(
    (sub.features as { premiumSmsAddon?: boolean } | undefined)?.premiumSmsAddon,
  );
  sub.features = { ...snapshot.features, premiumSmsAddon };
}

export async function applyPendingPlanChangeIfDue(sub: any, now = new Date()) {
  if (!sub?.pendingPlan || !sub.pendingPlanEffectiveAt) return sub;
  if (sub.pendingPlanEffectiveAt.getTime() > now.getTime()) return sub;
  if (sub.pendingPlan === sub.plan) {
    clearPending(sub);
    await sub.save();
    return sub;
  }

  const snapshot = await toSnapshot(sub.pendingPlan);
  if (sub.stripeSubscriptionId) {
    await updateStripeSubscription(sub.stripeSubscriptionId, snapshot.monthlyPriceCents, {
      prorationBehavior: 'none',
    });
  }
  applyPlanFields(sub, snapshot);
  clearPending(sub);
  await sub.save();
  return sub;
}

export async function previewPlanChange(
  restaurantId: string,
  toPlanKey: string,
): Promise<PlanChangeDecision> {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new Error('No subscription found');
  await applyPendingPlanChangeIfDue(sub);
  const fromPlan = await toSnapshot(sub.plan);
  const toPlan = await toSnapshot(toPlanKey);
  return evaluatePlanChange({ subscription: sub, fromPlan, toPlan });
}

export type PlanChangeResult = {
  subscription: InstanceType<typeof Subscription>;
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
  amountDueCents: number;
};

export async function changeRestaurantPlan(input: {
  restaurantId: string;
  plan: string;
  actorId: string;
}): Promise<PlanChangeResult> {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new Error('No subscription found');
  await applyPendingPlanChangeIfDue(sub);

  const fromPlan = await toSnapshot(sub.plan);
  const toPlan = await toSnapshot(input.plan);
  const decision = evaluatePlanChange({ subscription: sub, fromPlan, toPlan });

  if (decision.direction === 'same') {
    if (sub.pendingPlan) {
      clearPending(sub);
      await sub.save();
      await logAudit({
        actorId: input.actorId,
        action: 'cancelPendingPlanChange',
        resource: 'Subscription',
        resourceId: sub._id.toString(),
        details: { restaurantId: input.restaurantId, plan: sub.plan },
      });
      return { subscription: sub, clientSecret: null, paymentMode: null, amountDueCents: 0 };
    }
    throw new Error(decision.blockedReason ?? 'You are already on this plan.');
  }

  if (!decision.allowed) {
    throw new Error(decision.blockedReason ?? 'This plan change is not allowed.');
  }

  let clientSecret: string | null = null;
  let paymentMode: 'payment' | 'setup' | null = null;
  let amountDueCents = 0;

  if (decision.immediate) {
    const collectPayment = toPlan.monthlyPriceCents > fromPlan.monthlyPriceCents;
    if (sub.stripeSubscriptionId) {
      const updated = await updateStripeSubscription(sub.stripeSubscriptionId, toPlan.monthlyPriceCents, {
        prorationBehavior: 'create_prorations',
        collectPayment,
      });
      clientSecret = updated.clientSecret;
      paymentMode = updated.paymentMode;
    } else if (collectPayment && decision.proratedChargeCents > 0) {
      clientSecret = `pi_dev_${Date.now()}_secret_dev`;
      paymentMode = 'payment';
    }
    applyPlanFields(sub, toPlan);
    clearPending(sub);
    sub.lastPaidPlanChangeAt = new Date();
    amountDueCents = clientSecret
      ? decision.proratedChargeCents || toPlan.monthlyPriceCents
      : 0;
    sub.amountDueCents = amountDueCents;
    if (clientSecret && amountDueCents > 0) {
      sub.status = 'past_due';
    }
    await sub.save();
  } else {
    sub.pendingPlan = toPlan.key;
    sub.pendingPlanEffectiveAt = decision.effectiveAt ?? sub.currentPeriodEnd ?? undefined;
    await sub.save();
  }

  await logAudit({
    actorId: input.actorId,
    action: 'changePlan',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: {
      plan: toPlan.key,
      restaurantId: input.restaurantId,
      immediate: decision.immediate,
      pendingPlan: sub.pendingPlan ?? null,
      amountDueCents,
    },
  });

  return { subscription: sub, clientSecret, paymentMode, amountDueCents };
}

export async function getPlanChangePayment(restaurantId: string): Promise<PlanChangeResult> {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new Error('No subscription found');
  let amountDueCents = sub.amountDueCents ?? 0;
  let clientSecret: string | null = null;
  let paymentMode: 'payment' | 'setup' | null = null;
  if (sub.stripeSubscriptionId) {
    const open = await getOpenSubscriptionPayment(sub.stripeSubscriptionId);
    if (open.amountDueCents > 0) amountDueCents = open.amountDueCents;
    clientSecret = open.clientSecret;
    paymentMode = open.paymentMode;
  }
  if (amountDueCents > 0 && !clientSecret) {
    clientSecret = `pi_dev_${Date.now()}_secret_dev`;
    paymentMode = 'payment';
  }
  return { subscription: sub, clientSecret, paymentMode, amountDueCents };
}

export async function markPlanChangePaid(restaurantId: string) {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new Error('No subscription found');
  await syncPaidSubscriptionAfterCard({
    customerId: sub.stripeCustomerId,
    subscriptionId: sub.stripeSubscriptionId,
    monthlyPriceCents: sub.monthlyPriceCents,
  });
  sub.amountDueCents = 0;
  if (sub.status === 'past_due') sub.status = 'active';
  await sub.save();
  return sub;
}

export async function cancelPendingPlanChange(input: { restaurantId: string; actorId: string }) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new Error('No subscription found');
  if (!sub.pendingPlan) throw new Error('No scheduled plan change to cancel.');
  clearPending(sub);
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'cancelPendingPlanChange',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId },
  });
  return sub;
}
