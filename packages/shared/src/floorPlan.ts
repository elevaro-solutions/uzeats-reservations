/**
 * Built-in table shape keys (seeded into TableShapeDef).
 * Custom shapes may use any key matching TABLE_SHAPE_KEY_RE.
 */
export const DEFAULT_TABLE_SHAPES = [
  'rect',
  'round',
  'booth',
  'banquette',
  'high_top',
  'communal',
  'bar',
] as const;

/** @deprecated Prefer DEFAULT_TABLE_SHAPES — kept for existing imports. */
export const TABLE_SHAPES = DEFAULT_TABLE_SHAPES;

/** Canvas silhouette presets (border-radius / overlays). */
export const TABLE_SHAPE_RENDER_PRESETS = DEFAULT_TABLE_SHAPES;

export type TableShapeRenderPreset = (typeof TABLE_SHAPE_RENDER_PRESETS)[number];

/** Any persisted shape key (built-in or custom). */
export type TableShape = string;

export type BuiltinTableShape = (typeof DEFAULT_TABLE_SHAPES)[number];

export const TABLE_SHAPE_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

export const TABLE_SHAPE_LABELS: Record<BuiltinTableShape, string> = {
  rect: 'Rectangle',
  round: 'Round',
  booth: 'Booth',
  banquette: 'Banquette',
  high_top: 'High-top',
  communal: 'Communal',
  bar: 'Bar seat',
};

export function isTableShapeRenderPreset(value: string): value is TableShapeRenderPreset {
  return (TABLE_SHAPE_RENDER_PRESETS as readonly string[]).includes(value);
}

export function isBuiltinTableShape(value: string): value is BuiltinTableShape {
  return (DEFAULT_TABLE_SHAPES as readonly string[]).includes(value);
}

/** @deprecated Prefer isBuiltinTableShape / TABLE_SHAPE_KEY_RE for custom keys. */
export function isTableShape(value: string): boolean {
  return TABLE_SHAPE_KEY_RE.test(value);
}

/** Normalize a shape key for persistence; unknown/empty → rect. */
export function normalizeTableShape(value: string | null | undefined): TableShape {
  if (!value) return 'rect';
  const key = value.trim().toLowerCase();
  return TABLE_SHAPE_KEY_RE.test(key) ? key : 'rect';
}

export function tableShapeLabel(key: string, labels?: Record<string, string> | null): string {
  if (labels?.[key]) return labels[key]!;
  if (isBuiltinTableShape(key)) return TABLE_SHAPE_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Non-bookable venue objects on the floor plan. */
export const FLOOR_FIXTURE_KINDS = [
  'bar',
  'host_stand',
  'kitchen',
  'wall',
  'door',
  'window',
  'plant',
  'other',
] as const;

export type FloorFixtureKind = (typeof FLOOR_FIXTURE_KINDS)[number];

export const FLOOR_FIXTURE_LABELS: Record<FloorFixtureKind, string> = {
  bar: 'Bar',
  host_stand: 'Host stand',
  kitchen: 'Kitchen',
  wall: 'Wall',
  door: 'Door',
  window: 'Window',
  plant: 'Plant',
  other: 'Fixture',
};

export function isFloorFixtureKind(value: string): value is FloorFixtureKind {
  return (FLOOR_FIXTURE_KINDS as readonly string[]).includes(value);
}

export type FloorRectLike = {
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type AlignmentGuide = {
  orientation: 'vertical' | 'horizontal';
  /** Grid coordinate of the guide line. */
  at: number;
  /** Which edges produced this guide. */
  kind: 'edge' | 'center';
};

const GUIDE_EPS = 0.01;

function rectEdges(r: FloorRectLike) {
  return {
    left: r.posX,
    right: r.posX + r.width,
    top: r.posY,
    bottom: r.posY + r.height,
    centerX: r.posX + r.width / 2,
    centerY: r.posY + r.height / 2,
  };
}

/** Axis-aligned overlap (rotation ignored — same as placement). */
export function floorRectsOverlap(a: FloorRectLike, b: FloorRectLike): boolean {
  return (
    a.posX < b.posX + b.width &&
    b.posX < a.posX + a.width &&
    a.posY < b.posY + b.height &&
    b.posY < a.posY + a.height
  );
}

export function findOverlappingIds(
  items: Array<FloorRectLike & { id: string }>,
): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (floorRectsOverlap(items[i]!, items[j]!)) {
        overlapping.add(items[i]!.id);
        overlapping.add(items[j]!.id);
      }
    }
  }
  return overlapping;
}

