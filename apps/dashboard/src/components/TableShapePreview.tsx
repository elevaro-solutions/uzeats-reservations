'use client';

import {
  isOutsideTableShapeLabelPosition,
  normalizeTableShapeLabelFontScale,
  normalizeTableShapeLabelPosition,
  type TableShapeLabelPosition,
} from '@reservations/shared';
import { colors } from '@reservations/ui';
import { TableShapeGlyph } from '@/components/TableShapeGlyph';
import {
  shapeAccent,
  shapeBorderRadius,
  shapeCanvasExtras,
} from '@/lib/floorPlanCanvas';
import {
  tableShapeLabelChipStyle,
  tableShapeLabelFontSizes,
} from '@/lib/tableShapeLabel';

type TableShapePreviewProps = {
  renderPreset: string;
  iconUrl?: string | null;
  labelPosition?: string | null;
  labelFontScale?: number | null;
  /** Sample table name shown in the preview. */
  sampleName?: string;
  sampleMeta?: string;
  width?: number;
  height?: number;
};

/** Live canvas-style preview for admin shape editing. */
export function TableShapePreview({
  renderPreset,
  iconUrl,
  labelPosition,
  labelFontScale,
  sampleName = 'Table 12',
  sampleMeta = '2–4',
  width = 168,
  height = 120,
}: TableShapePreviewProps) {
  const position = normalizeTableShapeLabelPosition(labelPosition) as TableShapeLabelPosition;
  const fontScale = normalizeTableShapeLabelFontScale(labelFontScale);
  const outside = isOutsideTableShapeLabelPosition(position);
  const pad = outside ? 28 : 0;
  const cellSize = Math.min(width, height) / 3;
  const extras = shapeCanvasExtras(renderPreset, cellSize);
  const fonts = tableShapeLabelFontSizes(cellSize, fontScale);

  return (
    <div
      style={{
        width: width + pad * 2,
        height: height + pad * 2,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            borderRadius: shapeBorderRadius(renderPreset),
            background: colors.neutral[25],
            border: `1px solid ${colors.neutral[300]}`,
            boxShadow: shapeAccent(renderPreset),
            overflow: 'hidden',
            ...extras.style,
          }}
        >
          {extras.overlay?.map((style, i) => (
            <div key={`preview-extra-${i}`} style={style} />
          ))}
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: '12%',
                width: '76%',
                height: '76%',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.92,
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.35,
                pointerEvents: 'none',
              }}
            >
              <TableShapeGlyph shape={renderPreset} size={Math.round(cellSize * 1.2)} />
            </div>
          )}
        </div>
        <div
          style={{
            ...tableShapeLabelChipStyle(position),
            background: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: fonts.name, color: colors.textPrimary }}>
            {sampleName}
          </span>
          <span style={{ fontSize: fonts.meta, color: colors.textSecondary }}>{sampleMeta}</span>
        </div>
      </div>
    </div>
  );
}
