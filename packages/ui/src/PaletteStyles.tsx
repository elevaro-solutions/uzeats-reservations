import { paletteCssText } from './cssVars';

/** Injects active color palette as CSS variables on `:root`. */
export function PaletteStyles() {
  return <style component="PaletteStyles" dangerouslySetInnerHTML={{ __html: paletteCssText() }} />;
}
