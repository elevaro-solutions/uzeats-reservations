import { getActivePalette } from '@reservations/ui/palettes';

const palette = getActivePalette();

/** Shared brand colors for the mobile app (follows EXPO_PUBLIC_COLOR_PALETTE). */
export const brand = {
  primary: palette.brand[600],
  primaryDark: palette.brand[700],
  accent: palette.accent[400],
  accentDark: palette.accent[600],
} as const;
