import type { ThemeConfig } from 'antd';
import { colors, radii, shadows, typography } from './tokens';

/**
 * Shared Ant Design theme for web + dashboard.
 * Compatible with antd v5 and v6 (only common tokens are used).
 */
export const theme: ThemeConfig = {
  token: {
    // Brand
    colorPrimary: colors.brand[600],
    colorLink: colors.brand[600],
    colorLinkHover: colors.brand[500],
    colorInfo: colors.info,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,

    // Neutrals & surfaces
    colorTextBase: colors.textPrimary,
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textTertiary,
    colorBgLayout: colors.background,
    colorBgContainer: colors.surface,
    colorBorder: colors.border,
    colorBorderSecondary: colors.bordersubtle,

    // Shape & type
    borderRadius: radii.md,
    borderRadiusLG: radii.lg,
    borderRadiusSM: radii.sm,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize.base,

    // Softer elevation than antd defaults
    boxShadow: shadows.md,
    boxShadowSecondary: shadows.lg,

    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: typography.fontWeight.semibold,
      controlHeight: 40,
      paddingInline: 20,
      borderRadius: radii.md,
    },
    Card: {
      borderRadiusLG: radii.lg,
      paddingLG: 24,
      boxShadowTertiary: shadows.sm,
    },
    Input: {
      paddingInline: 14,
      activeShadow: `0 0 0 3px ${colors.brand[100]}`,
      borderRadius: radii.md,
    },
    Select: {
      optionSelectedBg: colors.brand[50],
      borderRadius: radii.md,
    },
    Menu: {
      itemBorderRadius: radii.sm,
      itemSelectedBg: colors.brand[50],
      itemSelectedColor: colors.brand[600],
      activeBarBorderWidth: 0,
      horizontalItemSelectedColor: colors.brand[600],
    },
    Tag: {
      borderRadiusSM: radii.pill,
    },
    Table: {
      headerBg: colors.neutral[50],
      headerColor: colors.textSecondary,
      headerSplitColor: 'transparent',
      rowHoverBg: colors.neutral[25],
    },
    Modal: {
      borderRadiusLG: radii.lg,
    },
    Typography: {
      titleMarginBottom: '0.4em',
      titleMarginTop: 0,
    },
    Layout: {
      headerBg: colors.surface,
      headerHeight: 64,
      bodyBg: colors.background,
      siderBg: colors.surface,
    },
    Rate: {
      starColor: colors.rating,
    },
    Badge: {
      colorBgContainer: colors.surface,
    },
    Segmented: {
      itemSelectedBg: colors.surface,
      trackBg: colors.neutral[100],
    },
    Tabs: {
      inkBarColor: colors.brand[600],
      itemSelectedColor: colors.brand[600],
      itemHoverColor: colors.brand[500],
    },
  },
};

export const priceRangeLabel = (n: number) => '$'.repeat(Math.min(4, Math.max(1, n)));
