import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Table } from '../models/Table.js';
import { signAccessToken } from '../services/auth.js';
import {
  generateReservationConfirmationNumber,
  resolveReservationConfirmationNumber,
} from '../lib/reservationConfirmationNumber.js';

describe('reservation confirmation numbers', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let confirmationNumber: string;
  let reservationId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'conf-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const owner = await User.create({
      email: 'conf-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({
      sub: owner._id.toString(),
      role: 'restaurant_owner',
    });

    const diner = await User.create({
      email: 'conf-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Casey',
      lastName: 'Guest',
      role: 'diner',
      phone: '+15551234567',
    });

    const restaurant = await Restaurant.create({
      name: 'Confirmation Cafe',
      slug: 'confirmation-cafe',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();

    await Table.create({
      restaurantId: restaurant._id,
      name: 'T1',
      minCapacity: 1,
      maxCapacity: 4,
      floorArea: 'Main',
      active: true,
    });

    confirmationNumber = await generateReservationConfirmationNumber();
    expect(confirmationNumber).toMatch(/^\d{6}$/);

    const reservation = await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: diner._id,
      tableIds: [],
      partySize: 2,
      slotStart: new Date('2026-11-01T23:00:00Z'),
      slotEnd: new Date('2026-11-02T01:00:00Z'),
      status: 'confirmed',
      source: 'network',
      confirmationNumber,
    });
    reservationId = reservation._id.toString();
  });

  it('resolves stored 6-digit codes and falls back for legacy rows', () => {
    expect(resolveReservationConfirmationNumber('482917', 'abc')).toBe('482917');
    expect(resolveReservationConfirmationNumber(null, '507f1f77bcf86cd799439011')).toBe(
      '99439011',
    );
    expect(resolveReservationConfirmationNumber('12ab', '507f1f77bcf86cd799439011')).toBe(
      '99439011',
    );
  });

  it('generates unique 6-digit codes', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(await generateReservationConfirmationNumber());
    }
    expect(codes.size).toBe(20);
    for (const code of codes) {
      expect(code).toMatch(/^\d{6}$/);
      expect(code).not.toBe(confirmationNumber);
    }
  });

  it('lets partners search by confirmation number across date periods', async () => {
    const res = await graphqlRequest(
      agent,
      `query ($restaurantId: ID!, $search: String, $period: ReservationDatePeriod) {
        restaurantReservations(
          restaurantId: $restaurantId
          search: $search
          period: $period
          limit: 20
          offset: 0
        ) {
          total
          items { id confirmationNumber }
        }
      }`,
      {
        restaurantId,
        search: confirmationNumber,
        period: 'upcoming',
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.restaurantReservations.total).toBe(1);
    expect(res.body.data.restaurantReservations.items[0].id).toBe(reservationId);
    expect(res.body.data.restaurantReservations.items[0].confirmationNumber).toBe(
      confirmationNumber,
    );
  });

  it('lets partners open a reservation by confirmation number', async () => {
    const res = await graphqlRequest(
      agent,
      `query ($id: ID!) {
        restaurantReservation(id: $id) {
          id
          confirmationNumber
        }
      }`,
      { id: confirmationNumber },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.restaurantReservation.id).toBe(reservationId);
    expect(res.body.data.restaurantReservation.confirmationNumber).toBe(confirmationNumber);
  });

  it('lets admins search by confirmation number', async () => {
    const res = await graphqlRequest(
      agent,
      `query ($search: String) {
        adminReservations(search: $search, period: upcoming, limit: 20, offset: 0) {
          total
          items { id confirmationNumber }
        }
      }`,
      { search: confirmationNumber },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminReservations.total).toBe(1);
    expect(res.body.data.adminReservations.items[0].confirmationNumber).toBe(confirmationNumber);
  });
});
