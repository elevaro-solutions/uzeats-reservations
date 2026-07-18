import { Router } from 'express';
import { Reservation } from '../models/Reservation.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { logger } from '../lib/logger.js';
import { posAuth, type PosAuthRequest } from '../middleware/posAuth.js';
import { recordGuestSpend } from '../services/guests.js';
import { claimTableSlots, releaseTableSlotClaims } from '../services/tableSlotClaims.js';

const router: ReturnType<typeof Router> = Router();

router.use(posAuth as any);

router.get('/reservations', async (req: PosAuthRequest, res) => {
  try {
    const restaurantId = req.restaurant._id.toString();
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const reservations = await Reservation.find({
      restaurantId,
      slotStart: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed', 'seated', 'completed', 'no_show'] },
    }).sort({ slotStart: 1 });

    const items = await Promise.all(
      reservations.map(async (r) => {
        const diner = await User.findById(r.dinerId).select('firstName lastName phone email');
        const tables = await Table.find({ _id: { $in: r.tableIds } }).select('name floorArea');
        return {
          id: r._id.toString(),
          partySize: r.partySize,
          slotStart: r.slotStart.toISOString(),
          slotEnd: r.slotEnd.toISOString(),
          status: r.status,
          occasion: r.occasion,
          guestNotes: r.guestNotes,
          diner: diner
            ? {
                firstName: diner.firstName,
                lastName: diner.lastName,
                phone: diner.phone,
                email: diner.email,
              }
            : null,
          tables: tables.map((t) => ({ name: t.name, floorArea: t.floorArea })),
        };
      }),
    );

    res.json({ reservations: items });
  } catch (err) {
    logger.error({ err }, '[pos] GET /reservations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reservations/:id/seat', async (req: PosAuthRequest, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status !== 'confirmed') {
      res.status(400).json({ error: `Cannot seat reservation with status: ${reservation.status}` });
      return;
    }

    reservation.status = 'seated';
    await reservation.save();

    logger.info(
      { reservationId: reservation._id.toString(), restaurantId: req.restaurant._id.toString() },
      '[pos] reservation seated',
    );

    res.json({ success: true, status: reservation.status });
  } catch (err) {
    logger.error({ err }, '[pos] POST /reservations/:id/seat error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reservations/:id/complete', async (req: PosAuthRequest, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status !== 'seated') {
      res.status(400).json({ error: `Cannot complete reservation with status: ${reservation.status}` });
      return;
    }

    reservation.status = 'completed';
    const spendCents = req.body?.totalSpendCents;
    if (typeof spendCents === 'number' && spendCents > 0) {
      reservation.totalSpendCents = spendCents;
      await recordGuestSpend({
        restaurantId: reservation.restaurantId.toString(),
        dinerId: reservation.dinerId.toString(),
        amountCents: spendCents,
        reservationId: reservation._id.toString(),
      });
    }
    await reservation.save();

    logger.info(
      { reservationId: reservation._id.toString(), spendCents },
      '[pos] reservation completed',
    );

    res.json({ success: true, status: reservation.status });
  } catch (err) {
    logger.error({ err }, '[pos] POST /reservations/:id/complete error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reservations/:id/no-show', async (req: PosAuthRequest, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (!['confirmed', 'seated'].includes(reservation.status)) {
      res.status(400).json({ error: `Cannot mark no-show for status: ${reservation.status}` });
      return;
    }

    reservation.status = 'no_show';
    await reservation.save();

    logger.info(
      { reservationId: reservation._id.toString() },
      '[pos] reservation marked no-show',
    );

    res.json({ success: true, status: reservation.status });
  } catch (err) {
    logger.error({ err }, '[pos] POST /reservations/:id/no-show error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/walkin', async (req: PosAuthRequest, res) => {
  try {
    const { partySize, guestNotes, tableName } = req.body ?? {};
    if (!partySize || typeof partySize !== 'number') {
      res.status(400).json({ error: 'partySize is required' });
      return;
    }

    const restaurantId = req.restaurant._id;
    let tableIds: string[] = [];

    if (tableName) {
      const table = await Table.findOne({ restaurantId, name: tableName, active: true });
      if (table) tableIds = [table._id.toString()];
    }

    const now = new Date();
    const slotEnd = new Date(now.getTime() + 90 * 60_000);

    const reservation = await Reservation.create({
      restaurantId,
      dinerId: req.restaurant.ownerId,
      tableIds,
      partySize,
      slotStart: now,
      slotEnd,
      status: 'seated',
      occasion: 'none',
      guestNotes: guestNotes ?? '',
      source: 'walkin',
    });

    if (tableIds[0]) {
      try {
        await claimTableSlots({
          restaurantId,
          tableId: tableIds[0],
          reservationId: reservation._id,
          slotStart: now,
          slotEnd,
        });
      } catch (err) {
        await releaseTableSlotClaims(reservation._id);
        await Reservation.deleteOne({ _id: reservation._id });
        throw err;
      }
    }

    logger.info(
      { reservationId: reservation._id.toString(), partySize },
      '[pos] walk-in created',
    );

    res.status(201).json({
      success: true,
      reservation: {
        id: reservation._id.toString(),
        partySize: reservation.partySize,
        slotStart: reservation.slotStart.toISOString(),
        status: reservation.status,
      },
    });
  } catch (err) {
    logger.error({ err }, '[pos] POST /walkin error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tables', async (req: PosAuthRequest, res) => {
  try {
    const restaurantId = req.restaurant._id.toString();
    const tables = await Table.find({ restaurantId, active: true });
    const now = new Date();

    const activeReservations = await Reservation.find({
      restaurantId,
      status: { $in: ['confirmed', 'seated'] },
      slotStart: { $lte: now },
      slotEnd: { $gte: now },
    });

    const occupiedTableIds = new Set<string>();
    for (const r of activeReservations) {
      for (const tId of r.tableIds) {
        occupiedTableIds.add(tId.toString());
      }
    }

    const items = tables.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      floorArea: t.floorArea,
      minCapacity: t.minCapacity,
      maxCapacity: t.maxCapacity,
      status: occupiedTableIds.has(t._id.toString()) ? 'occupied' : 'available',
    }));

    res.json({ tables: items });
  } catch (err) {
    logger.error({ err }, '[pos] GET /tables error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/spend', async (req: PosAuthRequest, res) => {
  try {
    const { reservationId, amountCents } = req.body ?? {};
    if (!reservationId || typeof amountCents !== 'number') {
      res.status(400).json({ error: 'reservationId and amountCents are required' });
      return;
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    reservation.totalSpendCents = (reservation.totalSpendCents ?? 0) + amountCents;
    await reservation.save();

    await recordGuestSpend({
      restaurantId: reservation.restaurantId.toString(),
      dinerId: reservation.dinerId.toString(),
      amountCents,
      reservationId: reservation._id.toString(),
    });

    logger.info(
      { reservationId, amountCents, dinerId: reservation.dinerId.toString() },
      '[pos] spend logged',
    );

    res.json({ success: true, totalSpendCents: (reservation as any).totalSpendCents });
  } catch (err) {
    logger.error({ err }, '[pos] POST /spend error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as posRouter };
