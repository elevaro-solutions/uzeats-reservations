import { Router } from 'express';
import { User } from '../models/User.js';
import { Reservation } from '../models/Reservation.js';
import { Integration } from '../models/Integration.js';
import { getAvailability } from '../services/availability.js';
import { createReservation, updateReservationStatus } from '../services/reservations.js';
import { logger } from '../lib/logger.js';
import { integrationAuth, type IntegrationAuthRequest } from '../middleware/integrationAuth.js';

/**
 * Partner booking API used by third-party booking sites, affiliates, and
 * the Google "Reserve a table" integration. Authenticated with a
 * per-integration API key (see the Integrations page in the Partner Hub).
 */
const router: ReturnType<typeof Router> = Router();

router.use(integrationAuth as any);

// Google Reserve-style availability feed
router.get('/availability', async (req: IntegrationAuthRequest, res) => {
  try {
    const date = req.query.date as string;
    const partySize = Number(req.query.partySize ?? 2);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
      return;
    }
    const slots = await getAvailability({
      restaurantId: req.restaurant._id.toString(),
      date,
      partySize,
    });
    res.json({
      restaurantId: req.restaurant._id.toString(),
      restaurantName: req.restaurant.name,
      date,
      partySize,
      slots: slots.filter((s) => s.available).map((s) => ({ time: s.time })),
    });
  } catch (err) {
    logger.error({ err }, '[partner] GET /availability error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a booking on behalf of a partner-site diner
router.post('/bookings', async (req: IntegrationAuthRequest, res) => {
  try {
    const { slotStart, partySize, guest, occasion, notes } = req.body ?? {};
    if (!slotStart || !partySize || !guest?.firstName) {
      res.status(400).json({
        error: 'slotStart, partySize and guest { firstName, lastName, email or phone } are required',
      });
      return;
    }

    // Find or create the diner account for this guest
    let diner = null;
    if (guest.email) diner = await User.findOne({ email: String(guest.email).toLowerCase() });
    if (!diner && guest.phone) diner = await User.findOne({ phone: guest.phone });
    if (!diner) {
      diner = await User.create({
        email: guest.email?.toLowerCase(),
        phone: guest.phone,
        firstName: guest.firstName,
        lastName: guest.lastName ?? '',
        role: 'diner',
      });
    }

    const result = await createReservation({
      dinerId: diner._id.toString(),
      restaurantId: req.restaurant._id.toString(),
      partySize: Number(partySize),
      slotStart: new Date(slotStart),
      occasion,
      guestNotes: notes,
      source: 'network',
    });

    await Integration.findByIdAndUpdate(req.integration._id, {
      $inc: { bookingsCount: 1 },
      lastUsedAt: new Date(),
    });

    res.status(201).json({
      booking: {
        id: result.reservation._id.toString(),
        status: result.reservation.status,
        slotStart: result.reservation.slotStart.toISOString(),
        partySize: result.reservation.partySize,
        depositRequired: result.reservation.depositAmountCents > 0,
        depositAmountCents: result.reservation.depositAmountCents,
      },
    });
  } catch (err) {
    logger.error({ err }, '[partner] POST /bookings error');
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(message.includes('No tables') || message.includes(':') ? 409 : 500).json({ error: message });
  }
});

// Cancel a partner booking
router.post('/bookings/:id/cancel', async (req: IntegrationAuthRequest, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const updated = await updateReservationStatus(
      req.params.id as string,
      'cancelled',
      reservation.dinerId.toString(),
      req.body?.reason ?? 'Cancelled by partner',
    );
    res.json({ booking: { id: updated._id.toString(), status: updated.status } });
  } catch (err) {
    logger.error({ err }, '[partner] POST /bookings/:id/cancel error');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

// Booking status lookup
router.get('/bookings/:id', async (req: IntegrationAuthRequest, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.restaurantId.equals(req.restaurant._id)) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({
      booking: {
        id: reservation._id.toString(),
        status: reservation.status,
        slotStart: reservation.slotStart.toISOString(),
        partySize: reservation.partySize,
      },
    });
  } catch (err) {
    logger.error({ err }, '[partner] GET /bookings/:id error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as partnerRouter };
