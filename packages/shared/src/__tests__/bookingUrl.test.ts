import { describe, expect, it } from 'vitest';
import {
  buildGoogleBusinessProfileBookingUrl,
  buildRestaurantBookingPath,
  buildRestaurantBookingUrl,
  buildWidgetEmbedCode,
  isMongoObjectId,
} from '../bookingUrl.js';

describe('bookingUrl', () => {
  it('detects Mongo object ids', () => {
    expect(isMongoObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isMongoObjectId('not-an-id')).toBe(false);
  });

  it('builds booking paths preferring slug', () => {
    expect(buildRestaurantBookingPath('samarkand-palace')).toBe('/restaurants/samarkand-palace');
    expect(buildRestaurantBookingPath(null, '507f1f77bcf86cd799439011')).toBe(
      '/restaurants/507f1f77bcf86cd799439011',
    );
    expect(buildRestaurantBookingPath()).toBe('/');
  });

  it('appends query params and Google Business UTMs', () => {
    expect(
      buildRestaurantBookingUrl('https://tablevera.online/', {
        slug: 'teahouse',
        params: { party: 2, empty: '' },
      }),
    ).toBe('https://tablevera.online/restaurants/teahouse?party=2');

    expect(
      buildGoogleBusinessProfileBookingUrl('https://tablevera.online', {
        slug: 'teahouse',
      }),
    ).toBe(
      'https://tablevera.online/restaurants/teahouse?utm_source=google&utm_medium=business_profile&utm_campaign=reservations',
    );
  });

  it('builds widget embed snippets', () => {
    const code = buildWidgetEmbedCode({
      restaurantId: 'rest_1',
      mode: 'button',
      buttonText: 'Book "now"',
      showReviews: false,
    });
    expect(code).toContain('data-restaurant-id="rest_1"');
    expect(code).toContain('data-mode="button"');
    expect(code).toContain('data-button-text="Book &quot;now&quot;"');
    expect(code).toContain('data-show-reviews="false"');
    expect(code).not.toContain('Book on Tablevera');
  });

  it('appends a crawlable Tablevera listing link when listingUrl is set', () => {
    const code = buildWidgetEmbedCode({
      restaurantId: 'rest_1',
      listingUrl: 'https://tablevera.online/restaurants/teahouse',
      restaurantName: 'The Teahouse',
    });
    expect(code).toContain('href="https://tablevera.online/restaurants/teahouse"');
    expect(code).toContain('Book The Teahouse on Tablevera');
  });
});
