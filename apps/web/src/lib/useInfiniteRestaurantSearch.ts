'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { SEARCH_RESTAURANTS } from '@/lib/graphql';

type SearchInput = Record<string, unknown>;

type SearchPageResult = {
  total: number;
  page: number;
  limit: number;
  items: any[];
};

export function useInfiniteRestaurantSearch(
  searchInput: SearchInput,
  options: {
    pageSize?: number;
    skip?: boolean;
    /** SSR page-1 payload when filters still match the seed. */
    initialResult?: SearchPageResult | null;
    seedMatches?: boolean;
  } = {},
) {
  const pageSize = options.pageSize ?? 24;
  const seedItems = options.seedMatches ? options.initialResult?.items ?? null : null;
  const seedTotal = options.seedMatches ? options.initialResult?.total ?? 0 : 0;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>(() => seedItems ?? []);
  const [total, setTotal] = useState(() => seedTotal);
  const [exhausted, setExhausted] = useState(() =>
    seedItems != null
      ? seedItems.length === 0 || seedItems.length < pageSize
      : false,
  );
  const filterKey = useMemo(() => JSON.stringify(searchInput), [searchInput]);
  const prevFilterKey = useRef(filterKey);
  const itemIdsRef = useRef<Set<string>>(
    new Set((seedItems ?? []).map((r: any) => r.id)),
  );
  const seededRef = useRef(Boolean(seedItems?.length));

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setItems([]);
      setTotal(0);
      setExhausted(false);
      itemIdsRef.current = new Set();
      seededRef.current = false;
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
    // When SSR painted page 1, refresh in background without blanking the grid.
    fetchPolicy: seededRef.current && page === 1 ? 'cache-and-network' : 'cache-first',
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
