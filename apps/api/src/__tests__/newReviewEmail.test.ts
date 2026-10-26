import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { newReviewManagerEmail } from '../services/notifications.js';

describe('new review manager email', () => {
  const previousDashboardUrl = env.DASHBOARD_APP_URL;

  afterEach(() => {
    (env as { DASHBOARD_APP_URL: string }).DASHBOARD_APP_URL = previousDashboardUrl;
  });

  it('adds a Partner Hub reviews link and escapes the guest comment', () => {
    (env as { DASHBOARD_APP_URL: string }).DASHBOARD_APP_URL = 'https://dashboard.tablevera.online/';
    const body =
      '5★ from Kamoliddin Hamzayev: Great food & service <script> — New York Pasta Garden';
    const email = newReviewManagerEmail(body, 'rest/1');

    expect(email.reviewUrl).toBe(
      'https://dashboard.tablevera.online/reviews?restaurant=rest%2F1',
    );
    expect(email.htmlBody).toContain('View review');
    expect(email.htmlBody).toContain(email.reviewUrl);
    expect(email.htmlBody).toContain('Great food &amp; service &lt;script&gt;');
    expect(email.htmlBody).not.toContain('<script>');
    expect(email.emailText).toContain(body);
    expect(email.emailText).toContain(`View review: ${email.reviewUrl}`);
  });
});