/**
 * Snap a moving rect toward nearby edges/centers of `others` and return
 * guides for the UI. `threshold` is in grid cells.
 */
export function snapWithAlignmentGuides(
  moving: FloorRectLike,
  others: FloorRectLike[],
  threshold = 0.35,
): { layout: FloorRectLike; guides: AlignmentGuide[] } {
  const m = rectEdges(moving);
  let posX = moving.posX;
  let posY = moving.posY;
  const guides: AlignmentGuide[] = [];

  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  let guideX: AlignmentGuide | null = null;
  let guideY: AlignmentGuide | null = null;

  for (const other of others) {
    const o = rectEdges(other);
    const xCandidates: Array<{ delta: number; at: number; kind: 'edge' | 'center' }> = [
      { delta: o.left - m.left, at: o.left, kind: 'edge' },
      { delta: o.right - m.right, at: o.right, kind: 'edge' },
      { delta: o.left - m.right, at: o.left, kind: 'edge' },
      { delta: o.right - m.left, at: o.right, kind: 'edge' },
      { delta: o.centerX - m.centerX, at: o.centerX, kind: 'center' },
    ];
    for (const c of xCandidates) {
      const abs = Math.abs(c.delta);
      if (abs <= threshold && abs < bestDx - GUIDE_EPS) {
        bestDx = abs;
        posX = moving.posX + c.delta;
        guideX = { orientation: 'vertical', at: c.at, kind: c.kind };
      }
    }

    const yCandidates: Array<{ delta: number; at: number; kind: 'edge' | 'center' }> = [
      { delta: o.top - m.top, at: o.top, kind: 'edge' },
      { delta: o.bottom - m.bottom, at: o.bottom, kind: 'edge' },
      { delta: o.top - m.bottom, at: o.top, kind: 'edge' },
      { delta: o.bottom - m.top, at: o.bottom, kind: 'edge' },
      { delta: o.centerY - m.centerY, at: o.centerY, kind: 'center' },
    ];
    for (const c of yCandidates) {
      const abs = Math.abs(c.delta);
      if (abs <= threshold && abs < bestDy - GUIDE_EPS) {
        bestDy = abs;
        posY = moving.posY + c.delta;
        guideY = { orientation: 'horizontal', at: c.at, kind: c.kind };
      }
    }
  }

  if (guideX) guides.push(guideX);
  if (guideY) guides.push(guideY);

  return {
    layout: { ...moving, posX, posY },
    guides,
  };
}

/** Simple undo/redo stack. */
export class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(
    private present: T,
    private readonly limit = 50,
  ) {}

  get current(): T {
    return this.present;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  push(next: T) {
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
  }

  replace(next: T) {
    this.present = next;
  }

  undo(): T | null {
    const prev = this.past.pop();
    if (prev == null) return null;
    this.future.push(this.present);
    this.present = prev;
    return this.present;
  }

  redo(): T | null {
    const next = this.future.pop();
    if (next == null) return null;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }

  reset(next: T) {
    this.present = next;
    this.past = [];
    this.future = [];
  }
}

export function newCombineGroupId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newFixtureId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newRoomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type FloorPlanScaleUnit = 'ft' | 'm';

export type FloorPlanScale = {
  unit: FloorPlanScaleUnit;
  /** Real-world length of one grid cell. */
  unitsPerCell: number;
};

