import { useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon, MapPinIcon, StarIcon } from "@/assets";
import { Button, Chip, ChipRowSkeleton, DateTimeField, Flex, TRENDING_CHIP_WIDTHS, Typography } from "@/components";
import {
  PRICE_RANGE_OPTIONS,
  type DiscoveryIndexEntry,
  useLocationPermission,
  type AddressSelection,
} from "@/features/discovery";
import { LocationPermissionModal } from "@/features/home/components/location-permission-modal.component";
import { LocationSheet } from "@/features/home/components/location-sheet.component";
import {
  DISTANCE_PRESETS_KM,
  TIME_PRESETS,
} from "@/lib/helpers/date-time.helpers";
import { useAppStore, type DiscoveryFilters } from "@/store";

import { SCOPED_DISCOVERY_INDEX } from "../api/search.operations";
import { FilterChipSection } from "./filter-chip-section.component";
import { FilterSectionHeader } from "./filter-section-header.component";
import { PartySizePicker } from "./party-size-picker.component";
import { countActiveDraftFilters } from "../helpers/count-active-draft-filters.helpers";
import { DEFAULT_DRAFT_FILTER_FIELDS } from "../helpers/filter-draft.helpers";
import {
  getFilterOptionIcon,
  WHEELCHAIR_ACCESSIBLE_LABEL,
} from "../helpers/filter-option-icons.helpers";
import {
  buildDiscoveryIndexInput,
  type ScopedDiscoveryIndexData,
} from "../types";

export type FiltersSheetProps = {
  visible: boolean;
  cities: DiscoveryIndexEntry[];
  onClose: () => void;
  onApplied?: () => void;
};

type DraftFilters = DiscoveryFilters;

