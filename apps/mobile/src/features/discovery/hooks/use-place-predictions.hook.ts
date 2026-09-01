import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/lib/use-debounced-value";

import {
  fetchPlacePredictions,
  hasGoogleMapsApiKey,
  type PlacePrediction,
} from "../helpers/place-autocomplete.helpers";

const PLACE_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function usePlacePredictions(query: string, enabled: boolean) {
  const debouncedQuery = useDebouncedValue(query, PLACE_DEBOUNCE_MS);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const trimmed = debouncedQuery.trim();

    if (trimmed.length < MIN_QUERY_LENGTH || !hasGoogleMapsApiKey()) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchPlacePredictions(trimmed).then((results) => {
      if (cancelled) return;
      setPredictions(results);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, enabled]);

  return { predictions, loading };
}
