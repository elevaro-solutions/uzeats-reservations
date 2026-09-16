import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { CoverFee } from '../models/CoverFee.js';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  buildCoverFeeLines,
  generateDuePeriodInvoices,
  generateInvoicesForPeriod,
  previousUtcBillingPeriod,
  utcBillingPeriod,
} from '../services/invoices.js';

async function seedRestaurant(plan = 'core') {
  const owner = await User.create({
    email: `invoice-owner-${Date.now()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Ivy',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Invoice Test Kitchen',
    slug: `invoice-test-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan,
    status: 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 0,
  });
  return { owner, restaurant, sub };
}

async function addCover(input: {
  restaurantId: mongoose.Types.ObjectId;
  dinerId: mongoose.Types.ObjectId;
  period: string;
  source: 'network' | 'website' | 'widget';
  partySize: number;
  feeCents: number;
}) {
  await CoverFee.create({
    restaurantId: input.restaurantId,
    reservationId: new mongoose.Types.ObjectId(),
    dinerId: input.dinerId,
    partySize: input.partySize,
    source: input.source,
    feeCents: input.feeCents,
    status: 'pending',
    billingPeriod: input.period,
  });
}

describe('period invoice generation', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('splits cover fees by source with cover quantities', () => {
    const lines = buildCoverFeeLines([
      { source: 'network', partySize: 4, feeCents: 200 },
      { source: 'network', partySize: 2, feeCents: 100 },
      { source: 'website', partySize: 3, feeCents: 30 },
      { source: 'phone', partySize: 2, feeCents: 0 },
    ]);
    expect(lines).toEqual([
      {
        description: 'Network cover (6 covers)',
        quantity: 6,
        unitAmountCents: 50,
        amountCents: 300,
      },
      {
        description: 'Website cover (3 covers)',
        quantity: 3,
        unitAmountCents: 10,
        amountCents: 30,
      },
    ]);
  });

  it('creates a period invoice with plan + cover breakdown and marks fees charged', async () => {
    const { owner, restaurant } = await seedRestaurant();
    const period = '2026-08';
    await addCover({
      restaurantId: restaurant._id,
      dinerId: owner._id,
      period,
      source: 'network',
      partySize: 4,
      feeCents: 200,
    });
    await addCover({
      restaurantId: restaurant._id,
      dinerId: owner._id,
      period,
      source: 'widget',
      partySize: 2,
      feeCents: 100,
    });

    const result = await generateInvoicesForPeriod(period);
    expect(result).toMatchObject({ created: 1, updated: 0, skipped: 0, period });

    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: period });
    expect(invoice).toBeTruthy();
    expect(invoice!.dueDate.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(invoice!.totalCents).toBe(9900 + 300);
    expect(invoice!.lines.map((l) => ({ d: l.description, q: l.quantity, a: l.amountCents }))).toEqual([
      { d: 'Core plan - 2026-08', q: 1, a: 9900 },
      { d: 'Network cover (4 covers)', q: 4, a: 200 },
      { d: 'Widget cover (2 covers)', q: 2, a: 100 },
    ]);

    const fees = await CoverFee.find({ restaurantId: restaurant._id, billingPeriod: period });
    expect(fees.every((f) => f.status === 'charged')).toBe(true);
  });

  it('refreshes unpaid auto invoices when more covers accrue', async () => {
    const { owner, restaurant } = await seedRestaurant();
    const period = '2026-08';
    await addCover({
      restaurantId: restaurant._id,
      dinerId: owner._id,
      period,
      source: 'network',
      partySize: 2,
      feeCents: 100,
    });

    await generateInvoicesForPeriod(period);
    await addCover({
      restaurantId: restaurant._id,
      dinerId: owner._id,
      period,
      source: 'network',
      partySize: 3,
      feeCents: 150,
    });

    const result = await generateInvoicesForPeriod(period);
    expect(result).toMatchObject({ created: 0, updated: 1, skipped: 0 });

    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: period });
    expect(invoice!.totalCents).toBe(9900 + 250);
    expect(invoice!.lines.some((l) => l.description === 'Network cover (5 covers)')).toBe(true);
  });

  it('does not overwrite paid or manual invoices', async () => {
    const { restaurant } = await seedRestaurant();
    const period = '2026-08';
    await Invoice.create({
      number: 'INV-202608-M0001',
      restaurantId: restaurant._id,
      status: 'pending',
      billingPeriod: period,
      currency: 'usd',
      subtotalCents: 5000,
      totalCents: 5000,
      lines: [{ description: 'Custom', quantity: 1, unitAmountCents: 5000, amountCents: 5000 }],
      dueDate: new Date('2026-08-15T00:00:00.000Z'),
    });

    const result = await generateInvoicesForPeriod(period);
    expect(result.skipped).toBe(1);
    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: period });
    expect(invoice!.number).toBe('INV-202608-M0001');
    expect(invoice!.totalCents).toBe(5000);
  });

  it('generateDuePeriodInvoices covers previous and current UTC months', async () => {
    const { restaurant } = await seedRestaurant();
    const now = new Date('2026-09-16T12:00:00.000Z');
    const result = await generateDuePeriodInvoices(now);
    expect(result.previous.period).toBe('2026-08');
    expect(result.current.period).toBe('2026-09');
    expect(utcBillingPeriod(now)).toBe('2026-09');
    expect(previousUtcBillingPeriod(now)).toBe('2026-08');

    const invoices = await Invoice.find({ restaurantId: restaurant._id }).sort({ billingPeriod: 1 });
    expect(invoices.map((i) => i.billingPeriod)).toEqual(['2026-08', '2026-09']);
  });
});
