import { expect, test } from '@playwright/test';
import { skipIfE2eDisabled } from '../fixtures/env.js';

test.describe('Diner web discovery @smoke', () => {
  test.beforeEach(({ }, testInfo) => {
    const reason = skipIfE2eDisabled();
    if (reason) testInfo.skip(true, reason);
  });

  test('home loads and exposes search', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/tablevera|uzeats|reserv/i);
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search|cuisine|restaurant/i));
    await expect(search.first()).toBeVisible({ timeout: 20_000 });
  });

  test('login page renders email/password form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });

  test('legal pages are reachable', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
