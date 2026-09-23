import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { sniffAllowedImageContentType } from '../services/spaces.js';

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

export class SafeRemoteImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SafeRemoteImageError';
  }
}

export function hostAllowed(hostname: string, suffixes: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return false;
  }
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isPrivateIpAddress(ip: string): boolean {
  const trimmed = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (trimmed.includes(':')) {
    if (trimmed === '::1' || trimmed === '::') return true;
    if (trimmed.startsWith('fe80:') || trimmed.startsWith('fc') || trimmed.startsWith('fd')) {
      return true;
    }
    const v4mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4mapped?.[1]) return isPrivateIpAddress(v4mapped[1]);
    return false;
  }
  const parts = trimmed.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export async function assertPublicAllowedUrl(
  raw: string,
  allowedHostSuffixes: readonly string[],
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeRemoteImageError('Invalid imageUrl', 400);
  }
  if (url.protocol !== 'https:') {
    throw new SafeRemoteImageError('Only https image URLs are allowed', 400);
  }
  if (url.username || url.password) {
    throw new SafeRemoteImageError('Image URL must not include credentials', 400);
  }
  if (isIP(url.hostname) && isPrivateIpAddress(url.hostname)) {
    throw new SafeRemoteImageError('Image host not allowed for import', 400);
  }
  if (!hostAllowed(url.hostname, allowedHostSuffixes)) {
    throw new SafeRemoteImageError('Image host not allowed for import', 400);
  }
  try {
    const { address } = await dns.lookup(url.hostname);
    if (isPrivateIpAddress(address)) {
      throw new SafeRemoteImageError('Image host not allowed for import', 400);
    }
  } catch (err) {
    if (err instanceof SafeRemoteImageError) throw err;
    throw new SafeRemoteImageError('Could not resolve image host', 400);
  }
  return url;
}

export async function fetchAllowedImage(input: {
  url: string;
  allowedHostSuffixes: readonly string[];
  maxBytes: number;
  userAgent: string;
}): Promise<{ body: Buffer; contentType: string }> {
  let current = input.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = await assertPublicAllowedUrl(current, input.allowedHostSuffixes);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': input.userAgent },
      });
    } catch (err) {
      if (err instanceof SafeRemoteImageError) throw err;
      throw new SafeRemoteImageError('Could not download image', 422);
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new SafeRemoteImageError(`Could not download image (${res.status})`, 422);
      }
      current = new URL(location, parsed).toString();
      continue;
    }

    if (!res.ok) {
      throw new SafeRemoteImageError(`Could not download image (${res.status})`, 422);
    }

    const arrayBuffer = await res.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    if (body.length === 0) {
      throw new SafeRemoteImageError('Downloaded image is empty', 422);
    }
    if (body.length > input.maxBytes) {
      throw new SafeRemoteImageError('Image too large (max 5 MB)', 413);
    }
    const contentType = sniffAllowedImageContentType(body);
    if (!contentType) {
      throw new SafeRemoteImageError('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF', 400);
    }
    return { body, contentType };
  }
  throw new SafeRemoteImageError('Too many redirects', 400);
}
