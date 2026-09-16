import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { generateDuePeriodInvoices } from './invoices.js';

const connection = { url: env.REDIS_URL };

export const billingQueue = new Queue('billing', { connection });

export async function runPeriodInvoiceJob() {
  try {
    const result = await generateDuePeriodInvoices();
    logger.info(
      {
        previous: result.previous,
        current: result.current,
      },
      'period invoices generated',
    );
    return result;
  } catch (err) {
    logger.error({ err }, 'period invoice job failed');
    throw err;
  }
}

export function startBillingWorker() {
  if (process.env.NODE_ENV === 'test') return;

  void runPeriodInvoiceJob().catch((err) => {
    logger.error({ err }, 'period invoice job failed on startup');
  });

  void billingQueue.add(
    'generate-period-invoices',
    {},
    { repeat: { pattern: '0 4 * * *' }, jobId: 'billing-period-invoices-daily' },
  );

  new Worker(
    'billing',
    async (job) => {
      if (job.name === 'generate-period-invoices') {
        await runPeriodInvoiceJob();
      }
    },
    { connection },
  );
}
