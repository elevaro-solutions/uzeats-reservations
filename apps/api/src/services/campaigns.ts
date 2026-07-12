import { Queue, Worker } from 'bullmq';
import { Campaign } from '../models/Campaign.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { sendEmail } from './notifications.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const connection = { url: env.REDIS_URL };

export const campaignQueue = new Queue('campaigns', { connection });

/** Resolve the audience for a campaign from the restaurant's guest profiles. */
async function resolveRecipients(campaign: {
  restaurantId: { toString(): string };
  targetTags?: string[];
  targetVipStatus?: string | null;
}) {
  const filter: Record<string, unknown> = { restaurantId: campaign.restaurantId };
  if (campaign.targetTags?.length) filter.tags = { $in: campaign.targetTags };
  if (campaign.targetVipStatus) filter.vipStatus = campaign.targetVipStatus;

  const profiles = await GuestProfile.find(filter).select('dinerId');
  const users = await User.find({
    _id: { $in: profiles.map((p) => p.dinerId) },
    email: { $exists: true, $ne: null },
  }).select('email firstName');
  return users;
}

export async function executeCampaign(campaignId: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status === 'sent' || campaign.status === 'cancelled') return campaign;

  const restaurant = await Restaurant.findById(campaign.restaurantId);
  const recipients = await resolveRecipients(campaign);

  let sent = 0;
  for (const user of recipients) {
    if (!user.email) continue;
    try {
      const body = campaign.body
        .replaceAll('{{firstName}}', user.firstName)
        .replaceAll('{{restaurantName}}', restaurant?.name ?? '');
      await sendEmail(user.email, campaign.subject, body);
      sent++;
    } catch (err) {
      logger.error({ err, email: user.email }, '[campaigns] send failed');
    }
  }

  campaign.status = 'sent';
  campaign.sentAt = new Date();
  campaign.recipientCount = sent;
  await campaign.save();
  logger.info({ campaignId, sent }, '[campaigns] campaign sent');
  return campaign;
}

/** Queue a scheduled campaign for its scheduled time (or run now if past). */
export async function scheduleCampaign(campaignId: string, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await campaignQueue.add(
    'send-campaign',
    { campaignId },
    { delay, jobId: `campaign-${campaignId}` },
  );
}

let workerStarted = false;

export function startCampaignWorker() {
  if (workerStarted) return;
  workerStarted = true;

  new Worker(
    'campaigns',
    async (job) => {
      if (job.name === 'send-campaign') {
        const { campaignId } = job.data as { campaignId: string };
        const campaign = await Campaign.findById(campaignId);
        if (campaign?.status !== 'scheduled') return;
        await executeCampaign(campaignId);
      }
    },
    { connection },
  );

  logger.info('[jobs] campaign worker started');
}
