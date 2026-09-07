/**
 * Idempotent repair: Lunch shifts should run every day (incl. Sat/Sun),
 * matching Dinner. Safe to re-run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Shift } from '../src/models/Shift.js';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const result = await Shift.updateMany(
    { name: 'Lunch' },
    { $set: { daysOfWeek: ALL_DAYS } },
  );
  console.log(
    `Updated ${result.modifiedCount} Lunch shift(s) (matched ${result.matchedCount}).`,
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
