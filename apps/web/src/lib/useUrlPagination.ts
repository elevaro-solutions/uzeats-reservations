'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Options = {
  defaultPageSize?: number;
  pageParam?: string;
  pageSizeParam?: string;
  maxPageSize?: number;
};

export function useUrlPagination(options: Options = {}) {
  const {
    defaultPageSize = 24,
    pageParam = 'page',
    pageSizeParam = 'pageSize',
    maxPageSize = 100,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number.parseInt(searchParams.get(pageParam) ?? '1', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }, [pageParam, searchParams]);

  const pageSize = useMemo(() => {
    const raw = Number.parseInt(
      searchParams.get(pageSizeParam) ?? String(defaultPageSize),
      10,
    );
    if (!Number.isFinite(raw) || raw < 1) return defaultPageSize;
    return Math.min(raw, maxPageSize);
  }, [defaultPageSize, maxPageSize, pageSizeParam, searchParams]);

  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const safePage = Math.max(1, nextPage || 1);
      if (safePage <= 1) params.delete(pageParam);
      else params.set(pageParam, String(safePage));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pageParam, pathname, router, searchParams],
  );

  return { page, pageSize, limit: pageSize, setPage };
}
