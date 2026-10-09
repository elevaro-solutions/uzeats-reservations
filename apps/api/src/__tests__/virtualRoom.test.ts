import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { AddonFee } from '../models/AddonFee.js';
import { Invoice } from '../models/Invoice.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { getPlatformConfig } from '../services/platformConfig.js';
import {
  ensurePeriodInvoiceForRestaurant,
  generateInvoicesForPeriod,
  refreshPeriodInvoiceForRestaurant,
  utcBillingPeriod,
} from '../services/invoices.js';
import {
  adminSetVirtualRoomAddon,
  canSelectTableIn3d,
  getPublicVirtualRoom,
  getVirtualRoomAddonStatus,
  getVirtualRoomOpsScene,
  publishVirtualRoom,
  recordVirtualRoomGuestFee,
  recordVirtualRoomSelectionAttempt,
  setVirtualRoomAddon,
  syncVirtualRoomBilledMonths,
} from '../services/virtualRoom.js';
import { VirtualRoom } from '../models/VirtualRoom.js';

async function setPlatformFlag(enabled: boolean) {
  await getPlatformConfig();
  await PlatformConfig.updateOne({ key: 'default' }, { $set: { 'featureFlags.virtualRoom3d': enabled } });
}

async function seedRestaurant(plan = 'core') {
  const owner = await User.create({
    email: `vr-owner-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Vera',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Virtual Room Kitchen',
    slug: `vr-kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
  });
  return { owner, restaurant, sub };
}

