export const FLOOR_GRID_COLS = 24;
export const FLOOR_GRID_ROWS = 16;
export const DEFAULT_CELL_SIZE = 40;
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
  if (containerWidth <= 0) return DEFAULT_CELL_SIZE;
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(containerWidth / cols)));
}

/** Tight grid for one floor area so rooms with overlapping coordinates don’t share a canvas. */
export function areaGridBounds(tables: TableLayout[]) {
  if (tables.length === 0) {
    return { minX: 0, minY: 0, cols: 8, rows: 4 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  for (const t of tables) {
    minX = Math.min(minX, t.posX);
    minY = Math.min(minY, t.posY);
    maxX = Math.max(maxX, t.posX + t.width);
    maxY = Math.max(maxY, t.posY + t.height);
  }
  return {
    minX,
    minY,
    cols: Math.max(maxX - minX, 4),
    rows: Math.max(maxY - minY, 4),
  };
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

/** Wrap degrees into [0, 360). */
export function normalizeRotation(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

export function pointerAngleDeg(centerX: number, centerY: number, x: number, y: number): number {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

export function applyFreeRotation(
  origRotation: number,
  startAngle: number,
  currentAngle: number,
  snapDeg?: number,
): number {
  let next = origRotation + (currentAngle - startAngle);
  if (snapDeg && snapDeg > 0) next = Math.round(next / snapDeg) * snapDeg;
  return normalizeRotation(next);
}

/** Convert a screen-space pixel delta into the table's local (unrotated) space. */
export function screenDeltaToLocal(dx: number, dy: number, rotationDeg: number): { dx: number; dy: number } {
  const rad = (-rotationDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { dx: dx * c - dy * s, dy: dx * s + dy * c };
}

export function tableCenterPx(
  layout: TableLayout,
  cellSize: number,
): { x: number; y: number } {
  return {
    x: layout.posX * cellSize + (layout.width * cellSize) / 2,
    y: layout.posY * cellSize + (layout.height * cellSize) / 2,
  };
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
