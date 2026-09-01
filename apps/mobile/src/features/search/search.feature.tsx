import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import {
  LocationPermissionModal,
  LocationSheet,
  useDiscoveryLocation,
} from "@/features/discovery";
import { useAuth } from "@/graphql";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAppStore } from "@/store";

import { FiltersSheet } from "./components/filters-sheet.component";
import { SearchDiscovery } from "./components/search-discovery.component";
import { SearchHeader } from "./components/search-header.component";
import { SearchResults } from "./components/search-results.component";
import { SearchSuggestions } from "./components/search-suggestions.component";
import { useSearchData } from "./hooks/use-search-data.hook";
import { useSearchHandlers } from "./hooks/use-search-handlers.hook";
import { useSearchMode } from "./hooks/use-search-mode.hook";
import { SEARCH_DEBOUNCE_MS } from "./search.constants";
import { clearBrowseFilters, hasActiveSearchFilters } from "./types";

export function SearchFeature() {
  const params = useLocalSearchParams<{ cuisine?: string; q?: string }>();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);

  const [queryDraft, setQueryDraft] = useState(discovery.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [committedQuery, setCommittedQuery] = useState(discovery.query);
  const debouncedQuery = useDebouncedValue(queryDraft, SEARCH_DEBOUNCE_MS);

  const {
    locationLabel,
    openLocationSheet,
    locationSheetProps,
    permissionModalProps,
  } = useDiscoveryLocation();

  const { setMode, showDiscovery, showResults, showSuggestions } =
    useSearchMode(discovery);

  useEffect(() => {
    const cuisine =
      typeof params.cuisine === "string" && params.cuisine
        ? params.cuisine
        : undefined;
    const q = typeof params.q === "string" ? params.q : undefined;
    if (!cuisine && q === undefined) return;

    if (cuisine) {
      setDiscovery({ ...clearBrowseFilters(), cuisine, query: "" });
      setQueryDraft("");
      setCommittedQuery("");
    } else {
      setQueryDraft(q ?? "");
      setCommittedQuery(q ?? "");
      setDiscovery({ query: q ?? "" });
    }
    setMode("results");
  }, [params.cuisine, params.q, setDiscovery, setMode]);

  useEffect(() => {
    if (queryDraft.trim().length === 0) {
      // Clearing the input also clears the committed query so chips/results
      // don't keep showing a search the user deleted from the field.
      if (committedQuery) {
        setCommittedQuery("");
        setDiscovery({ query: "" });
        return;
      }
      if (hasActiveSearchFilters({ ...discovery, query: "" })) {
        setMode("results");
      } else {
        setMode("idle");
      }
      return;
    }
    if (queryDraft !== committedQuery) {
      setMode("suggestions");
      return;
    }
    setMode("results");
  }, [queryDraft, committedQuery, discovery, setDiscovery, setMode]);

  const {
    cities,
    browse,
    browseLoading,
    recent,
    trending,
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
  } = useSearchData({
    discovery,
    committedQuery,
    queryDraft,
    debouncedQuery,
    showResults,
    showSuggestions,
    user,
  });

  const {
    commitSearch,
    handleBrowsePress,
    handleDiningStyleSelect,
    handleRecentPress,
    handleTrendingPress,
    handleSuggestionSelect,
    handleClearQuery,
    handleClearFilters,
    handleFiltersApplied,
  } = useSearchHandlers({
    discovery,
    queryDraft,
    setQueryDraft,
    setCommittedQuery,
    setMode,
    setFiltersOpen,
    setDiscovery,
    recordSearch,
  });

  return (
    <Flex flex={1} style={styles.screen}>
      <SearchHeader
        queryDraft={queryDraft}
        onChangeQuery={setQueryDraft}
        onClearQuery={handleClearQuery}
        onSubmitSearch={() => commitSearch()}
        locationLabel={locationLabel}
        onLocationPress={openLocationSheet}
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
          loading={suggestionsLoading}
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
          onClearFilters={handleClearFilters}
        />
      ) : null}

      <FiltersSheet
        visible={filtersOpen}
        cities={cities}
        onClose={() => setFiltersOpen(false)}
        onApplied={handleFiltersApplied}
      />

      <LocationSheet {...locationSheetProps} cities={cities} />
      <LocationPermissionModal {...permissionModalProps} />
    </Flex>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  screen: {
    backgroundColor: colors.background,
  },
}));
