export type FloorTableStatus = "free" | "reserved" | "seated" | "turning";

export type FloorStatusThemeColors = {
  green1: string;
  green3: string;
  green4: string;
  green8: string;
  green9: string;
  green11: string;
  amber1: string;
  amber3: string;
  amber4: string;
  amber8: string;
  amber10: string;
  amber11: string;
  red1: string;
  red3: string;
  red4: string;
  red8: string;
  red9: string;
  red11: string;
  blue1: string;
  blue3: string;
  blue4: string;
  blue8: string;
  blue9: string;
  blue11: string;
};

export type FloorStatusVisual = {
  label: string;
  /** Outer tile wash */
  wash: string;
  /** White-ish tabletop tint */
  body: string;
  /** Tabletop border */
  bodyBorder: string;
  /** Chair pills */
  chairs: string;
  /** Table name / emphasis text */
  accent: string;
  chipBg: string;
  chipText: string;
  /** Legend swatch (highest contrast) */
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

/**
 * Status palette (scannable):
 * free → green, reserved → amber, seated → red, turning → blue.
 * Cards tint wash + body + chairs + accent; legend uses strong swatches.
 */
export function floorStatusVisual(
  status: string,
  colors: FloorStatusThemeColors,
): FloorStatusVisual {
  switch (status) {
    case "reserved":
      return {
        label: STATUS_LABELS.reserved,
        wash: colors.amber3,
        body: colors.amber1,
        bodyBorder: colors.amber8,
        chairs: colors.amber8,
        accent: colors.amber11,
        chipBg: colors.amber4,
        chipText: colors.amber11,
        swatch: colors.amber10,
      };
    case "seated":
      return {
        label: STATUS_LABELS.seated,
        wash: colors.red3,
        body: colors.red1,
        bodyBorder: colors.red8,
        chairs: colors.red8,
        accent: colors.red11,
        chipBg: colors.red4,
        chipText: colors.red11,
        swatch: colors.red9,
      };
    case "turning":
      return {
        label: STATUS_LABELS.turning,
        wash: colors.blue3,
        body: colors.blue1,
        bodyBorder: colors.blue8,
        chairs: colors.blue8,
        accent: colors.blue11,
        chipBg: colors.blue4,
        chipText: colors.blue11,
        swatch: colors.blue9,
      };
    case "free":
    default:
      return {
        label: STATUS_LABELS.free,
        wash: colors.green3,
        body: colors.green1,
        bodyBorder: colors.green8,
        chairs: colors.green8,
        accent: colors.green11,
        chipBg: colors.green4,
        chipText: colors.green11,
        swatch: colors.green9,
      };
  }
}

export const FLOOR_STATUS_LEGEND: FloorTableStatus[] = [
  "free",
  "reserved",
  "seated",
  "turning",
];
