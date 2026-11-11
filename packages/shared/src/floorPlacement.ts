import {
  floorRectsOverlap,
  floorRectsOverlapRotated,
  rotatedFloorRectBounds,
  type FloorRectLike,
  type RotatedFloorRectLike,
} from './floorPlan.js';

/** Floor-plan editor grid, in table grid units. */
export const FLOOR_PLAN_GRID_COLS = 24;
export const FLOOR_PLAN_GRID_ROWS = 16;
export const DEFAULT_TABLE_WIDTH = 2;
export const DEFAULT_TABLE_HEIGHT = 2;
/** Cells kept free around a newly placed table so chairs don't collide. */
export const FLOOR_PLACEMENT_GAP = 1;

export type FloorRect = FloorRectLike;

export { floorRectsOverlap };

function inflate(r: RotatedFloorRectLike, gap: number): RotatedFloorRectLike {
  if (gap <= 0) return r;
  return {
    posX: r.posX - gap,
    posY: r.posY - gap,
    width: r.width + gap * 2,
    height: r.height + gap * 2,
    rotation: r.rotation,
  };
}

function collides(candidate: RotatedFloorRectLike, occupied: RotatedFloorRectLike[], gap: number) {
  const padded = inflate(candidate, gap);
  return occupied.some((r) => floorRectsOverlapRotated(padded, r));
}

/**
 * Top-left-most grid cell where a `width`×`height` table fits without overlapping
 * `occupied`. Scans row by row inside `cols` (and `rows` when given). When nothing fits
 * it keeps going downward, so a spot is always returned.
 */
export function findFreeFloorSpot(
  occupied: RotatedFloorRectLike[],
  width = DEFAULT_TABLE_WIDTH,
  height = DEFAULT_TABLE_HEIGHT,
  cols = FLOOR_PLAN_GRID_COLS,
  options: { rows?: number; gap?: number } = {},
): { posX: number; posY: number } {
  const gap = options.gap ?? 0;
  const maxX = Math.max(0, Math.floor(cols - width));
  const bottom = occupied.reduce((max, r) => {
    const b = rotatedFloorRectBounds(r);
    return Math.max(max, b.posY + b.height);
  }, 0);
  const maxY =
    options.rows != null
      ? Math.max(0, Math.floor(options.rows - height))
      : Math.ceil(bottom + gap);
  for (let posY = 0; posY <= maxY; posY++) {
    for (let posX = 0; posX <= maxX; posX++) {
      if (!collides({ posX, posY, width, height }, occupied, gap)) {
        return { posX, posY };
      }
    }
  }
  return { posX: 0, posY: Math.ceil(bottom + gap) };
}

export type NearSpotOptions = {
  cols: number;
  rows: number;
  /** Size of the new item; defaults to the source size. */
  width?: number;
  height?: number;
  /** Rotation of the new item; defaults to the source rotation. */
  rotation?: number | null;
  gap?: number;
};

/**
 * Free spot as close as possible to `source`, inside `cols`×`rows` (rotated extent included).
 * Tries directly below, right, left, then above the source, then the nearest free cell.
 * Returns `null` when nothing fits on the canvas.
 */
export function findFreeFloorSpotNear(
  source: RotatedFloorRectLike,
  occupied: RotatedFloorRectLike[],
  options: NearSpotOptions,
): { posX: number; posY: number } | null {
  const width = options.width ?? source.width;
  const height = options.height ?? source.height;
  const rotation = options.rotation ?? source.rotation ?? 0;
  const gap = options.gap ?? FLOOR_PLACEMENT_GAP;
  const { cols, rows } = options;

  const probe = rotatedFloorRectBounds({ posX: 0, posY: 0, width, height, rotation });
  const offsetX = -probe.posX;
  const offsetY = -probe.posY;

  const fits = (posX: number, posY: number) => {
    if (posX < 0 || posY < 0) return false;
    const candidate = { posX, posY, width, height, rotation };
    const b = rotatedFloorRectBounds(candidate);
    if (b.posX < -1e-6 || b.posY < -1e-6) return false;
    if (b.posX + b.width > cols + 1e-6 || b.posY + b.height > rows + 1e-6) return false;
    return !collides(candidate, occupied, gap);
  };

  const src = rotatedFloorRectBounds(source);
  const srcCenterX = src.posX + src.width / 2;
  const srcCenterY = src.posY + src.height / 2;
  const boxLeftForCenter = srcCenterX - probe.width / 2;
  const boxTopForCenter = srcCenterY - probe.height / 2;
  const directional: Array<[number, number]> = [
    [boxLeftForCenter, src.posY + src.height + gap],
    [src.posX + src.width + gap, boxTopForCenter],
    [src.posX - gap - probe.width, boxTopForCenter],
    [boxLeftForCenter, src.posY - gap - probe.height],
  ];
  for (const [boxX, boxY] of directional) {
    const posX = Math.round((boxX + offsetX) * 2) / 2;
    const posY = Math.round((boxY + offsetY) * 2) / 2;
    if (fits(posX, posY)) return { posX, posY };
  }

  let best: { posX: number; posY: number; dist: number } | null = null;
  for (let posY = 0; posY <= Math.floor(rows); posY++) {
    for (let posX = 0; posX <= Math.floor(cols); posX++) {
      const cx = posX + width / 2;
      const cy = posY + height / 2;
      const dist = (cx - srcCenterX) ** 2 + (cy - srcCenterY) ** 2;
      if (best && dist >= best.dist) continue;
      if (fits(posX, posY)) best = { posX, posY, dist };
    }
  }
  return best ? { posX: best.posX, posY: best.posY } : null;
}