export const DEFAULT_FLOOR_PLAN_SCALE: FloorPlanScale = {
  unit: 'ft',
  unitsPerCell: 2,
};

/** Where table name/capacity text sits relative to the shape on the canvas. */
export const TABLE_SHAPE_LABEL_POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'outside_top',
  'outside_bottom',
  'outside_left',
  'outside_right',
] as const;

export type TableShapeLabelPosition = (typeof TABLE_SHAPE_LABEL_POSITIONS)[number];

export const TABLE_SHAPE_LABEL_POSITION_LABELS: Record<TableShapeLabelPosition, string> = {
  center: 'Center (inside)',
  top: 'Inside top',
  bottom: 'Inside bottom',
  left: 'Inside left',
  right: 'Inside right',
  outside_top: 'Outside top',
  outside_bottom: 'Outside bottom',
  outside_left: 'Outside left',
  outside_right: 'Outside right',
};

export function isOutsideTableShapeLabelPosition(value: string): boolean {
  return value.startsWith('outside_');
}

export const DEFAULT_TABLE_SHAPE_LABEL_POSITION: TableShapeLabelPosition = 'center';

/** Multiplier for name/capacity font size on the floor plan (1 = default). */
export const DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE = 1;
export const MIN_TABLE_SHAPE_LABEL_FONT_SCALE = 0.6;
export const MAX_TABLE_SHAPE_LABEL_FONT_SCALE = 1.8;

export function isTableShapeLabelPosition(value: string): value is TableShapeLabelPosition {
  return (TABLE_SHAPE_LABEL_POSITIONS as readonly string[]).includes(value);
}

export function normalizeTableShapeLabelPosition(
  value: string | null | undefined,
): TableShapeLabelPosition {
  return value && isTableShapeLabelPosition(value) ? value : DEFAULT_TABLE_SHAPE_LABEL_POSITION;
}

export function normalizeTableShapeLabelFontScale(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE;
  return Math.min(
    MAX_TABLE_SHAPE_LABEL_FONT_SCALE,
    Math.max(MIN_TABLE_SHAPE_LABEL_FONT_SCALE, Math.round(n * 100) / 100),
  );
}

/** Default canvas fill when no custom background color is set. */
export const DEFAULT_FLOOR_PLAN_BACKGROUND_COLOR = '#fafafa';

/** Suggested floor/canvas colors for the layout editor. */
export const FLOOR_PLAN_BACKGROUND_COLOR_PRESETS = [
  { label: 'Light gray', color: '#fafafa' },
  { label: 'Warm cream', color: '#f5f0e8' },
  { label: 'Soft wood', color: '#e8d9c5' },
  { label: 'Cool stone', color: '#e8eef2' },
  { label: 'Sage', color: '#e4efe8' },
  { label: 'Slate', color: '#dfe3e8' },
  { label: 'Charcoal', color: '#3f3f46' },
  { label: 'White', color: '#ffffff' },
] as const;

/** Per-floor-area canvas underlay (color / image). */
export type FloorPlanAreaAppearance = {
  floorArea: string;
  backgroundColor?: string | null;
  backgroundUrl?: string | null;
};

/**
 * Resolve canvas underlay for one floor area.
 * Area-specific entries win; otherwise fall back to restaurant-level defaults.
 */
export function resolveFloorAreaAppearance(
  floorArea: string,
  appearances: FloorPlanAreaAppearance[] | null | undefined,
  fallback: {
    backgroundColor?: string | null;
    backgroundUrl?: string | null;
  } = {},
): { backgroundColor: string | null; backgroundUrl: string | null } {
  const key = (floorArea || 'Main').trim().toLowerCase();
  const match = (appearances ?? []).find(
    (a) => (a.floorArea || 'Main').trim().toLowerCase() === key,
  );
  if (!match) {
    return {
      backgroundColor: fallback.backgroundColor ?? null,
      backgroundUrl: fallback.backgroundUrl ?? null,
    };
  }
  return {
    backgroundColor:
      match.backgroundColor !== undefined
        ? match.backgroundColor
        : (fallback.backgroundColor ?? null),
    backgroundUrl:
      match.backgroundUrl !== undefined
        ? match.backgroundUrl
        : (fallback.backgroundUrl ?? null),
  };
}

