export type FloorTableStatus = "free" | "reserved" | "seated" | "turning";

export type FloorStatusThemeColors = {
  slate2: string;
  slate3: string;
  slate4: string;
  amber2: string;
  amber3: string;
  amber11: string;
  primary1: string;
  primary2: string;
  primary9: string;
  accent1: string;
  accent2: string;
  accent11: string;
  textPrimary: string;
  textSecondary: string;
};

export type FloorStatusVisual = {
  label: string;
  wash: string;
  chipBg: string;
  chipText: string;
  swatch: string;
};

const STATUS_LABELS: Record<FloorTableStatus, string> = {
  free: "Available",
  reserved: "Reserved",
  seated: "Seated",
  turning: "Turning",
};

export function floorStatusLabel(status: string): string {
  return STATUS_LABELS[status as FloorTableStatus] ?? status;
}

export function floorStatusVisual(
  status: string,
  colors: FloorStatusThemeColors,
): FloorStatusVisual {
  switch (status) {
    case "reserved":
      return {
        label: STATUS_LABELS.reserved,
        wash: colors.amber2,
        chipBg: colors.amber3,
        chipText: colors.amber11,
        swatch: colors.amber3,
      };
    case "seated":
      return {
        label: STATUS_LABELS.seated,
        wash: colors.primary1,
        chipBg: colors.primary2,
        chipText: colors.primary9,
        swatch: colors.primary2,
      };
    case "turning":
      return {
        label: STATUS_LABELS.turning,
        wash: colors.accent1,
        chipBg: colors.accent2,
        chipText: colors.accent11,
        swatch: colors.accent2,
      };
    case "free":
    default:
      return {
        label: STATUS_LABELS.free,
        wash: colors.slate2,
        chipBg: colors.slate3,
        chipText: colors.textSecondary,
        swatch: colors.slate3,
      };
  }
}

export const FLOOR_STATUS_LEGEND: FloorTableStatus[] = [
  "free",
  "reserved",
  "seated",
  "turning",
];
