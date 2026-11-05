import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Notification } from '../models/Loyalty.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { autoChargeDueInvoices, nextAutoChargeAt } from '../services/invoices.js';
import { notifyBillingAdmins, sendTrialCardReminders } from '../services/billingAlerts.js';
import { describeChargeFailure } from '../services/stripe.js';

const DUE = new Date('2026-09-01T00:00:00Z');

async function seed(invoiceOverrides: Record<string, unknown> = {}) {
  const owner = await User.create({
    email: `retry-owner-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Retry',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Retry Kitchen',
    slug: `retry-kitchen-${Date.now()}-${Math.random()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 100,
    websiteCoverFeeCents: 0,
    autoChargeInvoices: true,
    stripeCustomerId: 'cus_dev_retry',
    preferredPaymentMethodId: 'pm_dev_saved',
  });
  const invoice = await Invoice.create({
    number: `INV-RETRY-${Date.now()}-${Math.random()}`,
    restaurantId: restaurant._id,
    subscriptionId: sub._id,
    status: 'pending',
    billingPeriod: '2026-08',
    currency: 'usd',
    subtotalCents: 2500,
    totalCents: 2500,
    lines: [{ description: 'Covers', quantity: 1, unitAmountCents: 2500, amountCents: 2500 }],
    dueDate: DUE,
    payToken: `tok_retry_${Date.now()}_${Math.random()}`,
    ...invoiceOverrides,
  });
  return { owner, restaurant, sub, invoice };
}

describe('auto-charge retry schedule', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('skips off-schedule days and retries on the next scheduled day', async () => {
    const { invoice } = await seed({
      autoChargeAttemptedAt: new Date('2026-09-02T04:00:00Z'),
      autoChargeError: 'Insufficient funds',
      autoChargeAttempts: 2,
    });

    const offDay = await autoChargeDueInvoices(new Date('2026-09-03T04:00:00Z'));
    expect(offDay.attempted).toBe(0);
    expect((await Invoice.findById(invoice._id))!.status).toBe('pending');

    const retryDay = await autoChargeDueInvoices(new Date('2026-09-04T04:00:00Z'));
    expect(retryDay.charged).toBe(1);
    const paid = await Invoice.findById(invoice._id);
    expect(paid!.status).toBe('paid');
    expect(paid!.autoChargeAttempts).toBe(3);
    expect(paid!.autoChargeError).toBeUndefined();
  });

  it('attempts at most once per UTC day', async () => {
    await seed({
      autoChargeAttemptedAt: new Date('2026-09-04T01:00:00Z'),
      autoChargeError: 'Insufficient funds',
    });
    const result = await autoChargeDueInvoices(new Date('2026-09-04T09:00:00Z'));
    expect(result.attempted).toBe(0);
  });

  it('pauses on a hard decline until forced by a card change', async () => {
    const { restaurant, invoice } = await seed({
      autoChargeAttemptedAt: new Date('2026-09-01T04:00:00Z'),
      autoChargeError: 'The card was reported stolen',
      autoChargeHardDeclinePaymentMethodId: 'pm_dev_saved',
    });
    const scheduled = await autoChargeDueInvoices(new Date('2026-09-04T04:00:00Z'));
    expect(scheduled.attempted).toBe(0);
    expect(nextAutoChargeAt((await Invoice.findById(invoice._id))!)).toBeNull();

    const forced = await autoChargeDueInvoices(new Date('2026-09-04T05:00:00Z'), {
      restaurantId: restaurant._id.toString(),
      force: true,
    });
    expect(forced.charged).toBe(1);
  });

  it('leaves Stripe-owned renewal invoices to Stripe', async () => {
    await seed({ source: 'stripe_subscription', stripeInvoiceId: `in_test_${Date.now()}` });
    const result = await autoChargeDueInvoices(new Date('2026-09-01T04:00:00Z'));
    expect(result.attempted).toBe(0);
  });

  it('computes the next retry date on the schedule', () => {
    const next = nextAutoChargeAt(
      { status: 'pending', dueDate: DUE, autoChargeError: 'Insufficient funds' },
      new Date('2026-09-02T10:00:00Z'),
    );
    expect(next?.toISOString()).toBe('2026-09-04T04:00:00.000Z');
  });
});

describe('charge failure alerts', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('maps Stripe decline codes to owner-facing reasons', () => {
    expect(describeChargeFailure({ code: 'card_declined', decline_code: 'stolen_card' })).toMatchObject({
      reason: 'The card was reported stolen',
      hardDecline: true,
      actionRequired: false,
    });
    expect(
      describeChargeFailure({ code: 'card_declined', decline_code: 'insufficient_funds' }),
    ).toMatchObject({ hardDecline: false, reason: 'Insufficient funds' });
    expect(describeChargeFailure({ code: 'authentication_required' }).actionRequired).toBe(true);
  });

  it('alerts admins and account managers', async () => {
    const { restaurant } = await seed();
    await User.create({
      email: `billing-admin-${Date.now()}@test.com`,
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    });
    const count = await notifyBillingAdmins({
      restaurantId: restaurant._id.toString(),
      headline: 'Automatic charge failed',
      body: 'Insufficient funds.',
      amountCents: 2500,
    });
    expect(count).toBe(1);
    expect(await Notification.countDocuments({ type: 'billing_admin_alert' })).toBeGreaterThan(0);
  });

  it('reminds the owner once when a trial ends soon without a card', async () => {
    const { sub } = await seed();
    await Subscription.updateOne(
      { _id: sub._id },
      {
        $set: { status: 'trialing', trialEndsAt: new Date('2026-09-03T00:00:00Z') },
        $unset: { preferredPaymentMethodId: '', stripeCustomerId: '' },
      },
    );
    const now = new Date('2026-09-01T04:00:00Z');
    expect(await sendTrialCardReminders(now)).toBe(1);
    expect(await sendTrialCardReminders(now)).toBe(0);
    expect(await Notification.countDocuments({ type: 'trial_card_missing' })).toBeGreaterThan(0);
  });
});
