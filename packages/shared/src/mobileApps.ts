/** Public store listings. iOS is not live yet — do not link an App Store URL. */
export const MOBILE_APPS = {
  diner: {
    id: 'diner',
    name: 'Tablevera',
    audience: 'Diners',
    blurb: 'Find restaurants and book a table from your phone.',
    androidUrl:
      'https://play.google.com/store/apps/details?id=uz.alitech.tablevera&pcampaignid=web_share',
    ios: 'coming_soon' as const,
  },
  partner: {
    id: 'partner',
    name: 'Tablevera Partner',
    audience: 'Restaurants',
    blurb: 'Run the book, the floor, and guest messages from the host stand.',
    androidUrl: 'https://play.google.com/store/apps/details?id=uz.alitech.tablevera.merchant',
    ios: 'coming_soon' as const,
  },
} as const;

export type MobileAppId = keyof typeof MOBILE_APPS;
