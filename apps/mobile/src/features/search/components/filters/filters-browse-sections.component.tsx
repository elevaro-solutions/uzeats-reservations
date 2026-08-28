import { FilterChipSection } from "../filter-chip-section.component";
import {
  buildAmenityOptions,
  isAmenitySelected,
  mapBrowseOptions,
  nextAmenityDraft,
  selectedAmenityLabels,
} from "../../helpers/filter-browse-options.helpers";
import { toggleValue } from "../../helpers/filter-draft.helpers";
import type { ScopedDiscoveryIndexData } from "../../types";
import type { DiscoveryFilters } from "@/store";

export type FiltersBrowseSectionsProps = {
  loading: boolean;
  browse: ScopedDiscoveryIndexData | null;
  draft: DiscoveryFilters;
  patchDraft: (partial: Partial<DiscoveryFilters>) => void;
};

export function FiltersBrowseSections({
  loading,
  browse,
  draft,
  patchDraft,
}: FiltersBrowseSectionsProps) {
  return (
    <>
      <FilterChipSection
        title="Dining styles"
        loading={loading}
        options={mapBrowseOptions("diningStyle", browse?.diningStyles ?? [])}
        selected={draft.diningStyles ?? []}
        onToggle={(value) =>
          patchDraft({
            diningStyles: toggleValue(draft.diningStyles, value),
          })
        }
      />

      <FilterChipSection
        title="Meals"
        loading={loading}
        options={mapBrowseOptions("meal", browse?.meals ?? [])}
        selected={draft.meals ?? []}
        onToggle={(value) =>
          patchDraft({ meals: toggleValue(draft.meals, value) })
        }
      />

      <FilterChipSection
        title="Occasions"
        loading={loading}
        options={mapBrowseOptions("occasion", browse?.occasions ?? [])}
        selected={draft.occasions ?? []}
        onToggle={(value) =>
          patchDraft({ occasions: toggleValue(draft.occasions, value) })
        }
      />

      <FilterChipSection
        title="Dietary options"
        loading={loading}
        options={mapBrowseOptions("dietary", browse?.dietaryTags ?? [])}
        selected={draft.dietaryTags ?? []}
        onToggle={(value) =>
          patchDraft({ dietaryTags: toggleValue(draft.dietaryTags, value) })
        }
      />

      <FilterChipSection
        title="Amenities"
        loading={loading}
        options={buildAmenityOptions(
          (browse?.amenities ?? []).map((item) => item.label),
        )}
        selected={selectedAmenityLabels(
          draft.amenities,
          draft.wheelchairAccessible,
        )}
        isSelected={(label) =>
          isAmenitySelected(
            label,
            draft.amenities,
            draft.wheelchairAccessible,
          )
        }
        onToggle={(label) =>
          patchDraft(
            nextAmenityDraft(
              label,
              draft.amenities,
              draft.wheelchairAccessible,
            ),
          )
        }
      />
    </>
  );
}
