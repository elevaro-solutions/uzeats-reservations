import { expect, test } from '@playwright/test';
import { partnerLogin } from '../fixtures/auth.js';
import { e2eEnv, skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Admin hub @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
  });

  test('super admin lands in admin area', async ({ page }) => {
    await partnerLogin(page, e2eEnv.adminEmail, e2eEnv.adminPassword);
    await page.goto('/admin');
    await expect(page.getByText(/overview|restaurants|platform|admin/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('developer page shows version', async ({ page }) => {
    await partnerLogin(page, e2eEnv.adminEmail, e2eEnv.adminPassword);
    await page.goto('/admin/developer');
    await expect(page.getByText(/version|env|developer/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
