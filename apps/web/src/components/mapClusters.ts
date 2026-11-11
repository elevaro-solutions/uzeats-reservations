export type PixelPoint = { x: number; y: number };

export type MapCluster = {
  /** Seed restaurant id; stable while the group keeps the same first member. */
  id: string;
  memberIds: string[];
  x: number;
  y: number;
};

type Rect = { left: number; right: number; top: number; bottom: number };

export const CLUSTER_RADIUS_PX = 44;

/** Must match `.rt-map-marker-label`: the chip's own dot sits on the marker point. */
const LABEL_DOT_CENTER_X = 12;
const LABEL_HALF_HEIGHT = 12;
const LABEL_MAX_WIDTH = 200;
const LABEL_CHAR_WIDTH = 6.9;
/** Borders, both paddings, the dot and the dot-to-text gap. */
const LABEL_CHROME_X = 34;

/**
 * Greedy pixel clustering: each unassigned point seeds a group and absorbs every
 * unassigned point within `radiusPx`. Only groups of two or more are returned.
 */
export function clusterByPixels(
  ids: readonly string[],
  positions: Record<string, PixelPoint>,
  options: { radiusPx?: number; excludeIds?: ReadonlySet<string> } = {},
): MapCluster[] {
  const radius = options.radiusPx ?? CLUSTER_RADIUS_PX;
  const radiusSq = radius * radius;
  const candidates = ids.filter((id) => positions[id] && !options.excludeIds?.has(id));
  const assigned = new Set<string>();
  const clusters: MapCluster[] = [];

  for (const seedId of candidates) {
    if (assigned.has(seedId)) continue;
    const seed = positions[seedId]!;
    const memberIds = [seedId];
    assigned.add(seedId);
    for (const otherId of candidates) {
      if (assigned.has(otherId)) continue;
      const p = positions[otherId]!;
      const dx = p.x - seed.x;
      const dy = p.y - seed.y;
      if (dx * dx + dy * dy <= radiusSq) {
        memberIds.push(otherId);
        assigned.add(otherId);
      }
    }
    if (memberIds.length < 2) continue;
    let sumX = 0;
    let sumY = 0;
    for (const id of memberIds) {
      sumX += positions[id]!.x;
      sumY += positions[id]!.y;
    }
    clusters.push({
      id: seedId,
      memberIds,
      x: sumX / memberIds.length,
      y: sumY / memberIds.length,
    });
  }
  return clusters;
}

const WORLD_TILE_PX = 256;

function mercatorLatRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const rad = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(rad, Math.PI), -Math.PI) / 2;
}

/** Highest whole zoom at which the bounds fit inside the viewport minus padding (Infinity for a single point). */
export function zoomToFitBounds(
  bounds: { north: number; south: number; east: number; west: number },
  viewport: { width: number; height: number },
  paddingPx: number,
): number {
  const width = Math.max(1, viewport.width - paddingPx * 2);
  const height = Math.max(1, viewport.height - paddingPx * 2);
  const latFraction = (mercatorLatRad(bounds.north) - mercatorLatRad(bounds.south)) / Math.PI;
  const lngDiff = bounds.east - bounds.west;
  const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;
  const fit = (px: number, fraction: number) =>
    fraction > 0 ? Math.floor(Math.log2(px / WORLD_TILE_PX / fraction)) : Infinity;
  return Math.min(fit(height, latFraction), fit(width, lngFraction));
}

export function clusterBubbleSize(count: number): number {
  if (count < 10) return 34;
  if (count < 50) return 40;
  return 46;
}

export type PopoverPlacement = {
  left: number;
  top: number;
  below: boolean;
  /** Pointer tip x, relative to the popover's left edge. */
  pointerX: number;
};

/**
 * Puts a popover above `anchor` (or below when only that side fits, or has more room),
 * clamped inside the viewport while keeping the pointer on the anchor.
 * `offsetPx` is the distance from the anchor to the popover edge, pointer included.
 */
export function placePopover(
  anchor: PixelPoint,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  offsetPx: number,
  options: { marginPx?: number; pointerInsetPx?: number } = {},
): PopoverPlacement {
  const margin = options.marginPx ?? 12;
  const inset = options.pointerInsetPx ?? 24;
  const roomAbove = anchor.y - offsetPx - margin;
  const roomBelow = viewport.height - anchor.y - offsetPx - margin;
  const below = roomAbove < size.height && (roomBelow >= size.height || roomBelow > roomAbove);
  const top = below ? anchor.y + offsetPx : anchor.y - offsetPx - size.height;

  const maxLeft = viewport.width - margin - size.width;
  let left = Math.min(Math.max(anchor.x - size.width / 2, margin), Math.max(margin, maxLeft));
  left = Math.min(Math.max(left, anchor.x - size.width + inset), anchor.x - inset);
  return { left, top, below, pointerX: anchor.x - left };
}

function labelRect(point: PixelPoint, label: string): Rect {
  const width = Math.min(LABEL_MAX_WIDTH, LABEL_CHROME_X + label.length * LABEL_CHAR_WIDTH);
  const left = point.x - LABEL_DOT_CENTER_X;
  return {
    left,
    right: left + width,
    top: point.y - LABEL_HALF_HEIGHT,
    bottom: point.y + LABEL_HALF_HEIGHT,
  };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Name labels that fit without covering an earlier label or a cluster bubble.
 * `ids` is in priority order (selected first); hidden ones keep their dot.
 */
export function placeLabels(
  ids: readonly string[],
  positions: Record<string, PixelPoint>,
  labels: Record<string, string>,
  clusters: readonly MapCluster[],
): Set<string> {
  const occupied: Rect[] = clusters.map((c) => {
    const half = clusterBubbleSize(c.memberIds.length) / 2;
    return { left: c.x - half, right: c.x + half, top: c.y - half, bottom: c.y + half };
  });
  const placed = new Set<string>();
  for (const id of ids) {
    const point = positions[id];
    if (!point) continue;
    const rect = labelRect(point, labels[id] ?? '');
    if (occupied.some((r) => intersects(r, rect))) continue;
    occupied.push(rect);
    placed.add(id);
  }
  return placed;
}
