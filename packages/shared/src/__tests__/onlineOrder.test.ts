import { describe, expect, it } from 'vitest';
import {
  buildOnlineOrderLink,
  isOnlineOrderingEnabled,
  isValidOnlineOrderUrl,
  normalizeOnlineOrderUrl,
  onlineOrderUtmSource,
  resolveOnlineOrderLink,
} from '../onlineOrder.js';
import { canManageOnlineOrdering } from '../roles.js';
import { restaurantInputSchema } from '../schemas.js';

describe('onlineOrder', () => {
  it('validates ordering URLs, allowing a missing scheme', () => {
    expect(isValidOnlineOrderUrl('https://www.doordash.com/store/teahouse')).toBe(true);
    expect(isValidOnlineOrderUrl('order.toasttab.com/teahouse')).toBe(true);
    expect(isValidOnlineOrderUrl('')).toBe(false);
    expect(isValidOnlineOrderUrl('not a url')).toBe(false);
    expect(isValidOnlineOrderUrl('localhost')).toBe(false);
    expect(isValidOnlineOrderUrl('ftp://files.example.com/menu')).toBe(false);
  });

  it('normalizes to an https URL or null', () => {
    expect(normalizeOnlineOrderUrl(' order.toasttab.com/teahouse ')).toBe(
      'https://order.toasttab.com/teahouse',
    );
    expect(normalizeOnlineOrderUrl('http://example.com/order')).toBe('http://example.com/order');
    expect(normalizeOnlineOrderUrl('   ')).toBeNull();
    expect(normalizeOnlineOrderUrl('nope')).toBeNull();
  });

  it('treats a missing flag as enabled when the URL is valid', () => {
    expect(isOnlineOrderingEnabled({ onlineOrderUrl: 'https://a.com/o' })).toBe(true);
    expect(isOnlineOrderingEnabled({ onlineOrderUrl: 'https://a.com/o', onlineOrderEnabled: null })).toBe(
      true,
    );
    expect(isOnlineOrderingEnabled({ onlineOrderUrl: 'https://a.com/o', onlineOrderEnabled: false })).toBe(
      false,
    );
    expect(isOnlineOrderingEnabled({ onlineOrderUrl: '', onlineOrderEnabled: true })).toBe(false);
  });

  it('uses the full public listing path as utm_source', () => {
    expect(onlineOrderUtmSource('https://tablevera.online/', { slug: 'teahouse' })).toBe(
      'tablevera.online/restaurants/teahouse',
    );
    expect(onlineOrderUtmSource('https://tablevera.online', { id: '507f1f77bcf86cd799439011' })).toBe(
      'tablevera.online/restaurants/507f1f77bcf86cd799439011',
    );
  });

  it('appends UTMs, keeps other params, and replaces existing UTMs', () => {
    const link = buildOnlineOrderLink(
      'https://www.doordash.com/store/teahouse?pickup=true&utm_source=old#menu',
      { siteUrl: 'https://tablevera.online', slug: 'teahouse' },
    );
    const url = new URL(link!);
    expect(url.searchParams.get('pickup')).toBe('true');
    expect(url.searchParams.get('utm_source')).toBe('tablevera.online/restaurants/teahouse');
    expect(url.searchParams.get('utm_medium')).toBe('reservations');
    expect(url.searchParams.get('utm_campaign')).toBe('order_online');
    expect(url.searchParams.getAll('utm_source')).toHaveLength(1);
    expect(url.hash).toBe('#menu');
  });

  it('resolves no diner link when ordering is off', () => {
    const base = { slug: 'teahouse', onlineOrderUrl: 'https://a.com/o' };
    expect(resolveOnlineOrderLink(base, 'https://tablevera.online')).toContain('utm_medium=reservations');
    expect(
      resolveOnlineOrderLink({ ...base, onlineOrderEnabled: false }, 'https://tablevera.online'),
    ).toBeNull();
  });

  it('lets owners, managers, and admins toggle ordering, not hosts or diners', () => {
    expect(canManageOnlineOrdering('restaurant_owner')).toBe(true);
    expect(canManageOnlineOrdering('manager')).toBe(true);
    expect(canManageOnlineOrdering('admin')).toBe(true);
    expect(canManageOnlineOrdering('account_manager')).toBe(true);
    expect(canManageOnlineOrdering('host')).toBe(false);
    expect(canManageOnlineOrdering('diner')).toBe(false);
  });

  it('parses cleared and omitted ordering URLs differently', () => {
    const base = {
      name: 'Teahouse',
      cuisine: 'Uzbek',
      priceRange: 2,
      address: { line1: '1 Main St', city: 'Brooklyn', state: 'NY', zip: '11201', country: 'US' },
      location: { lng: -73.99, lat: 40.69 },
    };
    expect(restaurantInputSchema.parse({ ...base, onlineOrderUrl: '' }).onlineOrderUrl).toBeNull();
    expect(restaurantInputSchema.parse({ ...base, onlineOrderUrl: null }).onlineOrderUrl).toBeNull();
    expect(restaurantInputSchema.parse(base).onlineOrderUrl).toBeUndefined();
    expect(restaurantInputSchema.parse({ ...base, menuUrl: '' }).menuUrl).toBeNull();
  });
});
