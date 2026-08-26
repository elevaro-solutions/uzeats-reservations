import { Modal, Pressable, ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { MapPinIcon, XIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";
import type { DiscoveryIndexEntry } from "@/features/discovery";

export type LocationSheetProps = {
  visible: boolean;
  cities: DiscoveryIndexEntry[];
  currentLabel: string;
  nearMeLoading?: boolean;
  onClose: () => void;
  onSelectCity: (city: string, state?: string | null) => void;
  onUseCurrentLocation: () => void;
};

export function LocationSheet({
  visible,
  cities,
  currentLabel,
  nearMeLoading,
  onClose,
  onSelectCity,
  onUseCurrentLocation,
}: LocationSheetProps) {
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
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <XIcon size={22} color={styles.icon.color} />
          </Pressable>
        </Flex>

        <Typography size="text-sm" color="secondary" style={styles.subtitle}>
          Currently showing: {currentLabel}
        </Typography>

        <Button
          fullWidth
          size="lg"
          loading={nearMeLoading}
          startIcon={<MapPinIcon />}
          onPress={onUseCurrentLocation}
          style={styles.nearMe}
        >
          Use current location
        </Button>

        <Typography weight="semibold" size="text-lg" style={styles.sectionLabel}>
          Cities
        </Typography>

        <ScrollView contentContainerStyle={styles.list}>
          {cities.length === 0 ? (
            <Typography color="secondary" size="text-sm">
              No cities available yet. Defaulting to New York.
            </Typography>
          ) : (
            cities.map((city) => (
              <Pressable
                key={city.slug}
                style={styles.cityRow}
                onPress={() => onSelectCity(city.city ?? city.label, city.state)}
              >
                <Flex gap={0.25}>
                  <Typography weight="semibold">{city.label}</Typography>
                  <Typography size="text-xs" color="muted">
                    {city.count} restaurants
                  </Typography>
                </Flex>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    backgroundColor: colors.background,
    paddingTop: space(2),
  },
  header: {
    paddingHorizontal: space(2),
  },
  subtitle: {
    paddingHorizontal: space(2),
    marginTop: space(1),
  },
  nearMe: {
    marginHorizontal: space(2),
    marginTop: space(2),
  },
  sectionLabel: {
    paddingHorizontal: space(2),
    marginTop: space(3),
    marginBottom: space(1.5),
  },
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(4),
    gap: space(1),
  },
  cityRow: {
    paddingVertical: space(1.75),
    paddingHorizontal: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySubtle,
  },
  icon: {
    color: colors.textPrimary,
  },
}));
