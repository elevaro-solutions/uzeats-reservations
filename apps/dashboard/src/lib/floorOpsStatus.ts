export type FloorOpsStatus = 'free' | 'reserved' | 'seated' | 'turning';

export const FLOOR_OPS_STATUSES: FloorOpsStatus[] = ['free', 'reserved', 'seated', 'turning'];

/** Strong swatch per status — plan fills, 3D tints, legend, tags. */
export const FLOOR_OPS_STATUS_COLORS: Record<FloorOpsStatus, string> = {
  free: '#2e9e5b',
  reserved: '#e5a00d',
  seated: '#d64545',
  turning: '#2f6fed',
};

export const FLOOR_OPS_STATUS_LABELS: Record<FloorOpsStatus, string> = {
  free: 'Available',
  reserved: 'Reserved',
  seated: 'Seated',
  turning: 'Turning',
};

export function floorOpsStatusColor(status: string): string {
  return FLOOR_OPS_STATUS_COLORS[status as FloorOpsStatus] ?? FLOOR_OPS_STATUS_COLORS.free;
}

export function floorOpsStatusLabel(status: string): string {
  return FLOOR_OPS_STATUS_LABELS[status as FloorOpsStatus] ?? status;
}

export type FloorOpsTint = {
  /** Tile background */
  wash: string;
  /** Tabletop fill */
  body: string;
  /** Tabletop border + occupied chairs */
  line: string;
  /** Empty chairs on a busy table */
  emptyChair: string;
  /** Table name / text */
  accent: string;
};

const TINTS: Record<FloorOpsStatus, FloorOpsTint> = {
  free: {
    wash: '#e9f6ee',
    body: '#fbfefc',
    line: '#5cb883',
    emptyChair: '#5cb883',
    accent: '#1d6b41',
  },
  reserved: {
    wash: '#fdf3df',
    body: '#fffcf4',
    line: '#e9b44c',
    emptyChair: '#f4dca8',
    accent: '#8a5a00',
  },
  seated: {
    wash: '#fde9e9',
    body: '#fffafa',
    line: '#e57e7e',
    emptyChair: '#f5c4c4',
    accent: '#a82828',
  },
  turning: {
    wash: '#e8effd',
    body: '#fafcff',
    line: '#6d98f0',
    emptyChair: '#bfd1f8',
    accent: '#1f4fb8',
  },
};

export function floorOpsStatusTint(status: string): FloorOpsTint {
  return TINTS[status as FloorOpsStatus] ?? TINTS.free;
}

export type FloorChairSide = 'top' | 'right' | 'bottom' | 'left';

export type FloorChairDistribution = Record<FloorChairSide, number>;

export const MAX_FLOOR_CHAIRS = 12;

export function floorTableChairCount(maxCapacity: number): number {
  return Math.min(Math.max(Math.round(maxCapacity) || 0, 1), MAX_FLOOR_CHAIRS);
}

/** Banquet tables (7+ seats) span two grid columns in the Tables view. */
export function isBanquetTable(maxCapacity: number): boolean {
  return floorTableChairCount(maxCapacity) > 6;
}

/**
 * One chair per seat of `maxCapacity` (capped): 2-top → 1+1, 4-top → 2+2,
 * 6+ → long sides plus one chair at each end. Matches merchant mobile Cards.
 */
export function floorTableChairDistribution(maxCapacity: number): FloorChairDistribution {
  const n = floorTableChairCount(maxCapacity);
  if (n === 1) return { top: 1, bottom: 0, left: 0, right: 0 };
  if (n === 2) return { top: 1, bottom: 1, left: 0, right: 0 };
  if (n === 3) return { top: 1, bottom: 1, left: 1, right: 0 };
  if (n === 4) return { top: 2, bottom: 2, left: 0, right: 0 };
  if (n === 5) return { top: 2, bottom: 2, left: 1, right: 0 };
  const sides = n - 2;
  return {
    top: Math.ceil(sides / 2),
    bottom: Math.floor(sides / 2),
    left: 1,
    right: 1,
  };
}
