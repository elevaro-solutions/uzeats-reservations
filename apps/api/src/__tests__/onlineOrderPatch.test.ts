import { describe, expect, it } from 'vitest';
import { resolveOnlineOrderPatch } from '../lib/restaurantInput.js';

const URL_A = 'https://www.doordash.com/store/teahouse';

describe('resolveOnlineOrderPatch', () => {
  it('enables ordering when the first valid URL is added', () => {
    expect(resolveOnlineOrderPatch({}, { onlineOrderUrl: URL_A }, 'restaurant_owner')).toEqual({
      onlineOrderEnabled: true,
    });
    expect(resolveOnlineOrderPatch(null, { onlineOrderUrl: URL_A }, 'host')).toEqual({
      onlineOrderEnabled: true,
    });
  });

  it('keeps the stored flag when the update omits it', () => {
    expect(
      resolveOnlineOrderPatch(
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        { onlineOrderUrl: 'https://order.toasttab.com/teahouse' },
        'manager',
      ),
    ).toEqual({});
    expect(
      resolveOnlineOrderPatch({ onlineOrderUrl: URL_A, onlineOrderEnabled: false }, {}, 'manager'),
    ).toEqual({});
  });

  it('resets the flag when the URL is cleared', () => {
    expect(
      resolveOnlineOrderPatch(
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        { onlineOrderUrl: null, onlineOrderEnabled: false },
        'restaurant_owner',
      ),
    ).toEqual({ onlineOrderEnabled: null });
  });

  it('lets owners, managers, and admins switch ordering off and on', () => {
    for (const role of ['restaurant_owner', 'manager', 'admin', 'account_manager']) {
      expect(
        resolveOnlineOrderPatch(
          { onlineOrderUrl: URL_A },
          { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
          role,
        ),
      ).toEqual({ onlineOrderEnabled: false });
    }
    expect(
      resolveOnlineOrderPatch(
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        { onlineOrderEnabled: true },
        'manager',
      ),
    ).toEqual({ onlineOrderEnabled: true });
  });

  it('blocks hosts from changing the switch but allows resending the same value', () => {
    expect(() =>
      resolveOnlineOrderPatch(
        { onlineOrderUrl: URL_A },
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        'host',
      ),
    ).toThrow(/owners, managers, and admins/);
    expect(() =>
      resolveOnlineOrderPatch({}, { onlineOrderUrl: URL_A, onlineOrderEnabled: false }, 'host'),
    ).toThrow(/owners, managers, and admins/);
    expect(
      resolveOnlineOrderPatch(
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        { onlineOrderUrl: URL_A, onlineOrderEnabled: false },
        'host',
      ),
    ).toEqual({ onlineOrderEnabled: false });
  });
});
