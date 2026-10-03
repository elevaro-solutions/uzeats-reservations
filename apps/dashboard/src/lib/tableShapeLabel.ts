import type { CSSProperties } from 'react';
import {
  DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
  DEFAULT_TABLE_SHAPE_LABEL_POSITION,
  isOutsideTableShapeLabelPosition,
  normalizeTableShapeLabelFontScale,
  normalizeTableShapeLabelPosition,
  type TableShapeLabelPosition,
} from '@reservations/shared';

export type TableShapeLabelLayout = {
  position: TableShapeLabelPosition;
  fontScale: number;
};

export function resolveTableShapeLabelLayout(input?: {
  labelPosition?: string | null;
  labelFontScale?: number | null;
}): TableShapeLabelLayout {
  return {
    position: normalizeTableShapeLabelPosition(
      input?.labelPosition ?? DEFAULT_TABLE_SHAPE_LABEL_POSITION,
    ),
    fontScale: normalizeTableShapeLabelFontScale(
      input?.labelFontScale ?? DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
    ),
  };
}

export { isOutsideTableShapeLabelPosition };

/** Position the label chip relative to a table wrapper (inside or outside). */
export function tableShapeLabelChipStyle(position: TableShapeLabelPosition): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '110%',
    padding: '2px 6px',
    borderRadius: 6,
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 1.15,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };

  switch (position) {
    case 'top':
      return {
        ...base,
        top: 6,
        left: '50%',
        transform: 'translateX(-50%)',
        alignItems: 'center',
        maxWidth: '90%',
        whiteSpace: 'normal',
      };
    case 'bottom':
      return {
        ...base,
        bottom: 6,
        left: '50%',
        transform: 'translateX(-50%)',
        alignItems: 'center',
        maxWidth: '90%',
        whiteSpace: 'normal',
      };
    case 'left':
      return {
        ...base,
        left: 6,
        top: '50%',
        transform: 'translateY(-50%)',
        alignItems: 'flex-start',
        textAlign: 'left',
        maxWidth: '90%',
        whiteSpace: 'normal',
      };
    case 'right':
      return {
        ...base,
        right: 6,
        top: '50%',
        transform: 'translateY(-50%)',
        alignItems: 'flex-end',
        textAlign: 'right',
        maxWidth: '90%',
        whiteSpace: 'normal',
      };
    case 'outside_top':
      return {
        ...base,
        bottom: '100%',
        left: '50%',
        transform: 'translate(-50%, -4px)',
        alignItems: 'center',
      };
    case 'outside_bottom':
      return {
        ...base,
        top: '100%',
        left: '50%',
        transform: 'translate(-50%, 4px)',
        alignItems: 'center',
      };
    case 'outside_left':
      return {
        ...base,
        right: '100%',
        top: '50%',
        transform: 'translate(-4px, -50%)',
        alignItems: 'flex-end',
        textAlign: 'right',
      };
    case 'outside_right':
      return {
        ...base,
        left: '100%',
        top: '50%',
        transform: 'translate(4px, -50%)',
        alignItems: 'flex-start',
        textAlign: 'left',
      };
    case 'center':
    default:
      return {
        ...base,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        alignItems: 'center',
        maxWidth: '90%',
        whiteSpace: 'normal',
      };
  }
}

export function tableShapeLabelFontSizes(cellSize: number, fontScale: number) {
  const scale = normalizeTableShapeLabelFontScale(fontScale);
  return {
    name: Math.max(9, cellSize * 0.28 * scale),
    meta: Math.max(8, cellSize * 0.22 * scale),
  };
}
