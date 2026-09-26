import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

function notifierConfigured(): boolean {
  return Boolean(env.ELEVARO_NOTIFIER_URL && env.ELEVARO_NOTIFIER_API_KEY);
}

export class ElevaroTelegramLinkLimitError extends Error {
  readonly code = 'TELEGRAM_LINK_LIMIT' as const;
  readonly maxLinks: number;

  constructor(message: string, maxLinks = 2) {
    super(message);
    this.name = 'ElevaroTelegramLinkLimitError';
    this.maxLinks = maxLinks;
  }
}

/**
 * Fan-out actionable merchant alerts to Elevaro Merchant Notifier
 * (Telegram / WhatsApp). No-op when ELEVARO_NOTIFIER_* is unset.
 */
export async function sendElevaroMerchantNotification(input: {
  platformUserIds: string[];
  eventType: string;
  resourceType: string;
  resourceId: string;
  idempotencyKey: string;
  /** Overrides notifier manifest title when set */
  title?: string;
  /** Overrides notifier manifest body when set */
  body?: string;
  payload?: Record<string, unknown>;
  actions?: Array<'accept' | 'reject' | 'open'>;
  actionLabels?: Partial<Record<'accept' | 'reject' | 'open', string>>;
  openUrl?: string;
}): Promise<void> {
  if (!notifierConfigured()) return;
  if (input.platformUserIds.length === 0) return;

  const base = env.ELEVARO_NOTIFIER_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': env.ELEVARO_NOTIFIER_API_KEY,
      },
      body: JSON.stringify({
        platformId: 'tablevera',
        idempotencyKey: input.idempotencyKey,
        recipients: input.platformUserIds.map((platformUserId) => ({
          platformUserId,
        })),
        eventType: input.eventType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        title: input.title,
        body: input.body,
        payload: input.payload,
        actions: input.actions,
        actionLabels: input.actionLabels,
        openUrl: input.openUrl,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        { status: res.status, text, eventType: input.eventType },
        '[elevaro-notifier] notify failed',
      );
    }
  } catch (err) {
    logger.warn({ err, eventType: input.eventType }, '[elevaro-notifier] notify error');
  }
}

export async function createElevaroTelegramLink(
  platformUserId: string,
): Promise<{ deepLink: string; expiresAt: string } | null> {
  if (!notifierConfigured()) return null;
  const base = env.ELEVARO_NOTIFIER_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/v1/links/telegram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': env.ELEVARO_NOTIFIER_API_KEY,
    },
    body: JSON.stringify({ platformUserId, platformId: 'tablevera' }),
  });
  if (res.status === 409) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      maxLinks?: number;
    } | null;
    throw new ElevaroTelegramLinkLimitError(
      body?.error || 'Telegram link limit reached',
      body?.maxLinks ?? 2,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elevaro link failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ deepLink: string; expiresAt: string }>;
}

export async function listElevaroTelegramLinks(
  platformUserId: string,
): Promise<{ links: Array<{ chatId: string; linkedAt: string }>; maxLinks: number } | null> {
  if (!notifierConfigured()) return null;
  const base = env.ELEVARO_NOTIFIER_URL.replace(/\/$/, '');
  const url = new URL(`${base}/v1/links/telegram`);
  url.searchParams.set('platformUserId', platformUserId);
  url.searchParams.set('platformId', 'tablevera');
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Api-Key': env.ELEVARO_NOTIFIER_API_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elevaro list links failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    links: Array<{ chatId: string; linkedAt: string }>;
    maxLinks: number;
  }>;
}

export function verifyElevaroNotifierSignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  const secret = env.ELEVARO_NOTIFIER_HMAC_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
