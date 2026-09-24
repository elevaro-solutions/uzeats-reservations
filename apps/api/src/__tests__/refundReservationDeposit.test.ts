import { describe, it, expect, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { signAccessToken } from '../services/auth.js';
import { syncDepositRefundedFromStripe } from '../services/reservations.js';

vi.mock('../services/stripe.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/stripe.js')>();
  return {
    ...actual,
    refundDeposit: vi.fn(async () => ({ id: 're_test', mode: 'released' as const })),
  };
});

const REFUND_MUTATION = `
  mutation RefundReservationDeposit($id: ID!, $reason: String, $amountCents: Int) {
    refundReservationDeposit(id: $id, reason: $reason, amountCents: $amountCents) {
      id
      depositStatus
      depositAmountCents
      depositRefundedCents
      depositRefundableCents
    }
  }
`;

describe('refundReservationDeposit', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let adminToken: string;
  let dinerToken: string;
  let restaurantId: string;
  let dinerId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await User.create({
      email: 'deposit-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const admin = await User.create({
      email: 'deposit-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const diner = await User.create({
      email: 'deposit-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Diner',
      lastName: 'Guest',
      role: 'diner',
    });
    dinerId = diner._id;
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const restaurant = await Restaurant.create({
      name: 'Deposit Test Bistro',
      slug: 'deposit-test-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
      depositRequired: true,
      depositAmountCents: 2500,
    });
    restaurantId = restaurant._id.toString();
  });

  async function createBookedReservation(depositStatus: 'authorized' | 'captured' | 'none') {
    const slotStart = new Date(Date.now() + 24 * 60 * 60_000);
    return Reservation.create({
      restaurantId,
      dinerId,
      partySize: 2,
      slotStart,
      slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
      status: 'confirmed',
      depositAmountCents: depositStatus === 'none' ? 0 : 2500,
      depositStatus,
      stripePaymentIntentId:
        depositStatus === 'none' ? undefined : `pi_dev_refund_${Date.now()}_${Math.random()}`,
      source: 'network',
    });
  }

  it('lets owners release an authorized hold with a reason', async () => {
    const reservation = await createBookedReservation('authorized');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Goodwill / guest accommodation' },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.refundReservationDeposit.depositStatus).toBe('refunded');

    const reloaded = await Reservation.findById(reservation._id);
    expect(reloaded?.depositStatus).toBe('refunded');
  });

  it('lets admins refund a captured deposit', async () => {
    const reservation = await createBookedReservation('captured');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Service issue' },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.refundReservationDeposit.depositStatus).toBe('refunded');
  });

  it('rejects diners', async () => {
    const reservation = await createBookedReservation('authorized');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString() },
      dinerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden|not allowed|access/i);
  });

  it('rejects refund when deposit is not held or captured', async () => {
    const reservation = await createBookedReservation('none');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString() },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/cannot refund|no deposit/i);
  });

  it('is idempotent via Stripe webhook sync after a manual refund', async () => {
    const reservation = await createBookedReservation('authorized');
    const pi = reservation.stripePaymentIntentId!;
    await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Duplicate charge' },
      ownerToken,
    );

    const synced = await syncDepositRefundedFromStripe(pi);
    expect(synced?.depositStatus).toBe('refunded');
  });

  it('supports partial refund of a captured deposit', async () => {
    const reservation = await createBookedReservation('captured');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Service issue', amountCents: 1000 },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.refundReservationDeposit.depositStatus).toBe('captured');
    expect(res.body.data.refundReservationDeposit.depositRefundedCents).toBe(1000);
    expect(res.body.data.refundReservationDeposit.depositRefundableCents).toBe(1500);

    const rest = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Goodwill / guest accommodation', amountCents: 1500 },
      ownerToken,
    );
    expect(rest.body.errors).toBeUndefined();
    expect(rest.body.data.refundReservationDeposit.depositStatus).toBe('refunded');
    expect(rest.body.data.refundReservationDeposit.depositRefundedCents).toBe(2500);
    expect(rest.body.data.refundReservationDeposit.depositRefundableCents).toBe(0);
  });

  it('rejects partial refund larger than remaining', async () => {
    const reservation = await createBookedReservation('captured');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Service issue', amountCents: 99999 },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/exceeds remaining/i);
  });

  it('rejects partial amount on authorization holds', async () => {
    const reservation = await createBookedReservation('authorized');
    const res = await graphqlRequest(
      agent,
      REFUND_MUTATION,
      { id: reservation._id.toString(), reason: 'Service issue', amountCents: 1000 },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/full/i);
  });

  it('syncDepositRefundedFromStripe marks authorized deposits refunded', async () => {
    const reservation = await createBookedReservation('authorized');
    const synced = await syncDepositRefundedFromStripe(reservation.stripePaymentIntentId!);
    expect(synced?.depositStatus).toBe('refunded');
    const reloaded = await Reservation.findById(reservation._id);
    expect(reloaded?.depositStatus).toBe('refunded');
  });

  it('syncDepositRefundedFromStripe applies cumulative charge.refunded amount', async () => {
    const reservation = await createBookedReservation('captured');
    const synced = await syncDepositRefundedFromStripe(
      reservation.stripePaymentIntentId!,
      800,
    );
    expect(synced?.depositStatus).toBe('captured');
    expect(synced?.depositRefundedCents).toBe(800);

    const again = await syncDepositRefundedFromStripe(
      reservation.stripePaymentIntentId!,
      2500,
    );
    expect(again?.depositStatus).toBe('refunded');
    expect(again?.depositRefundedCents).toBe(2500);
  });

  it('ignores unknown payment intents', async () => {
    const synced = await syncDepositRefundedFromStripe('pi_unknown_xyz');
    expect(synced).toBeNull();
  });
});
