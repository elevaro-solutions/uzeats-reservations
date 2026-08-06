'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Options = {
  /** Debounce ms for text search updates (0 = immediate). */
  searchDebounceMs?: number;
};

/**
 * Keeps list filters in URL search params so views are shareable and back/forward works.
 */
export function useUrlListFilters(
  keys: { search?: string; status?: string; city?: string },
  options: Options = {},
) {
  const { searchDebounceMs = 300 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      search: keys.search ? (searchParams.get(keys.search) ?? '') : '',
      status: keys.status ? (searchParams.get(keys.status) ?? undefined) : undefined,
      city: keys.city ? (searchParams.get(keys.city) ?? undefined) : undefined,
    }),
    [keys.search, keys.status, keys.city, searchParams],
  );

  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const replaceParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [param, value] of Object.entries(updates)) {
        if (value) params.set(param, value);
        else params.delete(param);
      }
      if (resetPage) params.delete('page');

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!keys.search || searchDebounceMs <= 0) return;
    const timer = setTimeout(() => {
      if (searchDraft !== filters.search) {
        replaceParams({ [keys.search!]: searchDraft || undefined });
      }
    }, searchDebounceMs);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, keys.search, replaceParams, searchDebounceMs]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchDraft(value);
      if (!keys.search) return;
      if (searchDebounceMs <= 0) {
        replaceParams({ [keys.search]: value || undefined });
      }
    },
    [keys.search, replaceParams, searchDebounceMs],
  );

  const setStatus = useCallback(
    (value: string | undefined) => {
      if (!keys.status) return;
      replaceParams({ [keys.status]: value });
    },
    [keys.status, replaceParams],
  );

  const setCity = useCallback(
    (value: string | undefined) => {
      if (!keys.city) return;
      replaceParams({ [keys.city]: value });
    },
    [keys.city, replaceParams],
  );

  return {
    /** Live search input value (updates immediately). */
    search: searchDraft,
    /** Search term from the URL (debounced); use for server queries. */
    searchQuery: filters.search,
    status: filters.status,
    city: filters.city,
    setSearch,
    setStatus,
    setCity,
  };
}
