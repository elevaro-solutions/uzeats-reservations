import {
  DEFAULT_FLOOR_PLAN_BACKGROUND_COLOR,
  rotatedFloorRectBounds,
  type TableShape,
} from '@reservations/shared';
import type { CSSProperties } from 'react';

export const FLOOR_GRID_COLS = 24;
export const FLOOR_GRID_ROWS = 16;
export const DEFAULT_CELL_SIZE = 40;
export const MIN_CELL_SIZE = 18;
export const MAX_CELL_SIZE = 52;

/** Resolve canvas fill; null/empty → default light gray. */
export function resolveFloorBackgroundColor(color: string | null | undefined): string {
  return color?.trim() || DEFAULT_FLOOR_PLAN_BACKGROUND_COLOR;
}

/** Grid line color that stays visible on light or dark canvas fills. */
export function floorGridLineColor(backgroundColor: string | null | undefined): string {
  const hex = resolveFloorBackgroundColor(backgroundColor).replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(0, 6);
  if (full.length !== 6) return 'rgba(0,0,0,0.08)';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
}

/** CSS border-radius for each table shape. */
export function shapeBorderRadius(shape: string | undefined): string | number {
  switch (shape as TableShape) {
    case 'round':
      return '50%';
    case 'booth':
      return '14px 14px 5px 5px';
    case 'banquette':
      return '5px 18px 18px 5px';
    case 'high_top':
      return 4;
    case 'communal':
      return 3;
    case 'bar':
      return 999;
    case 'rect':
    default:
      return 6;
  }
}

export function shapeAccent(shape: string | undefined): string | undefined {
  switch (shape as TableShape) {
    case 'booth':
      return 'inset 0 10px 0 rgba(11, 61, 46, 0.22)';
    case 'banquette':
      return 'inset 8px 0 0 rgba(11, 61, 46, 0.2)';
    case 'high_top':
      return 'inset 0 0 0 3px rgba(11, 61, 46, 0.18)';
    case 'communal':
      return 'inset 0 0 0 1px rgba(11, 61, 46, 0.25)';
    case 'bar':
      return 'inset 0 0 0 1px rgba(11, 61, 46, 0.15)';
    default:
      return undefined;
  }
}

/** Extra visual cues so shapes read clearly on the canvas (not just border-radius). */
export function shapeCanvasExtras(
  shape: string | undefined,
  cellSize: number,
): { style?: CSSProperties; overlay?: CSSProperties[] } {
  const band = Math.max(4, Math.round(cellSize * 0.18));
  switch (shape as TableShape) {
    case 'booth':
      return {
        overlay: [
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: band + 2,
            background: 'rgba(11, 61, 46, 0.28)',
            borderRadius: '14px 14px 0 0',
            pointerEvents: 'none',
          },
        ],
      };
    case 'banquette':
      return {
        overlay: [
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: band + 2,
            background: 'rgba(11, 61, 46, 0.28)',
            borderRadius: '5px 0 0 5px',
            pointerEvents: 'none',
          },
        ],
      };
    case 'high_top': {
      // Pedestal cue sits along the bottom edge so center labels stay clear.
      const pedestal = Math.max(8, Math.round(cellSize * 0.32));
      return {
        overlay: [
          {
            position: 'absolute',
            bottom: Math.max(3, Math.round(cellSize * 0.08)),
            left: '50%',
            width: pedestal,
            height: pedestal,
            marginLeft: -pedestal / 2,
            borderRadius: '50%',
            background: 'rgba(11, 61, 46, 0.18)',
            border: '2px solid rgba(11, 61, 46, 0.35)',
            pointerEvents: 'none',
          },
        ],
      };
    }
    case 'communal': {
      // Short divider ticks at the top/bottom only — not through the label zone.
      const tickH = Math.max(6, Math.round(cellSize * 0.22));
      const ticks = [0.28, 0.5, 0.72].flatMap((pct) => [
        {
          position: 'absolute' as const,
          top: 4,
          left: `${pct * 100}%`,
          width: 1,
          height: tickH,
          background: 'rgba(11, 61, 46, 0.28)',
          pointerEvents: 'none' as const,
        },
        {
          position: 'absolute' as const,
          bottom: 4,
          left: `${pct * 100}%`,
          width: 1,
          height: tickH,
          background: 'rgba(11, 61, 46, 0.28)',
          pointerEvents: 'none' as const,
        },
      ]);
      return {
        style: { borderStyle: 'dashed' as const },
        overlay: ticks,
      };
    }
    case 'bar': {
      // Seat dots along the bottom rail, clear of centered labels.
      const dot = Math.max(4, Math.round(cellSize * 0.14));
      return {
        style: { borderRadius: 999 },
        overlay: [0.25, 0.5, 0.75].map((pct) => ({
          position: 'absolute' as const,
          bottom: Math.max(3, Math.round(cellSize * 0.1)),
          left: `${pct * 100}%`,
          width: dot,
          height: dot,
          marginLeft: -dot / 2,
          borderRadius: '50%',
          background: 'rgba(11, 61, 46, 0.4)',
          pointerEvents: 'none' as const,
        })),
      };
    }
    default:
      return {};
  }
}

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

