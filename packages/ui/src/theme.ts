import type { ThemeConfig } from 'antd';
import { colors, radii, shadows, typography } from './tokens';

/**
 * Shared Ant Design theme for web + dashboard.
 * Compatible with antd v5 and v6 (only common tokens are used).
 */
export const theme: ThemeConfig = {
  token: {
    // Brand — forest green primary, gold accent links on hover
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
      colorPrimary: colors.brand[600],
      colorPrimaryHover: colors.brand[500],
      colorPrimaryActive: colors.brand[700],
    },
    Card: {
      borderRadiusLG: radii.lg,
      paddingLG: 24,
      boxShadowTertiary: shadows.sm,
    },
    Input: {
      paddingInline: 14,
      activeShadow: `0 0 0 3px ${colors.brand[100]}`,
      hoverBorderColor: colors.brand[400],
      activeBorderColor: colors.brand[600],
      borderRadius: radii.md,
    },
    Select: {
      optionSelectedBg: colors.brand[50],
      optionSelectedColor: colors.brand[700],
      borderRadius: radii.md,
    },
    Menu: {
      itemBorderRadius: radii.sm,
      itemSelectedBg: colors.brand[50],
      itemSelectedColor: colors.brand[600],
      activeBarBorderWidth: 0,
      horizontalItemSelectedColor: colors.brand[600],
      itemHoverColor: colors.brand[500],
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
      headerBg: colors.brand[600],
      headerHeight: 64,
      bodyBg: colors.background,
      siderBg: colors.surface,
    },
    Rate: {
      starColor: colors.accent[400],
    },
    Badge: {
      colorBgContainer: colors.surface,
    },
    Segmented: {
      itemSelectedBg: colors.surface,
      itemSelectedColor: colors.brand[600],
      trackBg: colors.neutral[100],
    },
    Tabs: {
      inkBarColor: colors.brand[600],
      itemSelectedColor: colors.brand[600],
      itemHoverColor: colors.brand[500],
    },
    Checkbox: {
      colorPrimary: colors.brand[600],
    },
    Radio: {
      colorPrimary: colors.brand[600],
    },
    Switch: {
      colorPrimary: colors.brand[600],
    },
    Progress: {
      defaultColor: colors.brand[600],
    },
    Slider: {
      trackBg: colors.brand[200],
      trackHoverBg: colors.brand[300],
      handleColor: colors.brand[600],
    },
    Pagination: {
      itemActiveBg: colors.brand[50],
      itemActiveColor: colors.brand[600],
    },
  },
};

export const priceRangeLabel = (n: number) => '$'.repeat(Math.min(4, Math.max(1, n)));
