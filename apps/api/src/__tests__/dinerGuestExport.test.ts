import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { signAccessToken } from '../services/auth.js';

const EXPORT_DINERS = `
  mutation ExportAdminDiners($search: String, $format: String) {
    exportAdminDiners(search: $search, format: $format) {
      filename
      content
      rowCount
      mimeType
      encoding
    }
  }
`;

const EXPORT_GUESTS = `
  mutation ExportRestaurantGuests($restaurantId: ID!, $format: String, $search: String) {
    exportRestaurantGuests(restaurantId: $restaurantId, format: $format, search: $search) {
      filename
      content
      rowCount
      mimeType
      encoding
    }
  }
`;

const EXPORT_ADMIN = `
  mutation ExportAdminCsv($type: String!, $format: String, $period: String) {
    exportAdminCsv(type: $type, format: $format, period: $period) {
      filename
      content
      rowCount
      mimeType
    }
  }
`;

describe('Diner and guest list exports', () => {
  let agent: request.Agent;
  let adminToken: string;
  let ownerToken: string;
  let dinerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'export-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const owner = await User.create({
      email: 'export-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Owner',
      lastName: 'User',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({ sub: owner._id.toString(), role: 'restaurant_owner' });

    const diner = await User.create({
      email: 'export-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Guest',
      phone: '+15555550100',
      role: 'diner',
      loyaltyPoints: 40,
    });
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const restaurant = await Restaurant.create({
      name: 'Export Bistro',
      slug: 'export-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();

    await GuestProfile.create({
      restaurantId: restaurant._id,
      dinerId: diner._id,
      vipStatus: 'vip',
      tags: ['Regular'],
      totalVisits: 6,
      loyaltyPoints: 40,
      totalSpendCents: 12500,
      averagePartySize: 2,
      lastVisitDate: new Date('2026-09-01T00:00:00.000Z'),
      notes: 'Window seat',
    });
  });

  it('exports diners as excel json and pdf for admins', async () => {
    const xlsx = await graphqlRequest(agent, EXPORT_DINERS, { format: 'excel' }, adminToken);
    expect(xlsx.body.errors).toBeUndefined();
    expect(xlsx.body.data.exportAdminDiners.filename).toBe('diners.xlsx');
    expect(xlsx.body.data.exportAdminDiners.rowCount).toBeGreaterThanOrEqual(1);
    expect(xlsx.body.data.exportAdminDiners.encoding).toBe('base64');
    expect(
      Buffer.from(xlsx.body.data.exportAdminDiners.content, 'base64').toString('utf8'),
    ).toContain('export-diner@test.com');

    const json = await graphqlRequest(
      agent,
      EXPORT_DINERS,
      { format: 'json', search: 'Ada' },
      adminToken,
    );
    expect(json.body.errors).toBeUndefined();
    const parsed = JSON.parse(json.body.data.exportAdminDiners.content);
    expect(parsed.rowCount).toBe(1);
    expect(parsed.rows[0].email).toBe('export-diner@test.com');

    const pdf = await graphqlRequest(agent, EXPORT_DINERS, { format: 'pdf' }, adminToken);
    expect(pdf.body.data.exportAdminDiners.mimeType).toBe('application/pdf');
  });

  it('rejects diner export from a diner account', async () => {
    const res = await graphqlRequest(agent, EXPORT_DINERS, { format: 'json' }, dinerToken);
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it('exports restaurant guests as excel and pdf for the owner', async () => {
    const xlsx = await graphqlRequest(
      agent,
      EXPORT_GUESTS,
      { restaurantId, format: 'xlsx' },
      ownerToken,
    );
    expect(xlsx.body.errors).toBeUndefined();
    expect(xlsx.body.data.exportRestaurantGuests.filename).toContain('guests-');
    expect(xlsx.body.data.exportRestaurantGuests.rowCount).toBe(1);
    expect(
      Buffer.from(xlsx.body.data.exportRestaurantGuests.content, 'base64').toString('utf8'),
    ).toContain('Ada');

    const pdf = await graphqlRequest(
      agent,
      EXPORT_GUESTS,
      { restaurantId, format: 'pdf' },
      ownerToken,
    );
    expect(pdf.body.data.exportRestaurantGuests.mimeType).toBe('application/pdf');
  });

  it('exports platform guests from admin exports', async () => {
    const res = await graphqlRequest(
      agent,
      EXPORT_ADMIN,
      { type: 'guests', format: 'json', period: 'all' },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    const parsed = JSON.parse(res.body.data.exportAdminCsv.content);
    expect(parsed.rowCount).toBe(1);
    expect(parsed.rows[0].restaurant).toBe('Export Bistro');
    expect(parsed.rows[0].email).toBe('export-diner@test.com');
    expect(parsed.rows[0].vipStatus).toBe('vip');
  });
});
