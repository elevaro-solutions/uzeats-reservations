const VIRTUAL_SPACES_HOST =
  /^([a-z0-9-]+)\.([a-z0-9]+)\.digitaloceanspaces\.com$/i;
const PATH_SPACES_HOST = /^([a-z0-9]+)\.digitaloceanspaces\.com$/i;

/**
 * DigitalOcean Spaces origin → the bucket CDN.
 * `https://bucket.region.digitaloceanspaces.com/key` and
 * `https://region.digitaloceanspaces.com/bucket/key` both become
 * `https://bucket.region.cdn.digitaloceanspaces.com/key`.
 * Other hosts, including an already-CDN host, stay as they are.
 */
export function toSpacesCdnUrl(url: string): string {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return url;
  const host = parsed.hostname.toLowerCase();
  if (host.endsWith('.cdn.digitaloceanspaces.com')) return url;

  const virtual = host.match(VIRTUAL_SPACES_HOST);
  if (virtual) {
    parsed.hostname = `${virtual[1]}.${virtual[2]}.cdn.digitaloceanspaces.com`;
    return parsed.toString();
  }

  const pathStyle = host.match(PATH_SPACES_HOST);
  if (!pathStyle) return url;
  const slash = parsed.pathname.indexOf('/', 1);
  if (slash <= 1) return url;
  const bucket = parsed.pathname.slice(1, slash);
  if (!bucket || bucket.includes('.')) return url;
  parsed.hostname = `${bucket}.${pathStyle[1]}.cdn.digitaloceanspaces.com`;
  parsed.pathname = parsed.pathname.slice(slash);
  return parsed.toString();
}

/** Rewrite Spaces image URLs inside HTML (blog body, imported markup). */
export function rewriteSpacesUrlsInHtml(html: string): string {
  if (!html || !html.includes('digitaloceanspaces.com')) return html;
  return html.replace(
    /https?:\/\/[a-z0-9.-]*digitaloceanspaces\.com\/[^\s"'<>]*/gi,
    (match) => toSpacesCdnUrl(match),
  );
}

/**
 * Local API uploads are absolute `http://localhost:4000/api/uploads/local/...`.
 * Browser CSP often allows only `'self'` + `https:`, so those http URLs break.
 * Prefer the same-origin path when the host is our API local-upload endpoint;
 * Next apps rewrite `/api/uploads/local/*` to the API.
 * Spaces objects are served from the DigitalOcean CDN.
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
  return toSpacesCdnUrl(url);
}
