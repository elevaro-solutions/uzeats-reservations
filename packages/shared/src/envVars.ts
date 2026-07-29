export type EnvVarRequirement = 'required' | 'production' | 'recommended';

export type EnvVarGroup =
  | 'core'
  | 'auth'
  | 'urls'
  | 'payments'
  | 'storage'
  | 'notifications'
  | 'clients';

export interface EnvVarDefinition {
  key: string;
  label: string;
  group: EnvVarGroup;
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

/** Env vars tracked on the super-admin developer page (values are never exposed). */
export const ENV_VAR_DEFINITIONS: EnvVarDefinition[] = [
  {
    key: 'MONGODB_URI',
    label: 'MongoDB URI',
    group: 'core',
    requirement: 'required',
    description: 'Primary database connection string.',
  },
  {
    key: 'REDIS_URL',
    label: 'Redis URL',
    group: 'core',
    requirement: 'required',
    description: 'Job queue and session cache.',
  },
  {
    key: 'JWT_ACCESS_SECRET',
    label: 'JWT access secret',
    group: 'core',
    requirement: 'required',
    description: 'Signs short-lived access tokens (min 16 characters).',
  },
  {
    key: 'JWT_REFRESH_SECRET',
    label: 'JWT refresh secret',
    group: 'core',
    requirement: 'required',
    description: 'Signs refresh tokens (min 16 characters).',
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    label: 'Google client ID',
    group: 'auth',
    requirement: 'recommended',
    description: 'Verifies Google sign-in ID tokens on the API.',
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    label: 'Google client secret',
    group: 'auth',
    requirement: 'recommended',
    description: 'Server-side Google OAuth (if used).',
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    label: 'Twilio account SID',
    group: 'auth',
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
    description: 'SMS OTP delivery. Not needed when AUTH_DEV_OTP is enabled.',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    label: 'Twilio auth token',
    group: 'auth',
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
  },
  {
    key: 'TWILIO_VERIFY_SERVICE_SID',
    label: 'Twilio Verify service SID',
    group: 'auth',
    requirement: 'recommended',
    requiredUnlessEquals: { key: 'AUTH_DEV_OTP', value: 'true' },
  },
  {
    key: 'CORS_ORIGINS',
    label: 'CORS origins',
    group: 'urls',
    requirement: 'recommended',
    description: 'Comma-separated allowed browser origins.',
  },
  {
    key: 'WEB_APP_URL',
    label: 'Web app URL',
    group: 'urls',
    requirement: 'recommended',
    description: 'Public diner-facing site base URL.',
  },
  {
    key: 'DASHBOARD_APP_URL',
    label: 'Dashboard app URL',
    group: 'urls',
    requirement: 'recommended',
    description: 'Partner hub base URL.',
  },
  {
    key: 'API_PUBLIC_URL',
    label: 'API public URL',
    group: 'urls',
    requirement: 'production',
    description: 'Public API base URL for webhooks (e.g. Telegram).',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    label: 'Stripe secret key',
    group: 'payments',
    requirement: 'production',
    description: 'Required for deposit-enabled restaurants in production.',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    label: 'Stripe webhook secret',
    group: 'payments',
    requirement: 'recommended',
    description: 'Verifies Stripe webhook signatures.',
  },
  {
    key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    label: 'Stripe publishable key',
    group: 'payments',
    requirement: 'recommended',
    description: 'Client-side Stripe.js initialization.',
  },
  {
    key: 'DO_SPACES_KEY',
    label: 'Spaces access key',
    group: 'storage',
    requirement: 'recommended',
    description: 'DigitalOcean Spaces object storage.',
  },
  {
    key: 'DO_SPACES_SECRET',
    label: 'Spaces secret key',
    group: 'storage',
    requirement: 'recommended',
  },
  {
    key: 'SENDGRID_API_KEY',
    label: 'SendGrid API key',
    group: 'notifications',
    requirement: 'recommended',
    requiredUnlessSet: ['RESEND_API_KEY'],
    description: 'Primary transactional email provider.',
  },
  {
    key: 'RESEND_API_KEY',
    label: 'Resend API key',
    group: 'notifications',
    requirement: 'recommended',
    requiredUnlessSet: ['SENDGRID_API_KEY'],
    description: 'Fallback email provider when SendGrid is unset.',
  },
  {
    key: 'EMAIL_FROM',
    label: 'Email from address',
    group: 'notifications',
    requirement: 'recommended',
  },
  {
    key: 'ELEVARO_LEADS_API_KEY',
    label: 'Elevaro leads API key',
    group: 'notifications',
    requirement: 'recommended',
    description: 'Creates CRM leads from the public contact form.',
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    label: 'Telegram bot token',
    group: 'notifications',
    requirement: 'recommended',
    description: 'Optional Telegram notifications for staff.',
  },
  {
    key: 'VAPID_PUBLIC_KEY',
    label: 'VAPID public key',
    group: 'notifications',
    requirement: 'recommended',
    description: 'Web push notifications.',
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    label: 'VAPID private key',
    group: 'notifications',
    requirement: 'recommended',
  },
  {
    key: 'NEXT_PUBLIC_API_URL',
    label: 'GraphQL API URL',
    group: 'clients',
    requirement: 'required',
    description: 'Dashboard / web GraphQL endpoint.',
  },
  {
    key: 'NEXT_PUBLIC_WS_URL',
    label: 'GraphQL WebSocket URL',
    group: 'clients',
    requirement: 'required',
    description: 'Realtime subscriptions endpoint.',
  },
  {
    key: 'NEXT_PUBLIC_WEB_URL',
    label: 'Public web URL',
    group: 'clients',
    requirement: 'recommended',
    description: 'Used for share links and impersonation redirects.',
  },
  {
    key: 'NEXT_PUBLIC_DASHBOARD_URL',
    label: 'Dashboard URL',
    group: 'clients',
    requirement: 'recommended',
  },
  {
    key: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    label: 'Google client ID (public)',
    group: 'clients',
    requirement: 'recommended',
    description: 'Must match GOOGLE_CLIENT_ID for Google sign-in buttons.',
  },
  {
    key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    label: 'Google Maps API key',
    group: 'clients',
    requirement: 'recommended',
    description: 'Address autocomplete; forms fall back to plain inputs when empty.',
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

export type EnvSource = Record<string, string | undefined>;

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

/** Build env var status list for the developer page (never returns secret values). */
export function getEnvVarStatuses(source: EnvSource): EnvVarStatus[] {
  const nodeEnv = envValue('NODE_ENV', source) || 'development';

  return ENV_VAR_DEFINITIONS.map((def) => {
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