/** Upsert one area appearance (null color/url = explicit default for that area). */
export function upsertFloorAreaAppearance(
  appearances: FloorPlanAreaAppearance[] | null | undefined,
  next: FloorPlanAreaAppearance,
): FloorPlanAreaAppearance[] {
  const floorArea = (next.floorArea || 'Main').trim() || 'Main';
  const rest = (appearances ?? []).filter(
    (a) => (a.floorArea || 'Main').trim().toLowerCase() !== floorArea.toLowerCase(),
  );
  return [
    ...rest,
    {
      floorArea,
      backgroundColor: next.backgroundColor ?? null,
      backgroundUrl: next.backgroundUrl ?? null,
    },
  ];
}

export type FloorRoomPoint = { x: number; y: number };

export type FloorRoom = {
  id: string;
  name: string;
  floorArea: string;
  /** Polygon vertices in grid units (closed implicitly). */
  points: FloorRoomPoint[];
};

export function rectsIntersect(
  a: FloorRectLike,
  b: FloorRectLike,
): boolean {
  return floorRectsOverlap(a, b);
}

/** Select item ids whose axis-aligned bounds intersect the marquee rect. */
export function idsInMarquee(
  items: Array<FloorRectLike & { id: string }>,
  marquee: FloorRectLike,
): string[] {
  const norm = {
    posX: Math.min(marquee.posX, marquee.posX + marquee.width),
    posY: Math.min(marquee.posY, marquee.posY + marquee.height),
    width: Math.abs(marquee.width),
    height: Math.abs(marquee.height),
  };
  if (norm.width < 0.05 || norm.height < 0.05) return [];
  return items.filter((item) => floorRectsOverlap(item, norm)).map((item) => item.id);
}

export function formatCellLength(scale: FloorPlanScale, cells: number): string {
  const value = Math.round(cells * scale.unitsPerCell * 10) / 10;
  return `${value} ${scale.unit}`;
}

export type FloorLayoutTemplateId =
  | 'grid_rows'
  | 'bistro_pairs'
  | 'patio_terrace'
  | 'banquet_u'
  | 'bar_rail';

export const FLOOR_LAYOUT_TEMPLATES: Array<{
  id: FloorLayoutTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: 'grid_rows',
    label: 'Grid rows',
    description: 'Even rows of tables left-to-right',
  },
  {
    id: 'bistro_pairs',
    label: 'Bistro pairs',
    description: 'Two-across pairs with aisle gaps',
  },
  {
    id: 'patio_terrace',
    label: 'Patio terrace',
    description: 'Single row facing the edge',
  },
  {
    id: 'banquet_u',
    label: 'Banquet U',
    description: 'U-shaped arrangement for events',
  },
  {
    id: 'bar_rail',
    label: 'Bar rail',
    description: 'Single line along the top (bar seating)',
  },
];

export type TemplateTable = FloorRectLike & {
  id: string;
  floorArea?: string;
};

/**
 * Reposition existing tables into a named template within one floor area.
 * Returns only layout patches (pos/rotation); sizes are preserved.
 */
