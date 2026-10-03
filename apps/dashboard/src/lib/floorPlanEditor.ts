import {
  DEFAULT_FLOOR_PLAN_SCALE,
  DEFAULT_TABLE_HEIGHT,
  DEFAULT_TABLE_WIDTH,
  findFreeFloorSpot,
  FLOOR_PLAN_GRID_COLS,
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

export function duplicateTableLayout(
  source: FloorTable,
  tables: FloorTable[],
): Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'> {
  const areaKey = (source.floorArea || 'Main').toLowerCase();
  const occupied = tables
    .filter((t) => (t.floorArea || 'Main').toLowerCase() === areaKey)
    .map((t) => ({
      posX: t.posX,
      posY: t.posY,
      width: t.width,
      height: t.height,
    }));
  const right = {
    posX: source.posX + source.width,
    posY: source.posY,
    width: source.width,
    height: source.height,
  };
  const freeRight = !occupied.some(
    (o) =>
      right.posX < o.posX + o.width &&
      o.posX < right.posX + right.width &&
      right.posY < o.posY + o.height &&
      o.posY < right.posY + right.height,
  );
  if (freeRight && right.posX + right.width <= FLOOR_PLAN_GRID_COLS) {
    return { posX: right.posX, posY: right.posY, width: source.width, height: source.height };
  }
  const spot = findFreeFloorSpot(occupied, source.width, source.height, FLOOR_PLAN_GRID_COLS);
  return { ...spot, width: source.width, height: source.height };
}

export function toSaveInput(snapshot: FloorPlanSnapshot) {
  return {
    backgroundUrl: snapshot.backgroundUrl,
    backgroundColor: snapshot.backgroundColor,
    areaAppearances: snapshot.areaAppearances.map((a) => ({
      floorArea: a.floorArea,
      backgroundColor: a.backgroundColor ?? null,
      backgroundUrl: a.backgroundUrl ?? null,
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
  plant: { width: 1, height: 1, name: 'Plant' },
  other: { width: 2, height: 2, name: 'Fixture' },
};

export function roomPathD(points: Array<{ x: number; y: number }>, cellSize: number): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first!.x * cellSize} ${first!.y * cellSize}`;
  for (const p of rest) d += ` L ${p.x * cellSize} ${p.y * cellSize}`;
  return `${d} Z`;
}
