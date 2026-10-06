import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

const RESERVATION_FIELDS = `
  id status depositAmountCents depositStatus
  noShowFeeCents cardGuaranteeStatus noShowFeeReason
`;

const UPDATE_STATUS = `
  mutation UpdateStatus($id: ID!, $status: ReservationStatus!) {
    updateReservationStatus(id: $id, status: $status) { ${RESERVATION_FIELDS} }
  }
`;

describe('Booking payment policy (card guarantee vs prepaid)', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let dinerId: string;
  let ownerToken: string;
  let restaurantId: string;
  let slotStart: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'policy-diner@test.com',
      password: 'Password123!',
      firstName: 'Policy',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;
    dinerId = diner.user.id;

    const owner = await registerUser(agent, {
      email: 'policy-owner@test.com',
      password: 'Password123!',
      firstName: 'Policy',
      lastName: 'Owner',
    });
    await User.findByIdAndUpdate(owner.user.id, { role: 'restaurant_owner' });
    const { signAccessToken } = await import('../services/auth.js');
    ownerToken = signAccessToken({ sub: owner.user.id, role: 'restaurant_owner' });

    const restaurantRes = await graphqlRequest(
      agent,
      `mutation CreateRestaurant($input: RestaurantInput!) { createRestaurant(input: $input) { id } }`,
      {
        input: {
          name: 'Policy Bistro',
          cuisine: 'American',
          priceRange: 2,
          address: { line1: '5 Policy St', city: 'NYC', state: 'NY', zip: '10001' },
          location: { lng: -73.95, lat: 40.75 },
        },
      },
      ownerToken,
    );
    restaurantId = restaurantRes.body.data.createRestaurant.id;
    await Restaurant.findByIdAndUpdate(restaurantId, {
      status: 'approved',
      depositRequired: true,
      depositAmountCents: 2500,
    });

    await graphqlRequest(
      agent,
      `mutation CreateTable($restaurantId: ID!, $input: TableInput!) {
        createTable(restaurantId: $restaurantId, input: $input) { id }
      }`,
      { restaurantId, input: { name: 'G1', minCapacity: 2, maxCapacity: 4 } },
      ownerToken,
    );
    await graphqlRequest(
      agent,
      `mutation CreateShift($restaurantId: ID!, $input: ShiftInput!) {
        createShift(restaurantId: $restaurantId, input: $input) { id }
      }`,
      {
        restaurantId,
        input: {
          name: 'Dinner',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: '17:00',
          endTime: '23:00',
          slotIntervalMinutes: 30,
          turnTimeMinutes: 90,
        },
      },
      ownerToken,
    );

    const day = new Date();
    day.setDate(day.getDate() + 3);
    const availRes = await graphqlRequest(
      agent,
      `query Availability($restaurantId: ID!, $date: String!, $partySize: Int!) {
        availability(restaurantId: $restaurantId, date: $date, partySize: $partySize) { time available }
      }`,
      { restaurantId, date: day.toISOString().split('T')[0], partySize: 2 },
      dinerToken,
    );
    slotStart = availRes.body.data.availability.find((s: { available: boolean }) => s.available).time;
  });

  async function book() {
    return graphqlRequest(
      agent,
      `mutation CreateReservation($input: ReservationInput!) {
        createReservation(input: $input) { clientSecret reservation { ${RESERVATION_FIELDS} } }
      }`,
      { input: { restaurantId, partySize: 2, slotStart } },
      dinerToken,
    );
  }

  /** Confirmed booking with a saved card, `hoursAhead` from now (bypasses availability). */
  async function guaranteedBooking(hoursAhead: number) {
    const start = new Date(Date.now() + hoursAhead * 3_600_000);
    return Reservation.create({
      restaurantId,
      dinerId,
      partySize: 2,
      slotStart: start,
      slotEnd: new Date(start.getTime() + 90 * 60_000),
      status: 'confirmed',
      noShowFeeCents: 5000,
      cardGuaranteeStatus: 'card_saved',
      stripeCustomerId: 'cus_dev_policy',
      stripePaymentMethodId: 'pm_dev',
      source: 'network',
    });
  }

  it('card guarantee: saves a card and charges nothing at booking', async () => {
    const res = await book();
    expect(res.body.errors).toBeUndefined();
    const { reservation, clientSecret } = res.body.data.createReservation;
    expect(clientSecret).toBeNull();
    expect(reservation.status).toBe('confirmed');
    expect(reservation.depositAmountCents).toBe(0);
    expect(reservation.depositStatus).toBe('none');
    expect(reservation.noShowFeeCents).toBe(5000);
    expect(reservation.cardGuaranteeStatus).toBe('card_saved');

    const cancel = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation.id, status: 'cancelled' },
      dinerToken,
    );
    expect(cancel.body.errors).toBeUndefined();
    expect(cancel.body.data.updateReservationStatus.cardGuaranteeStatus).toBe('released');
  });

  it('charges the fee when the diner cancels inside the window', async () => {
    const reservation = await guaranteedBooking(2);
    const res = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation._id.toString(), status: 'cancelled' },
      dinerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReservationStatus.cardGuaranteeStatus).toBe('charged');
    expect(res.body.data.updateReservationStatus.noShowFeeReason).toBe('late_cancel');
  });

  it('never charges when the restaurant cancels, even late', async () => {
    const reservation = await guaranteedBooking(2);
    const res = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation._id.toString(), status: 'cancelled' },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReservationStatus.cardGuaranteeStatus).toBe('released');
  });

  it('charges the fee when staff mark a no-show, and staff can refund it', async () => {
    const reservation = await guaranteedBooking(-1);
    const res = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation._id.toString(), status: 'no_show' },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReservationStatus.cardGuaranteeStatus).toBe('charged');
    expect(res.body.data.updateReservationStatus.noShowFeeReason).toBe('no_show');

    const refund = await graphqlRequest(
      agent,
      `mutation Refund($id: ID!, $reason: String) {
        refundReservationNoShowFee(id: $id, reason: $reason) { cardGuaranteeStatus }
      }`,
      { id: reservation._id.toString(), reason: 'Guest had an emergency' },
      ownerToken,
    );
    expect(refund.body.errors).toBeUndefined();
    expect(refund.body.data.refundReservationNoShowFee.cardGuaranteeStatus).toBe('refunded');
  });

  it('releases the guarantee when the party is seated', async () => {
    const reservation = await guaranteedBooking(1);
    const res = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation._id.toString(), status: 'seated' },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReservationStatus.cardGuaranteeStatus).toBe('released');
  });

  it('lets staff charge an auto-flagged no-show, but not diners', async () => {
    const reservation = await guaranteedBooking(-3);
    await Reservation.updateOne({ _id: reservation._id }, { status: 'no_show' });
    const mutation = `mutation Charge($id: ID!) {
      chargeReservationNoShowFee(id: $id) { cardGuaranteeStatus noShowFeeReason }
    }`;

    const asDiner = await graphqlRequest(agent, mutation, { id: reservation._id.toString() }, dinerToken);
    expect(asDiner.body.errors?.length).toBeGreaterThan(0);

    const asStaff = await graphqlRequest(agent, mutation, { id: reservation._id.toString() }, ownerToken);
    expect(asStaff.body.errors).toBeUndefined();
    expect(asStaff.body.data.chargeReservationNoShowFee.cardGuaranteeStatus).toBe('charged');
  });

  it('prepaid policy: charges at booking and refunds when the restaurant cancels', async () => {
    await Restaurant.findByIdAndUpdate(restaurantId, { depositPolicy: 'prepaid' });
    const res = await book();
    expect(res.body.errors).toBeUndefined();
    const { reservation } = res.body.data.createReservation;
    expect(reservation.depositAmountCents).toBe(5000);
    expect(reservation.depositStatus).toBe('captured');
    expect(reservation.noShowFeeCents).toBe(0);
    expect(reservation.cardGuaranteeStatus).toBe('none');

    const cancel = await graphqlRequest(
      agent,
      UPDATE_STATUS,
      { id: reservation.id, status: 'cancelled' },
      ownerToken,
    );
    expect(cancel.body.errors).toBeUndefined();
    expect(cancel.body.data.updateReservationStatus.depositStatus).toBe('refunded');
  });
});
