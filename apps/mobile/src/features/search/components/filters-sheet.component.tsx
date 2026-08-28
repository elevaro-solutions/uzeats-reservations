import { useMemo } from "react";
import { Modal, ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import {
  LocationPermissionModal,
  LocationSheet,
  type DiscoveryIndexEntry,
  useDiscoveryLocation,
} from "@/features/discovery";
import { useQuery } from "@apollo/client";

import { SCOPED_DISCOVERY_INDEX } from "../api/search.operations";
import { countActiveDraftFilters } from "../helpers/count-active-draft-filters.helpers";
import { useFilterDraft } from "../hooks/use-filter-draft.hook";
import {
  buildDiscoveryIndexInput,
  type ScopedDiscoveryIndexData,
} from "../types";
import { FiltersBasicsSections } from "./filters/filters-basics-sections.component";
import { FiltersBrowseSections } from "./filters/filters-browse-sections.component";
import { FiltersCuisineSection } from "./filters/filters-cuisine-section.component";
import { FiltersLocationRow } from "./filters/filters-location-row.component";
import { FiltersReservationSection } from "./filters/filters-reservation-section.component";
import { FiltersSheetFooter } from "./filters/filters-sheet-footer.component";
import { FiltersSheetHeader } from "./filters/filters-sheet-header.component";

export type FiltersSheetProps = {
  visible: boolean;
  cities: DiscoveryIndexEntry[];
  onClose: () => void;
  onApplied?: () => void;
};

export function FiltersSheet({
  visible,
  cities,
  onClose,
  onApplied,
}: FiltersSheetProps) {
  const {
    draft,
    customTime,
    setCustomTime,
    patchDraft,
    clearAllBrowseFilters,
    apply,
  } = useFilterDraft({ visible, onClose, onApplied });

  const {
    locationLabel,
    openLocationSheet,
    locationSheetProps,
    permissionModalProps,
  } = useDiscoveryLocation({
    target: "draft",
    draft,
    onDraftPatch: patchDraft,
  });

  const draftLocationInput = useMemo(
    () =>
      buildDiscoveryIndexInput({
        city: draft.city,
        state: draft.state,
        nearMe: draft.nearMe,
        lat: draft.lat,
        lng: draft.lng,
        radiusKm: draft.radiusKm,
      }),
    [
      draft.city,
      draft.state,
      draft.nearMe,
      draft.lat,
      draft.lng,
      draft.radiusKm,
    ],
  );

  const { data: browseData, loading: browseLoading } = useQuery<{
    discoveryIndex: ScopedDiscoveryIndexData;
  }>(SCOPED_DISCOVERY_INDEX, {
    variables: { input: draftLocationInput },
    skip: !visible,
    fetchPolicy: "cache-and-network",
  });

  const browse = browseData?.discoveryIndex ?? null;
  const activeFilterCount = countActiveDraftFilters(draft);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Flex flex={1} style={styles.sheet}>
        <FiltersSheetHeader
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllBrowseFilters}
        />

        <ScrollView
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
        >
          <FiltersLocationRow
            locationLabel={locationLabel}
            onPress={openLocationSheet}
          />

          <FiltersReservationSection
            date={draft.date}
            time={draft.time}
            partySize={draft.partySize}
            customTime={customTime}
            onDateChange={(date) => patchDraft({ date })}
            onTimeChange={(time, custom) => {
              setCustomTime(custom);
              patchDraft({ time });
            }}
            onCustomTime={() => setCustomTime(true)}
            onPartySizeChange={(partySize) => patchDraft({ partySize })}
          />

          <FiltersCuisineSection
            loading={browseLoading}
            cuisines={browse?.cuisines ?? []}
            selected={draft.cuisine}
            onSelect={(cuisine) => patchDraft({ cuisine })}
          />

          <FiltersBasicsSections draft={draft} patchDraft={patchDraft} />

          <FiltersBrowseSections
            loading={browseLoading}
            browse={browse}
            draft={draft}
            patchDraft={patchDraft}
          />
        </ScrollView>

        <FiltersSheetFooter onCancel={onClose} onApply={apply} />
      </Flex>

      <LocationSheet {...locationSheetProps} cities={cities} />
      <LocationPermissionModal {...permissionModalProps} />
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
    paddingTop: space(3),
  },
  sheetBody: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    gap: space(4),
    paddingBottom: space(4),
  },
}));
