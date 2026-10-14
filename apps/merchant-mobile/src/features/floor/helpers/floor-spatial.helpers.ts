import type { FloorTableState } from "./floor.types";

export const SPATIAL_MIN_CELL = 32;
export const SPATIAL_MAX_CELL = 56;
export const SPATIAL_PAD_CELLS = 1;

export type FloorSpatialBounds = {
  minX: number;
  minY: number;
  cols: number;
  rows: number;
};

export type SpatialCornerRadii = {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
};

export type SpatialChairMetrics = {
  length: number;
  thickness: number;
  gap: number;
};

export function floorSpatialBounds(
  tables: FloorTableState[],
): FloorSpatialBounds {
  if (tables.length === 0) {
    return { minX: 0, minY: 0, cols: 8, rows: 6 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const row of tables) {
    const t = row.table;
    const x = t.posX ?? 0;
    const y = t.posY ?? 0;
    const w = t.width || 2;
    const h = t.height || 2;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  const pad = SPATIAL_PAD_CELLS;
  return {
    minX: minX - pad,
    minY: minY - pad,
    cols: Math.max(maxX - minX + pad * 2, 4),
    rows: Math.max(maxY - minY + pad * 2, 3),
  };
}

export function floorSpatialCellSize(
  availableWidth: number,
  cols: number,
): number {
  if (availableWidth <= 0 || cols <= 0) return 40;
  const ideal = availableWidth / cols;
  if (ideal >= SPATIAL_MIN_CELL) {
    return Math.min(Math.floor(ideal), SPATIAL_MAX_CELL);
  }
  return SPATIAL_MIN_CELL;
}

export function spatialChairMetrics(cell: number): SpatialChairMetrics {
  return {
    length: Math.round(clamp(cell * 0.5, 10, 18)),
    thickness: Math.round(clamp(cell * 0.16, 4, 7)),
    gap: Math.round(clamp(cell * 0.14, 2, 6)),
  };
}

export function spatialTableRadii(
  shape: string | null | undefined,
  size: number,
): SpatialCornerRadii {
  const all = (value: number): SpatialCornerRadii => ({
    borderTopLeftRadius: value,
    borderTopRightRadius: value,
    borderBottomLeftRadius: value,
    borderBottomRightRadius: value,
  });

  switch (shape) {
    case "round":
    case "plant":
      return all(size / 2);
    case "booth":
      return {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
      };
    case "banquette":
      return {
        borderTopLeftRadius: 5,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 16,
      };
    case "bar":
      return all(999);
    case "high_top":
      return all(4);
    case "communal":
      return all(4);
    default:
      return all(8);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
