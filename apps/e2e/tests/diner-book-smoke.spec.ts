import { expect, test } from '@playwright/test';
import { dinerLogin } from '../fixtures/auth.js';
import { e2eEnv, skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Diner web book smoke @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
    if (!e2eEnv.restaurantSlug) {
      testInfo.skip(true, 'Set E2E_RESTAURANT_SLUG to an approved venue slug');
    }
  });

  test('restaurant page opens Book flow controls', async ({ page }) => {
    await dinerLogin(page);
    await page.goto(`/restaurants/${e2eEnv.restaurantSlug}`);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    const book = page.getByRole('button', { name: /book/i }).or(page.getByRole('link', { name: /book/i }));
    await expect(book.first()).toBeVisible({ timeout: 20_000 });
    await book.first().click();
    await expect(
      page.getByText(/guest|party|date|time|select/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
