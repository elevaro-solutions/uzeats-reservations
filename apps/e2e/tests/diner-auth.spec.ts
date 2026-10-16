import { expect, test } from '@playwright/test';
import { dinerLogin } from '../fixtures/auth.js';
import { e2eEnv, skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Diner web auth @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
  });

  test('seed diner can sign in and reach home', async ({ page }) => {
    await dinerLogin(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/tablevera|reserv|discover|home/i);
  });

  test('bad password shows an error banner or field message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(e2eEnv.dinerEmail);
    await page.getByLabel('Password').fill('WrongPassword!!!');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed|wrong/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
