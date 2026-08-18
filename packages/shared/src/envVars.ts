export type EnvVarRequirement = 'required' | 'production' | 'recommended';

export type EnvVarGroup =
  | 'core'
  | 'auth'
  | 'urls'
  | 'payments'
  | 'storage'
  | 'notifications'
  | 'clients';

export type EnvApp = 'api' | 'web' | 'dashboard';

export const ENV_APP_LABELS: Record<EnvApp, string> = {
  api: 'API',
  web: 'WEB',
  dashboard: 'Dashboard',
};

export interface EnvVarDefinition {
  key: string;
  label: string;
  group: EnvVarGroup;
  apps: EnvApp[];
  requirement: EnvVarRequirement;
  /** Human-readable note shown on the developer page. */
  description?: string;
  /** Skip the requirement when another env var is set (non-empty). */
  requiredUnlessSet?: string[];
  /** Skip the requirement when another env var equals this value. */
  requiredUnlessEquals?: { key: string; value: string };
}

export const ENV_VAR_GROUPS: Record<EnvVarGroup, string> = {
  core: 'Core',
  auth: 'Authentication',
  urls: 'Application URLs',
  payments: 'Payments',
  storage: 'File storage',
  notifications: 'Notifications',
  clients: 'Client apps',
};

/** Env vars tracked on the super-admin developer page. */
export const ENV_VAR_DEFINITIONS: EnvVarDefinition[] = [
  {
    key: 'PORT',
    label: 'HTTP port',
    group: 'core',
    apps: ['api'],
    requirement: 'recommended',
    description: 'API server listen port (default 4000).',
  },
  {
    key: 'NODE_ENV',
    label: 'Node environment',
    group: 'core',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'MONGODB_URI',
    label: 'MongoDB URI',
    group: 'core',
    apps: ['api'],
    requirement: 'required',
    description: 'Primary database connection string.',
  },
  {
    key: 'REDIS_URL',
    label: 'Redis URL',
    group: 'core',
    apps: ['api'],
    requirement: 'required',
    description: 'Job queue and session cache.',
  },
  {
    key: 'JWT_ACCESS_SECRET',
    label: 'JWT access secret',
    group: 'core',
    apps: ['api'],
    requirement: 'required',
    description: 'Signs short-lived access tokens (min 16 characters).',
  },
  {
    key: 'JWT_REFRESH_SECRET',
    label: 'JWT refresh secret',
    group: 'core',
    apps: ['api'],
    requirement: 'required',
    description: 'Signs refresh tokens (min 16 characters).',
  },
  {
    key: 'JWT_ACCESS_EXPIRES',
    label: 'JWT access expiry',
    group: 'core',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'JWT_REFRESH_EXPIRES',
    label: 'JWT refresh expiry',
    group: 'core',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    label: 'Google client ID',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Verifies Google sign-in ID tokens on the API.',
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    label: 'Google client secret',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Server-side Google OAuth (if used).',
  },
  {
    key: 'AUTH_DEV_OTP',
    label: 'Auth dev OTP',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Accept OTP 123456 without Twilio (development only).',
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    label: 'Twilio account SID',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
    description: 'SMS OTP delivery. Not needed when AUTH_DEV_OTP is enabled.',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    label: 'Twilio auth token',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
  },
  {
    key: 'TWILIO_VERIFY_SERVICE_SID',
    label: 'Twilio Verify service SID',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
  },
  {
    key: 'TWILIO_FROM_NUMBER',
    label: 'Twilio from number',
    group: 'auth',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'CORS_ORIGINS',
    label: 'CORS origins',
    group: 'urls',
    apps: ['api'],
    requirement: 'recommended',
    description:
      'Comma-separated allowed browser origins for first-party routes (uploads, POS, partner). GraphQL reflects any origin so the booking widget can be embedded on restaurant sites.',
  },
  {
    key: 'WEB_APP_URL',
    label: 'Web app URL',
    group: 'urls',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Public diner-facing site base URL.',
  },
  {
    key: 'DASHBOARD_APP_URL',
    label: 'Dashboard app URL',
    group: 'urls',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Partner hub base URL.',
  },
  {
    key: 'API_PUBLIC_URL',
    label: 'API public URL',
    group: 'urls',
    apps: ['api'],
    requirement: 'production',
    description: 'Public API base URL for webhooks (e.g. Telegram).',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    label: 'Stripe secret key',
    group: 'payments',
    apps: ['api'],
    requirement: 'production',
    description: 'Required for deposit-enabled restaurants in production.',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    label: 'Stripe webhook secret',
    group: 'payments',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Verifies Stripe webhook signatures.',
  },
  {
    key: 'STRIPE_CURRENCY',
    label: 'Stripe currency',
    group: 'payments',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'DO_SPACES_KEY',
    label: 'Spaces access key',
    group: 'storage',
    apps: ['api'],
    requirement: 'required',
    description: 'DigitalOcean Spaces object storage.',
  },
  {
    key: 'DO_SPACES_SECRET',
    label: 'Spaces secret key',
    group: 'storage',
    apps: ['api'],
    requirement: 'required',
  },
  {
    key: 'DO_SPACES_ENDPOINT',
    label: 'Spaces endpoint',
    group: 'storage',
    apps: ['api'],
    requirement: 'required',
  },
  {
    key: 'DO_SPACES_BUCKET',
    label: 'Spaces bucket',
    group: 'storage',
    apps: ['api'],
    requirement: 'required',
  },
  {
    key: 'DO_SPACES_CDN',
    label: 'Spaces CDN URL',
    group: 'storage',
    apps: ['api'],
    requirement: 'required',
  },
  {
    key: 'SENDGRID_API_KEY',
    label: 'SendGrid API key',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
    requiredUnlessSet: ['RESEND_API_KEY'],
    description: 'Primary transactional email provider.',
  },
  {
    key: 'RESEND_API_KEY',
    label: 'Resend API key',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
    requiredUnlessSet: ['SENDGRID_API_KEY'],
    description: 'Fallback email provider when SendGrid is unset.',
  },
  {
    key: 'EMAIL_FROM',
    label: 'Email from address',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'ELEVARO_LEADS_API_KEY',
    label: 'Elevaro leads API key',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Creates CRM leads from the public contact form.',
  },
  {
    key: 'ELEVARO_LEADS_REFERRER_DOMAIN',
    label: 'Elevaro referrer domain',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'ELEVARO_LEADS_SOURCE',
    label: 'Elevaro leads source',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    label: 'Telegram bot token',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Optional Telegram notifications for staff.',
  },
  {
    key: 'TELEGRAM_WEBHOOK_SECRET',
    label: 'Telegram webhook secret',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'VAPID_PUBLIC_KEY',
    label: 'VAPID public key',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
    description: 'Web push notifications (server).',
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    label: 'VAPID private key',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'VAPID_SUBJECT',
    label: 'VAPID subject',
    group: 'notifications',
    apps: ['api'],
    requirement: 'recommended',
  },
  {
    key: 'NEXT_PUBLIC_API_URL',
    label: 'GraphQL API URL',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'required',
    description: 'Dashboard / web GraphQL endpoint.',
  },
  {
    key: 'NEXT_PUBLIC_WS_URL',
    label: 'GraphQL WebSocket URL',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'required',
    description: 'Realtime subscriptions endpoint.',
  },
  {
    key: 'NEXT_PUBLIC_WEB_URL',
    label: 'Public web URL',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'recommended',
    description: 'Used for share links and impersonation redirects.',
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    label: 'Public site URL',
    group: 'clients',
    apps: ['web'],
    requirement: 'recommended',
    description: 'SEO canonical URLs and sitemap.',
  },
  {
    key: 'NEXT_PUBLIC_DASHBOARD_URL',
    label: 'Dashboard URL',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'recommended',
  },
  {
    key: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    label: 'Google client ID (public)',
    group: 'clients',
    apps: ['web'],
    requirement: 'recommended',
    description: 'Must match GOOGLE_CLIENT_ID for Google sign-in buttons.',
  },
  {
    key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    label: 'Google Maps API key',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'recommended',
    description: 'Address autocomplete; forms fall back to plain inputs when empty.',
  },
  {
    key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    label: 'Stripe publishable key',
    group: 'payments',
    apps: ['web', 'dashboard'],
    requirement: 'required',
    description:
      'Client-side Stripe.js key for diner deposits and partner signup payment. Required on dashboard and web.',
  },
  {
    key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    label: 'VAPID public key (client)',
    group: 'notifications',
    apps: ['web'],
    requirement: 'recommended',
    description: 'Web push subscription in the diner profile.',
  },
  {
    key: 'NEXT_PUBLIC_COLOR_PALETTE',
    label: 'Color palette',
    group: 'clients',
    apps: ['web', 'dashboard'],
    requirement: 'recommended',
    description: 'Theme palette index (1 = Forest & Gold).',
  },
];

