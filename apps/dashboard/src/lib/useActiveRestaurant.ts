'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ALL_LOCATIONS_VALUE } from '@/lib/restaurants';
import {
  ACTIVE_RESTAURANT_STORAGE_KEY,
  clearPendingRestaurantScope,
  markPendingRestaurantScope,
  readPendingRestaurantScope,
  readStoredRestaurantScope,
  resolveRestaurantScope,
  writeStoredRestaurantScope,
} from '@/lib/restaurantScope';

const RESTAURANT_PARAM = 'restaurant';

/** Syncs active restaurant with URL `?restaurant=` and the header selector. */
export function useActiveRestaurant(
  restaurantIds: string[] = [],
  options?: { syncUrl?: boolean },
) {
  const syncUrl = options?.syncUrl ?? false;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [epoch, setEpoch] = useState(0);
  const restaurantIdsKey = restaurantIds.join(',');

  const scope = useMemo(() => {
    const pending = readPendingRestaurantScope();
    if (pending === ALL_LOCATIONS_VALUE && restaurantIds.length > 1) return { mode: 'all' as const };
    if (pending && restaurantIds.includes(pending)) {
      return { mode: 'one' as const, restaurantId: pending };
    }
    return resolveRestaurantScope({
      restaurantIds,
      urlRestaurant: searchParams.get(RESTAURANT_PARAM),
      stored: readStoredRestaurantScope(),
    });
    // epoch re-reads pending scope and localStorage after the header selector changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, searchParams, epoch, restaurantIds]);

  const allRestaurants = scope?.mode === 'all';
  const restaurantId = scope?.mode === 'one' ? scope.restaurantId : undefined;

  const setRestaurantId = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('locations');

      if (id === ALL_LOCATIONS_VALUE) {
        if (restaurantIds.length <= 1) return;
        markPendingRestaurantScope(ALL_LOCATIONS_VALUE);
        writeStoredRestaurantScope(ALL_LOCATIONS_VALUE);
        window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: ALL_LOCATIONS_VALUE }));
        params.delete(RESTAURANT_PARAM);
      } else {
        if (!restaurantIds.includes(id)) return;
        markPendingRestaurantScope(id);
        writeStoredRestaurantScope(id);
        window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
        if (restaurantIds.length > 1) params.set(RESTAURANT_PARAM, id);
        else params.delete(RESTAURANT_PARAM);
      }

      setEpoch((n) => n + 1);
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
    },
    [pathname, restaurantIds, router, searchParams],
  );

  useEffect(() => {
    if (!syncUrl || !scope || restaurantIds.length <= 1) return;
    const params = new URLSearchParams(searchParams.toString());
    const pending = readPendingRestaurantScope();
    const fromUrl = params.get(RESTAURANT_PARAM);
    let changed = false;
    if (params.has('locations')) {
      params.delete('locations');
      changed = true;
    }

    if (pending === ALL_LOCATIONS_VALUE) {
      if (params.has(RESTAURANT_PARAM)) {
        params.delete(RESTAURANT_PARAM);
        changed = true;
      } else {
        clearPendingRestaurantScope();
      }
    } else if (pending && restaurantIds.includes(pending)) {
      if (fromUrl !== pending) {
        params.set(RESTAURANT_PARAM, pending);
        changed = true;
      } else {
        clearPendingRestaurantScope();
      }
    } else if (fromUrl && restaurantIds.includes(fromUrl)) {
      if (localStorage.getItem(ACTIVE_RESTAURANT_STORAGE_KEY) !== fromUrl) {
        writeStoredRestaurantScope(fromUrl);
      }
    } else {
      const stored = readStoredRestaurantScope();
      if (stored && restaurantIds.includes(stored)) {
        params.set(RESTAURANT_PARAM, stored);
        changed = true;
      } else if (params.has(RESTAURANT_PARAM)) {
        params.delete(RESTAURANT_PARAM);
        changed = true;
        writeStoredRestaurantScope(ALL_LOCATIONS_VALUE);
      }
    }

    if (!changed) return;
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [syncUrl, scope, restaurantIds, restaurantIds.length, pathname, router, searchParams]);

  useEffect(() => {
    const onChange = () => setEpoch((n) => n + 1);
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  return { restaurantId, allRestaurants, setRestaurantId };
}
