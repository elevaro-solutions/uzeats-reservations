import { describe, expect, it } from 'vitest';
import { isLocalhostUrl, resolveAppUrl } from '../appUrls.js';

describe('resolveAppUrl', () => {
  const cors =
    'https://tablevera.online,https://dashboard.tablevera.online';

  it('uses explicit production URL when set', () => {
    expect(
      resolveAppUrl('https://custom.example.com', cors, 0, 'http://localhost:3000'),
    ).toBe('https://custom.example.com');
  });

  it('falls back to CORS origin when configured URL is localhost default', () => {
    expect(resolveAppUrl('http://localhost:3000', cors, 0, 'http://localhost:3000')).toBe(
      'https://tablevera.online',
    );
    expect(resolveAppUrl('http://localhost:3001', cors, 1, 'http://localhost:3001')).toBe(
      'https://dashboard.tablevera.online',
    );
  });

  it('strips trailing slashes', () => {
    expect(
      resolveAppUrl('https://tablevera.online/', cors, 0, 'http://localhost:3000'),
    ).toBe('https://tablevera.online');
  });

  it('keeps localhost when CORS is also local', () => {
    const localCors = 'http://localhost:3000,http://localhost:3001';
    expect(resolveAppUrl('http://localhost:3000', localCors, 0, 'http://localhost:3000')).toBe(
      'http://localhost:3000',
    );
  });
});

describe('isLocalhostUrl', () => {
  it('detects localhost and loopback', () => {
    expect(isLocalhostUrl('http://localhost:3000')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:3000')).toBe(true);
    expect(isLocalhostUrl('https://tablevera.online')).toBe(false);
  });
});
