import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useMemo } from "react";

import {
  buildSearchInput,
  useInfiniteRestaurantSearch,
  type DiscoveryIndexData,
} from "@/features/discovery";
import { DISCOVERY_INDEX } from "@/graphql/operations";
import type { DiscoveryFilters } from "@/store";

import {
  MY_RECENT_SEARCHES,
  RECORD_SEARCH,
  SCOPED_DISCOVERY_INDEX,
  SEARCH_SUGGESTIONS,
  TRENDING_SEARCHES,
} from "../api/search.operations";
import {
  RECENT_SEARCHES_LIMIT,
  SUGGESTIONS_LIMIT,
  TRENDING_SEARCHES_LIMIT,
} from "../search.constants";
import {
  buildDiscoveryIndexInput,
  buildRecordSearchInput,
  type RecentSearchEntry,
  type ScopedDiscoveryIndexData,
  type SearchSuggestion,
  type TrendingSearchTerm,
} from "../types";

export type UseSearchDataOptions = {
  discovery: DiscoveryFilters;
  committedQuery: string;
  queryDraft: string;
  debouncedQuery: string;
  showResults: boolean;
  showSuggestions: boolean;
  user: unknown;
};

export function useSearchData({
  discovery,
  committedQuery,
  queryDraft,
  debouncedQuery,
  showResults,
  showSuggestions,
  user,
}: UseSearchDataOptions) {
  const indexInput = useMemo(
    () => buildDiscoveryIndexInput(discovery),
    [
      discovery.city,
      discovery.state,
      discovery.nearMe,
      discovery.lat,
      discovery.lng,
      discovery.radiusKm,
    ],
  );

  const searchInput = useMemo(
    () => buildSearchInput({ ...discovery, query: committedQuery }),
    [discovery, committedQuery],
  );

  const { items, loading, loadingMore, hasMore, error, loadMore, refresh } =
    useInfiniteRestaurantSearch(searchInput, { skip: !showResults });

  const { data: indexData } = useQuery<{ discoveryIndex: DiscoveryIndexData }>(
    DISCOVERY_INDEX,
    { fetchPolicy: "cache-first" },
  );

  const { data: browseData, loading: browseLoading } = useQuery<{
    discoveryIndex: ScopedDiscoveryIndexData;
  }>(SCOPED_DISCOVERY_INDEX, {
    variables: { input: indexInput },
    fetchPolicy: "cache-first",
  });

  const { data: recentData, refetch: refetchRecent } = useQuery<{
    myRecentSearches: RecentSearchEntry[];
  }>(MY_RECENT_SEARCHES, {
    variables: { limit: RECENT_SEARCHES_LIMIT },
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const { data: trendingData, loading: trendingLoading } = useQuery<{
    trendingSearches: TrendingSearchTerm[];
  }>(TRENDING_SEARCHES, {
    variables: {
      input: { ...indexInput, limit: TRENDING_SEARCHES_LIMIT },
    },
    fetchPolicy: "cache-first",
  });

  const [fetchSuggestions, suggestionsQuery] = useLazyQuery<{
    searchSuggestions: SearchSuggestion[];
  }>(SEARCH_SUGGESTIONS, {
    fetchPolicy: "network-only",
  });

  const [recordSearchMutation] = useMutation(RECORD_SEARCH);

  useEffect(() => {
    if (!showSuggestions || debouncedQuery.trim().length === 0) return;
    fetchSuggestions({
      variables: {
        input: {
          query: debouncedQuery.trim(),
          ...indexInput,
          limit: SUGGESTIONS_LIMIT,
        },
      },
    });
  }, [debouncedQuery, fetchSuggestions, indexInput, showSuggestions]);

  const suggestionQuery =
    (
      suggestionsQuery.variables?.input as
        | { query?: string }
        | undefined
    )?.query ?? "";
  const debouncedTrimmed = debouncedQuery.trim();
  const suggestionsMatchQuery =
    suggestionQuery === debouncedTrimmed && debouncedTrimmed.length > 0;
  const suggestions = suggestionsMatchQuery
    ? (suggestionsQuery.data?.searchSuggestions ?? [])
    : [];
  const suggestionsLoading =
    Boolean(showSuggestions && debouncedTrimmed.length > 0) &&
    (suggestionsQuery.loading || !suggestionsMatchQuery);

  const recordSearch = useCallback(
    async (
      extras: Parameters<typeof buildRecordSearchInput>[1] = {},
      filtersOverride?: DiscoveryFilters,
    ) => {
      const payload = buildRecordSearchInput(
        filtersOverride ?? {
          ...discovery,
          query: committedQuery || queryDraft,
        },
        extras,
      );
      try {
        await recordSearchMutation({ variables: { input: payload } });
        if (user) await refetchRecent();
      } catch {
        /* non-blocking */
      }
    },
    [
      committedQuery,
      discovery,
      queryDraft,
      recordSearchMutation,
      refetchRecent,
      user,
    ],
  );

  return {
    cities: indexData?.discoveryIndex.cities ?? [],
    browse: browseData?.discoveryIndex ?? null,
    browseLoading,
    recent: recentData?.myRecentSearches ?? [],
    trending: trendingData?.trendingSearches ?? [],
    trendingLoading,
    suggestions,
    suggestionsLoading,
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    recordSearch,
  };
}
