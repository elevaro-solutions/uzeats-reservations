import { expect, test } from '@playwright/test';
import { partnerLogin } from '../fixtures/auth.js';
import { e2eEnv, skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Partner Hub auth @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('seed owner signs in to partner shell', async ({ page }) => {
    await partnerLogin(page, e2eEnv.ownerEmail, e2eEnv.ownerPassword);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByText(/overview|reservations|waitlist|dashboard/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
