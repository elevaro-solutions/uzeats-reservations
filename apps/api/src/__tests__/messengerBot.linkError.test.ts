import { describe, expect, it } from 'vitest';
import { TelegramApiError } from '../services/messengerBot/telegramApi.js';
import {
  errorForTelegramChatLookup,
  telegramBotPageUrl,
  telegramStartRequiredMessage,
} from '../services/messengerBot/linking.js';

describe('telegram chat link errors', () => {
  it('builds a t.me link from the bot username', () => {
    expect(telegramBotPageUrl('@TableveraBot')).toBe('https://t.me/TableveraBot');
    expect(telegramBotPageUrl('bad name')).toBeNull();
  });

  it('explains how to tap Start and includes the bot URL', () => {
    const message = telegramStartRequiredMessage('TableveraBot');
    expect(message).toContain('https://t.me/TableveraBot');
    expect(message).toContain('Tap the Start button');
    expect(message).toContain('/start');
    expect(message).toContain('chat ID');
  });

  it('maps chat-not-found to a validation error with the bot URL', () => {
    const err = errorForTelegramChatLookup(
      new TelegramApiError('getChat', 400, 'Bad Request: chat not found'),
      'TableveraBot',
    );
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('https://t.me/TableveraBot');
    expect(err.message).toContain('tapped Start');
    expect(err.details).toEqual({ botUrl: 'https://t.me/TableveraBot' });
  });

  it("maps bot can't initiate conversation the same way", () => {
    const err = errorForTelegramChatLookup(
      new TelegramApiError(
        'sendMessage',
        403,
        "Forbidden: bot can't initiate conversation with a user",
      ),
      'TableveraBot',
    );
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('https://t.me/TableveraBot');
    expect(err.message).toContain('tapped Start');
  });

  it('maps a blocked bot to unblock steps with the same link', () => {
    const err = errorForTelegramChatLookup(
      new TelegramApiError('getChat', 403, 'Forbidden: bot was blocked by the user'),
      'TableveraBot',
    );
    expect(err.message).toContain('blocked');
    expect(err.message).toContain('https://t.me/TableveraBot');
    expect(err.message).not.toContain('tapped Start');
  });

  it('maps a network failure to a retryable error', () => {
    const err = errorForTelegramChatLookup(new Error('fetch failed'), 'TableveraBot');
    expect(err.code).toBe('TELEGRAM_UNAVAILABLE');
    expect(err.statusCode).toBe(503);
    expect(err.message).not.toContain('Internal server error');
  });
});
