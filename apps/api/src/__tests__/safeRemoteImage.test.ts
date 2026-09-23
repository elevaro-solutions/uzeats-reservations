import { describe, expect, it } from 'vitest';
import { sniffAllowedImageContentType } from '../services/spaces.js';
import { hostAllowed, isPrivateIpAddress } from '../lib/safeRemoteImage.js';
import { sanitizeBlogHtml, sanitizeSupportHtml } from '@reservations/shared';

describe('isPrivateIpAddress', () => {
  it('blocks loopback, RFC1918, link-local, and metadata ranges', () => {
    expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('10.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('192.168.1.1')).toBe(true);
    expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateIpAddress('169.254.169.254')).toBe(true);
    expect(isPrivateIpAddress('::1')).toBe(true);
    expect(isPrivateIpAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('allows public unicast v4', () => {
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
    expect(isPrivateIpAddress('1.1.1.1')).toBe(false);
  });
});

describe('hostAllowed', () => {
  const suffixes = ['doordash.com', 'cdn4dd.com', 'cloudfront.net'];

  it('allows listed suffixes and rejects localhost', () => {
    expect(hostAllowed('img.cdn4dd.com', suffixes)).toBe(true);
    expect(hostAllowed('d111.cloudfront.net', suffixes)).toBe(true);
    expect(hostAllowed('localhost', suffixes)).toBe(false);
    expect(hostAllowed('evil.example.com', suffixes)).toBe(false);
    expect(hostAllowed('169.254.169.254', suffixes)).toBe(false);
  });
});

describe('sniffAllowedImageContentType', () => {
  it('detects jpeg/png/gif/webp and rejects html/svg', () => {
    expect(sniffAllowedImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(12)]))).toBe(
      'image/jpeg',
    );
    expect(
      sniffAllowedImageContentType(Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Buffer.alloc(12)])),
    ).toBe('image/png');
    const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(12)]);
    expect(sniffAllowedImageContentType(gif)).toBe('image/gif');
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WEBP'),
      Buffer.alloc(4),
    ]);
    expect(sniffAllowedImageContentType(webp)).toBe('image/webp');
    expect(sniffAllowedImageContentType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBe(
      null,
    );
    expect(sniffAllowedImageContentType(Buffer.from('<html><script>alert(1)</script>'))).toBe(null);
  });
});

describe('sanitizeBlogHtml', () => {
  it('strips scripts and javascript URLs; keeps https links and headings', () => {
    const dirty =
      '<h2>Hello</h2><p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://tablevera.online/blog">ok</a>';
    const clean = sanitizeBlogHtml(dirty);
    expect(clean).toContain('<h2>Hello</h2>');
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toContain('https://tablevera.online/blog');
    expect(clean).toContain('rel="noopener noreferrer"');
  });
});

describe('sanitizeSupportHtml', () => {
  it('drops img tags not in the support allowlist', () => {
    const clean = sanitizeSupportHtml('<p>ok</p><img src="https://evil.test/x" onerror="alert(1)">');
    expect(clean).toContain('<p>ok</p>');
    expect(clean).not.toMatch(/<img/i);
  });
});
