import type { Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import { verifyElevaroNotifierSignature } from '../services/elevaroNotifier.js';
import { updateReservationStatus } from '../services/reservations.js';

type ActionBody = {
  platformId?: string;
  platformUserId?: string;
  eventType?: string;
  resourceType?: string;
  resourceId?: string;
  action?: 'accept' | 'reject';
  deliveryId?: string;
  channel?: string;
};

type ReqWithRaw = Request & { rawBody?: string };

/**
 * Elevaro Merchant Notifier action callbacks (Accept / Reject).
 * Signature: X-Elevaro-Signature = hmac-sha256(rawBody, ELEVARO_NOTIFIER_HMAC_SECRET)
 */
export async function handleElevaroNotifierWebhook(
  req: ReqWithRaw,
  res: Response,
): Promise<void> {
  const raw =
    req.rawBody ??
    (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

  const signature = req.header('x-elevaro-signature') ?? undefined;
  if (!verifyElevaroNotifierSignature(raw, signature)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let body: ActionBody;
  try {
    body =
      typeof req.body === 'object' && req.body && typeof req.body !== 'string'
        ? (req.body as ActionBody)
        : (JSON.parse(raw) as ActionBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  if (body.platformId && body.platformId !== 'tablevera') {
    res.status(400).json({ error: 'Wrong platform' });
    return;
  }

  if (!body.platformUserId || !body.resourceId || !body.action) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  if (body.resourceType && body.resourceType !== 'reservation') {
    res.status(400).json({ error: 'Unsupported resourceType' });
    return;
  }

  const status = body.action === 'accept' ? 'confirmed' : 'cancelled';
  const reason =
    body.action === 'reject'
      ? `Rejected via Elevaro ${body.channel ?? 'messenger'}`
      : undefined;

  try {
    await updateReservationStatus(
      body.resourceId,
      status,
      body.platformUserId,
      reason,
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, body }, '[elevaro-notifier] action failed');
    const message = err instanceof Error ? err.message : 'Action failed';
    res.status(400).json({ error: message });
  }
}
