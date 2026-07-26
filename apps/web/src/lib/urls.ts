/** Production-safe URLs for cross-app links (web → dashboard). */
export function getDashboardUrl(): string {
  const configured = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return 'https://dashboard.tablevera.online';
  return 'http://localhost:3001';
}
