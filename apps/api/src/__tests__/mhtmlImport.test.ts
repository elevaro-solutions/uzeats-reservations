import { describe, expect, it, vi } from 'vitest';
import {
  isSupportedDeliveryUrl,
  normalizeDeliveryUrl,
  parseMhtmlRestaurant,
  parseRestaurantFile,
  parseRestaurantHtml,
} from '../services/mhtmlImport.js';
import { fetchRestaurantFromUrl, RestaurantUrlImportError } from '../services/restaurantUrlImport.js';

const DOORDASH_HTML = `
<!doctype html>
<html>
<head><title>Order Joe's Burgers - DoorDash</title></head>
<body>
  <div>4.5 (2k+) $$ DashPass • Burgers •</div>
  <meta property="og:description" content="Joe's Burgers in Austin, TX" />
  <h2 data-category-scroll-selector="true">Burgers</h2>
  <div data-testid="MenuItem">
    <h3>Classic Burger</h3>
    <span data-telemetry-id="storeMenuItem.subtitle">Angus beef, lettuce, tomato</span>
    <span data-testid="StoreMenuItemPrice">$12.50</span>
  </div>
  <div data-testid="MenuItem">
    <h3>Cheese Burger</h3>
    <span data-testid="StoreMenuItemPrice">$13.99</span>
  </div>
</body>
</html>
`;

const UBEREATS_HTML = `
<!doctype html>
<html>
<head><title>Order Silk Road - Uber Eats</title></head>
<body>
  <div>4.6 x (2,000+) Uyghur</div>
  <div>3518 Connecticut Ave Nw, Washington, DC 20008</div>
  <div>Featured items</div>
  <div>Lagman $23.04 • 91% (453)</div>
  <div>Manti $18.50 • 88% (120)</div>
  <div>11:30 AM – 9:00 PM</div>
</body>
</html>
`;

describe('mhtmlImport', () => {
  it('detects supported delivery URLs', () => {
    expect(isSupportedDeliveryUrl('https://www.doordash.com/store/joes-burgers/123/')).toBe(true);
    expect(isSupportedDeliveryUrl('https://www.ubereats.com/store/silk-road/abc')).toBe(true);
    expect(isSupportedDeliveryUrl('https://example.com/store/foo')).toBe(false);
    expect(isSupportedDeliveryUrl('https://www.doordash.com/')).toBe(false);
  });

  it('normalizes delivery URLs', () => {
    expect(normalizeDeliveryUrl('https://www.doordash.com/store/foo/#menu')).toBe(
      'https://www.doordash.com/store/foo/',
    );
  });

  it('parses DoorDash HTML exports', () => {
    const data = parseRestaurantHtml(DOORDASH_HTML, 'https://www.doordash.com/store/joes-burgers/123/');
    expect(data.source).toBe('doordash');
    expect(data.name).toBe("Joe's Burgers");
    expect(data.cuisine).toBe('American');
    expect(data.priceRange).toBe(2);
    expect(data.rating).toBe(4.5);
    expect(data.menuCategories).toEqual(['Burgers']);
    expect(data.menuItems).toHaveLength(2);
    expect(data.menuItems?.[0]).toMatchObject({
      name: 'Classic Burger',
      price: 1250,
      category: 'Burgers',
    });
  });

  it('parses Uber Eats HTML exports', () => {
    const data = parseRestaurantHtml(UBEREATS_HTML, 'https://www.ubereats.com/store/silk-road/abc');
    expect(data.source).toBe('ubereats');
    expect(data.name).toBe('Silk Road');
    expect(data.cuisine).toBe('Uzbek');
    expect(data.address).toMatchObject({
      line1: '3518 Connecticut Ave Nw',
      city: 'Washington',
      state: 'DC',
      zip: '20008',
    });
    expect(data.menuItems?.length).toBeGreaterThanOrEqual(2);
    expect(data.hours).toContain('11:30 AM');
  });

  it('parses quoted-printable MHTML bodies', () => {
    const mhtml = [
      'From: <Saved by Blink>',
      'Snapshot-Content-Location: https://www.doordash.com/store/test/1/',
      'Content-Type: multipart/related; boundary="BOUNDARY"',
      '',
      '--BOUNDARY',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '<title>Order Test Grill - DoorDash</title>',
      '<div>4.2 (100+) $$ DashPass =E2=80=A2 Burgers =E2=80=A2</div>',
      '--BOUNDARY--',
    ].join('\r\n');

    const data = parseMhtmlRestaurant(Buffer.from(mhtml, 'utf-8'));
    expect(data.source).toBe('doordash');
    expect(data.name).toBe('Test Grill');
    expect(data.cuisine).toBe('American');
  });

  it('parses standalone HTML files by filename', () => {
    const data = parseRestaurantFile(Buffer.from(DOORDASH_HTML, 'utf-8'), 'restaurant.html');
    expect(data.source).toBe('doordash');
    expect(data.name).toBe("Joe's Burgers");
  });
});

describe('restaurantUrlImport', () => {
  it('rejects invalid URLs', async () => {
    await expect(fetchRestaurantFromUrl('https://example.com/store/foo')).rejects.toMatchObject({
      code: 'invalid_url',
    } satisfies Partial<RestaurantUrlImportError>);
  });

  it('rejects Cloudflare challenge pages', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response('<html><title>Just a moment...</title></html>', { status: 403 }),
    ) as typeof fetch;

    try {
      await expect(
        fetchRestaurantFromUrl('https://www.doordash.com/store/test/1/'),
      ).rejects.toMatchObject({ code: 'blocked' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