function toggleValue(list: string[] | undefined, value: string): string[] {
  const current = list ?? [];
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

function isPresetTime(time?: string): boolean {
  if (!time) return true;
  return TIME_PRESETS.some((preset) => preset.value === time);
}

export function FiltersSheet({
  visible,
  cities,
  onClose,
  onApplied,
}: FiltersSheetProps) {
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const {
    useCurrentLocation,
    getPermission,
    status: locationStatus,
    clearError,
    openAppSettings,
  } = useLocationPermission();

  const [draft, setDraft] = useState<DraftFilters>(discovery);
  const [locationOpen, setLocationOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [customTime, setCustomTime] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(discovery);
    setCustomTime(Boolean(discovery.time && !isPresetTime(discovery.time)));
  }, [visible, discovery]);

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
  const locationLabel = draft.nearMe
    ? (draft.locationLabel ?? "Near you")
    : draft.city;

  const activeFilterCount = countActiveDraftFilters(draft);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  function patchDraft(partial: Partial<DraftFilters>) {
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
      date: /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
        ? draft.date
        : discovery.date,
      time:
        draft.time && /^\d{2}:\d{2}$/.test(draft.time) ? draft.time : undefined,
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

  async function handleUseLocation() {
    clearError();
    const result = await useCurrentLocation({ applyToStore: false });
    if (result.ok && result.lat != null && result.lng != null) {
      patchDraft({
        nearMe: true,
        lat: result.lat,
        lng: result.lng,
        locationLabel: result.label ?? "Near you",
        city: result.city ?? draft.city,
        state: result.state ?? draft.state,
      });
      setLocationOpen(false);
      return;
    }
    if (result.needsSettings) {
      Alert.alert(
        "Enable location",
        "Turn on location access for Tablevera in Settings to see restaurants near you.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void openAppSettings() },
        ],
      );
    }
  }

  async function handleNearMePress() {
    clearError();
    const existing = await getPermission();
    if (existing.status === "granted") {
      await handleUseLocation();
      return;
    }
    if (existing.status === "denied" && existing.canAskAgain === false) {
      await handleUseLocation();
      return;
    }
    setPermissionOpen(true);
  }

  function handleSelectCity(city: string, state?: string | null) {
    patchDraft({
      city,
      state: state ?? undefined,
      nearMe: false,
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
    });
    setLocationOpen(false);
  }

  function handleSelectPlace(place: AddressSelection) {
    patchDraft({
      nearMe: true,
      lat: place.lat,
      lng: place.lng,
      locationLabel: place.label,
      city: place.city ?? place.label,
      state: place.state,
    });
    setLocationOpen(false);
  }

  function buildAmenityOptions() {
    const labels = (browse?.amenities ?? []).map((item) => item.label);
    const withoutWheelchair = labels.filter(
      (label) => label !== WHEELCHAIR_ACCESSIBLE_LABEL,
    );
    const options = [
      WHEELCHAIR_ACCESSIBLE_LABEL,
      ...withoutWheelchair.filter(
        (label) => label !== WHEELCHAIR_ACCESSIBLE_LABEL,
      ),
    ];
    const unique = [...new Set(options)];
    return unique.map((label) => ({
      key: label,
      label,
      Icon: getFilterOptionIcon("amenity", label),
    }));
  }

  function toggleAmenity(label: string) {
    if (label === WHEELCHAIR_ACCESSIBLE_LABEL) {
      patchDraft({ wheelchairAccessible: !draft.wheelchairAccessible });
      return;
    }
    patchDraft({
      amenities: toggleValue(draft.amenities, label),
    });
  }

  function isAmenitySelected(label: string): boolean {
    if (label === WHEELCHAIR_ACCESSIBLE_LABEL) {
      return Boolean(draft.wheelchairAccessible);
    }
    return (draft.amenities ?? []).includes(label);
  }

  function mapBrowseOptions(
    kind: "diningStyle" | "meal" | "occasion" | "dietary",
    items: { slug: string; label: string }[],
  ) {
    return items.map((item) => ({
      key: item.slug,
      label: item.label,
      Icon: getFilterOptionIcon(
        kind === "diningStyle"
          ? "diningStyle"
          : kind === "meal"
            ? "meal"
            : kind === "occasion"
              ? "occasion"
              : "dietary",
        item.label,
      ),
    }));
  }

  const cuisines = browse?.cuisines ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Flex flex={1} style={styles.sheet}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          style={styles.sheetHeader}
        >
          <Flex gap={0.25} flex={1}>
            <Typography size="text-xl" weight="bold">
              Filters
            </Typography>
            <Typography size="text-sm" color="secondary">
              {activeFilterCount === 0
                ? "No filters selected"
                : `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} selected`}
            </Typography>
          </Flex>
          {activeFilterCount > 0 ? (
            <Pressable
              onPress={clearAllBrowseFilters}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Typography size="text-sm" weight="semibold" color="primary">
                Clear all
              </Typography>
            </Pressable>
          ) : null}
        </Flex>

        <ScrollView
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => setLocationOpen(true)}
            style={styles.locationRow}
            accessibilityRole="button"
            accessibilityLabel="Change search location"
          >
            <Flex gap={0.5} flex={1}>
              <Typography size="text-xs" color="secondary">
                Location
              </Typography>
              <Flex
                direction="row"
                alignItems="center"
                gap={1}
                style={styles.locationValueRow}
              >
                <MapPinIcon size={18} color={theme.colors.primary} />
                <Flex
                  direction="row"
                  alignItems="center"
                  gap={0.25}
                  style={styles.locationAddressRow}
                >
                  <Typography
                    weight="semibold"
                    numberOfLines={1}
                    style={styles.locationValue}
                  >
                    {locationLabel}
                  </Typography>
                  <ChevronDownIcon size={16} color={theme.colors.textMuted} />
                </Flex>
              </Flex>
            </Flex>
          </Pressable>

          <View style={styles.reservationCard(theme.colors.surface)}>
            <Typography weight="semibold" size="text-sm">
              Reservation details
            </Typography>
            <Flex direction="row" gap={1}>
              <DateTimeField
                label="Date"
                mode="date"
                value={draft.date}
                minimumDate={today}
                onChange={(value) => {
                  if (value) patchDraft({ date: value });
                }}
              />
              <DateTimeField
                label="Time"
                mode="time"
                value={draft.time}
                onChange={(value) => {
                  patchDraft({ time: value });
                  setCustomTime(true);
                }}
              />
            </Flex>

            <Flex gap={1}>
              <Typography size="text-xs" color="secondary">
                Popular times
              </Typography>
              <Flex direction="row" gap={1} flexWrap="wrap">
                {TIME_PRESETS.map((preset) => {
                  const selected =
                    preset.value === undefined
                      ? !draft.time
                      : draft.time === preset.value && !customTime;
                  return (
                    <Chip
                      key={preset.label}
                      selected={selected}
                      onPress={() => {
                        setCustomTime(false);
                        patchDraft({ time: preset.value });
                      }}
                    >
                      {preset.label}
                    </Chip>
                  );
                })}
                <Chip
                  selected={
                    customTime ||
                    Boolean(draft.time && !isPresetTime(draft.time))
                  }
                  onPress={() => setCustomTime(true)}
                >
                  Custom
                </Chip>
              </Flex>
            </Flex>

            <PartySizePicker
              value={draft.partySize}
              onChange={(partySize) => patchDraft({ partySize })}
            />
          </View>

          {cuisines.length > 0 || browseLoading ? (
            <Flex gap={1.5}>
              <FilterSectionHeader
                title="Cuisine"
                selectedCount={draft.cuisine ? 1 : 0}
              />
              {browseLoading && cuisines.length === 0 ? (
                <ChipRowSkeleton widths={TRENDING_CHIP_WIDTHS} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <Chip
                    selected={!draft.cuisine}
                    onPress={() => patchDraft({ cuisine: undefined })}
                  >
                    Any
                  </Chip>
                  {cuisines.map((c) => (
                    <Chip
                      key={c.slug}
                      selected={draft.cuisine === c.label}
                      onPress={() => patchDraft({ cuisine: c.label })}
                    >
                      {c.label}
                    </Chip>
                  ))}
                </ScrollView>
              )}
            </Flex>
          ) : null}

          <Flex gap={1.5}>
            <FilterSectionHeader
              title="Price"
              selectedCount={draft.priceRange != null ? 1 : 0}
            />
            <Flex direction="row" gap={1} flexWrap="wrap">
              <Chip
                selected={draft.priceRange == null}
                onPress={() => patchDraft({ priceRange: undefined })}
              >
                Any
              </Chip>
              {PRICE_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.priceRange === option.value}
                  onPress={() => patchDraft({ priceRange: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </Flex>
          </Flex>

          <Flex gap={1.5}>
            <FilterSectionHeader
              title="Minimum rating"
              selectedCount={draft.minRating != null ? 1 : 0}
            />
            <Flex direction="row" gap={1} flexWrap="wrap">
              <Chip
                selected={draft.minRating == null}
                onPress={() => patchDraft({ minRating: undefined })}
              >
                Any
              </Chip>
              {[4, 4.5].map((rating) => (
                <Chip
                  key={rating}
                  selected={draft.minRating === rating}
                  icon={
                    <StarIcon
                      size={16}
                      filled
                      color={
                        draft.minRating === rating
                          ? theme.colors.white
                          : theme.colors.accent
                      }
                    />
                  }
                  onPress={() => patchDraft({ minRating: rating })}
                >
                  {`${rating}+`}
                </Chip>
              ))}
            </Flex>
          </Flex>

          {draft.nearMe ? (
            <Flex gap={1.5}>
              <FilterSectionHeader title="Distance" />
              <Flex direction="row" gap={1} flexWrap="wrap">
                {DISTANCE_PRESETS_KM.map((km) => (
                  <Chip
                    key={km}
                    selected={draft.radiusKm === km}
                    onPress={() => patchDraft({ radiusKm: km })}
                  >
                    {`${km} km`}
                  </Chip>
                ))}
              </Flex>
            </Flex>
          ) : null}

          <FilterChipSection
            title="Dining styles"
            loading={browseLoading}
            options={mapBrowseOptions(
              "diningStyle",
              browse?.diningStyles ?? [],
            )}
            selected={draft.diningStyles ?? []}
            onToggle={(value) =>
              patchDraft({
                diningStyles: toggleValue(draft.diningStyles, value),
              })
            }
          />

          <FilterChipSection
            title="Meals"
            loading={browseLoading}
            options={mapBrowseOptions("meal", browse?.meals ?? [])}
            selected={draft.meals ?? []}
            onToggle={(value) =>
              patchDraft({ meals: toggleValue(draft.meals, value) })
            }
          />

          <FilterChipSection
            title="Occasions"
            loading={browseLoading}
            options={mapBrowseOptions("occasion", browse?.occasions ?? [])}
            selected={draft.occasions ?? []}
            onToggle={(value) =>
              patchDraft({ occasions: toggleValue(draft.occasions, value) })
            }
          />

          <FilterChipSection
            title="Dietary options"
            loading={browseLoading}
            options={mapBrowseOptions("dietary", browse?.dietaryTags ?? [])}
            selected={draft.dietaryTags ?? []}
            onToggle={(value) =>
              patchDraft({ dietaryTags: toggleValue(draft.dietaryTags, value) })
            }
          />

          <FilterChipSection
            title="Amenities"
            loading={browseLoading}
            options={buildAmenityOptions()}
            selected={[
              ...(draft.amenities ?? []),
              ...(draft.wheelchairAccessible
                ? [WHEELCHAIR_ACCESSIBLE_LABEL]
                : []),
            ]}
            isSelected={isAmenitySelected}
            onToggle={toggleAmenity}
          />
        </ScrollView>

        <Flex
          direction="row"
          gap={1}
          style={[styles.sheetFooter, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.footerBtn}>
            <Button
              variant="outlined"
              color="secondary"
              size="xl"
              fullWidth
              onPress={onClose}
            >
              Cancel
            </Button>
          </View>
          <View style={styles.footerBtn}>
            <Button size="xl" fullWidth onPress={apply}>
              Apply filters
            </Button>
          </View>
        </Flex>
      </Flex>

      <LocationSheet
        visible={locationOpen}
        cities={cities}
        currentLabel={locationLabel}
        highlightCitySelection={!draft.nearMe}
        nearMeLoading={locationStatus === "requesting"}
        onClose={() => setLocationOpen(false)}
        onSelectCity={handleSelectCity}
        onSelectPlace={handleSelectPlace}
        onUseCurrentLocation={() => {
          void handleNearMePress();
        }}
      />

      <LocationPermissionModal
        visible={permissionOpen}
        loading={locationStatus === "requesting"}
        onClose={() => setPermissionOpen(false)}
        onAllow={() => {
          setPermissionOpen(false);
          void handleUseLocation();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    paddingTop: space(3),
  },
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  sheetBody: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    gap: space(4),
    paddingBottom: space(4),
  },
  sheetFooter: {
    width: "100%",
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
  chipRow: {
    gap: space(1),
    alignItems: "center",
  },
  locationRow: {
    paddingVertical: space(0.5),
  },
  locationValueRow: {
    flexShrink: 1,
    minWidth: 0,
  },
  locationAddressRow: {
    flexShrink: 1,
    minWidth: 0,
  },
  locationValue: {
    flexShrink: 1,
    minWidth: 0,
  },
  reservationCard: (backgroundColor: string) => ({
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor,
  }),
}));
