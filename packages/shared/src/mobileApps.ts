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

export function isIosClient(nav: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  if (/iPad|iPhone|iPod/i.test(nav.userAgent ?? '')) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

export function preferredMobileStoreUrl(
  listing: MobileAppListing,
  nav?: { userAgent?: string; platform?: string; maxTouchPoints?: number },
): string {
  if (nav && isIosClient(nav)) return listing.iosUrl;
  return listing.androidUrl;
}

export function mobileStoreUrls(): string[] {
  return Object.values(MOBILE_APPS).flatMap((app) => [app.androidUrl, app.iosUrl]);
}
