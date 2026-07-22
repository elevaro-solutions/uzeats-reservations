import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleTelegramUpdate,
  isValidTelegramChatId,
  verifyTelegramWebhookSecret,
} from '../services/telegram.js';

describe('telegram bot', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      json: async () => ({ ok: true }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('validates chat id format', () => {
    expect(isValidTelegramChatId('123456789')).toBe(true);
    expect(isValidTelegramChatId('-100123456789')).toBe(true);
    expect(isValidTelegramChatId('abc')).toBe(false);
    expect(isValidTelegramChatId('')).toBe(false);
  });

  it('replies to /start with the chat id', async () => {
    await handleTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 123456789, type: 'private' },
        text: '/start',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { chat_id: number; text: string };
    expect(body.chat_id).toBe(123456789);
    expect(body.text).toContain('123456789');
    expect(body.text).toContain('Welcome to Tablevera');
  });

  it('replies to /help', async () => {
    await handleTelegramUpdate({
      update_id: 2,
      message: {
        message_id: 11,
        chat: { id: 42, type: 'private' },
        text: '/help',
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { text: string };
    expect(body.text).toContain('/start');
  });

  it('skips webhook secret check when not configured', () => {
    const req = { headers: {} } as Parameters<typeof verifyTelegramWebhookSecret>[0];
    expect(verifyTelegramWebhookSecret(req)).toBe(true);
  });
});
