import { describe, expect, it } from 'vitest';
import {
  isIosClient,
  MOBILE_APPS,
  mobileStoreUrls,
  preferredMobileStoreUrl,
} from '../mobileApps.js';

describe('mobileApps', () => {
  it('lists Play and App Store URLs for diner and partner', () => {
    expect(MOBILE_APPS.diner.iosUrl).toContain('id6823634245');
    expect(MOBILE_APPS.partner.iosUrl).toContain('id6824937754');
    expect(mobileStoreUrls()).toEqual([
      MOBILE_APPS.diner.androidUrl,
      MOBILE_APPS.diner.iosUrl,
      MOBILE_APPS.partner.androidUrl,
      MOBILE_APPS.partner.iosUrl,
    ]);
  });

  it('detects iPhone and iPadOS clients', () => {
    expect(isIosClient({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe(
      true,
    );
    expect(isIosClient({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      true,
    );
    expect(isIosClient({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(false);
  });

  it('prefers the App Store URL on iOS', () => {
    expect(
      preferredMobileStoreUrl(MOBILE_APPS.diner, {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      }),
    ).toBe(MOBILE_APPS.diner.iosUrl);
    expect(preferredMobileStoreUrl(MOBILE_APPS.partner)).toBe(MOBILE_APPS.partner.androidUrl);
  });
});
