import { StyleSheet } from "react-native-unistyles";

import { Flex } from "../flex";

import { Skeleton } from "./skeleton.component";

export function SuggestionRowSkeleton() {
  return (
    <Flex direction="row" alignItems="center" gap={1.5} style={styles.row}>
      <Skeleton width={40} height={40} radius="full" />
      <Flex flex={1} gap={0.25} style={styles.copy}>
        <Skeleton height={16} width="70%" radius="md" />
        <Skeleton height={14} width="50%" radius="md" />
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  row: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.25),
  },
  copy: {
    minWidth: 0,
  },
}));
