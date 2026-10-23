import { logger } from '../../lib/logger.js';

const TG_TIMEOUT_MS = 10_000;

export type TelegramInlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

export type TelegramInlineKeyboard = { inline_keyboard: TelegramInlineButton[][] };

export type TelegramReplyKeyboard = {
  keyboard: { text: string }[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
};

export type TelegramReplyMarkup =
  | TelegramInlineKeyboard
  | TelegramReplyKeyboard
  | { remove_keyboard: true };

export type TelegramTextEntity = {
  type: 'bold' | 'italic' | 'text_link' | 'phone_number';
  offset: number;
  length: number;
  url?: string;
};

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string; title?: string; username?: string; first_name?: string };
  from?: TelegramUser;
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly errorCode: number,
    readonly description: string,
  ) {
    super(`Telegram ${method} failed (${errorCode}): ${description}`);
  }
}

export async function telegramCall<T>(
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = TG_TIMEOUT_MS,
): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: ac.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: T;
      error_code?: number;
      description?: string;
    };
    if (!json.ok) {
      throw new TelegramApiError(
        method,
        json.error_code ?? res.status,
        json.description ?? 'Unknown error',
      );
    }
    return json.result as T;
  } finally {
    clearTimeout(timer);
  }
}

export function isTelegramChatGone(err: unknown): boolean {
  if (!(err instanceof TelegramApiError)) return false;
  if (err.errorCode === 403) return true;
  return err.errorCode === 400 && /chat not found/i.test(err.description);
}

export async function sendTelegramText(
  token: string,
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  entities?: TelegramTextEntity[],
): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(entities ? { entities } : { parse_mode: 'HTML' }),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function editTelegramText(
  token: string,
  chatId: string,
  messageId: string,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
  entities?: TelegramTextEntity[],
): Promise<void> {
  try {
    await telegramCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: Number(messageId),
      text,
      disable_web_page_preview: true,
      ...(entities ? { entities } : { parse_mode: 'HTML' }),
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    });
  } catch (err) {
    if (err instanceof TelegramApiError && /not modified/i.test(err.description)) return;
    throw err;
  }
}

export async function answerTelegramCallback(
  token: string,
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  try {
    await telegramCall(token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: showAlert } : {}),
    });
  } catch (err) {
    logger.debug({ err }, '[messenger-bot] answerCallbackQuery failed');
  }
}

export function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
