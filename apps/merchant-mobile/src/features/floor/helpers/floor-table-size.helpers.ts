export type FloorTableSizeBucket = "two" | "four" | "six" | "banquet";

export type FloorChairSide = "top" | "right" | "bottom" | "left";

export type FloorChairDistribution = Record<FloorChairSide, number>;

const MAX_CHAIRS = 10;

export function floorTableSizeBucket(maxCapacity: number): FloorTableSizeBucket {
  if (maxCapacity <= 2) return "two";
  if (maxCapacity <= 4) return "four";
  if (maxCapacity <= 6) return "six";
  return "banquet";
}

/**
 * Grid widths: consistent 2-column for normal tables; banquet spans full row.
 * Do not use flexGrow — orphans must not stretch to full width.
 */
export function floorTableWidth(bucket: FloorTableSizeBucket): `${number}%` {
  return bucket === "banquet" ? "100%" : "47%";
}

export function floorTableChairCount(maxCapacity: number): number {
  return Math.min(Math.max(maxCapacity, 2), MAX_CHAIRS);
}

/**
 * Chair counts per side — matches the Book-a-Table furniture language:
 * 2-top → 1 top + 1 bottom; 4-top → 2+2; larger → long sides + ends.
 */
export function floorTableChairDistribution(
  maxCapacity: number,
): FloorChairDistribution {
  const n = floorTableChairCount(maxCapacity);

  if (n <= 2) {
    return { top: 1, bottom: 1, left: 0, right: 0 };
  }
  if (n === 3) {
    return { top: 1, bottom: 1, left: 1, right: 0 };
  }
  if (n === 4) {
    return { top: 2, bottom: 2, left: 0, right: 0 };
  }
  if (n === 5) {
    return { top: 2, bottom: 2, left: 1, right: 0 };
  }

  const remaining = n - 2;
  return {
    top: Math.ceil(remaining / 2),
    bottom: Math.floor(remaining / 2),
    left: 1,
    right: 1,
  };
}
