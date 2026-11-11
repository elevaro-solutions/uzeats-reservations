import {
  DEFAULT_FLOOR_PLAN_SCALE,
  DEFAULT_TABLE_HEIGHT,
  DEFAULT_TABLE_WIDTH,
  findFreeFloorSpotNear,
  FLOOR_PLACEMENT_GAP,
  normalizeTableShape,
  type FloorFixtureKind,
  type FloorPlanAreaAppearance,
  type FloorPlanScale,
  type FloorRoom,
  type TableShape,
} from '@reservations/shared';

export type FloorTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea: string;
  combinable: boolean;
  active: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: TableShape;
  rotation: number;
  combineGroupId?: string | null;
  photoUrl?: string | null;
  requiresManualApproval?: boolean;
  depositRequired?: boolean;
  depositAmountCents?: number;
  /** When false, guests cannot pick this table in 3D. Default true. */
  virtualRoomSelectable?: boolean;
  /** When restaurant 3D fee applyTo is selected, only these tables incur the fee. */
  virtualRoomSelectionFeeEnabled?: boolean;
  /** Per-table unit fee override in cents. */
  virtualRoomSelectionFeeCents?: number | null;
};

export type FloorFixture = {
  id: string;
  name: string;
  kind: FloorFixtureKind;
  floorArea: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
};

export type FloorPlanSnapshot = {
  tables: FloorTable[];
  fixtures: FloorFixture[];
  rooms: FloorRoom[];
  backgroundUrl: string | null;
  backgroundColor: string | null;
  areaAppearances: FloorPlanAreaAppearance[];
  scale: FloorPlanScale;
};

export function cloneSnapshot(s: FloorPlanSnapshot): FloorPlanSnapshot {
  return {
    backgroundUrl: s.backgroundUrl,
    backgroundColor: s.backgroundColor,
    areaAppearances: s.areaAppearances.map((a) => ({ ...a })),
    scale: { ...s.scale },
    tables: s.tables.map((t) => ({ ...t })),
    fixtures: s.fixtures.map((f) => ({ ...f })),
    rooms: s.rooms.map((r) => ({
      ...r,
      points: r.points.map((p) => ({ ...p })),
    })),
  };
}

export function emptySnapshot(): FloorPlanSnapshot {
  return {
    tables: [],
    fixtures: [],
    rooms: [],
    backgroundUrl: null,
    backgroundColor: null,
    areaAppearances: [],
    scale: { ...DEFAULT_FLOOR_PLAN_SCALE },
  };
}

export function mapLoadedAreaAppearances(
  raw: FloorPlanAreaAppearance[] | null | undefined,
): FloorPlanAreaAppearance[] {
  if (!raw?.length) return [];
  return raw
    .filter((a) => a?.floorArea)
    .map((a) => ({
      floorArea: a.floorArea || 'Main',
      backgroundColor: a.backgroundColor ?? null,
      backgroundUrl: a.backgroundUrl ?? null,
      backgroundFit: a.backgroundFit ?? null,
      backgroundScale: a.backgroundScale ?? null,
      backgroundRotationDeg: a.backgroundRotationDeg ?? null,
    }));
}

export function mapLoadedTables(
  raw: Array<Partial<FloorTable> & { id: string; name: string }>,
): FloorTable[] {
  return raw.map((t) => ({
    id: t.id,
    name: t.name,
    minCapacity: t.minCapacity ?? 2,
    maxCapacity: t.maxCapacity ?? 4,
    floorArea: t.floorArea || 'Main',
    combinable: Boolean(t.combinable),
    active: t.active !== false,
    posX: t.posX ?? 0,
    posY: t.posY ?? 0,
    width: t.width || DEFAULT_TABLE_WIDTH,
    height: t.height || DEFAULT_TABLE_HEIGHT,
    shape: normalizeTableShape(t.shape),
    rotation: t.rotation ?? 0,
    combineGroupId: t.combineGroupId ?? null,
    photoUrl: t.photoUrl ?? null,
    requiresManualApproval: Boolean(t.requiresManualApproval),
    depositRequired: Boolean(t.depositRequired),
    depositAmountCents: t.depositAmountCents ?? 0,
    virtualRoomSelectable: t.virtualRoomSelectable !== false,
    virtualRoomSelectionFeeEnabled: Boolean(t.virtualRoomSelectionFeeEnabled),
    virtualRoomSelectionFeeCents:
      typeof t.virtualRoomSelectionFeeCents === 'number' ? t.virtualRoomSelectionFeeCents : null,
  }));
}

