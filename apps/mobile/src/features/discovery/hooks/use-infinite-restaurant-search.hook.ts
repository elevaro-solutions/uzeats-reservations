import { useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SEARCH } from "@/graphql";

import type { SearchRestaurantsInput } from "../helpers/build-search-input.helpers";
import type { RestaurantListItem, SearchRestaurantsResult } from "../types";

type Options = {
  pageSize?: number;
  skip?: boolean;
};

export function useInfiniteRestaurantSearch(
  searchInput: SearchRestaurantsInput,
  options: Options = {},
) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<RestaurantListItem[]>([]);
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

  const { data, loading, error, refetch } = useQuery<{
    searchRestaurants: SearchRestaurantsResult;
  }>(SEARCH, {
    variables: {
      input: {
        ...searchInput,
        page,
        limit: pageSize,
      },
    },
    skip: options.skip,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const result = data?.searchRestaurants;
    if (!result) return;
    if (result.page != null && result.page !== page) return;

    const pageItems = result.items ?? [];
    setTotal(result.total);

    if (page === 1) {
      itemIdsRef.current = new Set(pageItems.map((r) => r.id));
      setItems(pageItems);
      setExhausted(pageItems.length === 0 || pageItems.length < pageSize);
      return;
    }

    const next = pageItems.filter((r) => !itemIdsRef.current.has(r.id));
    if (
      pageItems.length === 0 ||
      next.length === 0 ||
      pageItems.length < pageSize
    ) {
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

  const refresh = useCallback(async () => {
    setPage(1);
    setExhausted(false);
    itemIdsRef.current = new Set();
    await refetch({
      input: {
        ...searchInput,
        page: 1,
        limit: pageSize,
      },
    });
  }, [pageSize, refetch, searchInput]);

  return {
    items,
    total,
    loading: initialLoading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
