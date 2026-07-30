'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { SEARCH_RESTAURANTS } from '@/lib/graphql';

type SearchInput = Record<string, unknown>;

export function useInfiniteRestaurantSearch(
  searchInput: SearchInput,
  options: { pageSize?: number; skip?: boolean } = {},
) {
  const pageSize = options.pageSize ?? 24;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const filterKey = useMemo(() => JSON.stringify(searchInput), [searchInput]);
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setItems([]);
      setTotal(0);
    }
  }, [filterKey]);

  const { data, loading } = useQuery(SEARCH_RESTAURANTS, {
    variables: {
      input: {
        ...searchInput,
        page,
        limit: pageSize,
      },
    },
    skip: options.skip,
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    const result = (data as any)?.searchRestaurants;
    if (!result) return;
    setTotal(result.total);
    if (page === 1) {
      setItems(result.items ?? []);
      return;
    }
    setItems((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const next = (result.items ?? []).filter((r: any) => !existingIds.has(r.id));
      return [...prev, ...next];
    });
  }, [data, page]);

  const hasMore = items.length < total;
  const loadingMore = loading && page > 1;
  const initialLoading = loading && page === 1 && items.length === 0;

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setPage((p) => p + 1);
  }, [loading, hasMore]);

  return {
    items,
    total,
    loading: initialLoading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
