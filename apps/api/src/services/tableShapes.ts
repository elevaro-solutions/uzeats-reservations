import {
  DEFAULT_TABLE_SHAPES,
  DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
  DEFAULT_TABLE_SHAPE_LABEL_POSITION,
  TABLE_SHAPE_KEY_RE,
  TABLE_SHAPE_LABELS,
  TABLE_SHAPE_RENDER_PRESETS,
  isTableShapeRenderPreset,
  normalizeTableShapeLabelFontScale,
  normalizeTableShapeLabelPosition,
  type TableShapeRenderPreset,
} from '@reservations/shared';
import { Table } from '../models/Table.js';
import { TableShapeDef } from '../models/TableShapeDef.js';

export function mapTableShapeDef(doc: any) {
  return {
    id: doc._id.toString(),
    key: doc.key as string,
    label: doc.label as string,
    description: doc.description ?? '',
    iconUrl: doc.iconUrl ?? null,
    renderPreset: (doc.renderPreset || 'rect') as string,
    labelPosition: normalizeTableShapeLabelPosition(doc.labelPosition),
    labelFontScale: normalizeTableShapeLabelFontScale(
      doc.labelFontScale ?? DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
    ),
    active: Boolean(doc.active),
    sortOrder: doc.sortOrder ?? 0,
    builtin: Boolean(doc.builtin),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

function assertValidKey(key: string) {
  if (!TABLE_SHAPE_KEY_RE.test(key)) {
    throw new Error('Key must be lowercase letters, numbers, or underscores (start with a letter)');
  }
}

async function uniqueKey(base: string, excludeId?: string) {
  let key = normalizeKey(base) || 'shape';
  if (!/^[a-z]/.test(key)) key = `s_${key}`.slice(0, 40);
  assertValidKey(key);
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? key : `${key}_${n}`.slice(0, 40);
    const existing = await TableShapeDef.findOne({ key: candidate }).select('_id');
    if (!existing || (excludeId && existing._id.toString() === excludeId)) return candidate;
    n += 1;
  }
}

function resolveRenderPreset(value: string | null | undefined): TableShapeRenderPreset {
  if (value && isTableShapeRenderPreset(value)) return value;
  return 'rect';
}

/** Seed the seven built-in shapes if missing (idempotent). */
export async function ensureDefaultTableShapes() {
  for (let i = 0; i < DEFAULT_TABLE_SHAPES.length; i++) {
    const key = DEFAULT_TABLE_SHAPES[i]!;
    const existing = await TableShapeDef.findOne({ key }).select('_id');
    if (existing) continue;
    await TableShapeDef.create({
      key,
      label: TABLE_SHAPE_LABELS[key],
      description: '',
      iconUrl: null,
      renderPreset: key,
      active: true,
      sortOrder: i,
      builtin: true,
    });
  }
}

export async function listTableShapes(input?: {
  active?: boolean | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}) {
  await ensureDefaultTableShapes();
  const limit = Math.min(input?.limit ?? 100, 200);
  const offset = input?.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (typeof input?.active === 'boolean') filter.active = input.active;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    filter.$or = [
      { label: { $regex: q, $options: 'i' } },
      { key: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    TableShapeDef.find(filter).sort({ sortOrder: 1, label: 1 }).skip(offset).limit(limit),
    TableShapeDef.countDocuments(filter),
  ]);

  return { total, items: items.map(mapTableShapeDef) };
}

export async function createTableShapeDef(input: {
  key?: string | null;
  label: string;
  description?: string | null;
  iconUrl?: string | null;
  renderPreset?: string | null;
  labelPosition?: string | null;
  labelFontScale?: number | null;
  active?: boolean | null;
  sortOrder?: number | null;
}) {
  const label = input.label.trim();
  if (!label) throw new Error('Label is required');

  const key = await uniqueKey(input.key?.trim() || label);
  const doc = await TableShapeDef.create({
    key,
    label,
    description: input.description?.trim() || '',
    iconUrl: input.iconUrl?.trim() || null,
    renderPreset: resolveRenderPreset(input.renderPreset),
    labelPosition: normalizeTableShapeLabelPosition(
      input.labelPosition ?? DEFAULT_TABLE_SHAPE_LABEL_POSITION,
    ),
    labelFontScale: normalizeTableShapeLabelFontScale(
      input.labelFontScale ?? DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
    ),
    active: input.active !== false,
    sortOrder: input.sortOrder ?? 0,
    builtin: false,
  });
  return mapTableShapeDef(doc);
}

export async function updateTableShapeDef(
  id: string,
  input: {
    key?: string | null;
    label?: string | null;
    description?: string | null;
    iconUrl?: string | null;
    renderPreset?: string | null;
    labelPosition?: string | null;
    labelFontScale?: number | null;
    active?: boolean | null;
    sortOrder?: number | null;
  },
) {
  const doc = await TableShapeDef.findById(id);
  if (!doc) throw new Error('Shape not found');

  if (input.label != null) {
    const label = input.label.trim();
    if (!label) throw new Error('Label is required');
    doc.label = label;
  }

  if (input.key != null && input.key.trim()) {
    if (doc.builtin) throw new Error('Built-in shape keys cannot be changed');
    const nextKey = await uniqueKey(input.key.trim(), id);
    if (nextKey !== doc.key) {
      await Table.updateMany({ shape: doc.key }, { $set: { shape: nextKey } });
      doc.key = nextKey;
    }
  }

  if (input.description != null) doc.description = input.description.trim();
  if (input.iconUrl !== undefined) {
    doc.iconUrl = input.iconUrl?.trim() || null;
  }
  if (input.renderPreset != null) {
    doc.renderPreset = resolveRenderPreset(input.renderPreset);
  }
  if (input.labelPosition != null) {
    doc.labelPosition = normalizeTableShapeLabelPosition(input.labelPosition);
  }
  if (input.labelFontScale != null) {
    doc.labelFontScale = normalizeTableShapeLabelFontScale(input.labelFontScale);
  }
  if (typeof input.active === 'boolean') {
    if (doc.key === 'rect' && !input.active) {
      throw new Error('The default Rectangle shape cannot be deactivated');
    }
    doc.active = input.active;
  }
  if (input.sortOrder != null) doc.sortOrder = input.sortOrder;

  await doc.save();
  return mapTableShapeDef(doc);
}

export async function deleteTableShapeDef(id: string) {
  const doc = await TableShapeDef.findById(id);
  if (!doc) throw new Error('Shape not found');
  if (doc.key === 'rect') {
    throw new Error('The default Rectangle shape cannot be deleted');
  }

  const inUse = await Table.countDocuments({ shape: doc.key });
  if (inUse > 0) {
    await Table.updateMany({ shape: doc.key }, { $set: { shape: 'rect' } });
  }

  await TableShapeDef.deleteOne({ _id: doc._id });
  return { deleted: true, reassignedTables: inUse };
}

export { TABLE_SHAPE_RENDER_PRESETS };
