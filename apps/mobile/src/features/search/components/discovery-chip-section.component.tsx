import type { ReactElement } from "react";
import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, Flex, Skeleton } from "@/components";
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
        <Flex direction="row" gap={1} style={styles.padX}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={88} height={36} radius="lg" />
          ))}
        </Flex>
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
