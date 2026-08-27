import { useMemo, useState } from "react";

import type { DiscoveryFilters } from "@/store";

import { hasActiveSearchFilters, type SearchMode } from "../types";

export function useSearchMode(initialFilters: DiscoveryFilters) {
  const [mode, setMode] = useState<SearchMode>(() =>
    hasActiveSearchFilters(initialFilters) ? "results" : "idle",
  );

  const showResults = mode === "results";
  const showSuggestions = mode === "suggestions";
  const showDiscovery = mode === "idle";

  return useMemo(
    () => ({
      mode,
      setMode,
      showResults,
      showSuggestions,
      showDiscovery,
    }),
    [mode, showDiscovery, showResults, showSuggestions],
  );
}
