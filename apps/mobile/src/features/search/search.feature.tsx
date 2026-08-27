import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import {
  buildSearchInput,
  useInfiniteRestaurantSearch,
} from "@/features/discovery";
import type { DiningStyleTile } from "@/features/home/data/dining-styles";
import { useAuth } from "@/graphql";
import { useAppStore } from "@/store";

import {
  MY_RECENT_SEARCHES,
  RECORD_SEARCH,
  SCOPED_DISCOVERY_INDEX,
  SEARCH_SUGGESTIONS,
  TRENDING_SEARCHES,
} from "./api/search.operations";
import { FiltersSheet } from "./components/filters-sheet.component";
import { SearchDiscovery } from "./components/search-discovery.component";
import { SearchHeader } from "./components/search-header.component";
import { SearchResults } from "./components/search-results.component";
import { SearchSuggestions } from "./components/search-suggestions.component";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useSearchMode } from "./hooks/use-search-mode.hook";
import {
  RECENT_SEARCHES_LIMIT,
  SEARCH_DEBOUNCE_MS,
  SUGGESTIONS_LIMIT,
  TRENDING_SEARCHES_LIMIT,
} from "./search.constants";
import {
  applyRecentSearchEntry,
  applyTrendingTerm,
  buildDiscoveryIndexInput,
  buildRecordSearchInput,
  clearBrowseFilters,
  hasActiveSearchFilters,
  type RecentSearchEntry,
  type ScopedDiscoveryIndexData,
  type SearchSuggestion,
  type TrendingSearchTerm,
} from "./types";

