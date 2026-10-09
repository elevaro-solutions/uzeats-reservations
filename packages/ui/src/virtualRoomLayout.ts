/**
 * Keeps 3D walls outside rotated tables. Floor-plan rotation is around the
 * table center (CSS clockwise). Walls used to follow the unrotated box, so a
 * turned table — and the chairs past its edge — cut through the wall.
 */

export type XZ = { x: number; z: number };

/** Chairs and booth backs sit about 0.6 m past the tabletop. */
export const SEAT_CLEARANCE_M = 0.75;

export function rotatedRectCorners(
  centerX: number,
  centerZ: number,
  halfW: number,
  halfD: number,
  rotationDeg: number,
  margin = 0,
): XZ[] {
  const hw = halfW + margin;
  const hd = halfD + margin;
  const φ = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(φ);
  const sin = Math.sin(φ);
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => ({
    x: centerX + x * cos + z * sin,
    z: centerZ - x * sin + z * cos,
  }));
}

export function pointInPolygon(p: XZ, poly: XZ[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]!;
    const b = poly[j]!;
    const crosses = a.z > p.z !== b.z > p.z;
    if (!crosses) continue;
    const x = ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z + 0) + a.x;
    if (p.x < x) inside = !inside;
  }
  return inside;
}

function outwardNormal(a: XZ, b: XZ, poly: XZ[]): XZ {
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  let x = (b.z - a.z) / len;
  let z = (a.x - b.x) / len;
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  if (pointInPolygon({ x: mid.x + x * 0.05, z: mid.z + z * 0.05 }, poly)) {
    x = -x;
    z = -z;
  }
  return { x, z };
}

/**
 * Slides each wall edge straight outward until every footprint point is inside.
 * Corners stay square: a rectangular room stays rectangular, just larger on the
 * sides the rotated table crosses.
 */
export function expandOutline(outline: XZ[], points: XZ[], eps = 0.08): XZ[] {
  if (outline.length < 3 || points.length === 0) return outline;
  const disp = outline.map(() => ({ x: 0, z: 0 }));
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const n = outwardNormal(a, b, outline);
    let maxOut = 0;
    for (const p of points) {
      const dist = (p.x - a.x) * n.x + (p.z - a.z) * n.z;
      if (dist > maxOut) maxOut = dist;
    }
    if (maxOut <= 0) continue;
    const push = maxOut + eps;
    const i2 = (i + 1) % outline.length;
    disp[i]!.x += n.x * push;
    disp[i]!.z += n.z * push;
    disp[i2]!.x += n.x * push;
    disp[i2]!.z += n.z * push;
  }
  return outline.map((p, i) => ({ x: p.x + disp[i]!.x, z: p.z + disp[i]!.z }));
}

export type RoomItem = {
  id: string;
  center: XZ;
  corners: XZ[];
};

/** Center stays put when a table rotates, so the room it belongs to does too. */
function belongsToOutline(item: RoomItem, outline: XZ[]): boolean {
  return pointInPolygon(item.center, outline);
}

