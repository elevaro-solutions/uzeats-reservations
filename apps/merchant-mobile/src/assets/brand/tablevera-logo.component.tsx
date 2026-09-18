import { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import { TABLEVERA_LOGO_COLOR_SVG } from "./tablevera-logo-color-svg";

/** Intrinsic aspect ratio of tablevera_logo_color_v2.svg (6384 × 1515). */
const LOGO_ASPECT = 6384 / 1515;

export type TableveraLogoProps = {
  /** Logo height in dp. Matches web auth wordmark (~36–40). */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Full-color Tablevera wordmark for light surfaces (auth, headers). */
export function TableveraLogo({ height = 36, style }: TableveraLogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <SvgXml
      xml={TABLEVERA_LOGO_COLOR_SVG}
      width={width}
      height={height}
      style={style}
      accessibilityRole="image"
      accessibilityLabel="Tablevera"
    />
  );
}
