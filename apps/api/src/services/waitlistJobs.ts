import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import {
  expireStaleNotifiedWaitlistEntries,
  notifyOverdueWaitlistEntries,
} from './waitlist.js';
import { expireAbandonedIncompleteBookings } from './reservations.js';

const connection = { url: env.REDIS_URL };

export const waitlistQueue = new Queue('waitlist', { connection });

export async function runWaitlistExpiryJob() {
  try {
    const result = await expireStaleNotifiedWaitlistEntries();
    if (result.expired > 0) {
      logger.info(result, 'waitlist notified holds expired');
    }
    return result;
  } catch (err) {
    logger.error({ err }, 'waitlist expiry job failed');
    throw err;
  }
}

export async function runWaitlistOverdueJob() {
  try {
    const result = await notifyOverdueWaitlistEntries();
    if (result.notified > 0) {
      logger.info(result, 'waitlist overdue hosts notified');
    }
    return result;
  } catch (err) {
    logger.error({ err }, 'waitlist overdue job failed');
    throw err;
  }
}

export function startWaitlistWorker() {
  if (process.env.NODE_ENV === 'test') return;

  void waitlistQueue.add(
    'expire-notified',
    {},
    { repeat: { pattern: '* * * * *' }, jobId: 'waitlist-expire-notified' },
  );

  void waitlistQueue.add(
    'notify-overdue',
    {},
    { repeat: { pattern: '* * * * *' }, jobId: 'waitlist-notify-overdue' },
  );

  void waitlistQueue.add(
    'expire-card-holds',
    {},
    { repeat: { pattern: '* * * * *' }, jobId: 'booking-expire-card-holds' },
  );

  new Worker(
    'waitlist',
    async (job) => {
      if (job.name === 'expire-notified') {
        await runWaitlistExpiryJob();
      } else if (job.name === 'notify-overdue') {
        await runWaitlistOverdueJob();
      } else if (job.name === 'expire-card-holds') {
        const result = await expireAbandonedIncompleteBookings();
        if (result.expired > 0) {
          logger.info(result, 'incomplete card-hold bookings expired');
        }
      }
    },
    { connection },
  );
}