export function rectOutline(minX: number, minZ: number, maxX: number, maxZ: number): XZ[] {
  return [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
}

/** Grow walls (and the floor extent) so rotated tables and their chairs stay inside. */
export function fitRoomToFurniture(args: {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  outlines: XZ[][];
  items: RoomItem[];
}): { minX: number; minZ: number; maxX: number; maxZ: number; outlines: XZ[][] } {
  const base = args.outlines.filter((o) => o.length >= 3);
  const outlines = (base.length ? base : [rectOutline(args.minX, args.minZ, args.maxX, args.maxZ)]).map(
    (outline) => {
      const points = args.items.filter((item) => belongsToOutline(item, outline)).flatMap((item) => item.corners);
      return expandOutline(outline, points);
    },
  );

  let { minX, minZ, maxX, maxZ } = args;
  const include = (p: XZ) => {
    minX = Math.min(minX, p.x);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxZ = Math.max(maxZ, p.z);
  };
  for (const outline of outlines) outline.forEach(include);
  for (const item of args.items) item.corners.forEach(include);

  return { minX, minZ, maxX, maxZ, outlines };
}

/**
 * A door or window drawn along the edge of the floor plan snaps to the 3D wall.
 * The wall sits outside the layout (padding plus chair clearance), so the snap
 * reach has to cover that gap.
 */
export const OPENING_SNAP_M = 1.75;

export type OpeningFixture = {
  id: string;
  kind: 'door' | 'window';
  center: XZ;
  halfW: number;
  halfD: number;
  rotationDeg: number;
};

export type WallOpening = {
  id: string;
  kind: 'door' | 'window';
  /** Center of the opening, meters from the wall's start point. */
  along: number;
  width: number;
};

function dot2(a: XZ, b: XZ) {
  return a.x * b.x + a.z * b.z;
}

function fixtureAxes(rotationDeg: number) {
  const φ = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(φ);
  const sin = Math.sin(φ);
  return {
    x: { x: cos, z: -sin },
    z: { x: sin, z: cos },
  };
}

/** One list of openings per outline edge. Each fixture cuts at most one wall. */
export function openingsForOutline(
  outline: XZ[],
  fixtures: OpeningFixture[],
  snapM = OPENING_SNAP_M,
): WallOpening[][] {
  const edges: WallOpening[][] = outline.map(() => []);
  type Candidate = WallOpening & { edge: number; distance: number };
  const best = new Map<string, Candidate>();

  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.3) continue;
    const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    for (const fixture of fixtures) {
      const axes = fixtureAxes(fixture.rotationDeg);
      const long = fixture.halfW >= fixture.halfD ? axes.x : axes.z;
      if (Math.abs(dot2(long, dir)) < 0.7) continue;
      const rel = { x: fixture.center.x - a.x, z: fixture.center.z - a.z };
      const t = dot2(rel, dir);
      const perp = Math.hypot(rel.x - dir.x * t, rel.z - dir.z * t);
      if (perp > snapM) continue;
      const halfAlong =
        fixture.halfW * Math.abs(dot2(axes.x, dir)) + fixture.halfD * Math.abs(dot2(axes.z, dir));
      const maxW = fixture.kind === 'door' ? 1.8 : 3.2;
      let width = Math.min(Math.max(halfAlong * 2, 0.7), maxW);
      let s0 = t - width / 2;
      let s1 = t + width / 2;
      if (s1 < 0.25 || s0 > len - 0.25) continue;
      s0 = Math.max(0.12, s0);
      s1 = Math.min(len - 0.12, s1);
      width = s1 - s0;
      if (width < 0.55) continue;
      const prev = best.get(fixture.id);
      if (prev && prev.distance <= perp) continue;
      best.set(fixture.id, {
        id: fixture.id,
        kind: fixture.kind,
        edge: i,
        distance: perp,
        along: (s0 + s1) / 2,
        width,
      });
    }
  }

  const grouped = new Map<number, Candidate[]>();
  for (const candidate of best.values()) {
    const list = grouped.get(candidate.edge) ?? [];
    list.push(candidate);
    grouped.set(candidate.edge, list);
  }
  for (const [edge, list] of grouped) {
    const a = outline[edge]!;
    const b = outline[(edge + 1) % outline.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    list.sort((p, q) => p.along - q.along);
    let cursor = 0.12;
    for (const candidate of list) {
      let s0 = candidate.along - candidate.width / 2;
      let s1 = candidate.along + candidate.width / 2;
      if (s0 < cursor) s0 = cursor;
      if (s1 > len - 0.12) s1 = len - 0.12;
      if (s1 - s0 < 0.55) continue;
      edges[edge]!.push({
        id: candidate.id,
        kind: candidate.kind,
        along: (s0 + s1) / 2,
        width: s1 - s0,
      });
      cursor = s1 + 0.1;
    }
  }
  return edges;
}
