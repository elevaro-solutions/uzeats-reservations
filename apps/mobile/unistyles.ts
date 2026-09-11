import { StyleSheet } from "react-native-unistyles";

/**
 * Tablevera Forest & Gold — light theme only.
 * Primary aligns with brand splash (#0b3d2e); accent gold for appetite/premium cues.
 * Scales follow the xizmat unistyles token shape (1–12), not xizmat colors.
 */
const lightPalette = {
  white: "#ffffff",
  black: "#000000",

  // Forest primary (brand)
  primary1: "#f0f7f4",
  primary2: "#dceee6",
  primary3: "#b5d9c8",
  primary4: "#7fb89a",
  primary5: "#3d8f6f",
  primary6: "#1d6b52",
  primary7: "#155a44",
  primary8: "#0f4a38",
  primary9: "#0b3d2e",
  primary10: "#093224",
  primary11: "#07271c",
  primary12: "#051c14",

  // Antique gold accent
  accent1: "#faf6ee",
  accent2: "#f3ead4",
  accent3: "#e8d5a8",
  accent4: "#d4b06a",
  accent5: "#c5a059",
  accent6: "#a8843f",
  accent7: "#8f6b2a",
  accent8: "#735622",
  accent9: "#c5a059",
  accent10: "#a8843f",
  accent11: "#8f6b2a",
  accent12: "#453312",

  // Warm olive-tinted neutrals
  slate1: "#fafaf8",
  slate2: "#f5f4f0",
  slate3: "#ebe9e3",
  slate4: "#e0ddd5",
  slate5: "#d4d0c6",
  slate6: "#c5c0b4",
  slate7: "#b0aa9c",
  slate8: "#948e80",
  slate9: "#7a7468",
  slate10: "#625d53",
  slate11: "#4a463f",
  slate12: "#1e1c18",

  // Semantic scales
  red1: "#fffcfc",
  red2: "#fff7f7",
  red3: "#feebec",
  red4: "#ffdbdc",
  red5: "#ffcdce",
  red6: "#fdbdbe",
  red7: "#f4a9aa",
  red8: "#eb8e90",
  red9: "#e5484d",
  red10: "#dc3e42",
  red11: "#ce2c31",
  red12: "#641723",

  green1: "#fbfefc",
  green2: "#f4fbf6",
  green3: "#e6f6eb",
  green4: "#d6f1df",
  green5: "#c4e8d1",
  green6: "#adddc0",
  green7: "#8eceaa",
  green8: "#5bb98b",
  green9: "#30a46c",
  green10: "#2b9a66",
  green11: "#218358",
  green12: "#193b2d",

  amber1: "#fefdfb",
  amber2: "#fefbe9",
  amber3: "#fff7c2",
  amber4: "#ffee9c",
  amber5: "#fbe577",
  amber6: "#f3d673",
  amber7: "#e9c162",
  amber8: "#e2a336",
  amber9: "#ffc53d",
  amber10: "#ffba18",
  amber11: "#ab6400",
  amber12: "#4f3422",

  blue1: "#fbfdff",
  blue2: "#f4faff",
  blue3: "#e6f4fe",
  blue4: "#d5efff",
  blue5: "#c2e5ff",
  blue6: "#acd8fc",
  blue7: "#8ec8f6",
  blue8: "#5eb1ef",
  blue9: "#0090ff",
  blue10: "#0588f0",
  blue11: "#0d74ce",
  blue12: "#113264",
};

const lightTheme = {
  space: (v: number) => v * 8,
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
  shadows: {
    soft: {
      shadowColor: lightPalette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    card: {
      shadowColor: lightPalette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    stickyFooter: {
      shadowColor: lightPalette.black,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  colors: {
    ...lightPalette,
    error: lightPalette.red9,
    info: lightPalette.blue9,
    border: lightPalette.slate5,
    success: lightPalette.green9,
    surface: lightPalette.slate2,
    warning: lightPalette.amber10,
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(255, 255, 255, 0.18)",
    textMuted: lightPalette.slate9,
    primary: lightPalette.primary9,
    errorPress: lightPalette.red11,
    errorSubtle: lightPalette.red3,
    infoPress: lightPalette.blue11,
    infoSubtle: lightPalette.blue3,
    background: lightPalette.white,
    secondary: lightPalette.slate12,
    borderStrong: lightPalette.slate7,
    textPrimary: lightPalette.slate12,
    successPress: lightPalette.green11,
    successSubtle: lightPalette.green3,
    warningPress: lightPalette.amber11,
    warningSubtle: lightPalette.amber3,
    textSecondary: lightPalette.slate11,
    secondaryPress: lightPalette.slate11,
    secondarySubtle: lightPalette.slate3,
    primaryPress: lightPalette.primary11,
    primarySubtle: lightPalette.primary3,
    accent: lightPalette.accent9,
    accentPress: lightPalette.accent11,
    accentSubtle: lightPalette.accent3,
  },
};

const appThemes = {
  light: lightTheme,
};

export type UnistylesAppThemes = typeof appThemes;

declare module "react-native-unistyles" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends UnistylesAppThemes {}
}

StyleSheet.configure({
  settings: {
    initialTheme: "light",
  },
  themes: appThemes,
});
