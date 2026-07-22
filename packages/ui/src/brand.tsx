import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { getActivePalette } from './palettes';

const palette = getActivePalette();

/** Logo palette — aliases over active design tokens. */
export const brandLogoColors = {
  green: palette.logo.green,
  gold: palette.logo.gold,
} as const;

export const brandAssetPaths = {
  icon: '/brand/tablevera_icon_v2.svg',
  /** White logo — use on green / dark backgrounds */
  logo: '/brand/tablevera_logo_white_v2.svg',
  /** Full-color logo — use on white / light backgrounds */
  logoColor: '/brand/tablevera_logo_color_v2.svg',
} as const;

export type TableveraIconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
  /** Hides the icon's black backdrop on light surfaces. */
  blendOnLight?: boolean;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'style'>;

/** Square brand mark — dining scene icon. */
export function TableveraIcon({
  size = 32,
  style,
  className,
  blendOnLight = false,
  ...imgProps
}: TableveraIconProps) {
  return (
    <img
      src={brandAssetPaths.icon}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        flexShrink: 0,
        ...(blendOnLight ? { mixBlendMode: 'lighten' } : null),
        ...style,
      }}
      {...imgProps}
    />
  );
}

export type TableveraLogoProps = {
  height?: number;
  style?: CSSProperties;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'height' | 'style'>;

/** Full horizontal logo — best on dark backgrounds. */
export function TableveraLogo({ height = 36, style, className, ...imgProps }: TableveraLogoProps) {
  return (
    <img
      src={brandAssetPaths.logo}
      alt="Tablevera"
      height={height}
      className={className}
      style={{
        display: 'block',
        width: 'auto',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      {...imgProps}
    />
  );
}

export type TableveraWordmarkProps = {
  iconSize?: number;
  style?: CSSProperties;
  className?: string;
  /** `default` = color logo on light surfaces; `inverse` = white logo on dark surfaces */
  variant?: 'default' | 'inverse';
};

/** Logo for headers and sidebars. */
export function TableveraWordmark({
  iconSize = 32,
  style,
  className,
  variant = 'default',
}: TableveraWordmarkProps) {
  const height = Math.round(iconSize * 1.05);
  const src = variant === 'inverse' ? brandAssetPaths.logo : brandAssetPaths.logoColor;

  return (
    <img
      src={src}
      alt="Tablevera"
      height={height}
      className={className}
      style={{
        display: 'block',
        width: 'auto',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export type TableveraBrandProps = {
  iconSize?: number;
  style?: CSSProperties;
  className?: string;
  /** `light` = light header surfaces; `dark` = footer, auth panels */
  surface?: 'light' | 'dark';
};

/** Picks logo styling for the surface behind it. */
export function TableveraBrand({
  iconSize = 34,
  style,
  className,
  surface = 'light',
}: TableveraBrandProps) {
  return (
    <TableveraWordmark
      iconSize={iconSize}
      variant={surface === 'dark' ? 'inverse' : 'default'}
      style={style}
      className={className}
    />
  );
}