export function applyFloorLayoutTemplate(
  tables: TemplateTable[],
  templateId: FloorLayoutTemplateId,
): Array<{ id: string; posX: number; posY: number; rotation: number }> {
  if (tables.length === 0) return [];
  const ordered = [...tables];

  switch (templateId) {
    case 'patio_terrace': {
      let x = 0;
      return ordered.map((t) => {
        const patch = { id: t.id, posX: x, posY: 0, rotation: 0 };
        x += t.width + 1;
        return patch;
      });
    }
    case 'bar_rail': {
      let x = 0;
      return ordered.map((t) => {
        const patch = { id: t.id, posX: x, posY: 0, rotation: 0 };
        x += Math.max(t.width, 1) + 0.5;
        return patch;
      });
    }
    case 'bistro_pairs': {
      return ordered.map((t, i) => {
        const pair = Math.floor(i / 2);
        const col = i % 2;
        const row = pair;
        return {
          id: t.id,
          posX: col * (t.width + 2),
          posY: row * (t.height + 1),
          rotation: 0,
        };
      });
    }
    case 'banquet_u': {
      const n = ordered.length;
      const side = Math.max(1, Math.ceil(n / 3));
      return ordered.map((t, i) => {
        if (i < side) {
          return { id: t.id, posX: 0, posY: i * (t.height + 0.5), rotation: 90 };
        }
        if (i < side * 2) {
          const j = i - side;
          return { id: t.id, posX: 2 + j * (t.width + 0.5), posY: side * (t.height + 0.5), rotation: 0 };
        }
        const j = i - side * 2;
        return {
          id: t.id,
          posX: 2 + side * (t.width + 0.5),
          posY: (side - 1 - j) * (t.height + 0.5),
          rotation: 270,
        };
      });
    }
    case 'grid_rows':
    default: {
      const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
      return ordered.map((t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          id: t.id,
          posX: col * (t.width + 1),
          posY: row * (t.height + 1),
          rotation: 0,
        };
      });
    }
  }
}

const CSV_HEADERS = [
  'name',
  'minCapacity',
  'maxCapacity',
  'floorArea',
  'shape',
  'posX',
  'posY',
  'width',
  'height',
  'rotation',
  'combinable',
  'active',
  'combineGroupId',
] as const;

export type FloorTableCsvRow = {
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea: string;
  shape: TableShape;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  combinable: boolean;
  active: boolean;
  combineGroupId: string | null;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportFloorTablesCsv(rows: FloorTableCsvRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.name),
        String(row.minCapacity),
        String(row.maxCapacity),
        csvEscape(row.floorArea),
        row.shape,
        String(row.posX),
        String(row.posY),
        String(row.width),
        String(row.height),
        String(row.rotation),
        row.combinable ? 'true' : 'false',
        row.active ? 'true' : 'false',
        row.combineGroupId ?? '',
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export function parseFloorTablesCsv(text: string): FloorTableCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  const required = ['name', 'minCapacity', 'maxCapacity'] as const;
  for (const key of required) {
    if (idx(key) < 0) throw new Error(`CSV missing required column: ${key}`);
  }

  const bool = (v: string | undefined, fallback: boolean) => {
    if (v == null || v === '') return fallback;
    const n = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(n)) return true;
    if (['0', 'false', 'no', 'n'].includes(n)) return false;
    return fallback;
  };
  const num = (v: string | undefined, fallback: number) => {
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const rows: FloorTableCsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? cells[i]?.trim() ?? '' : '';
    };
    const name = get('name');
    if (!name) continue;
    const minCapacity = Math.max(1, Math.min(50, Math.round(num(get('minCapacity'), 2))));
    const maxCapacity = Math.max(
      minCapacity,
      Math.min(50, Math.round(num(get('maxCapacity'), Math.max(minCapacity, 4)))),
    );
    rows.push({
      name,
      minCapacity,
      maxCapacity,
      floorArea: get('floorArea') || 'Main',
      shape: normalizeTableShape(get('shape') || 'rect'),
      posX: Math.max(0, num(get('posX'), 0)),
      posY: Math.max(0, num(get('posY'), 0)),
      width: Math.max(1, num(get('width'), 2)),
      height: Math.max(1, num(get('height'), 2)),
      rotation: Math.max(0, Math.min(360, num(get('rotation'), 0))),
      combinable: bool(get('combinable'), false),
      active: bool(get('active'), true),
      combineGroupId: get('combineGroupId') || null,
    });
  }
  return rows;
}