export interface EnvVarStatus {
  key: string;
  label: string;
  group: EnvVarGroup;
  requirement: EnvVarRequirement;
  description?: string;
  configured: boolean;
  applicable: boolean;
  required: boolean;
  missing: boolean;
}

export interface DeveloperEnvRow {
  key: string;
  app: EnvApp;
  label: string;
  group: EnvVarGroup | 'other';
  requirement: EnvVarRequirement;
  description?: string;
  value: string | null;
  configured: boolean;
  applicable: boolean;
  missing: boolean;
}

export type EnvSource = Record<string, string | undefined>;

const SENSITIVE_ENV_KEY =
  /(SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY|AUTH_TOKEN|MONGODB_URI|REDIS_URL|WEBHOOK)/i;

/** Mask secret env values for the developer page (keep last 4 chars when long enough). */
export function maskEnvValue(key: string, value: string): string {
  if (!SENSITIVE_ENV_KEY.test(key)) return value;
  if (value.length <= 8) return '********';
  return `********${value.slice(-4)}`;
}

function envValue(key: string, source: EnvSource): string {
  return (source[key] ?? '').trim();
}

function isConfigured(key: string, source: EnvSource): boolean {
  return envValue(key, source).length > 0;
}

function isApplicable(def: EnvVarDefinition, source: EnvSource): boolean {
  if (def.requiredUnlessSet?.length) {
    if (def.requiredUnlessSet.some((key) => isConfigured(key, source))) {
      return false;
    }
  }
  if (def.requiredUnlessEquals) {
    const { key, value } = def.requiredUnlessEquals;
    if (envValue(key, source) === value) {
      return false;
    }
  }
  return true;
}

