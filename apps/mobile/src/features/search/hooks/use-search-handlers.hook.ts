import { useRouter } from "expo-router";
import type { Dispatch, SetStateAction } from "react";

import type { DiningStyleTile } from "@/features/discovery";
import { useAppStore, type DiscoveryFilters } from "@/store";

import type {
  RecentSearchEntry,
  RecordSearchPayload,
  SearchMode,
  SearchSuggestion,
  TrendingSearchTerm,
} from "../types";
import {
  applyRecentSearchEntry,
  applyTrendingTerm,
  clearBrowseFilters,
  hasActiveSearchFilters,
} from "../types";

export type UseSearchHandlersOptions = {
  discovery: DiscoveryFilters;
  queryDraft: string;
  setQueryDraft: Dispatch<SetStateAction<string>>;
  setCommittedQuery: Dispatch<SetStateAction<string>>;
  setMode: (mode: SearchMode) => void;
  setFiltersOpen: (open: boolean) => void;
  setDiscovery: (partial: Partial<DiscoveryFilters>) => void;
  recordSearch: (
    extras?: RecordSearchPayload,
    filtersOverride?: DiscoveryFilters,
  ) => Promise<void>;
};

export function useSearchHandlers({
  discovery,
  queryDraft,
  setQueryDraft,
  setCommittedQuery,
  setMode,
  setFiltersOpen,
  setDiscovery,
  recordSearch,
}: UseSearchHandlersOptions) {
  const router = useRouter();

  function commitSearch(nextQuery = queryDraft) {
    const trimmed = nextQuery.trim();
    const nextFilters = { ...discovery, query: trimmed };
    setCommittedQuery(trimmed);
    setDiscovery({ query: trimmed });
    setMode("results");
    void recordSearch({ query: trimmed || undefined }, nextFilters);
  }

  function applyFilters(partial: Partial<DiscoveryFilters>) {
    const nextFilters = { ...discovery, ...partial };
    setDiscovery(partial);
    setMode("results");
    void recordSearch({}, nextFilters);
  }

  function handleBrowsePress(
    kind:
      | "cuisine"
      | "occasion"
      | "meal"
      | "diningStyle"
      | "dietary"
      | "amenity",
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
    const nextFilters = { ...discovery, ...partial };
    setQueryDraft(partial.query ?? "");
    setCommittedQuery(partial.query ?? "");
    setDiscovery(partial);
    setMode("results");
    void recordSearch({}, nextFilters);
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

  function handleClearFilters() {
    const lastSearchCity = useAppStore.getState().lastSearchCity;
    setDiscovery({
      ...clearBrowseFilters(),
      query: "",
      city: lastSearchCity || discovery.city,
      nearMe: false,
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
      state: undefined,
    });
    setQueryDraft("");
    setCommittedQuery("");
    setMode("idle");
  }

  function handleFiltersApplied() {
    setMode("results");
    void recordSearch({}, useAppStore.getState().discovery);
  }

  return {
    commitSearch,
    handleBrowsePress,
    handleDiningStyleSelect,
    handleRecentPress,
    handleTrendingPress,
    handleSuggestionSelect,
    handleClearQuery,
    handleClearFilters,
    handleFiltersApplied,
  };
}
