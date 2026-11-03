import { describe, expect, it } from 'vitest';
import {
  isAndroidClient,
  isIosClient,
  MOBILE_APPS,
  mobileStorePreference,
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

  it('detects iPhone, iPadOS, and Android clients', () => {
    expect(isIosClient({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe(
      true,
    );
    expect(isIosClient({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      true,
    );
    expect(isIosClient({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(false);
    expect(isAndroidClient({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(true);
    expect(isAndroidClient({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe(
      false,
    );
  });

  it('prefers App Store on iOS, Play on Android, and both when ambiguous', () => {
    expect(
      preferredMobileStoreUrl(MOBILE_APPS.diner, {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      }),
    ).toBe(MOBILE_APPS.diner.iosUrl);
    expect(
      preferredMobileStoreUrl(MOBILE_APPS.diner, {
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      }),
    ).toBe(MOBILE_APPS.diner.androidUrl);
    expect(preferredMobileStoreUrl(MOBILE_APPS.partner)).toBe(MOBILE_APPS.partner.androidUrl);
    expect(mobileStorePreference()).toBe('both');
    expect(mobileStorePreference({ userAgent: 'Mozilla/5.0 (Macintosh)' })).toBe('both');
    expect(
      mobileStorePreference({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }),
    ).toBe('ios');
    expect(mobileStorePreference({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe('android');
  });
});
