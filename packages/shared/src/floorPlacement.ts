/** Floor-plan editor grid, in table grid units. */
export const FLOOR_PLAN_GRID_COLS = 24;
export const FLOOR_PLAN_GRID_ROWS = 16;
export const DEFAULT_TABLE_WIDTH = 2;
export const DEFAULT_TABLE_HEIGHT = 2;

export type FloorRect = {
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export function floorRectsOverlap(a: FloorRect, b: FloorRect): boolean {
  return (
    a.posX < b.posX + b.width &&
    b.posX < a.posX + a.width &&
    a.posY < b.posY + b.height &&
    b.posY < a.posY + a.height
  );
}

/**
 * Top-left-most grid cell where a `width`×`height` table fits without overlapping
 * `occupied`. Scans row by row inside `cols`; when the grid is full it keeps going
 * downward, so a spot is always returned.
 */
export function findFreeFloorSpot(
  occupied: FloorRect[],
  width = DEFAULT_TABLE_WIDTH,
  height = DEFAULT_TABLE_HEIGHT,
  cols = FLOOR_PLAN_GRID_COLS,
): { posX: number; posY: number } {
  const maxX = Math.max(0, Math.floor(cols - width));
  const bottom = occupied.reduce((max, r) => Math.max(max, r.posY + r.height), 0);
  const maxY = Math.ceil(bottom);
  for (let posY = 0; posY <= maxY; posY++) {
    for (let posX = 0; posX <= maxX; posX++) {
      const candidate = { posX, posY, width, height };
      if (!occupied.some((r) => floorRectsOverlap(candidate, r))) {
        return { posX, posY };
      }
    }
  }
  return { posX: 0, posY: maxY };
}
