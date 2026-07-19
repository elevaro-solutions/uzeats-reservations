/**
 * ReserveTable design tokens.
 *
 * Framework-agnostic (no antd import) so they can be consumed by the
 * Next.js apps, the Ant Design theme, and the Expo mobile app alike.
 *
 * Palette intent: warm hospitality — terracotta-wine accent on soft
 * stone neutrals. Feels like a dining room, not a generic tech product.
 */

export const colors = {
  /** Brand — warm terracotta-wine, appetizing and confident. */
  brand: {
    50: '#fdf6f4',
    100: '#fce9e4',
    200: '#f8d2c8',
    300: '#f0ac9a',
    400: '#e47d64',
    500: '#d45a3f',
    600: '#c4472f', // primary
    700: '#a33826',
    800: '#873123',
    900: '#702c22',
  },

  /** Warm neutrals — softer than pure gray, suits food & hospitality. */
  neutral: {
    0: '#ffffff',
    25: '#fcfbfa',
    50: '#f7f5f2',
    100: '#f0ede8',
    200: '#e3dfd8',
    300: '#d0cbc2',
    400: '#a39e94',
    500: '#78736a',
    600: '#5a554d',
    700: '#433f39',
    800: '#2c2925',
    900: '#1a1816',
  },

  /** Semantic */
  success: '#2f9e6a',
  successBg: '#e8f7ef',
  warning: '#d4890f',
  warningBg: '#fdf4e5',
  error: '#c4472f',
  errorBg: '#fdf0ed',
  info: '#2f6fed',
  infoBg: '#ebf1fe',

  /** Rating gold */
  rating: '#e8a317',

  /** Hero / auth panel midtone (warm espresso) */
  heroMid: '#2a1816',

  /** Aliases used across surfaces */
  background: '#f7f5f2',
  surface: '#ffffff',
  border: '#e3dfd8',
  bordersubtle: '#f0ede8',
  textPrimary: '#1a1816',
  textSecondary: '#5a554d',
  textTertiary: '#a39e94',
  textInverse: '#ffffff',
} as const;

export const typography = {
  fontFamily:
    'var(--font-sans, "Plus Jakarta Sans"), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Type scale (px) — 1.25 ratio, tuned for UI density. */
  fontSize: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 40,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.55,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.04em',
  },
} as const;

/** 4px base spacing scale. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Layered, low-contrast shadows for a soft, modern feel. */
export const shadows = {
  xs: '0 1px 2px rgba(26, 24, 22, 0.04)',
  sm: '0 1px 3px rgba(26, 24, 22, 0.05), 0 1px 2px rgba(26, 24, 22, 0.04)',
  md: '0 4px 14px rgba(26, 24, 22, 0.07), 0 1px 3px rgba(26, 24, 22, 0.04)',
  lg: '0 16px 40px rgba(26, 24, 22, 0.1), 0 2px 8px rgba(26, 24, 22, 0.05)',
  brand: '0 8px 20px rgba(196, 71, 47, 0.28)',
} as const;

export const layout = {
  /** Max content width for the diner-facing web app. */
  contentMaxWidth: 1120,
  headerHeight: 64,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const tokens = { colors, typography, spacing, radii, shadows, layout } as const;
