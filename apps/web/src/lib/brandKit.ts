export type BrandDownload = {
  title: string;
  detail: string;
  href: string;
  filename: string;
  preview: string;
  /** Background behind the preview so white and forest marks stay visible. */
  surface: 'light' | 'dark' | 'forest' | 'cream';
};

export type BrandDownloadGroup = {
  id: string;
  title: string;
  items: BrandDownload[];
};

export const BRAND_DOWNLOADS: BrandDownloadGroup[] = [
  {
    id: 'logos',
    title: 'Logos',
    items: [
      {
        title: 'Color logo',
        detail: 'SVG · light backgrounds',
        href: '/brand/tablevera_logo_color_v2.svg',
        filename: 'tablevera-logo-color.svg',
        preview: '/brand/tablevera_logo_color_v2.svg',
        surface: 'light',
      },
      {
        title: 'White logo',
        detail: 'SVG · forest and dark backgrounds',
        href: '/brand/tablevera_logo_white_v2.svg',
        filename: 'tablevera-logo-white.svg',
        preview: '/brand/tablevera_logo_white_v2.svg',
        surface: 'forest',
      },
      {
        title: 'Icon',
        detail: 'SVG · square mark',
        href: '/brand/tablevera_icon_v2.svg',
        filename: 'tablevera-icon.svg',
        preview: '/brand/tablevera_icon_v2.svg',
        surface: 'light',
      },
      {
        title: 'Partner logo',
        detail: 'SVG · partner wordmark',
        href: '/downloads/tablevera-partner-logo.svg',
        filename: 'tablevera-partner-logo.svg',
        preview: '/downloads/tablevera-partner-logo.svg',
        surface: 'light',
      },
      {
        title: 'Partner mark',
        detail: 'SVG · partner icon',
        href: '/downloads/tablevera-partner-mark.svg',
        filename: 'tablevera-partner-mark.svg',
        preview: '/downloads/tablevera-partner-mark.svg',
        surface: 'cream',
      },
    ],
  },
  {
    id: 'app-icons',
    title: 'App icons',
    items: [
      {
        title: 'Diner icon',
        detail: 'PNG · 1024 × 1024',
        href: '/downloads/diner-icon-1024.png',
        filename: 'tablevera-diner-icon-1024.png',
        preview: '/downloads/diner-icon-1024.png',
        surface: 'light',
      },
      {
        title: 'Diner icon',
        detail: 'PNG · 512 × 512',
        href: '/downloads/diner-icon-512.png',
        filename: 'tablevera-diner-icon-512.png',
        preview: '/downloads/diner-icon-512.png',
        surface: 'light',
      },
      {
        title: 'Diner icon',
        detail: 'SVG · 1024',
        href: '/downloads/diner-icon.svg',
        filename: 'tablevera-diner-icon.svg',
        preview: '/downloads/diner-icon.svg',
        surface: 'light',
      },
      {
        title: 'Partner icon',
        detail: 'PNG · 1024 × 1024',
        href: '/downloads/merchant-icon-1024.png',
        filename: 'tablevera-partner-icon-1024.png',
        preview: '/downloads/merchant-icon-1024.png',
        surface: 'light',
      },
      {
        title: 'Partner icon',
        detail: 'PNG · 512 × 512',
        href: '/downloads/merchant-icon-512.png',
        filename: 'tablevera-partner-icon-512.png',
        preview: '/downloads/merchant-icon-512.png',
        surface: 'light',
      },
      {
        title: 'Partner icon',
        detail: 'SVG · 1024',
        href: '/downloads/merchant-icon.svg',
        filename: 'tablevera-partner-icon.svg',
        preview: '/downloads/merchant-icon.svg',
        surface: 'light',
      },
    ],
  },
  {
    id: 'store-graphics',
    title: 'Store graphics',
    items: [
      {
        title: 'Diner feature graphic',
        detail: 'PNG · 1024 × 500',
        href: '/downloads/diner-feature-1024x500.png',
        filename: 'tablevera-diner-feature-1024x500.png',
        preview: '/downloads/diner-feature-1024x500.png',
        surface: 'light',
      },
      {
        title: 'Partner feature graphic',
        detail: 'PNG · 1024 × 500',
        href: '/downloads/merchant-feature-1024x500.png',
        filename: 'tablevera-partner-feature-1024x500.png',
        preview: '/downloads/merchant-feature-1024x500.png',
        surface: 'light',
      },
    ],
  },
];
