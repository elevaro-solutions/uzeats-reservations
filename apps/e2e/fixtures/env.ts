/** Credentials + feature flags for browser E2E. Prefer env overrides for staging. */

export const e2eEnv = {
  enabled: process.env.E2E_ENABLED === '1' || !process.env.CI,
  webUrl: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
  dashboardUrl: process.env.E2E_DASHBOARD_URL ?? 'http://localhost:3001',
  dinerEmail: process.env.E2E_DINER_EMAIL ?? 'diner@tablevera.local',
  dinerPassword: process.env.E2E_DINER_PASSWORD ?? 'Password123!',
  ownerEmail: process.env.E2E_OWNER_EMAIL ?? 'owner@tablevera.local',
  ownerPassword: process.env.E2E_OWNER_PASSWORD ?? 'Password123!',
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? 'a@tablevera.local',
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? 'Password123!',
  /** Optional approved restaurant slug for book smoke (seed-dependent). */
  restaurantSlug: process.env.E2E_RESTAURANT_SLUG ?? '',
};

export function skipIfE2eDisabled() {
  if (!e2eEnv.enabled) {
    return 'E2E disabled (set E2E_ENABLED=1 to run in CI)';
  }
  return null;
}
