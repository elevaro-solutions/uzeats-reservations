import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { runAgreementReminderJob } from './legalAgreements.js';

const connection = { url: env.REDIS_URL };

export const agreementReminderQueue = new Queue('agreement-reminders', { connection });

export function startAgreementReminderWorker() {
  if (process.env.NODE_ENV === 'test') return;

  void runAgreementReminderJob()
    .then((result) => {
      logger.info(result, 'agreement reminder job finished (startup)');
    })
    .catch((err) => {
      logger.error({ err }, 'agreement reminder job failed on startup');
    });

  void agreementReminderQueue.add(
    'send-agreement-reminders',
    {},
    { repeat: { pattern: '0 15 * * *' }, jobId: 'agreement-reminders-daily' },
  );

  new Worker(
    'agreement-reminders',
    async (job) => {
      if (job.name === 'send-agreement-reminders') {
        const result = await runAgreementReminderJob();
        logger.info(result, 'agreement reminder job finished');
        return result;
      }
    },
    { connection },
  );
}
