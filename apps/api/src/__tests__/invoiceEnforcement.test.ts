import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import {
  applyEnforcementForRestaurant,
  assertPartnerMayCreateCover,
  assessDeclinedCardFee,
  getVenueEnforcementSnapshot,
  pauseBillingEnforcement,
  waiveInvoiceEnforcementFees,
} from '../services/invoiceEnforcement.js';
import { restaurantIsPubliclyListed } from '../services/publicListing.js';

async function seedVenue() {
  const owner = await User.create({
    email: `ftp-${Date.now()}@test.com`,
    passwordHash: 'x',
    firstName: 'Pay',
    lastName: 'Late',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Late Kitchen',
    slug: `late-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
  });
  return { owner, restaurant, sub };
}

async function unpaidInvoice(
  restaurantId: unknown,
  dueDate: Date,
  totalCents = 10_000,
) {
  return Invoice.create({
    number: `INV-FTP-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    restaurantId,
    status: 'pending',
    billingPeriod: dueDate.toISOString().slice(0, 7),
    currency: 'usd',
    subtotalCents: totalCents,
    totalCents,
    lines: [
      {
        description: 'Core plan',
        quantity: 1,
        unitAmountCents: totalCents,
        amountCents: totalCents,
      },
    ],
    dueDate,
  });
}

describe('fail-to-pay enforcement', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('stays listed through grace and unlists at day 14', async () => {
    const { restaurant } = await seedVenue();
    await unpaidInvoice(restaurant._id, new Date('2026-10-01T00:00:00.000Z'));

    const day7 = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-08T12:00:00.000Z'),
    );
    expect(day7.stage).toBe('grace');
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(true);

    const day8 = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-09T12:00:00.000Z'),
    );
    expect(day8.stage).toBe('overdue');
    const overdue = await Invoice.findOne({ restaurantId: restaurant._id });
    expect(overdue!.lines.some((l) => (l as { kind?: string }).kind === 'finance_charge')).toBe(
      true,
    );
    expect(overdue!.totalCents).toBe(10_150);

    const day14 = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-15T12:00:00.000Z'),
    );
    expect(day14.stage).toBe('unlisted');
    expect(await restaurantIsPubliclyListed(restaurant._id.toString())).toBe(false);
  });

  it('restricts new covers at day 30 and terminates at day 60', async () => {
    const { owner, restaurant } = await seedVenue();
    await unpaidInvoice(restaurant._id, new Date('2026-09-01T00:00:00.000Z'));

    const day30 = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-01T12:00:00.000Z'),
    );
    expect(day30.stage).toBe('restricted');
    await expect(
      assertPartnerMayCreateCover(restaurant._id.toString()),
    ).rejects.toThrow(/paused until outstanding invoices/i);

    const day60 = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-31T12:00:00.000Z'),
    );
    expect(day60.stage).toBe('terminated');
    const sub = await Subscription.findOne({ restaurantId: restaurant._id });
    expect(sub!.status).toBe('cancelled');
    expect(owner.email).toBeTruthy();
  });

  it('assesses a declined-card fee once', async () => {
    const { restaurant } = await seedVenue();
    const invoice = await unpaidInvoice(restaurant._id, new Date('2026-10-01T00:00:00.000Z'));
    const err = Object.assign(new Error('Your card was declined'), { code: 'card_declined' });
    expect(await assessDeclinedCardFee(invoice._id.toString(), err)).toBe(true);
    expect(await assessDeclinedCardFee(invoice._id.toString(), err)).toBe(false);
    const fresh = await Invoice.findById(invoice._id);
    expect(fresh!.totalCents).toBe(12_500);
    expect(fresh!.lines.some((l) => (l as { kind?: string }).kind === 'declined_fee')).toBe(true);
  });

  it('pause freezes the ladder and waive removes fee lines', async () => {
    const { restaurant, owner } = await seedVenue();
    const invoice = await unpaidInvoice(restaurant._id, new Date('2026-10-01T00:00:00.000Z'));
    await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-15T12:00:00.000Z'),
    );
    expect((await getVenueEnforcementSnapshot(restaurant._id.toString(), new Date('2026-10-15T12:00:00.000Z'))).stage).toBe(
      'unlisted',
    );

    await pauseBillingEnforcement({
      restaurantId: restaurant._id.toString(),
      actorId: owner._id.toString(),
      reason: 'payment plan',
    });
    const paused = await applyEnforcementForRestaurant(
      restaurant._id.toString(),
      new Date('2026-10-20T12:00:00.000Z'),
    );
    expect(paused.paused).toBe(true);
    expect(paused.stage).toBe('unlisted');

    await waiveInvoiceEnforcementFees({
      invoiceId: invoice._id.toString(),
      actorId: owner._id.toString(),
    });
    const after = await Invoice.findById(invoice._id);
    expect(after!.lines.every((l) => !(l as { kind?: string }).kind)).toBe(true);
    expect(after!.totalCents).toBe(10_000);
  });
});
