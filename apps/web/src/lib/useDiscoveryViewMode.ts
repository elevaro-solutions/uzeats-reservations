'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type DiscoveryViewMode = 'list' | 'map';

export function useDiscoveryViewMode() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewMode = useMemo<DiscoveryViewMode>(() => {
    return searchParams.get('view') === 'map' ? 'map' : 'list';
  }, [searchParams]);

  const setViewMode = useCallback(
    (next: DiscoveryViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'list') params.delete('view');
      else params.set('view', 'map');

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl === currentUrl) return;

      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { viewMode, setViewMode };
}
