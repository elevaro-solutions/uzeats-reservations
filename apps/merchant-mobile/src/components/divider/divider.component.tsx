import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type DividerProps = {
  spacing?: number;
};

export function Divider({ spacing = 2 }: DividerProps) {
  return <View style={styles.line(spacing)} />;
}

const styles = StyleSheet.create(({ space, colors }) => ({
  line: (spacing: number) => ({
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
    marginVertical: space(spacing),
  }),
}));
