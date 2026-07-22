import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { User } from '../models/User.js';
import { expireFifoPointBuckets, reconcileUserLoyaltyBuckets } from '../lib/loyaltyBuckets.js';

const connection = { url: env.REDIS_URL };

export const loyaltyQueue = new Queue('loyalty', { connection });

/** One-time style backfill so legacy ledgers get per-bucket remainingPoints. */
export async function migrateLoyaltyBuckets() {
  const users = await User.find({ loyaltyPoints: { $gt: 0 } }).select('_id');
  for (const user of users) {
    try {
      await reconcileUserLoyaltyBuckets(user._id.toString());
    } catch (err) {
      logger.error({ err, userId: user._id.toString() }, 'loyalty bucket migration failed');
    }
  }
}

export async function expireInactiveLoyaltyPoints() {
  try {
    const result = await expireFifoPointBuckets();
    if (result.expiredPoints > 0) {
      logger.info(result, 'loyalty FIFO buckets expired');
    }
    return result;
  } catch (err) {
    logger.error({ err }, 'loyalty FIFO expiry job failed');
    return { expiredUsers: 0, expiredPoints: 0 };
  }
}

export function startLoyaltyWorker() {
  if (process.env.NODE_ENV === 'test') return;

  void migrateLoyaltyBuckets().catch((err) => {
    logger.error({ err }, 'loyalty bucket migration failed on startup');
  });

  void loyaltyQueue.add(
    'expire-points',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'loyalty-expire-daily' },
  );

  new Worker(
    'loyalty',
    async (job) => {
      if (job.name === 'expire-points') {
        await expireInactiveLoyaltyPoints();
      }
    },
    { connection },
  );
}
