export type CookieCategory = 'essential' | 'analytics' | 'marketing';

export type CookieConsentPreferences = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'tablevera_cookie_consent';
const CONSENT_VERSION = 1;

type StoredConsent = CookieConsentPreferences & { version: number };

export const DEFAULT_PREFERENCES: CookieConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  updatedAt: new Date(0).toISOString(),
};

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null;

    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(preferences: Omit<CookieConsentPreferences, 'essential' | 'updatedAt'>) {
  if (typeof window === 'undefined') return;

  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    essential: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: payload }));
}

export function hasCookieConsent(): boolean {
  return readCookieConsent() !== null;
}

export function acceptAllCookies() {
  writeCookieConsent({ analytics: true, marketing: true });
}

export function rejectNonEssentialCookies() {
  writeCookieConsent({ analytics: false, marketing: false });
}
