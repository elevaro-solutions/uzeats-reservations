import type { ReactElement } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  Chip,
  ChipRowSkeleton,
  Flex,
  TRENDING_CHIP_WIDTHS,
} from "@/components";
import { SectionHeader } from "@/features/home/components/section-header.component";
import type { IconPropsType } from "@/types";

export type DiscoveryChipItem = {
  key: string;
  label: string;
};

export type DiscoveryChipSectionProps = {
  title: string;
  items: DiscoveryChipItem[];
  loading: boolean;
  icon?: ReactElement<IconPropsType>;
  onPress: (item: DiscoveryChipItem) => void;
};

export function DiscoveryChipSection({
  title,
  items,
  loading,
  icon,
  onPress,
}: DiscoveryChipSectionProps) {
  if (!loading && items.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <SectionHeader title={title} />
      {loading && items.length === 0 ? (
        <View style={styles.padX}>
          <ChipRowSkeleton widths={TRENDING_CHIP_WIDTHS} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Flex direction="row" gap={1}>
            {items.map((item) => (
              <Chip key={item.key} icon={icon} onPress={() => onPress(item)}>
                {item.label}
              </Chip>
            ))}
          </Flex>
        </ScrollView>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  padX: {
    paddingHorizontal: space(2),
  },
  chipScroll: {
    paddingHorizontal: space(2),
  },
}));
