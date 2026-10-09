import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  autoChargeDueInvoices,
  confirmInvoicePayment,
  startInvoicePayment,
} from '../services/invoices.js';

async function seed() {
  const owner = await User.create({
    email: `pay-owner-${Date.now()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Pay',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Pay Kitchen',
    slug: `pay-kitchen-${Date.now()}`,
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
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    autoChargeInvoices: true,
  });
  const invoice = await Invoice.create({
    number: `INV-TEST-${Date.now()}`,
    restaurantId: restaurant._id,
    subscriptionId: sub._id,
    status: 'pending',
    billingPeriod: '2026-08',
    currency: 'usd',
    subtotalCents: 5000,
    totalCents: 5000,
    lines: [{ description: 'Test', quantity: 1, unitAmountCents: 5000, amountCents: 5000 }],
    dueDate: new Date('2026-08-01T00:00:00Z'),
    payToken: `tok_${Date.now()}`,
  });
  return { owner, restaurant, sub, invoice };
}

describe('invoice preferred payment + auto-charge', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('saves a preferred payment method when the owner pays an invoice', async () => {
    const { restaurant, invoice, sub } = await seed();
    const session = await startInvoicePayment(invoice.payToken!);
    expect(session.paymentIntentId).toBeTruthy();
    expect(session.isStub).toBe(true);

    await confirmInvoicePayment(invoice.payToken!, session.paymentIntentId!);

    const updatedSub = await Subscription.findById(sub._id);
    expect(updatedSub!.preferredPaymentMethodId).toMatch(/^pm_dev_/);
    expect(updatedSub!.autoChargeInvoices).toBe(true);
    expect(updatedSub!.stripeCustomerId).toBeTruthy();

    const paid = await Invoice.findById(invoice._id);
    expect(paid!.status).toBe('paid');
    expect(String(restaurant._id)).toBe(String(paid!.restaurantId));
  });

  it('auto-charges a due invoice with the preferred payment method', async () => {
    const { restaurant, sub } = await seed();
    await Subscription.updateOne(
      { _id: sub._id },
      {
        $set: {
          stripeCustomerId: 'cus_dev_auto',
          preferredPaymentMethodId: 'pm_dev_saved',
          autoChargeInvoices: true,
        },
      },
    );
    const due = await Invoice.create({
      number: `INV-AUTO-${Date.now()}`,
      restaurantId: restaurant._id,
      subscriptionId: sub._id,
      status: 'pending',
      billingPeriod: '2026-09',
      currency: 'usd',
      subtotalCents: 2500,
      totalCents: 2500,
      lines: [{ description: 'Auto', quantity: 1, unitAmountCents: 2500, amountCents: 2500 }],
      dueDate: new Date('2026-09-01T00:00:00Z'),
      payToken: `tok_auto_${Date.now()}`,
    });

    const result = await autoChargeDueInvoices(new Date('2026-09-02T00:00:00Z'));
    expect(result.charged).toBeGreaterThanOrEqual(1);

    const paid = await Invoice.findById(due._id);
    expect(paid!.status).toBe('paid');
    expect(paid!.stripePaymentIntentId).toMatch(/^pi_dev_/);
  });
});
