import { Text, TextProps } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { getFontFamily, TypographyWeight } from "./helpers/get-font-family.helper";

export type TypographySize =
  | "text-xs"
  | "text-sm"
  | "text-md"
  | "text-lg"
  | "text-xl"
  | "display-xs"
  | "display-sm"
  | "display-md";

export type { TypographyWeight };

export type TypographyColor =
  | "textPrimary"
  | "secondary"
  | "muted"
  | "primary"
  | "accent"
  | "error"
  | "success"
  | "warning"
  | "info"
  | "inverse";

export type TypographyProps = TextProps & {
  size?: TypographySize;
  weight?: TypographyWeight;
  color?: TypographyColor;
  align?: "left" | "center" | "right";
};

export function Typography({
  style,
  children,
  align = "left",
  size = "text-md",
  weight = "regular",
  color = "textPrimary",
  ...props
}: TypographyProps) {
  styles.useVariants({ size, color, align, weight });

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create((theme) => ({
  text: {
    variants: {
      align: {
        left: { textAlign: "left" },
        right: { textAlign: "right" },
        center: { textAlign: "center" },
      },
      weight: {
        bold: { fontFamily: getFontFamily("bold") },
        medium: { fontFamily: getFontFamily("medium") },
        regular: { fontFamily: getFontFamily("regular") },
        semibold: { fontFamily: getFontFamily("semibold") },
      },
      color: {
        error: { color: theme.colors.error },
        info: { color: theme.colors.blue11 },
        success: { color: theme.colors.green11 },
        warning: { color: theme.colors.amber11 },
        muted: { color: theme.colors.textMuted },
        accent: { color: theme.colors.accent11 },
        primary: { color: theme.colors.primary11 },
        secondary: { color: theme.colors.textSecondary },
        textPrimary: { color: theme.colors.textPrimary },
        inverse: { color: theme.colors.white },
      },
      size: {
        // DM Sans has a large x-height — slightly tighter leading than Inter-like scales
        "text-xs": { fontSize: 12, lineHeight: 16 },
        "text-sm": { fontSize: 14, lineHeight: 20 },
        "text-md": { fontSize: 16, lineHeight: 22 },
        "text-lg": { fontSize: 18, lineHeight: 24 },
        "text-xl": { fontSize: 20, lineHeight: 28 },
        "display-xs": { fontSize: 24, lineHeight: 30 },
        "display-sm": { fontSize: 28, lineHeight: 34 },
        "display-md": { fontSize: 34, lineHeight: 40 },
      },
    },
  },
}));