function isRequired(def: EnvVarDefinition, nodeEnv: string, applicable: boolean): boolean {
  if (!applicable) return false;
  if (def.requirement === 'required') return true;
  if (def.requirement === 'production' && nodeEnv === 'production') return true;
  return false;
}

/** Parse a dotenv file into key/value pairs (comments and quotes stripped). */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const withoutComment = trimmed.split('#')[0]?.trim() ?? '';
    if (!withoutComment) continue;

    const eq = withoutComment.indexOf('=');
    if (eq === -1) continue;

    let key = withoutComment.slice(0, eq).trim();
    if (key.startsWith('export ')) key = key.slice(7).trim();
    if (!key) continue;

    let value = withoutComment.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function getGroupLabel(group: EnvVarGroup | 'other'): string {
  return group === 'other' ? 'Other' : ENV_VAR_GROUPS[group];
}

/** Build env var status list for the API deployment (never returns secret values). */
export function getEnvVarStatuses(source: EnvSource): EnvVarStatus[] {
  const nodeEnv = envValue('NODE_ENV', source) || 'development';

  return ENV_VAR_DEFINITIONS
    .filter((def) => def.apps.includes('api'))
    .map((def) => {
      const configured = isConfigured(def.key, source);
      const applicable = isApplicable(def, source);
      const required = isRequired(def, nodeEnv, applicable);
      return {
        key: def.key,
        label: def.label,
        group: def.group,
        requirement: def.requirement,
        description: def.description,
        configured,
        applicable,
        required,
        missing: required && !configured,
      };
    });
}

export function getMissingRequiredEnvVars(source: EnvSource): EnvVarStatus[] {
  return getEnvVarStatuses(source).filter((row) => row.missing);
}

/** Build per-app env rows with values for the super-admin developer page. */
export function buildDeveloperEnvRows(
  sources: Record<EnvApp, EnvSource>,
  nodeEnv: string,
): DeveloperEnvRow[] {
  const defByKey = new Map(ENV_VAR_DEFINITIONS.map((def) => [def.key, def]));
  const rows: DeveloperEnvRow[] = [];

  for (const app of ['api', 'web', 'dashboard'] as EnvApp[]) {
    const source = sources[app] ?? {};
    const keys = new Set<string>();

    for (const key of Object.keys(source)) {
      if (key) keys.add(key);
    }

    for (const def of ENV_VAR_DEFINITIONS) {
      if (def.apps.includes(app)) keys.add(def.key);
    }

    for (const key of keys) {
      const def = defByKey.get(key);

      if (def && !def.apps.includes(app) && !isConfigured(key, source)) {
        continue;
      }

      const value = envValue(key, source);
      const configured = value.length > 0;
      const applicable = def ? isApplicable(def, source) : true;
      const required = def ? isRequired(def, nodeEnv, applicable) : false;
      const group = def?.group ?? 'other';

      rows.push({
        key,
        app,
        label: def?.label ?? key,
        group,
        requirement: def?.requirement ?? 'recommended',
        description: def?.description,
        value: configured ? maskEnvValue(key, value) : null,
        configured,
        applicable,
        missing: required && !configured,
      });
    }
  }

  const appOrder: Record<EnvApp, number> = { api: 0, web: 1, dashboard: 2 };
  return rows.sort((a, b) => {
    if (appOrder[a.app] !== appOrder[b.app]) return appOrder[a.app] - appOrder[b.app];
    return a.key.localeCompare(b.key);
  });
}
