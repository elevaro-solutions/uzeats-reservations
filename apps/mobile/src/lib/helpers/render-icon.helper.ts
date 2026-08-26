import { cloneElement, isValidElement, ReactElement } from "react";
import { StyleProp, StyleSheet as RNStyleSheet, ViewStyle } from "react-native";

import { IconPropsType } from "@/types";

type RenderIconArgs = {
  icon?: ReactElement<IconPropsType> | null;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function renderIcon({ icon, color, style }: RenderIconArgs) {
  if (!isValidElement(icon)) return null;

  const flattened = RNStyleSheet.flatten(style) || {};
  return cloneElement(icon, {
    color: color ?? icon.props.color ?? (flattened as { color?: string }).color,
    style: [icon.props.style, style],
    size:
      icon.props.size ??
      (flattened as { width?: number }).width ??
      (flattened as { height?: number }).height,
  });
}
