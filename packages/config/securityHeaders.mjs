function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').origin;
  } catch {
    return 'http://localhost:4000';
  }
}

/** Extra http origins for local-upload thumbs (Spaces CDN is covered by https:). */
function localUploadImgOrigins() {
  const origins = new Set([apiOrigin()]);
  // Always allow the common local API hosts — stored review/support URLs use these
  // even when NEXT_PUBLIC_API_URL was baked as https at config-eval time.
  origins.add('http://localhost:4000');
  origins.add('http://127.0.0.1:4000');
  return [...origins].join(' ');
}

/** Browser CSP. Next/Antd/Stripe still need unsafe-inline; sanitizer is the XSS gate. */
export function contentSecurityPolicy({ maps } = { maps: false }) {
  const connect = [
    "'self'",
    apiOrigin(),
    'https://api.stripe.com',
    'https://accounts.google.com',
    'https://maps.googleapis.com',
  ];
  const frames = [
    'https://js.stripe.com',
    'https://hooks.stripe.com',
    'https://accounts.google.com',
  ];
  if (maps) {
    frames.push('https://maps.google.com', 'https://www.google.com');
  }
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${localUploadImgOrigins()}`,
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    `frame-src ${frames.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function securityHeaders({ maps } = { maps: false }) {
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    { key: 'Content-Security-Policy', value: contentSecurityPolicy({ maps }) },
  ];
  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }
  return headers;
}

/** Proxy local upload GETs through the Next app so img-src 'self' works. */
export function localUploadRewrites() {
  const origin = apiOrigin();
  return [
    {
      source: '/api/uploads/local/:path*',
      destination: `${origin}/api/uploads/local/:path*`,
    },
  ];
}
