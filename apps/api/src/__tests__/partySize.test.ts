import {
  DEFAULT_MAX_PARTY_SIZE,
  DEFAULT_MIN_PARTY_SIZE,
  LARGE_PARTY_SELECT_VALUE,
  MAX_BOOKABLE_PARTY_SIZE,
  MAX_PARTY_SIZE_SETTING,
  clampToAcceptedPartySize,
  isAcceptedPartySize,
  partySizeSelectOptions,
  resolveAcceptedPartySize,
} from '@reservations/shared';

describe('resolveAcceptedPartySize', () => {
  it('uses platform defaults when unset', () => {
    expect(resolveAcceptedPartySize(null)).toEqual({
      min: DEFAULT_MIN_PARTY_SIZE,
      max: DEFAULT_MAX_PARTY_SIZE,
    });
    expect(resolveAcceptedPartySize({})).toEqual({
      min: DEFAULT_MIN_PARTY_SIZE,
      max: DEFAULT_MAX_PARTY_SIZE,
    });
  });

  it('honors restaurant min/max and keeps min ≤ max', () => {
    expect(resolveAcceptedPartySize({ minPartySize: 2, maxPartySize: 8 })).toEqual({
      min: 2,
      max: 8,
    });
    expect(resolveAcceptedPartySize({ minPartySize: 10, maxPartySize: 4 })).toEqual({
      min: 10,
      max: 10,
    });
  });

  it('allows large restaurant max and clamps invalid lows / overhead', () => {
    expect(resolveAcceptedPartySize({ minPartySize: 0, maxPartySize: 120 })).toEqual({
      min: DEFAULT_MIN_PARTY_SIZE,
      max: 120,
    });
    expect(resolveAcceptedPartySize({ minPartySize: 1, maxPartySize: 50_000 })).toEqual({
      min: 1,
      max: MAX_PARTY_SIZE_SETTING,
    });
  });
});

describe('partySizeSelectOptions', () => {
  it('lists accepted sizes and a Large party CTA when below settings ceiling', () => {
    const options = partySizeSelectOptions({ minPartySize: 2, maxPartySize: 4 });
    expect(options.map((o) => o.value)).toEqual([2, 3, 4, LARGE_PARTY_SELECT_VALUE]);
    expect(options.at(-1)?.label).toBe('Large party (5+)');
  });

  it('omits Large party when max is the settings ceiling', () => {
    const options = partySizeSelectOptions({
      minPartySize: MAX_PARTY_SIZE_SETTING,
      maxPartySize: MAX_PARTY_SIZE_SETTING,
    });
    expect(options.some((o) => o.value === LARGE_PARTY_SELECT_VALUE)).toBe(false);
    expect(options).toHaveLength(1);
  });

  it('supports max above the discovery picker bound', () => {
    const options = partySizeSelectOptions({ minPartySize: 1, maxPartySize: 60 });
    expect(options).toHaveLength(61); // 1–60 + Large party
    expect(options.some((o) => o.value === MAX_BOOKABLE_PARTY_SIZE)).toBe(true);
    expect(options.some((o) => o.value === 60)).toBe(true);
  });
});

describe('isAcceptedPartySize / clampToAcceptedPartySize', () => {
  it('validates and clamps into the accepted range', () => {
    const settings = { minPartySize: 2, maxPartySize: 6 };
    expect(isAcceptedPartySize(4, settings)).toBe(true);
    expect(isAcceptedPartySize(1, settings)).toBe(false);
    expect(isAcceptedPartySize(7, settings)).toBe(false);
    expect(clampToAcceptedPartySize(1, settings)).toBe(2);
    expect(clampToAcceptedPartySize(9, settings)).toBe(6);
  });
});
