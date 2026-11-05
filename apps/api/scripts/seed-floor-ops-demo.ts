/**
 * Dev-only: fills Live floor with demo reservations relative to "now" so every
 * table status (reserved, seated, turning, free + upcoming) and the Arriving
 * list show up. Re-running replaces the previous demo rows.
 *
 *   pnpm --filter @reservations/api exec tsx scripts/seed-floor-ops-demo.ts [restaurantId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Reservation } from '../src/models/Reservation.js';
import { Restaurant } from '../src/models/Restaurant.js';
import { Table } from '../src/models/Table.js';
import { User } from '../src/models/User.js';

const DEFAULT_RESTAURANT_ID = '6ae095ac626abc7b1e59ff95';
const DEMO_MARKER = '[floor-demo]';
const DEMO_EMAIL_DOMAIN = 'floor-demo.tablevera.test';
const MIN = 60_000;

const GUESTS = [
  ['Dan', 'Diner'],
  ['Mia', 'Chen'],
  ['Omar', 'Haddad'],
  ['Sofia', 'Rossi'],
  ['Liam', 'Walker'],
  ['Aziza', 'Karimova'],
  ['Noah', 'Kim'],
  ['Emma', 'Lopez'],
  ['Jamshid', 'Tursunov'],
  ['Grace', 'Park'],
] as const;

type DemoRow = {
  table: string | null;
  guest: number;
  partySize: number;
  startOffsetMin: number;
  durationMin?: number;
  status: 'pending' | 'confirmed' | 'seated';
  note: string;
};

/** Table names match the dev restaurant; missing names are skipped. */
const ROWS: DemoRow[] = [
  // AC2-2: seated 40 min ago, two more bookings later today
  { table: 'AC2-2', guest: 0, partySize: 3, startOffsetMin: -40, status: 'seated', note: 'Anniversary' },
  { table: 'AC2-2', guest: 1, partySize: 4, startOffsetMin: 120, status: 'confirmed', note: '' },
  { table: 'AC2-2', guest: 2, partySize: 2, startOffsetMin: 300, status: 'pending', note: '' },
  // AC2-3: reserved (arrives in 20 min), then one later
  { table: 'AC2-3', guest: 3, partySize: 2, startOffsetMin: 20, status: 'confirmed', note: 'Window seat if possible' },
  { table: 'AC2-3', guest: 4, partySize: 4, startOffsetMin: 180, status: 'confirmed', note: '' },
  // AC2-4: turning (seated 80 of 90 min), one later
  { table: 'AC2-4', guest: 5, partySize: 5, startOffsetMin: -80, status: 'seated', note: '' },
  { table: 'AC2-4', guest: 6, partySize: 6, startOffsetMin: 240, status: 'confirmed', note: '' },
  // AC2-5: free now, big parties later
  { table: 'AC2-5', guest: 7, partySize: 8, startOffsetMin: 90, status: 'confirmed', note: 'Birthday cake at 9' },
  { table: 'AC2-5', guest: 8, partySize: 10, startOffsetMin: 360, status: 'confirmed', note: '' },
  // Arriving, not assigned to a table yet
  { table: null, guest: 9, partySize: 2, startOffsetMin: 10, status: 'confirmed', note: '' },
  { table: null, guest: 2, partySize: 4, startOffsetMin: 25, status: 'confirmed', note: '' },
];

async function ensureDemoDiners() {
  const ids: mongoose.Types.ObjectId[] = [];
  for (const [i, [firstName, lastName]] of GUESTS.entries()) {
    const email = `guest${i + 1}@${DEMO_EMAIL_DOMAIN}`;
    const user = await User.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, firstName, lastName, role: 'diner' } },
      { upsert: true, new: true },
    );
    ids.push(user._id);
  }
  return ids;
}

async function main() {
  const restaurantId = process.argv[2] || DEFAULT_RESTAURANT_ID;
  await mongoose.connect(env.MONGODB_URI);

  const restaurant = await Restaurant.findById(restaurantId).select('name').lean();
  if (!restaurant) throw new Error(`Restaurant ${restaurantId} not found`);

  const tables = await Table.find({ restaurantId, active: true }).select('name').lean();
  const tableByName = new Map(tables.map((t) => [t.name, t._id]));
  const diners = await ensureDemoDiners();

  const removed = await Reservation.deleteMany({
    restaurantId,
    guestNotes: { $regex: `^\\${DEMO_MARKER}` },
  });

  const now = Date.now();
  let created = 0;
  for (const row of ROWS) {
    const tableId = row.table ? tableByName.get(row.table) : null;
    if (row.table && !tableId) {
      console.warn(`Skipping ${row.table}: no such active table`);
      continue;
    }
    const slotStart = new Date(now + row.startOffsetMin * MIN);
    const slotEnd = new Date(slotStart.getTime() + (row.durationMin ?? 90) * MIN);
    await Reservation.create({
      restaurantId,
      dinerId: diners[row.guest],
      tableIds: tableId ? [tableId] : [],
      partySize: row.partySize,
      slotStart,
      slotEnd,
      status: row.status,
      seatedAt: row.status === 'seated' ? slotStart : undefined,
      guestNotes: `${DEMO_MARKER} ${row.note}`.trim(),
    });
    created += 1;
  }

  console.log(
    `${restaurant.name}: removed ${removed.deletedCount} old demo reservation(s), created ${created}.`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
