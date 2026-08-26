import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <Flex direction="row" alignItems="center" gap={1.5}>
      <View style={styles.line} />
      <Typography size="text-sm" color="muted">
        {label}
      </Typography>
      <View style={styles.line} />
    </Flex>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
}));
