import { getActivePalette, type ColorPalette, type PaletteId } from './palettes';

/** CSS custom properties injected on `:root` for static stylesheets. */
export function paletteCssVariables(palette: ColorPalette = getActivePalette()): Record<string, string> {
  return {
    '--color-palette-id': palette.id,
    '--color-brand': palette.brand[600],
    '--color-brand-50': palette.brand[50],
    '--color-brand-100': palette.brand[100],
    '--color-brand-200': palette.brand[200],
    '--color-brand-500': palette.brand[500],
    '--color-brand-600': palette.brand[600],
    '--color-brand-700': palette.brand[700],
    '--color-brand-800': palette.brand[800],
    '--color-brand-900': palette.brand[900],
    '--color-accent': palette.accent[400],
    '--color-accent-50': palette.accent[50],
    '--color-accent-300': palette.accent[300],
    '--color-accent-400': palette.accent[400],
    '--color-accent-600': palette.accent[600],
    '--color-hero-mid': palette.heroMid,
    '--color-rating': palette.rating,
    '--color-brand-rgb': palette.brandRgb,
    '--color-accent-rgb': palette.accentRgb,
    '--color-brand-logo-green': palette.logo.green,
    '--color-brand-logo-gold': palette.logo.gold,
    '--shadow-brand': palette.shadows.brand,
    '--shadow-accent': palette.shadows.accent,
  };
}

export function paletteCssText(id?: PaletteId): string {
  const vars = paletteCssVariables(getActivePalette(id));
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `:root {\n${body}\n}`;
}
