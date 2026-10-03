'use client';

import { useMemo } from 'react';
import {
  DEFAULT_TABLE_SHAPES,
  DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
  DEFAULT_TABLE_SHAPE_LABEL_POSITION,
  TABLE_SHAPE_LABELS,
  type TableShapeLabelPosition,
  type TableShapeRenderPreset,
} from '@reservations/shared';
import { useQuery } from '@/lib/apollo-hooks';
import { TABLE_SHAPES_QUERY } from '@/lib/graphql';
import { resolveTableShapeLabelLayout } from '@/lib/tableShapeLabel';

export type TableShapeOption = {
  key: string;
  label: string;
  description: string;
  iconUrl: string | null;
  renderPreset: TableShapeRenderPreset | string;
  labelPosition: TableShapeLabelPosition;
  labelFontScale: number;
  builtin: boolean;
};

const FALLBACK: TableShapeOption[] = DEFAULT_TABLE_SHAPES.map((key) => ({
  key,
  label: TABLE_SHAPE_LABELS[key],
  description: '',
  iconUrl: null,
  renderPreset: key,
  labelPosition: DEFAULT_TABLE_SHAPE_LABEL_POSITION,
  labelFontScale: DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
  builtin: true,
}));

/** Active floor-plan shapes from the API (falls back to built-ins offline). */
export function useTableShapes() {
  const { data, loading, error, refetch } = useQuery(TABLE_SHAPES_QUERY, {
    variables: { active: true },
    fetchPolicy: 'cache-and-network',
  });

  const shapes: TableShapeOption[] = useMemo(() => {
    const items = data?.tableShapes as
      | Array<{
          key: string;
          label: string;
          description?: string;
          iconUrl?: string | null;
          renderPreset?: string;
          labelPosition?: string;
          labelFontScale?: number;
          builtin?: boolean;
        }>
      | undefined;
    if (!items?.length) return FALLBACK;
    return items.map((s) => {
      const layout = resolveTableShapeLabelLayout(s);
      return {
        key: s.key,
        label: s.label,
        description: s.description ?? '',
        iconUrl: s.iconUrl ?? null,
        renderPreset: s.renderPreset || s.key,
        labelPosition: layout.position,
        labelFontScale: layout.fontScale,
        builtin: Boolean(s.builtin),
      };
    });
  }, [data?.tableShapes]);

  const byKey = useMemo(() => {
    const map = new Map<string, TableShapeOption>();
    for (const s of shapes) map.set(s.key, s);
    return map;
  }, [shapes]);

  const labelFor = (key: string) =>
    byKey.get(key)?.label ?? TABLE_SHAPE_LABELS[key as keyof typeof TABLE_SHAPE_LABELS] ?? key;
  const renderPresetFor = (key: string) => byKey.get(key)?.renderPreset ?? key;
  const iconUrlFor = (key: string) => byKey.get(key)?.iconUrl ?? null;
  const labelLayoutFor = (key: string) =>
    resolveTableShapeLabelLayout(byKey.get(key) ?? undefined);

  return {
    shapes,
    byKey,
    labelFor,
    renderPresetFor,
    iconUrlFor,
    labelLayoutFor,
    loading,
    error,
    refetch,
  };
}
