import { ActivityIndicator, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export type LoaderProps = {
  size?: "small" | "large";
  fullScreen?: boolean;
};

export function Loader({ size = "large", fullScreen = false }: LoaderProps) {
  const { theme } = useUnistyles();

  return (
    <View style={[styles.wrap, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: space(2),
  },
  fullScreen: {
    flex: 1,
  },
}));
