import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logAudit } from './audit.js';
import {
  cancelStripeSubscription,
  clearStripeCancelAtPeriodEnd,
  scheduleStripeCancelAtPeriodEnd,
} from './stripe.js';

/** True while soft-cancelled and still inside the paid period. */
export function isPaidThrough(sub: {
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: Date | null;
  status?: string | null;
}, now = new Date()) {
  if (!sub.cancelAtPeriodEnd) return false;
  if (sub.status === 'cancelled' || sub.status === 'paused') return false;
  const end = sub.currentPeriodEnd;
  if (!end) return false;
  return end.getTime() > now.getTime();
}

/** Features / add-ons remain available when active, or soft-cancel until period end. */
export function subscriptionGrantsEntitlements(sub: {
  status?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: Date | null;
}, now = new Date()) {
  if (!sub) return false;
  if (sub.status === 'paused') return false;
  if (sub.status === 'cancelled') return false;
  if (['trialing', 'active', 'past_due'].includes(String(sub.status))) {
    return true;
  }
  return isPaidThrough(sub, now);
}

/**
 * If soft-cancel period has ended, flip to cancelled (covers stubs / missed webhooks).
 * Returns the (possibly updated) subscription.
 */
export async function finalizeCancelAtPeriodEndIfDue(
  sub: SubscriptionDocument,
  now = new Date(),
): Promise<SubscriptionDocument> {
  if (!sub.cancelAtPeriodEnd) return sub;
  if (sub.status === 'cancelled') {
    if (sub.cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = false;
      await sub.save();
    }
    return sub;
  }
  const end = sub.currentPeriodEnd;
  if (!end || end.getTime() > now.getTime()) return sub;

  if (sub.stripeSubscriptionId && !String(sub.stripeSubscriptionId).startsWith('sub_dev_')) {
    // Stripe should already have canceled; ensure local matches.
  }
  sub.status = 'cancelled';
  sub.cancelAtPeriodEnd = false;
  if (!sub.cancelledAt) sub.cancelledAt = end;
  await sub.save();
  return sub;
}

export async function scheduleSubscriptionCancel(input: {
  restaurantId: string;
  actorId: string;
  /** Hard cancel — lose access immediately (admin / rare). Default soft. */
  immediate?: boolean;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new NotFoundError('Subscription');
  await finalizeCancelAtPeriodEndIfDue(sub);

  if (sub.status === 'cancelled') {
    throw new ConflictError('Subscription is already cancelled');
  }
  if (!input.immediate && sub.cancelAtPeriodEnd) {
    throw new ConflictError('Cancellation is already scheduled for the end of the billing period');
  }

  if (input.immediate) {
    if (sub.stripeSubscriptionId) {
      await cancelStripeSubscription(sub.stripeSubscriptionId);
    }
    sub.status = 'cancelled';
    sub.cancelAtPeriodEnd = false;
    sub.cancelledAt = new Date();
    sub.pendingPlan = undefined;
    sub.pendingPlanEffectiveAt = undefined;
    await sub.save();
    await logAudit({
      actorId: input.actorId,
      action: 'cancelSubscription',
      resource: 'Subscription',
      resourceId: sub._id.toString(),
      details: { restaurantId: input.restaurantId, immediate: true },
    });
    return sub;
  }

  if (sub.stripeSubscriptionId) {
    await scheduleStripeCancelAtPeriodEnd(sub.stripeSubscriptionId);
  }
  sub.cancelAtPeriodEnd = true;
  // Keep status active/trialing so entitlements continue until currentPeriodEnd.
  sub.pendingPlan = undefined;
  sub.pendingPlanEffectiveAt = undefined;
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'cancelSubscription',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: {
      restaurantId: input.restaurantId,
      immediate: false,
      paidThrough: sub.currentPeriodEnd?.toISOString() ?? null,
    },
  });
  return sub;
}

export async function reactivateSubscription(input: {
  restaurantId: string;
  actorId: string;
}) {
  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) throw new NotFoundError('Subscription');
  await finalizeCancelAtPeriodEndIfDue(sub);

  if (sub.status === 'cancelled') {
    throw new ValidationError(
      'This subscription has already ended. Choose a plan to start a new subscription.',
    );
  }
  if (!sub.cancelAtPeriodEnd) {
    throw new ConflictError('Subscription is not scheduled to cancel');
  }

  if (sub.stripeSubscriptionId) {
    await clearStripeCancelAtPeriodEnd(sub.stripeSubscriptionId);
  }
  sub.cancelAtPeriodEnd = false;
  await sub.save();
  await logAudit({
    actorId: input.actorId,
    action: 'reactivateSubscription',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId },
  });
  return sub;
}

/** Clear soft-cancel when the owner upgrades / changes plan so the new plan starts now. */
export async function clearCancelAtPeriodEndIfSet(sub: SubscriptionDocument) {
  if (!sub.cancelAtPeriodEnd) return sub;
  if (sub.stripeSubscriptionId) {
    await clearStripeCancelAtPeriodEnd(sub.stripeSubscriptionId);
  }
  sub.cancelAtPeriodEnd = false;
  return sub;
}
