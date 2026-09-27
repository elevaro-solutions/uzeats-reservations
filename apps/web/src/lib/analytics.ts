import type { CookieConsentPreferences } from '@/lib/cookieConsent';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || '';

export function isGaConfigured(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

type GtagConsentState = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

/** Map cookie-banner prefs → Google Consent Mode v2. */
export function consentFromPreferences(prefs: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>) {
  const analytics: GtagConsentState = prefs.analytics ? 'granted' : 'denied';
  const marketing: GtagConsentState = prefs.marketing ? 'granted' : 'denied';
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  };
}

export function updateGaConsent(prefs: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>) {
  gtag('consent', 'update', consentFromPreferences(prefs));
}

export function trackPageView(url: string) {
  if (!isGaConfigured()) return;
  gtag('config', GA_MEASUREMENT_ID, { page_path: url });
}

export function trackEvent(action: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!isGaConfigured()) return;
  gtag('event', action, params);
}
