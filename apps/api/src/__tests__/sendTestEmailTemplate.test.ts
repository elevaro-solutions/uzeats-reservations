import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/notifications.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/notifications.js')>();
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue(undefined),
    isEmailDeliveryConfigured: vi.fn(() => true),
  };
});

vi.mock('../models/EmailTemplate.js', () => ({
  DEFAULT_EMAIL_TEMPLATES: [],
  EmailTemplate: {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

import { sendEmail, isEmailDeliveryConfigured } from '../services/notifications.js';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { sendTestEmailTemplate } from '../services/emailTemplates.js';

describe('sendTestEmailTemplate', () => {
  beforeEach(() => {
    vi.mocked(isEmailDeliveryConfigured).mockReturnValue(true);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
    vi.mocked(EmailTemplate.findOne).mockResolvedValue({
      key: 'password_reset',
      subject: 'Reset {{firstName}}',
      bodyHtml: '<p>Hi {{firstName}}</p>',
      bodyText: 'Hi {{firstName}}',
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when SendGrid is not configured', async () => {
    vi.mocked(isEmailDeliveryConfigured).mockReturnValue(false);
    await expect(
      sendTestEmailTemplate({ key: 'password_reset', to: 'admin@example.com' }),
    ).rejects.toThrow(/SENDGRID_API_KEY/);
  });

  it('rejects invalid recipient', async () => {
    await expect(
      sendTestEmailTemplate({ key: 'password_reset', to: 'not-an-email' }),
    ).rejects.toThrow(/valid email/);
  });

  it('sends draft content with [Test] subject prefix and sample vars', async () => {
    const result = await sendTestEmailTemplate({
      key: 'password_reset',
      to: 'admin@example.com',
      subject: 'Hello {{firstName}}',
      bodyHtml: '<p>{{firstName}}</p>',
      bodyText: 'Hi {{firstName}}',
    });

    expect(result.to).toBe('admin@example.com');
    expect(result.subject).toBe('[Test] Hello Alex');
    expect(sendEmail).toHaveBeenCalledWith(
      'admin@example.com',
      '[Test] Hello Alex',
      'Hi Alex',
      { htmlBody: '<p>Alex</p>' },
    );
  });
});
