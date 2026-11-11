import { describe, expect, it } from 'vitest';
import { browserMediaUrl, rewriteSpacesUrlsInHtml, toSpacesCdnUrl } from '../mediaUrl.js';

describe('toSpacesCdnUrl', () => {
  it('rewrites virtual-hosted and path-style Spaces origins to the CDN', () => {
    expect(
      toSpacesCdnUrl('https://tablevera.sfo3.digitaloceanspaces.com/uploads/wall.jpg?v=1'),
    ).toBe('https://tablevera.sfo3.cdn.digitaloceanspaces.com/uploads/wall.jpg?v=1');

    expect(
      toSpacesCdnUrl('https://sfo3.digitaloceanspaces.com/tablevera/restaurants/abc/menu/dish.jpg'),
    ).toBe('https://tablevera.sfo3.cdn.digitaloceanspaces.com/restaurants/abc/menu/dish.jpg');
  });

  it('leaves CDN, custom, and local upload URLs alone', () => {
    const cdn = 'https://tablevera.sfo3.cdn.digitaloceanspaces.com/uploads/wall.jpg';
    expect(toSpacesCdnUrl(cdn)).toBe(cdn);
    expect(toSpacesCdnUrl('https://images.unsplash.com/photo-1')).toBe(
      'https://images.unsplash.com/photo-1',
    );
    expect(browserMediaUrl('http://localhost:4000/api/uploads/local/restaurants/abc/menu/a.jpg')).toBe(
      '/api/uploads/local/restaurants/abc/menu/a.jpg',
    );
  });

  it('rewrites image URLs inside HTML', () => {
    const html =
      '<p><img src="https://tablevera.sfo3.digitaloceanspaces.com/uploads/dish.jpg"></p>';
    expect(rewriteSpacesUrlsInHtml(html)).toBe(
      '<p><img src="https://tablevera.sfo3.cdn.digitaloceanspaces.com/uploads/dish.jpg"></p>',
    );
  });
});
