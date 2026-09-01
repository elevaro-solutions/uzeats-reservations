import { StarIcon } from "@/assets";
import { PRICE_RANGE_OPTIONS } from "@/features/discovery";
import { DISTANCE_PRESETS_KM } from "@/lib/helpers/date-time.helpers";
import type { DiscoveryFilters } from "@/store";
import { useUnistyles } from "react-native-unistyles";

import { FiltersSingleSelectSection } from "./filters-single-select-section.component";

export type FiltersBasicsSectionsProps = {
  draft: DiscoveryFilters;
  patchDraft: (partial: Partial<DiscoveryFilters>) => void;
};

export function FiltersBasicsSections({
  draft,
  patchDraft,
}: FiltersBasicsSectionsProps) {
  const { theme } = useUnistyles();

  return (
    <>
      <FiltersSingleSelectSection
        title="Price"
        selectedCount={draft.priceRange != null ? 1 : 0}
        selected={draft.priceRange}
        options={PRICE_RANGE_OPTIONS.map((option) => ({
          key: String(option.value),
          label: option.label,
          value: option.value,
        }))}
        onSelectAny={() => patchDraft({ priceRange: undefined })}
        onSelect={(priceRange) => patchDraft({ priceRange })}
      />

      <FiltersSingleSelectSection
        title="Minimum rating"
        selectedCount={draft.minRating != null ? 1 : 0}
        selected={draft.minRating}
        options={[4, 4.5].map((rating) => ({
          key: String(rating),
          label: `${rating}+`,
          value: rating,
          icon: (
            <StarIcon
              size={16}
              filled
              color={
                draft.minRating === rating
                  ? theme.colors.white
                  : theme.colors.accent
              }
            />
          ),
        }))}
        onSelectAny={() => patchDraft({ minRating: undefined })}
        onSelect={(minRating) => patchDraft({ minRating })}
      />

      {draft.nearMe ? (
        <FiltersSingleSelectSection
          title="Distance"
          selected={draft.radiusKm}
          showAny={false}
          options={DISTANCE_PRESETS_KM.map((km) => ({
            key: String(km),
            label: `${km} km`,
            value: km,
          }))}
          onSelect={(radiusKm) => patchDraft({ radiusKm })}
        />
      ) : null}
    </>
  );
}
