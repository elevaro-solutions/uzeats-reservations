/**
 * Local API uploads are absolute `http://localhost:4000/api/uploads/local/...`.
 * Browser CSP often allows only `'self'` + `https:`, so those http URLs break.
 * Prefer the same-origin path when the host is our API local-upload endpoint;
 * Next apps rewrite `/api/uploads/local/*` to the API.
 */
export function browserMediaUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.pathname.startsWith('/api/uploads/local/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* keep original */
  }
  return url;
}