/** Largest table/fixture side the save schema accepts, in grid cells. */
export const MAX_ITEM_CELLS = 24;

function clampAxis(pos: number, size: number, half: number, limit: number): number {
  const center = pos + size / 2;
  const clamped = half * 2 >= limit ? limit / 2 : Math.min(Math.max(center, half), limit - half);
  // Positions stay >= 0 for the save schema, so a turned item may sit slightly off the top/left edge.
  return Math.max(0, clamped - size / 2);
}

/**
 * Move by (dx, dy) and keep the item's rotated footprint inside `cols`×`rows`.
 * With no rotation this is the plain axis-aligned clamp.
 */
export function clampMove(
  layout: TableLayout,
  dx: number,
  dy: number,
  cols = FLOOR_GRID_COLS,
  rows = FLOOR_GRID_ROWS,
  rotation = 0,
): TableLayout {
  const bounds = rotatedFloorRectBounds({ ...layout, rotation });
  const posX = clampAxis(layout.posX + dx, layout.width, bounds.width / 2, cols);
  const posY = clampAxis(layout.posY + dy, layout.height, bounds.height / 2, rows);
  return { ...layout, posX, posY };
}

export function clampLayout(
  layout: TableLayout,
  cols = FLOOR_GRID_COLS,
  rows = FLOOR_GRID_ROWS,
  rotation = 0,
): TableLayout {
  const width = Math.min(Math.max(layout.width, 1), cols - layout.posX, MAX_ITEM_CELLS);
  const height = Math.min(Math.max(layout.height, 1), rows - layout.posY, MAX_ITEM_CELLS);
  return clampMove({ posX: layout.posX, posY: layout.posY, width, height }, 0, 0, cols, rows, rotation);
}

/** Wrap degrees into [0, 360). */
export function normalizeRotation(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

export function pointerAngleDeg(centerX: number, centerY: number, x: number, y: number): number {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

/** Free rotation within this many degrees of a right angle snaps to it. */
export const RIGHT_ANGLE_MAGNET_DEG = 6;

/**
 * Rotation from a pointer drag. With `snapDeg`, steps by that amount; otherwise angles close to
 * 0/90/180/270 snap onto them so tables don't end up a few degrees crooked.
 */
export function applyFreeRotation(
  origRotation: number,
  startAngle: number,
  currentAngle: number,
  snapDeg?: number,
): number {
  let next = origRotation + (currentAngle - startAngle);
  if (snapDeg && snapDeg > 0) {
    next = Math.round(next / snapDeg) * snapDeg;
  } else {
    const nearest = Math.round(next / 90) * 90;
    if (Math.abs(next - nearest) <= RIGHT_ANGLE_MAGNET_DEG) next = nearest;
  }
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
  if (width > MAX_ITEM_CELLS) {
    if (handle.includes('w')) posX += width - MAX_ITEM_CELLS;
    width = MAX_ITEM_CELLS;
  }
  if (height > MAX_ITEM_CELLS) {
    if (handle.includes('n')) posY += height - MAX_ITEM_CELLS;
    height = MAX_ITEM_CELLS;
  }

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

/**
 * Sit above the box (not inside it) so short walls/tables still show a usable rotate control.
 */
export const floorPlanRotateHandleStyle: CSSProperties = {
  position: 'absolute',
  top: -28,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 22,
  height: 22,
  borderRadius: 11,
  border: '2px solid #fff',
  background: '#0b3d2e',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
  zIndex: 3,
  padding: 0,
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
