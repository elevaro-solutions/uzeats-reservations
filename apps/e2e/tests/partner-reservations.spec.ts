import { expect, test } from '@playwright/test';
import { partnerLogin } from '../fixtures/auth.js';
import { skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Partner Hub reservations @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
  });

  test('owner can open Reservations list', async ({ page }) => {
    await partnerLogin(page);
    await page.goto('/reservations');
    await expect(page.getByText(/reservation/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/something went wrong/i);
  });

  test('owner can open Waitlist', async ({ page }) => {
    await partnerLogin(page);
    await page.goto('/waitlist');
    await expect(page.getByText(/waitlist|live|history/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
