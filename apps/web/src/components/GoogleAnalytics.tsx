'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  GA_MEASUREMENT_ID,
  isGaConfigured,
  trackPageView,
  updateGaConsent,
} from '@/lib/analytics';
import { readCookieConsent } from '@/lib/cookieConsent';

function applyStoredConsent() {
  const stored = readCookieConsent();
  if (stored) {
    updateGaConsent(stored);
  }
}

function GaPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGaConfigured()) return;
    const qs = searchParams?.toString();
    trackPageView(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

function GaConsentSync() {
  useEffect(() => {
    if (!isGaConfigured()) return;

    applyStoredConsent();

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ analytics?: boolean; marketing?: boolean }>).detail;
      if (detail && typeof detail.analytics === 'boolean' && typeof detail.marketing === 'boolean') {
        updateGaConsent({ analytics: detail.analytics, marketing: detail.marketing });
        return;
      }
      applyStoredConsent();
    };

    window.addEventListener('cookieconsentchange', onChange);
    return () => window.removeEventListener('cookieconsentchange', onChange);
  }, []);

  return null;
}

/**
 * GA4 + Consent Mode v2. Loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.
 * Defaults storage to denied until the cookie banner grants analytics/marketing.
 */
export function GoogleAnalytics() {
  if (!isGaConfigured()) return null;

  const id = GA_MEASUREMENT_ID;

  return (
    <>
      <Script
        id="ga-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true, send_page_view: false });
`.trim(),
        }}
      />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <GaConsentSync />
      <Suspense fallback={null}>
        <GaPageViews />
      </Suspense>
    </>
  );
}
