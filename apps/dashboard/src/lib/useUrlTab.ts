'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Options = {
  param?: string;
  defaultValue: string;
  allowed: readonly string[];
  /** Search params to drop whenever this value changes. */
  resetParams?: string[];
};

const EMPTY_RESET: string[] = [];

/**
 * Persists a tab (or similar enum) in the URL so refresh and share restore the view.
 * Default values are omitted from the query string.
 */
export function useUrlTab({
  param = 'tab',
  defaultValue,
  allowed,
  resetParams = EMPTY_RESET,
}: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo(() => {
    const raw = searchParams.get(param);
    if (raw && allowed.includes(raw)) return raw;
    return defaultValue;
  }, [allowed, defaultValue, param, searchParams]);

  const setValue = useCallback(
    (next: string, extras?: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      const allowedNext = allowed.includes(next) ? next : defaultValue;

      if (allowedNext === defaultValue) params.delete(param);
      else params.set(param, allowedNext);

      for (const key of resetParams) params.delete(key);
      if (extras) {
        for (const [key, extra] of Object.entries(extras)) {
          if (extra) params.set(key, extra);
          else params.delete(key);
        }
      }

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [allowed, defaultValue, param, pathname, resetParams, router, searchParams],
  );

  return [value, setValue] as const;
}
