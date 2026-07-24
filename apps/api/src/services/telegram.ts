import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { ValidationError } from '../lib/errors.js';

const TELEGRAM_API = 'https://api.telegram.org';

export interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

let polling = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollOffset = 0;

export function isTelegramConfigured(): boolean {
  return !!env.TELEGRAM_BOT_TOKEN;
}

export function isValidTelegramChatId(chatId: string): boolean {
  return /^-?\d+$/.test(chatId.trim());
}

async function callTelegramApi<T = unknown>(
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'Telegram bot token not configured' };
  }

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  return (await res.json()) as TelegramApiResponse<T>;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.debug({ chatId, text }, '[telegram:dev] stub');
    return;
  }

  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (opts?.parseMode) payload.parse_mode = opts.parseMode;

  const res = await callTelegramApi('sendMessage', payload);
  if (!res.ok) {
    throw new Error(res.description ?? 'Failed to send Telegram message');
  }
}

export async function sendTelegramNotification(
  chatId: string,
  title: string,
  body: string,
): Promise<void> {
  await sendTelegramMessage(chatId, `*${title}*\n${body}`, { parseMode: 'Markdown' });
}

export async function verifyTelegramChat(chatId: string): Promise<void> {
  const trimmed = chatId.trim();
  if (!isValidTelegramChatId(trimmed)) {
    throw new ValidationError('Invalid Telegram chat ID');
  }

  if (!env.TELEGRAM_BOT_TOKEN) return;

  const res = await callTelegramApi('getChat', { chat_id: trimmed });
  if (!res.ok) {
    throw new ValidationError(
      'Could not verify this chat ID. Open @uzeatsbot in Telegram, send /start, then paste the ID it replies with.',
    );
  }
}

function startMessage(chatId: number): string {
  return [
    '👋 Welcome to Tablevera!',
    '',
    `Your Chat ID is: \`${chatId}\``,
    '',
    'Paste this ID in your Tablevera profile under Notification preferences to receive reservation updates here.',
  ].join('\n');
}

function helpMessage(): string {
  return [
    'Tablevera notification bot',
    '',
    '/start — get your Chat ID for linking notifications',
    '/help — show this message',
  ].join('\n');
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.chat?.id) return;

  const text = message.text.trim();
  const chatId = message.chat.id;

  if (text === '/start' || text.startsWith('/start ')) {
    await sendTelegramMessage(String(chatId), startMessage(chatId), { parseMode: 'Markdown' });
    return;
  }

  if (text === '/help') {
    await sendTelegramMessage(String(chatId), helpMessage());
  }
}

export function verifyTelegramWebhookSecret(req: Request): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return true;
  const header = req.headers['x-telegram-bot-api-secret-token'];
  return typeof header === 'string' && header === env.TELEGRAM_WEBHOOK_SECRET;
}

export async function handleTelegramWebhook(req: Request, res: Response): Promise<void> {
  if (!verifyTelegramWebhookSecret(req)) {
    res.status(403).send('Forbidden');
    return;
  }

  const update = req.body as TelegramUpdate;
  res.status(200).json({ ok: true });

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    logger.error({ err, updateId: update.update_id }, '[telegram] webhook handler failed');
  }
}

async function pollTelegramUpdates(): Promise<void> {
  if (!polling) return;

  try {
    const res = await callTelegramApi<TelegramUpdate[]>('getUpdates', {
      offset: pollOffset,
      timeout: 25,
      allowed_updates: ['message'],
    });

    if (res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        pollOffset = update.update_id + 1;
        await handleTelegramUpdate(update);
      }
    } else if (!res.ok) {
      logger.error({ description: res.description }, '[telegram] getUpdates failed');
    }
  } catch (err) {
    logger.error({ err }, '[telegram] polling failed');
  }

  if (polling) {
    pollTimer = setTimeout(() => {
      void pollTelegramUpdates();
    }, 100);
  }
}

export async function startTelegramPolling(): Promise<void> {
  if (!isTelegramConfigured()) return;

  await callTelegramApi('deleteWebhook', { drop_pending_updates: false });
  polling = true;
  pollOffset = 0;
  logger.info('[telegram] long-polling started (development mode)');
  void pollTelegramUpdates();
}

export function stopTelegramPolling(): void {
  polling = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

async function registerTelegramWebhook(): Promise<void> {
  const baseUrl = env.API_PUBLIC_URL.replace(/\/$/, '');
  const url = `${baseUrl}/webhooks/telegram`;

  const body: Record<string, unknown> = {
    url,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  };
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = env.TELEGRAM_WEBHOOK_SECRET;
  }

  const res = await callTelegramApi('setWebhook', body);
  if (!res.ok) {
    throw new Error(res.description ?? 'Failed to register Telegram webhook');
  }

  logger.info({ url }, '[telegram] webhook registered');
}

export async function startTelegramBot(): Promise<void> {
  if (!isTelegramConfigured()) {
    logger.info('[telegram] bot token not set — notifications will be stubbed');
    return;
  }

  if (env.NODE_ENV === 'production' && env.API_PUBLIC_URL) {
    if (!env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn('[telegram] TELEGRAM_WEBHOOK_SECRET is not set — webhook requests are not verified');
    }
    await registerTelegramWebhook();
    return;
  }

  await startTelegramPolling();
}
