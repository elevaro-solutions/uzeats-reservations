import { describe, expect, it } from 'vitest';
import { parseJwtExpiresToSeconds } from '../lib/jwtExpires.js';

describe('parseJwtExpiresToSeconds', () => {
  it('parses seconds, minutes, hours, and days', () => {
    expect(parseJwtExpiresToSeconds('30s', 0)).toBe(30);
    expect(parseJwtExpiresToSeconds('15m', 0)).toBe(15 * 60);
    expect(parseJwtExpiresToSeconds('2h', 0)).toBe(2 * 60 * 60);
    expect(parseJwtExpiresToSeconds('7d', 0)).toBe(7 * 24 * 60 * 60);
  });

  it('returns fallback for invalid values', () => {
    expect(parseJwtExpiresToSeconds('', 99)).toBe(99);
    expect(parseJwtExpiresToSeconds('nope', 42)).toBe(42);
    expect(parseJwtExpiresToSeconds('-5m', 7)).toBe(7);
  });
});