describe('virtual 3D room add-on', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('is unavailable while the platform flag is off', async () => {
    const { restaurant } = await seedRestaurant();
    const status = await getVirtualRoomAddonStatus(restaurant._id.toString());
    expect(status.platformEnabled).toBe(false);
    expect(status.eligible).toBe(false);
    await expect(setVirtualRoomAddon(restaurant._id.toString(), true)).rejects.toThrow(
      /not available/i,
    );
  });

  it('requires a plan with floor plans', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant('basic');
    const status = await getVirtualRoomAddonStatus(restaurant._id.toString());
    expect(status.eligible).toBe(false);
    expect(status.ineligibleReason).toMatch(/floor plans/i);
  });

  it('admin can enable a free multi-month trial and generate the period invoice', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    const now = new Date('2026-08-03T10:00:00Z');

    const status = await adminSetVirtualRoomAddon(
      {
        restaurantId,
        enabled: true,
        trialPriceCents: 0,
        trialMonths: 3,
        priceOverrideCents: 4000,
      },
      now,
    );
    expect(status).toMatchObject({
      active: true,
      onTrial: true,
      trialPriceCents: 0,
      trialDurationMonths: 3,
      effectiveMonthlyPriceCents: 0,
      priceOverrideCents: 4000,
    });
    expect(status.trialEndsAt).toEqual(new Date('2026-11-03T10:00:00.000Z'));

    const invoice = await ensurePeriodInvoiceForRestaurant(restaurantId, '2026-08', {
      emailOwner: false,
    });
    expect(invoice!.lines.some((l) => l.description.includes('trial (free)') && l.amountCents === 0)).toBe(
      true,
    );

    await syncVirtualRoomBilledMonths(new Date('2026-09-01T00:00:00Z'));
    await syncVirtualRoomBilledMonths(new Date('2026-12-01T00:00:00Z'));
    const sub = await Subscription.findOne({ restaurantId: restaurant._id }).lean();
    const months = (sub as any).addons.virtualRoom3d.billedMonths;
    expect(months).toEqual(
      expect.arrayContaining([
        { period: '2026-08', priceCents: 0 },
        { period: '2026-09', priceCents: 0 },
        { period: '2026-12', priceCents: 4000 },
      ]),
    );
  });

  it('bills the monthly price and 3D guest fees on the period invoice', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();

    const status = await setVirtualRoomAddon(restaurantId, true, new Date('2026-08-03T10:00:00Z'));
    expect(status).toMatchObject({
      active: true,
      monthlyPriceCents: 5000,
      perGuestFeeCents: 200,
      selectionFeeMode: 'per_guest',
    });

    const reservationId = new mongoose.Types.ObjectId();
    const completedAt = new Date('2026-08-20T21:00:00Z');
    const reservation = {
      _id: reservationId,
      restaurantId: restaurant._id,
      partySize: 4,
      tableSelectionSource: 'virtual_3d',
      virtualRoomGuestFeeCents: 200,
      virtualRoomSelectionFeeMode: 'per_guest' as const,
    };
    await recordVirtualRoomGuestFee(reservation, completedAt);
    await recordVirtualRoomGuestFee(reservation, completedAt);
    await recordVirtualRoomGuestFee(
      { ...reservation, _id: new mongoose.Types.ObjectId(), tableSelectionSource: 'list' },
      completedAt,
    );
    expect(await AddonFee.countDocuments({ restaurantId: restaurant._id })).toBe(1);

    await generateInvoicesForPeriod('2026-08');
    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: '2026-08' });
    expect(invoice!.lines.map((l) => ({ d: l.description, q: l.quantity, a: l.amountCents }))).toEqual([
      { d: 'Core plan - 2026-08', q: 1, a: 9900 },
      { d: 'Virtual 3D room add-on (experimental) - 2026-08', q: 1, a: 5000 },
      { d: '3D table selection (4 guests)', q: 4, a: 800 },
    ]);
    expect(invoice!.totalCents).toBe(9900 + 5000 + 800);

    const fee = await AddonFee.findOne({ reservationId });
    expect(fee!.status).toBe('charged');
  });

  it('re-prices the open period invoice right after toggling', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    const period = utcBillingPeriod();
    await generateInvoicesForPeriod(period);
    await setVirtualRoomAddon(restaurantId, true);
    expect(await refreshPeriodInvoiceForRestaurant(restaurantId)).toBe(true);

    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: period });
    expect(invoice!.totalCents).toBe(9900 + 5000);
  });

  it('locks each month at the price in effect when it was billed', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    await setVirtualRoomAddon(restaurantId, true, new Date('2026-08-03T10:00:00Z'));

    await PlatformConfig.updateOne(
      { key: 'default' },
      { $set: { 'virtualRoomPricing.monthlyPriceCents': 7500 } },
    );
    await syncVirtualRoomBilledMonths(new Date('2026-08-25T00:00:00Z'));
    await syncVirtualRoomBilledMonths(new Date('2026-09-01T00:00:00Z'));
    await syncVirtualRoomBilledMonths(new Date('2026-09-02T00:00:00Z'));

    const sub = await Subscription.findOne({ restaurantId: restaurant._id }).lean();
    expect((sub as any).addons.virtualRoom3d.billedMonths).toEqual([
      { period: '2026-08', priceCents: 5000 },
      { period: '2026-09', priceCents: 7500 },
    ]);
  });

  it('stops billing new months once the add-on is turned off', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    await setVirtualRoomAddon(restaurantId, true, new Date('2026-08-03T10:00:00Z'));
    await setVirtualRoomAddon(restaurantId, false, new Date('2026-08-10T10:00:00Z'));
    await syncVirtualRoomBilledMonths(new Date('2026-09-01T00:00:00Z'));

    const sub = await Subscription.findOne({ restaurantId: restaurant._id }).lean();
    expect((sub as any).addons.virtualRoom3d.billedMonths).toEqual([
      { period: '2026-08', priceCents: 5000 },
    ]);
  });

  it('skips monthly billing while the plan no longer includes floor plans', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    await setVirtualRoomAddon(restaurantId, true, new Date('2026-08-03T10:00:00Z'));
    await Subscription.updateOne({ restaurantId: restaurant._id }, { $set: { plan: 'basic' } });
    await syncVirtualRoomBilledMonths(new Date('2026-09-01T00:00:00Z'));

    const sub = await Subscription.findOne({ restaurantId: restaurant._id }).lean();
    expect((sub as any).addons.virtualRoom3d.billedMonths).toEqual([
      { period: '2026-08', priceCents: 5000 },
    ]);
    expect((await getVirtualRoomAddonStatus(restaurantId)).active).toBe(false);
  });

  it('only exposes the scene to diners once published with the add-on active', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();

    await expect(publishVirtualRoom(restaurantId, true)).rejects.toThrow(/Billing/);
    await setVirtualRoomAddon(restaurantId, true);
    await expect(publishVirtualRoom(restaurantId, true)).rejects.toThrow(/Add tables/);

    await Table.create({
      restaurantId: restaurant._id,
      name: 'T1',
      minCapacity: 1,
      maxCapacity: 4,
      posX: 2,
      posY: 3,
      width: 2,
      height: 2,
      floorArea: 'Patio',
    });
    expect(await getPublicVirtualRoom(restaurantId)).toBeNull();
    await publishVirtualRoom(restaurantId, true);

    const scene = await getPublicVirtualRoom(restaurantId);
    expect(scene).toBeTruthy();
    expect(scene!.areas.map((a) => a.name)).toEqual(['Patio']);
    expect(scene!.areas[0]?.tables[0]).toMatchObject({ name: 'T1', posX: 2, posY: 3 });
    expect(await canSelectTableIn3d(restaurantId)).toBe(true);

    await setVirtualRoomAddon(restaurantId, false);
    expect(await getPublicVirtualRoom(restaurantId)).toBeNull();
    expect(await canSelectTableIn3d(restaurantId)).toBe(false);
  });

  it('counts diner 3D table-selection attempts only when published and active', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();

    expect(await recordVirtualRoomSelectionAttempt(restaurantId)).toBeNull();
    expect(await recordVirtualRoomSelectionAttempt('not-an-id')).toBeNull();

    await setVirtualRoomAddon(restaurantId, true);
    await Table.create({
      restaurantId: restaurant._id,
      name: 'T1',
      minCapacity: 1,
      maxCapacity: 4,
      posX: 2,
      posY: 3,
      width: 2,
      height: 2,
      floorArea: 'Main',
    });
    // Add-on on but not published yet.
    expect(await recordVirtualRoomSelectionAttempt(restaurantId)).toBeNull();

    await publishVirtualRoom(restaurantId, true);
    const first = await recordVirtualRoomSelectionAttempt(restaurantId);
    expect(first?.selectionAttemptCount).toBe(1);
    const second = await recordVirtualRoomSelectionAttempt(restaurantId);
    expect(second?.selectionAttemptCount).toBe(2);
    expect((await getVirtualRoomAddonStatus(restaurantId)).selectionAttemptCount).toBe(2);

    const room = await VirtualRoom.findOne({ restaurantId }).lean();
    expect(room?.selectionAttemptCount).toBe(2);

    await setVirtualRoomAddon(restaurantId, false);
    expect(await recordVirtualRoomSelectionAttempt(restaurantId)).toBeNull();
    expect((await VirtualRoom.findOne({ restaurantId }).lean())?.selectionAttemptCount).toBe(2);
  });

  it('skips restaurant invoice fees when the platform bills the diner', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    await recordVirtualRoomGuestFee(
      {
        _id: new mongoose.Types.ObjectId(),
        restaurantId: restaurant._id,
        partySize: 2,
        tableSelectionSource: 'virtual_3d',
        virtualRoomGuestFeeCents: 200,
        virtualRoomSelectionFeeMode: 'per_guest',
        virtualRoomSelectionFeePayer: 'diner',
      },
      new Date('2026-09-10T20:00:00Z'),
    );
    expect(await AddonFee.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  });

  it('skips restaurant invoice fees for combined (diner already paid platform fee)', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    await recordVirtualRoomGuestFee(
      {
        _id: new mongoose.Types.ObjectId(),
        restaurantId: restaurant._id,
        partySize: 2,
        tableSelectionSource: 'virtual_3d',
        virtualRoomGuestFeeCents: 200,
        virtualRoomRestaurantFeeCents: 1000,
        virtualRoomSelectionFeeMode: 'per_guest',
        virtualRoomSelectionFeePayer: 'combined',
      },
      new Date('2026-09-10T20:00:00Z'),
    );
    expect(await AddonFee.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  });

  it('invoices the platform cut for diner_share when the restaurant set a fee', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const reservationId = new mongoose.Types.ObjectId();
    await recordVirtualRoomGuestFee(
      {
        _id: reservationId,
        restaurantId: restaurant._id,
        partySize: 2,
        tableSelectionSource: 'virtual_3d',
        virtualRoomGuestFeeCents: 200,
        virtualRoomRestaurantFeeCents: 1000,
        virtualRoomSelectionFeeMode: 'per_guest',
        virtualRoomSelectionFeePayer: 'diner_share',
      },
      new Date('2026-09-10T20:00:00Z'),
    );
    const fee = await AddonFee.findOne({ reservationId });
    expect(fee).toMatchObject({ partySize: 2, unitFeeCents: 200, feeCents: 400, status: 'pending' });
  });

  it('skips diner_share invoice cut when the restaurant did not set a fee', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    await recordVirtualRoomGuestFee(
      {
        _id: new mongoose.Types.ObjectId(),
        restaurantId: restaurant._id,
        partySize: 2,
        tableSelectionSource: 'virtual_3d',
        virtualRoomGuestFeeCents: 200,
        virtualRoomRestaurantFeeCents: 0,
        virtualRoomSelectionFeeMode: 'per_guest',
        virtualRoomSelectionFeePayer: 'diner_share',
      },
      new Date('2026-09-10T20:00:00Z'),
    );
    expect(await AddonFee.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  });

  it('bills a flat per-table selection fee when mode is per_table', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    await setVirtualRoomAddon(restaurantId, true, new Date('2026-09-02T10:00:00Z'));

    const reservationId = new mongoose.Types.ObjectId();
    await recordVirtualRoomGuestFee(
      {
        _id: reservationId,
        restaurantId: restaurant._id,
        partySize: 5,
        tableSelectionSource: 'virtual_3d',
        virtualRoomGuestFeeCents: 200,
        virtualRoomSelectionFeeMode: 'per_table',
      },
      new Date('2026-09-10T20:00:00Z'),
    );
    const fee = await AddonFee.findOne({ reservationId });
    expect(fee).toMatchObject({ partySize: 5, unitFeeCents: 200, feeCents: 200 });

    await generateInvoicesForPeriod('2026-09');
    const invoice = await Invoice.findOne({ restaurantId: restaurant._id, billingPeriod: '2026-09' });
    expect(invoice!.lines.some((l) => l.description.includes('1 table pick') && l.amountCents === 200)).toBe(
      true,
    );
  });

  it('places multiple areas side by side or stacked in the overall scene', async () => {
    await setPlatformFlag(true);
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();
    await setVirtualRoomAddon(restaurantId, true);
    await Table.create([
      {
        restaurantId: restaurant._id,
        name: 'Main-1',
        minCapacity: 2,
        maxCapacity: 4,
        floorArea: 'Main',
        posX: 0,
        posY: 0,
        width: 2,
        height: 2,
      },
      {
        restaurantId: restaurant._id,
        name: 'Hall-1',
        minCapacity: 2,
        maxCapacity: 4,
        floorArea: 'Hall',
        posX: 0,
        posY: 0,
        width: 2,
        height: 2,
      },
    ]);
    const { updateVirtualRoom, getVirtualRoomEditor } = await import('../services/virtualRoom.js');
    await updateVirtualRoom(restaurantId, { areaLayoutMode: 'adjacent' });
    let editor = await getVirtualRoomEditor(restaurantId);
    expect(editor.areaLayoutMode).toBe('adjacent');
    expect(editor.scene.areas).toHaveLength(2);
    const adjacentXs = editor.scene.areas.map((a) => a.offsetXM);
    expect(adjacentXs[0]).toBe(0);
    expect(adjacentXs[1]).toBeGreaterThan(0);

    await updateVirtualRoom(restaurantId, { areaLayoutMode: 'stack' });
    editor = await getVirtualRoomEditor(restaurantId);
    expect(editor.areaLayoutMode).toBe('stack');
    const stackYs = editor.scene.areas.map((a) => a.offsetYM);
    expect(stackYs[0]).toBe(0);
    expect(stackYs[1]).toBeGreaterThan(0);
  });

  it('builds an ops scene from the floor plan without the add-on', async () => {
    await setPlatformFlag(false);
    const { restaurant } = await seedRestaurant();
    await Table.create({
      restaurantId: restaurant._id,
      name: 'Ops-1',
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Main',
      posX: 1,
      posY: 1,
      width: 2,
      height: 2,
    });
    const scene = await getVirtualRoomOpsScene(restaurant._id.toString());
    expect(scene.areas.some((a) => a.tables.some((t) => t.name === 'Ops-1'))).toBe(true);
  });
});