export function mapLoadedRooms(raw: FloorRoom[] | null | undefined): FloorRoom[] {
  if (!raw?.length) return [];
  return raw
    .filter((r) => r?.id && Array.isArray(r.points) && r.points.length >= 3)
    .map((r) => ({
      id: r.id,
      name: r.name || 'Room',
      floorArea: r.floorArea || 'Main',
      points: r.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })),
    }));
}

export function mapLoadedScale(
  raw: { unit?: string; unitsPerCell?: number } | null | undefined,
): FloorPlanScale {
  if (!raw || raw.unitsPerCell == null) return { ...DEFAULT_FLOOR_PLAN_SCALE };
  return {
    unit: raw.unit === 'm' ? 'm' : 'ft',
    unitsPerCell: Number(raw.unitsPerCell) || DEFAULT_FLOOR_PLAN_SCALE.unitsPerCell,
  };
}

export function applyDraftPositions(
  tables: FloorTable[],
  positions: Array<{
    id: string;
    posX: number;
    posY: number;
    width?: number | null;
    height?: number | null;
    shape?: string | null;
    rotation?: number | null;
    combineGroupId?: string | null;
  }>,
): FloorTable[] {
  if (!positions.length) return tables;
  const byId = new Map(positions.map((p) => [p.id, p]));
  return tables.map((t) => {
    const p = byId.get(t.id);
    if (!p) return t;
    return {
      ...t,
      posX: p.posX,
      posY: p.posY,
      width: p.width ?? t.width,
      height: p.height ?? t.height,
      shape: p.shape ? normalizeTableShape(p.shape) : t.shape,
      rotation: p.rotation ?? t.rotation,
      combineGroupId: p.combineGroupId !== undefined ? p.combineGroupId : t.combineGroupId,
    };
  });
}

export function nextTableName(tables: FloorTable[]): string {
  const used = new Set(tables.map((t) => t.name.toLowerCase()));
  let n = tables.length + 1;
  while (used.has(`t${n}`)) n += 1;
  return `T${n}`;
}

function sameArea(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a || 'Main').toLowerCase() === (b || 'Main').toLowerCase();
}

/** Tables and fixtures in `area`, as rotated rects for placement checks. */
export function occupiedInArea(
  area: string,
  tables: FloorTable[],
  fixtures: FloorFixture[],
): Array<{ posX: number; posY: number; width: number; height: number; rotation: number }> {
  return [...tables, ...fixtures]
    .filter((item) => sameArea(item.floorArea, area))
    .map((item) => ({
      posX: item.posX,
      posY: item.posY,
      width: item.width,
      height: item.height,
      rotation: item.rotation ?? 0,
    }));
}

/**
 * Spot for a copy of `source` next to it, inside the visible canvas. `null` when the area
 * has no free room left.
 */
export function duplicateTableLayout(
  source: FloorTable,
  tables: FloorTable[],
  fixtures: FloorFixture[],
  canvas: { cols: number; rows: number },
): Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'> | null {
  const occupied = occupiedInArea(source.floorArea, tables, fixtures);
  const spot = findFreeFloorSpotNear(source, occupied, {
    cols: canvas.cols,
    rows: canvas.rows,
    gap: FLOOR_PLACEMENT_GAP,
  });
  if (!spot) return null;
  return { ...spot, width: source.width, height: source.height };
}

const clampNum = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

/** Wrap into the schema's 0–360 range. */
const saveRotation = (deg: number | null | undefined) => {
  const n = (deg ?? 0) % 360;
  return n < 0 ? n + 360 : n;
};

