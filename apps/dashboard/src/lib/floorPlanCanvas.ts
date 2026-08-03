export const FLOOR_GRID_COLS = 24;
export const FLOOR_GRID_ROWS = 16;
export const MIN_CELL_SIZE = 18;
export const MAX_CELL_SIZE = 52;

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type TableLayout = {
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export function cellSizeForWidth(containerWidth: number, cols = FLOOR_GRID_COLS): number {
  if (containerWidth <= 0) return 40;
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(containerWidth / cols)));
}

export function snapDelta(pixels: number, cellSize: number): number {
  if (pixels >= 0) return Math.floor(pixels / cellSize);
  return Math.ceil(pixels / cellSize);
}

export function clampMove(
  layout: TableLayout,
  dx: number,
  dy: number,
  cols = FLOOR_GRID_COLS,
  rows = FLOOR_GRID_ROWS,
): TableLayout {
  const posX = Math.min(Math.max(layout.posX + dx, 0), cols - layout.width);
  const posY = Math.min(Math.max(layout.posY + dy, 0), rows - layout.height);
  return { ...layout, posX, posY };
}

export function clampLayout(
  layout: TableLayout,
  cols = FLOOR_GRID_COLS,
  rows = FLOOR_GRID_ROWS,
): TableLayout {
  const width = Math.min(Math.max(layout.width, 1), cols - layout.posX);
  const height = Math.min(Math.max(layout.height, 1), rows - layout.posY);
  const posX = Math.min(Math.max(layout.posX, 0), cols - width);
  const posY = Math.min(Math.max(layout.posY, 0), rows - height);
  return { posX, posY, width, height };
}

export function applyResize(
  orig: TableLayout,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  cols = FLOOR_GRID_COLS,
  rows = FLOOR_GRID_ROWS,
): TableLayout {
  let { posX, posY, width, height } = orig;

  if (handle.includes('e')) {
    width = Math.min(Math.max(width + dx, 1), cols - posX);
  }
  if (handle.includes('w')) {
    const nextWidth = width - dx;
    const nextPosX = posX + dx;
    if (nextWidth >= 1 && nextPosX >= 0) {
      width = nextWidth;
      posX = nextPosX;
    } else if (nextPosX < 0) {
      width = width + posX;
      posX = 0;
    } else {
      width = 1;
      posX = orig.posX + orig.width - 1;
    }
  }
  if (handle.includes('s')) {
    height = Math.min(Math.max(height + dy, 1), rows - posY);
  }
  if (handle.includes('n')) {
    const nextHeight = height - dy;
    const nextPosY = posY + dy;
    if (nextHeight >= 1 && nextPosY >= 0) {
      height = nextHeight;
      posY = nextPosY;
    } else if (nextPosY < 0) {
      height = height + posY;
      posY = 0;
    } else {
      height = 1;
      posY = orig.posY + orig.height - 1;
    }
  }

  width = Math.min(width, cols - posX);
  height = Math.min(height, rows - posY);

  return { posX, posY, width, height };
}

export const RESIZE_HANDLES: Array<{
  id: ResizeHandle;
  cursor: string;
  style: Record<string, string | number>;
}> = [
  { id: 'nw', cursor: 'nwse-resize', style: { top: -5, left: -5 } },
  { id: 'n', cursor: 'ns-resize', style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'ne', cursor: 'nesw-resize', style: { top: -5, right: -5 } },
  { id: 'e', cursor: 'ew-resize', style: { top: '50%', right: -5, transform: 'translateY(-50%)' } },
  { id: 'se', cursor: 'nwse-resize', style: { bottom: -5, right: -5 } },
  { id: 's', cursor: 'ns-resize', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'sw', cursor: 'nesw-resize', style: { bottom: -5, left: -5 } },
  { id: 'w', cursor: 'ew-resize', style: { top: '50%', left: -5, transform: 'translateY(-50%)' } },
];
