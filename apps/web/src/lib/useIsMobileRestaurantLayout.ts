'use client';

import { useEffect, useState } from 'react';

/** Aligns with restaurant profile sticky Book / booking drawer breakpoint. */
export const RESTAURANT_MOBILE_MAX_WIDTH = 992;

export function useIsMobileRestaurantLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${RESTAURANT_MOBILE_MAX_WIDTH}px)`);
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return isMobile;
}
