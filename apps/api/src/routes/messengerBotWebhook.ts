import type { Request, Response } from 'express';
import { getBotPlatformConfig } from '../services/messengerBot/config.js';
import { handleTelegramUpdate } from '../services/messengerBot/updates.js';
import type { TelegramUpdate } from '../services/messengerBot/telegramApi.js';
import { logger } from '../lib/logger.js';

/** POST /webhooks/messenger-bot — Telegram merchant bot updates. */
export async function messengerBotWebhookHandler(req: Request, res: Response): Promise<void> {
  const cfg = await getBotPlatformConfig();
  if (!cfg.telegramToken || !cfg.telegramWebhookSecret) {
    res.status(503).json({ ok: false });
    return;
  }

  const secret = req.header('x-telegram-bot-api-secret-token');
  if (!secret || secret !== cfg.telegramWebhookSecret) {
    res.status(401).json({ ok: false });
    return;
  }

  // Ack immediately; process async so Telegram does not retry.
  res.status(200).json({ ok: true });
  const update = req.body as TelegramUpdate;
  void handleTelegramUpdate(update).catch((err) =>
    logger.warn({ err }, '[messenger-bot] webhook handle failed'),
  );
}
