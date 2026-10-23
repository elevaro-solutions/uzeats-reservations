import { randomBytes } from 'node:crypto';
import { PlatformConfig } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import {
  getBotPlatformConfig,
  invalidateBotPlatformConfig,
  messengerWebhookBaseUrl,
} from './config.js';
import { startMessengerBotNotifier } from './notifier.js';
import { TelegramApiError, telegramCall, type TelegramUpdate, type TelegramUser } from './telegramApi.js';
import { handleTelegramUpdate } from './updates.js';

const TELEGRAM_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{20,}$/;
export const MESSENGER_BOT_WEBHOOK_PATH = '/webhooks/messenger-bot';

const BOT_COMMANDS = [
  { command: 'reservations', description: 'Active reservations waiting on you' },
  { command: 'pause', description: 'Pause new reservation alerts' },
  { command: 'resume', description: 'Resume reservation alerts' },
  { command: 'help', description: 'How the bot works' },
  { command: 'unlink', description: 'Disconnect this chat' },
];

export type TelegramTransportStatus = {
  mode: 'WEBHOOK' | 'POLLING' | 'NONE';
  webhookUrl: string | null;
  pendingUpdates: number | null;
  lastError: string | null;
};

let pollingToken: string | null = null;
let pollingGeneration = 0;

function stopPolling(): void {
  pollingToken = null;
  pollingGeneration += 1;
}

async function pollLoop(token: string, generation: number): Promise<void> {
  let offset = 0;
  while (pollingToken === token && pollingGeneration === generation) {
    try {
      const updates = await telegramCall<TelegramUpdate[]>(
        token,
        'getUpdates',
        { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] },
        35_000,
      );
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleTelegramUpdate(update);
      }
    } catch (err) {
      if (pollingGeneration !== generation) return;
      const conflict = err instanceof TelegramApiError && err.errorCode === 409;
      logger.warn(
        { err },
        conflict
          ? '[messenger-bot] polling conflict (another instance or webhook is active)'
          : '[messenger-bot] polling error',
      );
      await new Promise((r) => setTimeout(r, conflict ? 30_000 : 5_000));
    }
  }
}

function startPolling(token: string): void {
  if (pollingToken === token) return;
  stopPolling();
  pollingToken = token;
  const generation = pollingGeneration;
  void pollLoop(token, generation);
  logger.info('[messenger-bot] Telegram long polling started');
}

export async function configureTelegramTransport(): Promise<void> {
  const cfg = await getBotPlatformConfig(true);
  const token = cfg.telegramToken;
  if (!token) {
    stopPolling();
    return;
  }
  const base = messengerWebhookBaseUrl();
  try {
    if (base && cfg.telegramWebhookSecret) {
      stopPolling();
      await telegramCall(token, 'setWebhook', {
        url: `${base}${MESSENGER_BOT_WEBHOOK_PATH}`,
        secret_token: cfg.telegramWebhookSecret,
        allowed_updates: ['message', 'callback_query'],
      });
      logger.info(
        { url: `${base}${MESSENGER_BOT_WEBHOOK_PATH}` },
        '[messenger-bot] Telegram webhook set',
      );
    } else {
      await telegramCall(token, 'deleteWebhook', { drop_pending_updates: false });
      startPolling(token);
    }
    await telegramCall(token, 'setMyCommands', { commands: BOT_COMMANDS });
  } catch (err) {
    logger.error({ err }, '[messenger-bot] Telegram transport setup failed');
  }
}

export async function connectTelegramBot(rawToken: string): Promise<{ username: string }> {
  const token = rawToken.trim();
  if (!TELEGRAM_TOKEN_RE.test(token)) {
    throw new Error("That doesn't look like a Telegram bot token (expected 123456:ABC…).");
  }
  let me: TelegramUser;
  try {
    me = await telegramCall<TelegramUser>(token, 'getMe');
  } catch (err) {
    if (err instanceof TelegramApiError && err.errorCode === 401) {
      throw new Error('Telegram rejected this token. Copy it again from @BotFather.');
    }
    throw new Error('Could not reach Telegram to verify the token. Try again.');
  }
  if (!me.username) throw new Error('This bot has no username.');

  const previous = await getBotPlatformConfig(true);
  if (previous.telegramToken && previous.telegramToken !== token) {
    await telegramCall(previous.telegramToken, 'deleteWebhook').catch(() => undefined);
  }
  await PlatformConfig.updateOne(
    { key: 'default' },
    {
      $set: {
        telegramBotToken: token,
        telegramBotUsername: me.username,
        telegramWebhookSecret: randomBytes(32).toString('hex'),
      },
      $setOnInsert: { key: 'default' },
    },
    { upsert: true },
  );
  invalidateBotPlatformConfig();
  await configureTelegramTransport();
  return { username: me.username };
}

export async function disconnectTelegramBot(): Promise<void> {
  const cfg = await getBotPlatformConfig(true);
  stopPolling();
  if (cfg.telegramToken) {
    await telegramCall(cfg.telegramToken, 'deleteWebhook').catch(() => undefined);
  }
  await PlatformConfig.updateOne(
    { key: 'default' },
    {
      $set: {
        telegramBotToken: null,
        telegramBotUsername: null,
        telegramWebhookSecret: null,
      },
    },
  );
  invalidateBotPlatformConfig();
}

export async function getTelegramTransportStatus(): Promise<TelegramTransportStatus> {
  const cfg = await getBotPlatformConfig(true);
  if (!cfg.telegramToken) {
    return { mode: 'NONE', webhookUrl: null, pendingUpdates: null, lastError: null };
  }
  try {
    const info = await telegramCall<{
      url?: string;
      pending_update_count?: number;
      last_error_message?: string;
    }>(cfg.telegramToken, 'getWebhookInfo');
    return {
      mode: info.url ? 'WEBHOOK' : pollingToken ? 'POLLING' : 'NONE',
      webhookUrl: info.url || null,
      pendingUpdates: info.pending_update_count ?? null,
      lastError: info.last_error_message ?? null,
    };
  } catch (err) {
    return {
      mode: 'NONE',
      webhookUrl: null,
      pendingUpdates: null,
      lastError: err instanceof Error ? err.message : 'Telegram unreachable',
    };
  }
}

/** Call once after Mongo connects. */
export function startMessengerBot(): void {
  startMessengerBotNotifier();
  void configureTelegramTransport();
}
