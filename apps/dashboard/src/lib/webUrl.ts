/** Public diner web app URL (booking pages + widget script). */
export function getPublicWebUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '');
  if (configured && !configured.includes('localhost')) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'dashboard.tablevera.online' || hostname.endsWith('.tablevera.online')) {
      return `${protocol}//tablevera.online`;
    }
  }

  return configured || 'http://localhost:3000';
}
