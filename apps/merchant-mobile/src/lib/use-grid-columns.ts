import { useWindowDimensions } from "react-native";

export const TABLET_MIN_WIDTH = 768;
export const LARGE_TABLET_MIN_WIDTH = 1024;

export type GridColumns = 1 | 2 | 3;

export function gridColumns(width: number): GridColumns {
  if (width >= LARGE_TABLET_MIN_WIDTH) return 3;
  if (width >= TABLET_MIN_WIDTH) return 2;
  return 1;
}

export function useGridColumns(): GridColumns {
  const { width } = useWindowDimensions();
  return gridColumns(width);
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const columns = Math.max(1, size);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}
