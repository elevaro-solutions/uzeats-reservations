export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type ColorPalette = {
  id: '1' | '2';
  name: string;
  brand: ColorScale;
  accent: ColorScale;
  heroMid: string;
  rating: string;
  /** For `rgba(var(--color-brand-rgb), α)` in CSS */
  brandRgb: string;
  accentRgb: string;
  shadows: {
    brand: string;
    accent: string;
  };
  logo: {
    green: string;
    gold: string;
  };
};

/** Forest green + antique gold (current Tablevera brand). */
export const palette1: ColorPalette = {
  id: '1',
  name: 'Forest & Gold',
  brand: {
    50: '#f0f7f4',
    100: '#dceee6',
    200: '#b5d9c8',
    300: '#7fb89a',
    400: '#3d8f6f',
    500: '#1d6b52',
    600: '#0b3d2e',
    700: '#093224',
    800: '#07271c',
    900: '#051c14',
  },
  accent: {
    50: '#faf6ee',
    100: '#f3ead4',
    200: '#e8d5a8',
    300: '#d4b06a',
    400: '#c5a059',
    500: '#a8843f',
    600: '#8f6b2a',
    700: '#735622',
    800: '#5c441a',
    900: '#453312',
  },
  heroMid: '#071f18',
  rating: '#c5a059',
  brandRgb: '11, 61, 46',
  accentRgb: '197, 160, 89',
  shadows: {
    brand: '0 8px 20px rgba(11, 61, 46, 0.28)',
    accent: '0 8px 20px rgba(197, 160, 89, 0.32)',
  },
  logo: {
    green: '#0b3d2e',
    gold: '#c5a059',
  },
};

/** Terracotta + warm gold (original hospitality palette). */
export const palette2: ColorPalette = {
  id: '2',
  name: 'Terracotta & Amber',
  brand: {
    50: '#fdf6f4',
    100: '#fce9e4',
    200: '#f8d2c8',
    300: '#f0ac9a',
    400: '#e47d64',
    500: '#d45a3f',
    600: '#c4472f',
    700: '#a33826',
    800: '#873123',
    900: '#702c22',
  },
  accent: {
    50: '#fdf8ec',
    100: '#fcefcc',
    200: '#f5df99',
    300: '#ecc85a',
    400: '#e8a317',
    500: '#d4890f',
    600: '#b8740c',
    700: '#945f0a',
    800: '#704808',
    900: '#4c3105',
  },
  heroMid: '#2a1816',
  rating: '#e8a317',
  brandRgb: '196, 71, 47',
  accentRgb: '232, 163, 23',
  shadows: {
    brand: '0 8px 20px rgba(196, 71, 47, 0.28)',
    accent: '0 8px 20px rgba(232, 163, 23, 0.32)',
  },
  logo: {
    green: '#c4472f',
    gold: '#e8a317',
  },
};

export const palettes = {
  '1': palette1,
  '2': palette2,
} as const;

export type PaletteId = keyof typeof palettes;

/** Reads palette id from Next.js or Expo public env (inlined at build time). */
export function resolvePaletteId(): PaletteId {
  const raw =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_COLOR_PALETTE || process.env.EXPO_PUBLIC_COLOR_PALETTE)) ||
    '1';
  return raw === '2' ? '2' : '1';
}

export function getActivePalette(id: PaletteId = resolvePaletteId()): ColorPalette {
  return palettes[id];
}
