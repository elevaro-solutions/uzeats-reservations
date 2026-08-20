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
  const [exhausted, setExhausted] = useState(false);
  const filterKey = useMemo(() => JSON.stringify(searchInput), [searchInput]);
  const prevFilterKey = useRef(filterKey);
  const itemIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setItems([]);
      setTotal(0);
      setExhausted(false);
      itemIdsRef.current = new Set();
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
    // Ignore stale Apollo cache while variables (page) are in flight.
    if (result.page != null && result.page !== page) return;

    const pageItems = result.items ?? [];
    setTotal(result.total);

    if (page === 1) {
      itemIdsRef.current = new Set(pageItems.map((r: any) => r.id));
      setItems(pageItems);
      setExhausted(pageItems.length === 0 || pageItems.length < pageSize);
      return;
    }

    const next = pageItems.filter((r: any) => !itemIdsRef.current.has(r.id));
    if (pageItems.length === 0 || next.length === 0 || pageItems.length < pageSize) {
      setExhausted(true);
    }
    if (next.length === 0) return;

    for (const r of next) itemIdsRef.current.add(r.id);
    setItems((prev) => [...prev, ...next]);
  }, [data, page, pageSize]);

  const hasMore = !exhausted && items.length < total;
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
