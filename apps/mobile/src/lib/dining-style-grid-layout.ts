export const DINING_STYLE_COLS = 3;
/** Phone-scale tile size; iPad would otherwise stretch squares to full width. */
export const DINING_STYLE_MAX_CELL = 128;

export type DiningStyleGridMetrics = {
  cell: number;
  gutter: number;
  padX: number;
  heroWidth: number;
  rowHeight: number;
  gridInnerWidth: number;
};

export function diningStyleGridMetrics(
  windowWidth: number,
  space: (n: number) => number,
): DiningStyleGridMetrics {
  const gutter = space(1);
  const padX = space(2);
  const available = windowWidth - padX * 2;
  const computed =
    (available - gutter * (DINING_STYLE_COLS - 1)) / DINING_STYLE_COLS;
  const cell = Math.min(computed, DINING_STYLE_MAX_CELL);
  const gridInnerWidth = cell * DINING_STYLE_COLS + gutter * (DINING_STYLE_COLS - 1);

  return {
    cell,
    gutter,
    padX,
    heroWidth: cell * 2 + gutter,
    rowHeight: cell,
    gridInnerWidth,
  };
}
