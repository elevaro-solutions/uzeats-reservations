'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const RESTAURANT_PARAM = 'restaurant';

/** Syncs active restaurant with URL `?restaurant=` and Partner Hub header selector. */
export function useActiveRestaurant(restaurantIds: string[] = []) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantIdState] = useState<string>();

  const restaurantIdsKey = restaurantIds.join(',');

  const resolvedId = useMemo(() => {
    const fromUrl = searchParams.get(RESTAURANT_PARAM);
    const validFromUrl = fromUrl && restaurantIds.includes(fromUrl) ? fromUrl : undefined;
    if (validFromUrl) return validFromUrl;

    const saved =
      typeof window !== 'undefined' ? localStorage.getItem('activeRestaurantId') : null;
    const validSaved = saved && restaurantIds.includes(saved) ? saved : undefined;
    return validSaved ?? restaurantIds[0];
  }, [restaurantIdsKey, searchParams, restaurantIds]);

  useEffect(() => {
    setRestaurantIdState(resolvedId);
  }, [resolvedId]);

  const setRestaurantId = useCallback(
    (id: string) => {
      if (!restaurantIds.includes(id)) return;
      setRestaurantIdState(id);
      localStorage.setItem('activeRestaurantId', id);
      window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));

      const params = new URLSearchParams(searchParams.toString());
      if (restaurantIds.length > 1) params.set(RESTAURANT_PARAM, id);
      else params.delete(RESTAURANT_PARAM);

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [pathname, restaurantIds, router, searchParams],
  );

  useEffect(() => {
    if (!resolvedId || restaurantIds.length <= 1) return;
    const fromUrl = searchParams.get(RESTAURANT_PARAM);
    if (fromUrl === resolvedId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(RESTAURANT_PARAM, resolvedId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [resolvedId, restaurantIds.length, pathname, router, searchParams]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setRestaurantIdState(id);
    };
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  return { restaurantId: restaurantId ?? resolvedId, setRestaurantId };
}
