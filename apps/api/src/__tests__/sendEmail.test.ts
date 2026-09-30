import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { sendEmail } from '../services/notifications.js';

describe('sendEmail via SendGrid', () => {
  const fetchMock = vi.fn();
  let previousKey: string;

  beforeEach(() => {
    previousKey = env.SENDGRID_API_KEY;
    (env as { SENDGRID_API_KEY: string }).SENDGRID_API_KEY = 'sg-test-key';
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => '',
    });
  });

  afterEach(() => {
    (env as { SENDGRID_API_KEY: string }).SENDGRID_API_KEY = previousKey;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('omits attachments when none are provided', async () => {
    await sendEmail('diner@tablevera.online', 'Confirm reservation', 'See you soon.');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    const body = JSON.parse(init.body as string) as { attachments?: unknown[] };
    expect(body).not.toHaveProperty('attachments');
  });

  it('includes attachments when provided', async () => {
    await sendEmail('billing@tablevera.online', 'Invoice', 'PDF attached.', {
      attachments: [
        {
          filename: 'invoice.pdf',
          contentBase64: 'cGRm',
          contentType: 'application/pdf',
        },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      attachments: Array<{ filename: string; content: string; type: string }>;
    };
    expect(body.attachments).toEqual([
      {
        content: 'cGRm',
        filename: 'invoice.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ]);
  });

  it('strips MIME parameters from attachment types (SendGrid rejects ;)', async () => {
    await sendEmail('diner@tablevera.online', 'Confirm reservation', 'See you soon.', {
      attachments: [
        {
          filename: 'reservation.ics',
          contentBase64: 'aWNz',
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      attachments: Array<{ type: string }>;
    };
    expect(body.attachments[0]?.type).toBe('text/calendar');
  });
});
