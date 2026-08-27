import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { XIcon } from "@/assets";
import { Button, Chip, Flex, Input, Typography } from "@/components";
import { useAppStore } from "@/store";

import type { ScopedDiscoveryIndexData } from "../types";

export type FiltersSheetProps = {
  visible: boolean;
  browse: ScopedDiscoveryIndexData | null;
  onClose: () => void;
  onApplied?: () => void;
};

function toggleValue(list: string[] | undefined, value: string): string[] {
  const current = list ?? [];
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

export function FiltersSheet({ visible, browse, onClose, onApplied }: FiltersSheetProps) {
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const { theme } = useUnistyles();

  const [date, setDate] = useState(discovery.date);
  const [time, setTime] = useState(discovery.time ?? "");
  const [partySize, setPartySize] = useState(String(discovery.partySize));
  const [cuisine, setCuisine] = useState(discovery.cuisine ?? "");
  const [priceRange, setPriceRange] = useState<number | undefined>(
    discovery.priceRange,
  );
  const [minRating, setMinRating] = useState<number | undefined>(
    discovery.minRating,
  );
  const [radiusKm, setRadiusKm] = useState(String(discovery.radiusKm));
  const [accessible, setAccessible] = useState(
    Boolean(discovery.wheelchairAccessible),
  );
  const [diningStyles, setDiningStyles] = useState<string[]>(
    discovery.diningStyles ?? [],
  );
  const [occasions, setOccasions] = useState<string[]>(discovery.occasions ?? []);
  const [meals, setMeals] = useState<string[]>(discovery.meals ?? []);
  const [dietaryTags, setDietaryTags] = useState<string[]>(
    discovery.dietaryTags ?? [],
  );
  const [amenities, setAmenities] = useState<string[]>(
    discovery.amenities ?? [],
  );

  useEffect(() => {
    if (!visible) return;
    setDate(discovery.date);
    setTime(discovery.time ?? "");
    setPartySize(String(discovery.partySize));
    setCuisine(discovery.cuisine ?? "");
    setPriceRange(discovery.priceRange);
    setMinRating(discovery.minRating);
    setRadiusKm(String(discovery.radiusKm));
    setAccessible(Boolean(discovery.wheelchairAccessible));
    setDiningStyles(discovery.diningStyles ?? []);
    setOccasions(discovery.occasions ?? []);
    setMeals(discovery.meals ?? []);
    setDietaryTags(discovery.dietaryTags ?? []);
    setAmenities(discovery.amenities ?? []);
  }, [visible, discovery]);

  function renderChipGroup(
    title: string,
    options: string[],
    selected: string[],
    onToggle: (value: string) => void,
  ) {
    if (options.length === 0) return null;

    return (
      <>
        <Typography weight="medium" size="text-sm">
          {title}
        </Typography>
        <Flex direction="row" gap={1} flexWrap="wrap">
          {options.map((option) => (
            <Chip
              key={option}
              selected={selected.includes(option)}
              onPress={() => onToggle(option)}
            >
              {option}
            </Chip>
          ))}
        </Flex>
      </>
    );
  }

  function apply() {
    const party = Math.min(50, Math.max(1, Number(partySize) || 2));
    const radius = Math.min(100, Math.max(0.5, Number(radiusKm) || 25));
    setDiscovery({
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : discovery.date,
      time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
      partySize: party,
      cuisine: cuisine.trim() || undefined,
      priceRange,
      minRating,
      radiusKm: radius,
      wheelchairAccessible: accessible || undefined,
      diningStyles: diningStyles.length ? diningStyles : undefined,
      occasions: occasions.length ? occasions : undefined,
      meals: meals.length ? meals : undefined,
      dietaryTags: dietaryTags.length ? dietaryTags : undefined,
      amenities: amenities.length ? amenities : undefined,
    });
    onClose();
    onApplied?.();
  }

  const cuisines = (browse?.cuisines ?? []).map((item) => item.label);

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
          <Typography size="text-xl" weight="bold">
            Filters
          </Typography>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <XIcon size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </Flex>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Input
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            helperText="Format: YYYY-MM-DD"
          />
          <Input
            label="Time (optional)"
            value={time}
            onChangeText={setTime}
            placeholder="19:00"
            autoCapitalize="none"
            helperText="Format: HH:MM (24h)"
          />
          <Input
            label="Party size"
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
          />

          <Typography weight="medium" size="text-sm">
            Cuisine
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip selected={!cuisine} onPress={() => setCuisine("")}>
              Any
            </Chip>
            {cuisines.map((c) => (
              <Chip
                key={c}
                selected={cuisine === c}
                onPress={() => setCuisine(c)}
              >
                {c}
              </Chip>
            ))}
          </ScrollView>

          {renderChipGroup(
            "Dining styles",
            (browse?.diningStyles ?? []).map((item) => item.label),
            diningStyles,
            (value) => setDiningStyles((current) => toggleValue(current, value)),
          )}

          {renderChipGroup(
            "Meals",
            (browse?.meals ?? []).map((item) => item.label),
            meals,
            (value) => setMeals((current) => toggleValue(current, value)),
          )}

          {renderChipGroup(
            "Dietary options",
            (browse?.dietaryTags ?? []).map((item) => item.label),
            dietaryTags,
            (value) => setDietaryTags((current) => toggleValue(current, value)),
          )}

          {renderChipGroup(
            "Occasions",
            (browse?.occasions ?? []).map((item) => item.label),
            occasions,
            (value) => setOccasions((current) => toggleValue(current, value)),
          )}

          {renderChipGroup(
            "Amenities",
            (browse?.amenities ?? []).map((item) => item.label),
            amenities,
            (value) => setAmenities((current) => toggleValue(current, value)),
          )}

          <Typography weight="medium" size="text-sm">
            Price
          </Typography>
          <Flex direction="row" gap={1} flexWrap="wrap">
            {[undefined, 1, 2, 3, 4].map((p) => (
              <Chip
                key={String(p)}
                selected={priceRange === p}
                onPress={() => setPriceRange(p)}
              >
                {p == null ? "Any" : "$".repeat(p)}
              </Chip>
            ))}
          </Flex>

          <Typography weight="medium" size="text-sm">
            Minimum rating
          </Typography>
          <Flex direction="row" gap={1} flexWrap="wrap">
            {[undefined, 4, 4.5].map((r) => (
              <Chip
                key={String(r)}
                selected={minRating === r}
                onPress={() => setMinRating(r)}
              >
                {r == null ? "Any" : `${r}+`}
              </Chip>
            ))}
          </Flex>

          {discovery.nearMe ? (
            <Input
              label="Distance (km)"
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="decimal-pad"
            />
          ) : null}

          <Chip
            selected={accessible}
            onPress={() => setAccessible((value) => !value)}
          >
            Wheelchair accessible
          </Chip>
        </ScrollView>

        <Flex direction="row" gap={1} style={styles.sheetFooter}>
          <Button
            variant="outlined"
            color="secondary"
            style={styles.footerBtn}
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button style={styles.footerBtn} onPress={apply}>
            Apply
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  sheet: {
    backgroundColor: colors.background,
  },
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  sheetBody: {
    padding: space(2),
    gap: space(2),
    paddingBottom: space(4),
  },
  sheetFooter: {
    padding: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
  },
  chipRow: {
    gap: space(1),
    alignItems: "center",
  },
}));
