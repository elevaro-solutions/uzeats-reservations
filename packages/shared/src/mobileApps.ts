/** Public store listings for diner and partner apps. */
export const MOBILE_APPS = {
  diner: {
    id: 'diner',
    name: 'Tablevera',
    audience: 'Diners',
    blurb: 'Find restaurants and book a table from your phone.',
    androidUrl:
      'https://play.google.com/store/apps/details?id=uz.alitech.tablevera&pcampaignid=web_share',
    iosUrl: 'https://apps.apple.com/app/tablevera/id6823634245',
  },
  partner: {
    id: 'partner',
    name: 'Tablevera Partner',
    audience: 'Restaurants',
    blurb: 'Run the book, the floor, and guest messages from the host stand.',
    androidUrl: 'https://play.google.com/store/apps/details?id=uz.alitech.tablevera.merchant',
    iosUrl: 'https://apps.apple.com/app/tablevera-merchant/id6824937754',
  },
} as const;

export type MobileAppId = keyof typeof MOBILE_APPS;
export type MobileAppListing = (typeof MOBILE_APPS)[MobileAppId];

export type MobileNavHints = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

/** Prefer App Store, Play Store, or both when the client is ambiguous (e.g. desktop phone preview). */
export type MobileStorePreference = 'ios' | 'android' | 'both';

export function isIosClient(nav: MobileNavHints): boolean {
  if (/iPad|iPhone|iPod/i.test(nav.userAgent ?? '')) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

export function isAndroidClient(nav: MobileNavHints): boolean {
  return /Android/i.test(nav.userAgent ?? '');
}

export function mobileStorePreference(nav?: MobileNavHints): MobileStorePreference {
  if (nav && isIosClient(nav)) return 'ios';
  if (nav && isAndroidClient(nav)) return 'android';
  return 'both';
}

export function preferredMobileStoreUrl(
  listing: MobileAppListing,
  nav?: MobileNavHints,
): string {
  if (nav && isIosClient(nav)) return listing.iosUrl;
  // Android and ambiguous clients (desktop phone preview, missing UA): Play for
  // single-CTA surfaces. Use mobileStorePreference() when showing both stores.
  return listing.androidUrl;
}

export function mobileStoreUrls(): string[] {
  return Object.values(MOBILE_APPS).flatMap((app) => [app.androidUrl, app.iosUrl]);
}
