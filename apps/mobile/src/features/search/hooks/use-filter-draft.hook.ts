import { useEffect, useState } from "react";

import { parseIsoDate, parseTime24 } from "@/lib/helpers/date-time.helpers";
import { useAppStore, type DiscoveryFilters } from "@/store";

import {
  DEFAULT_DRAFT_FILTER_FIELDS,
  isPresetTime,
} from "../helpers/filter-draft.helpers";

export type UseFilterDraftOptions = {
  visible: boolean;
  onClose: () => void;
  onApplied?: () => void;
};

export function useFilterDraft({
  visible,
  onClose,
  onApplied,
}: UseFilterDraftOptions) {
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const [draft, setDraft] = useState<DiscoveryFilters>(discovery);
  const [customTime, setCustomTime] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(discovery);
    setCustomTime(Boolean(discovery.time && !isPresetTime(discovery.time)));
    // Sync draft only when the sheet opens — not when the store updates underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [visible]);

  function patchDraft(partial: Partial<DiscoveryFilters>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function clearAllBrowseFilters() {
    patchDraft({ ...DEFAULT_DRAFT_FILTER_FIELDS });
  }

  function apply() {
    const party = Math.min(50, Math.max(1, draft.partySize || 2));
    const radius = Math.min(100, Math.max(0.5, draft.radiusKm || 25));
    setDiscovery({
      city: draft.city,
      state: draft.state,
      nearMe: draft.nearMe,
      lat: draft.lat,
      lng: draft.lng,
      locationLabel: draft.locationLabel,
      date: parseIsoDate(draft.date) ? draft.date : discovery.date,
      time: draft.time && parseTime24(draft.time) ? draft.time : undefined,
      partySize: party,
      cuisine: draft.cuisine?.trim() || undefined,
      priceRange: draft.priceRange,
      minRating: draft.minRating,
      radiusKm: radius,
      wheelchairAccessible: draft.wheelchairAccessible || undefined,
      diningStyles: draft.diningStyles?.length ? draft.diningStyles : undefined,
      occasions: draft.occasions?.length ? draft.occasions : undefined,
      meals: draft.meals?.length ? draft.meals : undefined,
      dietaryTags: draft.dietaryTags?.length ? draft.dietaryTags : undefined,
      amenities: draft.amenities?.length ? draft.amenities : undefined,
    });
    onClose();
    onApplied?.();
  }

  return {
    draft,
    customTime,
    setCustomTime,
    patchDraft,
    clearAllBrowseFilters,
    apply,
  };
}
