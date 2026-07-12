/**
 * ReserveTable design tokens.
 *
 * Framework-agnostic (no antd import) so they can be consumed by the
 * Next.js apps, the Ant Design theme, and the Expo mobile app alike.
 */

export const colors = {
  /** Brand — a confident, appetizing red. */
  brand: {
    50: '#fef2f3',
    100: '#fde3e5',
    200: '#fbccd0',
    300: '#f7a3aa',
    400: '#f1707c',
    500: '#e64553',
    600: '#da3743', // primary
    700: '#b02531',
    800: '#93222d',
    900: '#7a222b',
  },

  /** Warm neutrals — softer than pure gray, suits food & hospitality. */
  neutral: {
    0: '#ffffff',
    25: '#fcfcfb',
    50: '#f8f7f6',
    100: '#f1efed',
    200: '#e5e2df',
    300: '#d4d0cc',
    400: '#a8a29c',
    500: '#7d766f',
    600: '#5c554e',
    700: '#443f39',
    800: '#2b2724',
    900: '#1c1917',
  },

  /** Semantic */
  success: '#2e9e5b',
  successBg: '#e9f7ef',
  warning: '#d97917',
  warningBg: '#fdf3e5',
  error: '#d64550',
  errorBg: '#fdeceb',
  info: '#2f6fed',
  infoBg: '#ebf1fe',

  /** Aliases used across surfaces */
  background: '#f8f7f6',
  surface: '#ffffff',
  border: '#e5e2df',
  bordersubtle: '#f1efed',
  textPrimary: '#1c1917',
  textSecondary: '#5c554e',
  textTertiary: '#a8a29c',
  textInverse: '#ffffff',
} as const;

export const typography = {
  fontFamily:
    'var(--font-sans, "Inter"), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Type scale (px) — 1.25 ratio, tuned for UI density. */
  fontSize: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 38,
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
    tight: '-0.02em',
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
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** Layered, low-contrast shadows for a soft, modern feel. */
export const shadows = {
  xs: '0 1px 2px rgba(28, 25, 23, 0.05)',
  sm: '0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04)',
  md: '0 4px 12px rgba(28, 25, 23, 0.08), 0 1px 3px rgba(28, 25, 23, 0.05)',
  lg: '0 12px 32px rgba(28, 25, 23, 0.12), 0 2px 6px rgba(28, 25, 23, 0.06)',
  brand: '0 6px 16px rgba(218, 55, 67, 0.24)',
} as const;

export const layout = {
  /** Max content width for the diner-facing web app. */
  contentMaxWidth: 1120,
  headerHeight: 64,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const tokens = { colors, typography, spacing, radii, shadows, layout } as const;
