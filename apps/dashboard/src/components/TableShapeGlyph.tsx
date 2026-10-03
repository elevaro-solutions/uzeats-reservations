'use client';

import type { TableShapeRenderPreset } from '@reservations/shared';
import {
  DEFAULT_TABLE_SHAPES,
  TABLE_SHAPE_LABELS,
  isTableShapeRenderPreset,
} from '@reservations/shared';
import { colors } from '@reservations/ui';

const STROKE = colors.brand[700];
const FILL = colors.brand[50];
const ACCENT = colors.brand[600];

type TableShapeGlyphProps = {
  /** Shape key or render preset used for the built-in SVG. */
  shape: string;
  size?: number;
  /** When set, shows the uploaded icon instead of the built-in SVG. */
  iconUrl?: string | null;
};

/** Small SVG (or uploaded icon) that shows what each floor-plan table shape looks like. */
export function TableShapeGlyph({ shape, size = 22, iconUrl }: TableShapeGlyphProps) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: 4,
          flexShrink: 0,
          background: 'transparent',
        }}
      />
    );
  }

  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true as const,
  };

  const preset: TableShapeRenderPreset = isTableShapeRenderPreset(shape) ? shape : 'rect';

  switch (preset) {
    case 'round':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill={FILL} stroke={STROKE} strokeWidth="1.75" />
        </svg>
      );
    case 'booth':
      return (
        <svg {...common}>
          <path
            d="M5 8.5 C5 5.5 7 4 12 4 C17 4 19 5.5 19 8.5 V18 H5 Z"
            fill={FILL}
            stroke={STROKE}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M5 9.5 H19" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'banquette':
      return (
        <svg {...common}>
          <path
            d="M4 8 H14 C18.5 8 20 10 20 14 V18 H4 Z"
            fill={FILL}
            stroke={STROKE}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M4 8 V18" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'high_top':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2.5" fill={FILL} stroke={STROKE} strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.2" fill={ACCENT} opacity="0.85" />
        </svg>
      );
    case 'communal':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="8" rx="1.5" fill={FILL} stroke={STROKE} strokeWidth="1.75" />
          <path d="M7 8 V16 M12 8 V16 M17 8 V16" stroke={ACCENT} strokeWidth="1.25" opacity="0.7" />
        </svg>
      );
    case 'bar':
      return (
        <svg {...common}>
          <rect x="3" y="9.5" width="18" height="5" rx="2.5" fill={FILL} stroke={STROKE} strokeWidth="1.75" />
          <circle cx="7" cy="12" r="1.2" fill={ACCENT} />
          <circle cx="12" cy="12" r="1.2" fill={ACCENT} />
          <circle cx="17" cy="12" r="1.2" fill={ACCENT} />
        </svg>
      );
    case 'rect':
    default:
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="2" fill={FILL} stroke={STROKE} strokeWidth="1.75" />
        </svg>
      );
  }
}

export function tableShapeOptionLabel(args: {
  key: string;
  label: string;
  iconUrl?: string | null;
  renderPreset?: string;
  size?: number;
}) {
  const { key, label, iconUrl, renderPreset, size = 20 } = args;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <TableShapeGlyph shape={renderPreset || key} size={size} iconUrl={iconUrl} />
      <span>{label}</span>
    </span>
  );
}

/** Static fallback options when the catalog query is unavailable. */
export const TABLE_SHAPE_SELECT_OPTIONS = DEFAULT_TABLE_SHAPES.map((value) => ({
  value,
  label: tableShapeOptionLabel({
    key: value,
    label: TABLE_SHAPE_LABELS[value],
    renderPreset: value,
  }),
  title: TABLE_SHAPE_LABELS[value],
}));

export function buildTableShapeSelectOptions(
  shapes: Array<{
    key: string;
    label: string;
    iconUrl?: string | null;
    renderPreset?: string;
  }>,
) {
  return shapes.map((s) => ({
    value: s.key,
    label: tableShapeOptionLabel({
      key: s.key,
      label: s.label,
      iconUrl: s.iconUrl,
      renderPreset: s.renderPreset,
    }),
    title: s.label,
  }));
}
