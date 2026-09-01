import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { NavigationIcon, SearchIcon, XIcon } from "@/assets";
import { Flex, IconButton, Input, Typography } from "@/components";

import { filterCitiesByQuery } from "../helpers/filter-cities.helpers";
import {
  fetchPlaceDetails,
  type AddressSelection,
  type PlacePrediction,
} from "../helpers/place-autocomplete.helpers";
import { usePlacePredictions } from "../hooks/use-place-predictions.hook";
import type { DiscoveryIndexEntry } from "../types";
import { LocationResultRow } from "./location-result-row.component";

export type LocationSheetProps = {
  visible: boolean;
  cities: DiscoveryIndexEntry[];
  currentLabel: string;
  /** When true, highlight the matching city row (city mode, not near-me). */
  highlightCitySelection?: boolean;
  nearMeLoading?: boolean;
  onClose: () => void;
  onSelectCity: (city: string, state?: string | null) => void;
  onSelectPlace: (place: AddressSelection) => void;
  onUseCurrentLocation: () => void;
};

export function LocationSheet({
  visible,
  cities,
  currentLabel,
  highlightCitySelection = false,
  nearMeLoading,
  onClose,
  onSelectCity,
  onSelectPlace,
  onUseCurrentLocation,
}: LocationSheetProps) {
  const { theme } = useUnistyles();
  const [query, setQuery] = useState("");
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);

  const isSearching = query.trim().length > 0;
  const { predictions, loading: placesLoading } = usePlacePredictions(
    query,
    visible,
  );
  const filteredCities = filterCitiesByQuery(cities, query);
  const showAddresses =
    isSearching && (placesLoading || predictions.length > 0);
  const showEmpty =
    isSearching &&
    !placesLoading &&
    predictions.length === 0 &&
    filteredCities.length === 0;

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResolvingPlaceId(null);
    }
  }, [visible]);

  async function handleSelectPrediction(prediction: PlacePrediction) {
    setResolvingPlaceId(prediction.placeId);
    const place = await fetchPlaceDetails(prediction.placeId);
    setResolvingPlaceId(null);
    if (place) onSelectPlace(place);
  }

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
          style={styles.header}
        >
          <Typography size="text-xl" weight="bold">
            Your location
          </Typography>
          <IconButton
            icon={<XIcon />}
            variant="ghost"
            size="sm"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </Flex>

        <Typography size="text-sm" color="secondary" style={styles.subtitle}>
          Currently showing: {currentLabel}
        </Typography>

        <View style={styles.padX}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Enter an address, city, or postcode"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            size="md"
            prefix={<SearchIcon size={18} color={theme.colors.slate10} />}
            suffix={
              query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <XIcon size={16} color={theme.colors.textMuted} />
                </Pressable>
              ) : null
            }
          />
        </View>

        <View style={styles.padX}>
          <Pressable
            onPress={onUseCurrentLocation}
            disabled={nearMeLoading}
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            accessibilityState={{ busy: Boolean(nearMeLoading) }}
            style={({ pressed }) => [
              styles.nearMeCard,
              pressed && styles.nearMeCardPressed,
            ]}
          >
            <View style={styles.nearMeIcon}>
              {nearMeLoading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <NavigationIcon size={20} color={theme.colors.white} />
              )}
            </View>
            <Flex flex={1} gap={0.25} style={styles.nearMeCopy}>
              <Typography weight="semibold" size="text-md">
                Use current location
              </Typography>
              <Typography size="text-sm" color="secondary" numberOfLines={1}>
                Show restaurants near you
              </Typography>
            </Flex>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {showEmpty ? (
            <Typography color="secondary" size="text-sm" style={styles.padX}>
              No matching places
            </Typography>
          ) : null}

          {showAddresses ? (
            <Flex gap={0.25}>
              <Typography
                weight="semibold"
                size="text-sm"
                color="secondary"
                style={styles.sectionLabel}
              >
                Addresses
              </Typography>
              {placesLoading && predictions.length === 0 ? (
                <Flex alignItems="center" style={styles.loadingRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                </Flex>
              ) : (
                predictions.map((prediction) => (
                  <LocationResultRow
                    key={prediction.placeId}
                    title={prediction.mainText}
                    subtitle={prediction.secondaryText || undefined}
                    loading={resolvingPlaceId === prediction.placeId}
                    accessibilityLabel={prediction.description}
                    onPress={() => void handleSelectPrediction(prediction)}
                  />
                ))
              )}
              {predictions.length > 0 ? (
                <Typography
                  size="text-xs"
                  color="muted"
                  align="center"
                  style={styles.attribution}
                >
                  powered by Google
                </Typography>
              ) : null}
            </Flex>
          ) : null}

          {!showEmpty && filteredCities.length > 0 ? (
            <Flex
              gap={0.25}
              style={showAddresses ? styles.citiesAfterAddresses : undefined}
            >
              <Typography
                weight="semibold"
                size="text-sm"
                color="secondary"
                style={styles.sectionLabel}
              >
                Cities
              </Typography>
              {filteredCities.map((city) => {
                const selected =
                  highlightCitySelection &&
                  (city.label === currentLabel || city.city === currentLabel);
                return (
                  <LocationResultRow
                    key={city.slug}
                    title={city.label}
                    subtitle={`${city.count} restaurants`}
                    selected={selected}
                    onPress={() =>
                      onSelectCity(city.city ?? city.label, city.state)
                    }
                  />
                );
              })}
            </Flex>
          ) : null}

          {!isSearching && filteredCities.length === 0 ? (
            <Typography color="secondary" size="text-sm" style={styles.padX}>
              No cities available yet. Defaulting to New York.
            </Typography>
          ) : null}
        </ScrollView>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    backgroundColor: colors.background,
    paddingTop: space(3),
  },
  header: {
    paddingHorizontal: space(2),
  },
  subtitle: {
    paddingHorizontal: space(2),
    marginTop: space(0.5),
    marginBottom: space(2),
  },
  padX: {
    paddingHorizontal: space(2),
    marginBottom: space(1.5),
  },
  nearMeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.5),
    paddingHorizontal: space(1.5),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  nearMeCardPressed: {
    backgroundColor: colors.slate3,
  },
  nearMeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nearMeCopy: {
    minWidth: 0,
  },
  list: {
    paddingTop: space(1.5),
    paddingBottom: space(4),
    gap: space(2),
  },
  citiesAfterAddresses: {
    marginTop: space(0.5),
  },
  sectionLabel: {
    paddingHorizontal: space(2),
    marginBottom: space(0.25),
  },
  loadingRow: {
    paddingVertical: space(2),
  },
  attribution: {
    marginTop: space(1),
    paddingHorizontal: space(2),
  },
}));
