export function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

/** Prefer explicit app URL; fall back to matching CORS origin when still on localhost defaults. */
export function resolveAppUrl(
  configured: string,
  corsOrigins: string,
  corsIndex: number,
  devFallback: string,
): string {
  const trimmed = trimTrailingSlash(configured);
  if (trimmed && !isLocalhostUrl(trimmed)) {
    return trimmed;
  }

  const fromCors = corsOrigins.split(',')[corsIndex]?.trim();
  if (fromCors) {
    return trimTrailingSlash(fromCors);
  }

  return trimmed || devFallback;
}
