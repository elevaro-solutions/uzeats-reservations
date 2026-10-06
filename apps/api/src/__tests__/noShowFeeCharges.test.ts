import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

const LIST_FEES = `
  query RestaurantNoShowFeeCharges($restaurantId: ID, $feeStatus: String) {
    restaurantNoShowFeeCharges(restaurantId: $restaurantId, feeStatus: $feeStatus) {
      total
      summary {
        chargedCount
        chargedCents
        refundedCount
        refundedCents
        failedCount
        pendingCount
        pendingCents
        netCollectedCents
      }
      items {
        id
        noShowFeeCents
        cardGuaranteeStatus
        noShowFeeReason
      }
    }
  }
`;

describe('No-show fee charges report', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let chargedId: string;
  let pendingId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await registerUser(agent, {
      email: 'fees-owner@test.com',
      password: 'Password123!',
      firstName: 'Fees',
      lastName: 'Owner',
    });
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });
    const { signAccessToken } = await import('../services/auth.js');
    ownerToken = signAccessToken({ sub: owner.user.id, role: 'restaurant_owner' });

    const admin = await registerUser(agent, {
      email: 'fees-admin@test.com',
      password: 'Password123!',
      firstName: 'Fees',
      lastName: 'Admin',
    });
    await User.findByIdAndUpdate(admin.user.id, { role: 'super_admin' });
    adminToken = signAccessToken({ sub: admin.user.id, role: 'super_admin' });

    const diner = await registerUser(agent, {
      email: 'fees-diner@test.com',
      password: 'Password123!',
      firstName: 'Fees',
      lastName: 'Diner',
    });

    const restaurantRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) { createRestaurant(input: $input) { id } }`,
      {
        input: {
          name: 'Fees Bistro',
          cuisine: 'American',
          priceRange: 2,
          address: { line1: '9 Fee St', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.95, lat: 40.75 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;
    await Restaurant.findByIdAndUpdate(restaurantId, { status: 'approved' });

    const slot = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    slot.setMinutes(0, 0, 0);

    const charged = await Reservation.create({
      restaurantId,
      dinerId: diner.user.id,
      partySize: 2,
      slotStart: slot,
      slotEnd: new Date(slot.getTime() + 90 * 60 * 1000),
      status: 'no_show',
      noShowFeeCents: 5000,
      cardGuaranteeStatus: 'charged',
      noShowFeeReason: 'no_show',
      noShowFeeChargedAt: new Date(),
      source: 'network',
    });
    chargedId = charged._id.toString();

    const pending = await Reservation.create({
      restaurantId,
      dinerId: diner.user.id,
      partySize: 4,
      slotStart: new Date(slot.getTime() + 24 * 60 * 60 * 1000),
      slotEnd: new Date(slot.getTime() + 25.5 * 60 * 60 * 1000),
      status: 'no_show',
      noShowFeeCents: 2500,
      cardGuaranteeStatus: 'card_saved',
      source: 'network',
    });
    pendingId = pending._id.toString();
  });

  it('lists charged and pending fees with summary for partners', async () => {
    const res = await graphqlRequest(
      agent,
      LIST_FEES,
      { restaurantId },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const data = res.body.data.restaurantNoShowFeeCharges;
    expect(data.total).toBe(2);
    expect(data.summary.chargedCount).toBe(1);
    expect(data.summary.chargedCents).toBe(5000);
    expect(data.summary.netCollectedCents).toBe(5000);
    expect(data.summary.pendingCount).toBe(1);
    expect(data.summary.pendingCents).toBe(2500);
    const ids = data.items.map((i: { id: string }) => i.id);
    expect(ids).toEqual(expect.arrayContaining([chargedId, pendingId]));
  });

  it('filters by feeStatus=charged', async () => {
    const res = await graphqlRequest(
      agent,
      LIST_FEES,
      { restaurantId, feeStatus: 'charged' },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const data = res.body.data.restaurantNoShowFeeCharges;
    expect(data.total).toBe(1);
    expect(data.items[0].id).toBe(chargedId);
    expect(data.summary.chargedCount).toBe(1);
    expect(data.summary.pendingCount).toBe(1);
  });

  it('adminNoShowFeeCharges returns the same bookings platform-wide', async () => {
    const res = await graphqlRequest(
      agent,
      `query {
        adminNoShowFeeCharges {
          total
          summary { chargedCents pendingCents }
          items { id }
        }
      }`,
      {},
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    const data = res.body.data.adminNoShowFeeCharges;
    expect(data.total).toBe(2);
    expect(data.summary.chargedCents).toBe(5000);
    expect(data.summary.pendingCents).toBe(2500);
  });
});