/** Values the save schema accepts (sizes, names, ranges), so a draft save can't fail on input. */
export function toSaveInput(snapshot: FloorPlanSnapshot) {
  const raw = toRawSaveInput(snapshot);
  return {
    ...raw,
    fixtures: raw.fixtures.map((f) => ({
      ...f,
      name: (f.name.trim() || FIXTURE_DEFAULTS[f.kind]?.name || 'Fixture').slice(0, 60),
      posX: clampNum(f.posX, 0, 500),
      posY: clampNum(f.posY, 0, 500),
      width: clampNum(f.width, 0.25, 48),
      height: clampNum(f.height, 0.25, 48),
      rotation: saveRotation(f.rotation),
    })),
    rooms: raw.rooms
      .filter((r) => r.points.length >= 3)
      .map((r, i) => ({
        ...r,
        name: (r.name.trim() || `Room ${i + 1}`).slice(0, 60),
        points: r.points
          .slice(0, 40)
          .map((p) => ({ x: clampNum(p.x, 0, 500), y: clampNum(p.y, 0, 500) })),
      })),
    positions: raw.positions.map((p) => ({
      ...p,
      posX: clampNum(p.posX, 0, 500),
      posY: clampNum(p.posY, 0, 500),
      width: clampNum(p.width, 1, 24),
      height: clampNum(p.height, 1, 24),
      rotation: saveRotation(p.rotation),
    })),
    scale: {
      ...raw.scale,
      unitsPerCell: clampNum(raw.scale.unitsPerCell, 0.25, 50),
    },
  };
}

function toRawSaveInput(snapshot: FloorPlanSnapshot) {
  return {
    backgroundUrl: snapshot.backgroundUrl,
    backgroundColor: snapshot.backgroundColor,
    areaAppearances: snapshot.areaAppearances.map((a) => ({
      floorArea: a.floorArea,
      backgroundColor: a.backgroundColor ?? null,
      backgroundUrl: a.backgroundUrl ?? null,
      backgroundFit: a.backgroundFit ?? null,
      backgroundScale: a.backgroundScale ?? null,
      backgroundRotationDeg: a.backgroundRotationDeg ?? null,
    })),
    scale: snapshot.scale,
    fixtures: snapshot.fixtures.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      floorArea: f.floorArea,
      posX: f.posX,
      posY: f.posY,
      width: f.width,
      height: f.height,
      rotation: f.rotation,
    })),
    rooms: snapshot.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      floorArea: r.floorArea,
      points: r.points.map((p) => ({ x: p.x, y: p.y })),
    })),
    positions: snapshot.tables.map((t) => ({
      id: t.id,
      posX: t.posX,
      posY: t.posY,
      width: t.width,
      height: t.height,
      shape: t.shape,
      rotation: t.rotation ?? 0,
      combineGroupId: t.combineGroupId ?? null,
    })),
  };
}

export const FIXTURE_DEFAULTS: Record<
  FloorFixtureKind,
  { width: number; height: number; name: string }
> = {
  bar: { width: 6, height: 1.5, name: 'Bar' },
  host_stand: { width: 2, height: 1.5, name: 'Host' },
  kitchen: { width: 4, height: 2, name: 'Kitchen' },
  wall: { width: 6, height: 0.5, name: 'Wall' },
  door: { width: 1.5, height: 0.5, name: 'Door' },
  window: { width: 3, height: 0.4, name: 'Window' },
  plant: { width: 1, height: 1, name: 'Plant' },
  other: { width: 2, height: 2, name: 'Fixture' },
};

export function fixtureAddTip(kind: FloorFixtureKind): string {
  if (kind === 'window') return 'Place it along a wall. Guests see a window in the 3D room';
  if (kind === 'door') return 'Place it along a wall. Guests see a doorway in the 3D room';
  if (kind === 'wall') return 'A divider guests see as an interior wall in the 3D room';
  return `Add a ${FIXTURE_DEFAULTS[kind].name.toLowerCase()} to the floor`;
}

export function roomPathD(points: Array<{ x: number; y: number }>, cellSize: number): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first!.x * cellSize} ${first!.y * cellSize}`;
  for (const p of rest) d += ` L ${p.x * cellSize} ${p.y * cellSize}`;
  return `${d} Z`;
}
