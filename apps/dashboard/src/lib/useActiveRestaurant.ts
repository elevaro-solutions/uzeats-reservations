'use client';

import { useCallback, useEffect, useState } from 'react';

/** Syncs the active restaurant with the Partner Hub header selector. */
export function useActiveRestaurant(restaurantIds: string[] = []) {
  const [restaurantId, setRestaurantIdState] = useState<string>();

  const setRestaurantId = useCallback((id: string) => {
    setRestaurantIdState(id);
    localStorage.setItem('activeRestaurantId', id);
    window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const valid = saved && restaurantIds.includes(saved);
    const next = valid ? saved! : restaurantIds[0];
    setRestaurantIdState(next);
  }, [restaurantIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setRestaurantIdState(id);
    };
    window.addEventListener('rt-restaurant-change', onChange);
    return () => window.removeEventListener('rt-restaurant-change', onChange);
  }, []);

  return { restaurantId, setRestaurantId };
}
