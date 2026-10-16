import type { Page } from '@playwright/test';
import { e2eEnv } from './env.js';

export async function dinerLogin(page: Page, email = e2eEnv.dinerEmail, password = e2eEnv.dinerPassword) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
}

export async function partnerLogin(
  page: Page,
  email = e2eEnv.ownerEmail,
  password = e2eEnv.ownerPassword,
) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
}
