import { describe, expect, it } from 'vitest';
import {
  LARGE_PARTY_SELECT_VALUE,
  MAX_BOOKABLE_PARTY_SIZE,
  clampToAcceptedPartySize,
  discoveryPartySizeSelectOptions,
  isAcceptedPartySize,
  partySizeSelectOptions,
  resolveAcceptedPartySize,
} from '../partySize.js';

describe('partySize', () => {
  it('defaults unset settings to 1–20', () => {
    expect(resolveAcceptedPartySize(undefined)).toEqual({ min: 1, max: 20 });
    expect(resolveAcceptedPartySize({})).toEqual({ min: 1, max: 20 });
  });

  it('clamps and swaps inverted bounds', () => {
    expect(resolveAcceptedPartySize({ minPartySize: 4, maxPartySize: 8 })).toEqual({
      min: 4,
      max: 8,
    });
    expect(resolveAcceptedPartySize({ minPartySize: 10, maxPartySize: 2 })).toEqual({
      min: 10,
      max: 10,
    });
  });

  it('validates accepted party sizes', () => {
    const settings = { minPartySize: 2, maxPartySize: 6 };
    expect(isAcceptedPartySize(2, settings)).toBe(true);
    expect(isAcceptedPartySize(6, settings)).toBe(true);
    expect(isAcceptedPartySize(1, settings)).toBe(false);
    expect(isAcceptedPartySize(7, settings)).toBe(false);
    expect(isAcceptedPartySize(2.5, settings)).toBe(false);
  });

  it('clamps draft restore into range', () => {
    const settings = { minPartySize: 2, maxPartySize: 6 };
    expect(clampToAcceptedPartySize(1, settings)).toBe(2);
    expect(clampToAcceptedPartySize(9, settings)).toBe(6);
    expect(clampToAcceptedPartySize(4, settings)).toBe(4);
  });

  it('builds select options with Large party CTA', () => {
    const options = partySizeSelectOptions({ minPartySize: 1, maxPartySize: 4 });
    expect(options.map((o) => o.value)).toEqual([1, 2, 3, 4, LARGE_PARTY_SELECT_VALUE]);
    expect(options.at(-1)?.label).toMatch(/Large party \(5\+\)/);
  });

  it('omits Large party when includeLargeParty is false', () => {
    const options = partySizeSelectOptions(
      { minPartySize: 1, maxPartySize: 4 },
      { includeLargeParty: false },
    );
    expect(options.map((o) => o.value)).toEqual([1, 2, 3, 4]);
  });

  it('discovery picker spans 1…MAX_BOOKABLE without Large party', () => {
    const options = discoveryPartySizeSelectOptions();
    expect(options).toHaveLength(MAX_BOOKABLE_PARTY_SIZE);
    expect(options[0]).toEqual({ value: 1, label: '1 guest' });
    expect(options.at(-1)?.value).toBe(MAX_BOOKABLE_PARTY_SIZE);
  });
});
