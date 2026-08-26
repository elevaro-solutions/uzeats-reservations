import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export type FlexProps = {
  flex?: number;
  gap?: number;
  children?: ReactNode;
  flexShrink?: number;
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  alignItems?: ViewStyle["alignItems"];
  justifyContent?: ViewStyle["justifyContent"];
  style?: StyleProp<ViewStyle>;
};

export function Flex({
  flex,
  style,
  gap = 0,
  children,
  flexShrink,
  flexWrap = "nowrap",
  direction = "column",
  alignItems = "stretch",
  justifyContent = "flex-start",
}: FlexProps) {
  const { theme } = useUnistyles();

  return (
    <View
      style={[
        {
          flex,
          flexWrap,
          flexShrink,
          alignItems,
          justifyContent,
          gap: theme.space(gap),
          flexDirection: direction,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
