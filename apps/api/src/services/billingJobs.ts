import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { generateDuePeriodInvoices } from './invoices.js';

const connection = { url: env.REDIS_URL };

export const billingQueue = new Queue('billing', { connection });

export async function runPeriodInvoiceJob(opts: { autoCharge?: boolean } = {}) {
  try {
    const result = await generateDuePeriodInvoices(new Date(), opts);
    logger.info(
      {
        previous: result.previous,
        current: result.current,
        autoCharge: result.autoCharge,
        enforcement: result.enforcement,
        alerts: result.alerts,
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

  // Startup only refreshes invoices; charges and notices wait for the 04:00 UTC run.
  void runPeriodInvoiceJob({ autoCharge: false }).catch((err) => {
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
