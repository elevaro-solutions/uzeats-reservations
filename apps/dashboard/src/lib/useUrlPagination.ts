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
    defaultPageSize = 20,
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

  const offset = (page - 1) * pageSize;

  const setPagination = useCallback(
    (nextPage: number, nextPageSize?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const size = nextPageSize ?? pageSize;
      const safePage = Math.max(1, nextPage || 1);

      if (safePage <= 1) params.delete(pageParam);
      else params.set(pageParam, String(safePage));

      if (size === defaultPageSize) params.delete(pageSizeParam);
      else params.set(pageSizeParam, String(size));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [
      defaultPageSize,
      pageParam,
      pageSize,
      pageSizeParam,
      pathname,
      router,
      searchParams,
    ],
  );

  const tablePagination = useCallback(
    (total: number, opts?: { showSizeChanger?: boolean }) => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: opts?.showSizeChanger ?? false,
      onChange: (nextPage: number, nextPageSize?: number) => {
        setPagination(nextPage, nextPageSize);
      },
    }),
    [page, pageSize, setPagination],
  );

  return {
    page,
    pageSize,
    limit: pageSize,
    offset,
    setPagination,
    tablePagination,
  };
}
