/** How no-shows are marked after the seating window ends. */
export const NO_SHOW_MARKING_MODES = ['auto', 'manual_only'] as const;
export type NoShowMarkingMode = (typeof NO_SHOW_MARKING_MODES)[number];

/** Platform default: hosts/managers mark no-shows; fee charge runs on that mark. */
export const DEFAULT_NO_SHOW_MARKING_MODE: NoShowMarkingMode = 'manual_only';

export function isNoShowMarkingMode(value: unknown): value is NoShowMarkingMode {
  return value === 'auto' || value === 'manual_only';
}

/**
 * Resolve effective mode. First non-null wins:
 * table → floor/area → restaurant → platform → default.
 */
export function resolveNoShowMarkingMode(
  layers: Array<NoShowMarkingMode | null | undefined>,
): NoShowMarkingMode {
  for (const layer of layers) {
    if (isNoShowMarkingMode(layer)) return layer;
  }
  return DEFAULT_NO_SHOW_MARKING_MODE;
}
