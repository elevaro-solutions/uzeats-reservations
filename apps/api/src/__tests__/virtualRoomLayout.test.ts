import { describe, expect, it } from 'vitest';
import {
  SEAT_CLEARANCE_M,
  aabbOfOutlines,
  expandOutline,
  fitRoomToFurniture,
  fixtureIdsOnOutlines,
  openingsForOutline,
  pointInPolygon,
  rectOutline,
  rotatedRectCorners,
} from '../../../../packages/ui/src/virtualRoomLayout.ts';

function maxOutside(points: Array<{ x: number; z: number }>, outline: Array<{ x: number; z: number }>) {
  let worst = 0;
  for (const p of points) {
    if (pointInPolygon(p, outline)) continue;
    let nearest = Infinity;
    for (let i = 0; i < outline.length; i += 1) {
      const a = outline[i]!;
      const b = outline[(i + 1) % outline.length]!;
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const len2 = abx * abx + abz * abz || 1;
      const t = Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2));
      nearest = Math.min(nearest, Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t)));
    }
    worst = Math.max(worst, nearest);
  }
  return worst;
}

describe('virtual room layout', () => {
  it('turns a table clockwise the same way as the floor plan', () => {
    const corners = rotatedRectCorners(0, 0, 2, 0.5, 90, 0);
    const xs = corners.map((c: { x: number; z: number }) => c.x);
    const zs = corners.map((c: { x: number; z: number }) => c.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.1);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(3.9);
  });

  it('keeps a rotated table and its chairs inside the walls', () => {
    const outline = rectOutline(0, 0, 10, 10);
    const corners = rotatedRectCorners(1.2, 5, 1, 1, 40, SEAT_CLEARANCE_M);
    expect(maxOutside(corners, outline)).toBeGreaterThan(0.2);

    const expanded = expandOutline(outline, corners);
    expect(maxOutside(corners, expanded)).toBe(0);
    expect(expanded[0]!.z).toBeCloseTo(0, 5);
    expect(expanded[1]!.z).toBeCloseTo(0, 5);
    expect(expanded[0]!.x).toBeLessThan(0);
  });

  it('does not move walls when the table already fits', () => {
    const outline = rectOutline(0, 0, 20, 20);
    const corners = rotatedRectCorners(10, 10, 1, 1, 30, SEAT_CLEARANCE_M);
    const expanded = expandOutline(outline, corners);
    expect(expanded).toEqual(outline);
  });

  it('grows only the room the table sits in', () => {
    const left = rectOutline(0, 0, 10, 10);
    const right = rectOutline(12, 0, 22, 10);
    const fitted = fitRoomToFurniture({
      minX: 0,
      minZ: 0,
      maxX: 22,
      maxZ: 10,
      outlines: [left, right],
      items: [
        {
          id: 't',
          center: { x: 1.2, z: 5 },
          corners: rotatedRectCorners(1.2, 5, 1, 1, 45, SEAT_CLEARANCE_M),
        },
      ],
    });
    expect(fitted.outlines[0]![0]!.x).toBeLessThan(0);
    expect(fitted.outlines[1]).toEqual(right);
    expect(maxOutside(rotatedRectCorners(1.2, 5, 1, 1, 45, SEAT_CLEARANCE_M), fitted.outlines[0]!)).toBe(0);
  });

  it('cuts a doorway into the nearest parallel wall and ignores a door in the middle', () => {
    const room = rectOutline(0, 0, 10, 8);
    const edges = openingsForOutline(room, [
      { id: 'door', kind: 'door', center: { x: 5, z: 0.3 }, halfW: 0.6, halfD: 0.15, rotationDeg: 0 },
      { id: 'window', kind: 'window', center: { x: 0.25, z: 4 }, halfW: 1.1, halfD: 0.15, rotationDeg: 90 },
      { id: 'mid', kind: 'door', center: { x: 5, z: 4 }, halfW: 0.6, halfD: 0.15, rotationDeg: 0 },
    ]);
    expect(edges[0]?.map((o: { id: string }) => o.id)).toEqual(['door']);
    expect(edges[0]?.[0]?.along).toBeCloseTo(5, 0);
    expect(edges[3]?.map((o: { id: string }) => o.id)).toEqual(['window']);
    expect(edges.flat().some((o: { id: string }) => o.id === 'mid')).toBe(false);
  });

  it('keeps the floor extent on the wall outlines, not exterior décor', () => {
    const room = rectOutline(0, 0, 10, 8);
    const fitted = fitRoomToFurniture({
      minX: -2,
      minZ: -2,
      maxX: 14,
      maxZ: 12,
      outlines: [room],
      items: [
        {
          id: 'outside-plant',
          center: { x: 12, z: 4 },
          corners: [
            { x: 11.5, z: 3.5 },
            { x: 12.5, z: 3.5 },
            { x: 12.5, z: 4.5 },
            { x: 11.5, z: 4.5 },
          ],
        },
      ],
    });
    expect(fitted.minX).toBeCloseTo(0);
    expect(fitted.minZ).toBeCloseTo(0);
    expect(fitted.maxX).toBeCloseTo(10);
    expect(fitted.maxZ).toBeCloseTo(8);
    expect(aabbOfOutlines(fitted.outlines)).toEqual({
      minX: 0,
      minZ: 0,
      maxX: 10,
      maxZ: 8,
    });
  });

  it('skips wall fixtures redrawn on a room outline edge', () => {
    const room = rectOutline(0, 0, 10, 8);
    const onEdge = fixtureIdsOnOutlines([room], [
      { id: 'edge-wall', center: { x: 5, z: 0.1 }, halfW: 2, halfD: 0.15, rotationDeg: 0 },
      { id: 'inner-wall', center: { x: 5, z: 4 }, halfW: 0.15, halfD: 2, rotationDeg: 0 },
    ]);
    expect([...onEdge]).toEqual(['edge-wall']);
  });
});