export function SearchFeature() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cuisine?: string; q?: string }>();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const resetDiscovery = useAppStore((s) => s.resetDiscovery);

  const [queryDraft, setQueryDraft] = useState(discovery.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [committedQuery, setCommittedQuery] = useState(discovery.query);
  const debouncedQuery = useDebouncedValue(queryDraft, SEARCH_DEBOUNCE_MS);

  const { mode, setMode, showDiscovery, showResults, showSuggestions } =
    useSearchMode(discovery);

  const locationLabel = discovery.nearMe
    ? (discovery.locationLabel ?? "Near you")
    : discovery.city;

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

  useEffect(() => {
    if (typeof params.cuisine === "string" && params.cuisine) {
      setDiscovery({ cuisine: params.cuisine, query: "" });
      setQueryDraft("");
      setCommittedQuery("");
      setMode("results");
    }
    if (typeof params.q === "string") {
      setQueryDraft(params.q);
      setCommittedQuery(params.q);
      setDiscovery({ query: params.q });
      setMode("results");
    }
  }, [params.cuisine, params.q, setDiscovery, setMode]);

  useEffect(() => {
    if (queryDraft.trim().length === 0) {
      if (hasActiveSearchFilters({ ...discovery, query: committedQuery })) {
        setMode("results");
      } else {
        setMode("idle");
      }
      return;
    }
    if (queryDraft !== committedQuery) {
      setMode("suggestions");
    }
  }, [queryDraft, committedQuery, discovery, setMode]);

  const searchInput = useMemo(
    () => buildSearchInput({ ...discovery, query: committedQuery }),
    [discovery, committedQuery],
  );

  const {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useInfiniteRestaurantSearch(searchInput, { skip: !showResults });

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

  const recordSearch = useCallback(
    async (extras: Parameters<typeof buildRecordSearchInput>[1] = {}) => {
      const payload = buildRecordSearchInput(
        { ...discovery, query: committedQuery || queryDraft },
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

  function commitSearch(nextQuery = queryDraft) {
    const trimmed = nextQuery.trim();
    setCommittedQuery(trimmed);
    setDiscovery({ query: trimmed });
    setMode("results");
    void recordSearch({ query: trimmed || undefined });
  }

  function applyFilters(partial: Parameters<typeof setDiscovery>[0]) {
    setDiscovery(partial);
    setMode("results");
    void recordSearch();
  }

  function handleBrowsePress(
    kind: "cuisine" | "occasion" | "meal" | "diningStyle" | "dietary" | "amenity",
    label: string,
  ) {
    const reset = clearBrowseFilters();
    setQueryDraft("");
    setCommittedQuery("");

    switch (kind) {
      case "cuisine":
        applyFilters({ ...reset, cuisine: label });
        break;
      case "occasion":
        applyFilters({ ...reset, occasions: [label] });
        break;
      case "meal":
        applyFilters({ ...reset, meals: [label] });
        break;
      case "diningStyle":
        applyFilters({ ...reset, diningStyles: [label] });
        break;
      case "dietary":
        applyFilters({ ...reset, dietaryTags: [label] });
        break;
      case "amenity":
        applyFilters({ ...reset, amenities: [label] });
        break;
    }
  }

  function handleDiningStyleSelect(tile: DiningStyleTile) {
    if (tile.kind === "more") {
      setFiltersOpen(true);
      return;
    }
    setQueryDraft("");
    setCommittedQuery("");
    applyFilters({ ...clearBrowseFilters(), ...tile.filter });
  }

  function handleRecentPress(entry: RecentSearchEntry) {
    const partial = applyRecentSearchEntry(entry);
    setQueryDraft(partial.query ?? "");
    setCommittedQuery(partial.query ?? "");
    setDiscovery(partial);
    setMode("results");
  }

  function handleTrendingPress(term: TrendingSearchTerm) {
    const partial = applyTrendingTerm(term);
    setQueryDraft(partial.query ?? "");
    setCommittedQuery(partial.query ?? "");
    setDiscovery(partial);
    setMode("results");
    void recordSearch();
  }

  function handleSuggestionSelect(item: SearchSuggestion) {
    void recordSearch({
      query: queryDraft.trim() || item.name,
      restaurantId: item.id,
    });
    router.push(`/restaurant/${item.id}`);
  }

  function handleClearQuery() {
    setQueryDraft("");
    if (hasActiveSearchFilters({ ...discovery, query: "" })) {
      setCommittedQuery("");
      setDiscovery({ query: "" });
      setMode("results");
      return;
    }
    setCommittedQuery("");
    setDiscovery({ query: "" });
    setMode("idle");
  }

  const browse = browseData?.discoveryIndex ?? null;
  const recent = recentData?.myRecentSearches ?? [];
  const trending = trendingData?.trendingSearches ?? [];
  const suggestions = suggestionsQuery.data?.searchSuggestions ?? [];

  return (
    <Flex flex={1} style={styles.screen}>
      <SearchHeader
        queryDraft={queryDraft}
        onChangeQuery={setQueryDraft}
        onClearQuery={handleClearQuery}
        onSubmitSearch={() => commitSearch()}
        locationLabel={locationLabel}
        showSearchButton={queryDraft.trim().length > 0}
      />

      {showDiscovery ? (
        <SearchDiscovery
          loading={browseLoading || trendingLoading}
          recent={recent}
          trending={trending}
          browse={browse}
          onRecentPress={handleRecentPress}
          onTrendingPress={handleTrendingPress}
          onBrowsePress={handleBrowsePress}
          onDiningStyleSelect={handleDiningStyleSelect}
        />
      ) : null}

      {showSuggestions ? (
        <SearchSuggestions
          query={queryDraft}
          loading={suggestionsQuery.loading}
          items={suggestions}
          onSelect={handleSuggestionSelect}
        />
      ) : null}

      {showResults ? (
        <SearchResults
          discovery={{ ...discovery, query: committedQuery }}
          setDiscovery={setDiscovery}
          onClearQuery={handleClearQuery}
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
          onOpenFilters={() => setFiltersOpen(true)}
          onLoadMore={loadMore}
          onRefresh={refresh}
          onClearFilters={() => {
            resetDiscovery();
            setQueryDraft("");
            setCommittedQuery("");
            setMode("idle");
          }}
        />
      ) : null}

      <FiltersSheet
        visible={filtersOpen}
        browse={browse}
        onClose={() => setFiltersOpen(false)}
        onApplied={() => {
          setMode("results");
          void recordSearch();
        }}
      />
    </Flex>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  screen: {
    backgroundColor: colors.background,
  },
}));
