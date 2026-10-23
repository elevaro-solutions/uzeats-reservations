import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { Reservation, Restaurant, Table, User } from '../../models/index.js';
import type { ReservationCardData } from './reservationCard.js';

export async function loadReservationCard(
  reservationId: string,
): Promise<(ReservationCardData & { restaurantId: string }) | null> {
  if (!mongoose.isValidObjectId(reservationId)) return null;
  const reservation = await Reservation.findById(reservationId).lean();
  if (!reservation) return null;

  const [restaurant, diner, tables] = await Promise.all([
    Restaurant.findById(reservation.restaurantId).select('name').lean(),
    User.findById(reservation.dinerId).select('firstName lastName phone').lean(),
    reservation.tableIds?.length
      ? Table.find({ _id: { $in: reservation.tableIds } }).select('name').lean()
      : Promise.resolve([]),
  ]);

  const guestName = diner
    ? [diner.firstName, diner.lastName].filter(Boolean).join(' ').trim()
    : null;
  const tableLabels = (tables as Array<{ name?: string }>)
    .map((t) => t.name)
    .filter((x): x is string => Boolean(x));

  const base = env.DASHBOARD_APP_URL?.replace(/\/$/, '') ?? '';
  const dashboardUrl = base ? `${base}/reservations/${reservationId}` : null;

  return {
    reservationId: String(reservation._id),
    restaurantId: String(reservation.restaurantId),
    status: String(reservation.status),
    restaurantName: restaurant?.name ?? null,
    guestName: guestName || null,
    guestPhone: diner?.phone ?? null,
    partySize: reservation.partySize,
    slotStart: reservation.slotStart,
    slotEnd: reservation.slotEnd ?? null,
    occasion: reservation.occasion ?? null,
    guestNotes: reservation.guestNotes ?? null,
    tableLabels,
    source: reservation.source ?? null,
    cancellationReason: reservation.cancellationReason ?? null,
    requiresManualApproval: reservation.requiresManualApproval === true,
    dashboardUrl,
  };
}
