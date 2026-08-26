import crypto from 'crypto';
import { PlatformService } from '../models/PlatformService.js';

export function mapPlatformService(doc: any) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? '',
    priceCents: doc.priceCents ?? 0,
    active: Boolean(doc.active),
    sortOrder: doc.sortOrder ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `service-${crypto.randomBytes(3).toString('hex')}`;
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await PlatformService.findOne({ slug: candidate }).select('_id');
    if (!existing || (excludeId && existing._id.toString() === excludeId)) return candidate;
    n += 1;
  }
}

export async function listPlatformServices(input?: {
  active?: boolean | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input?.limit ?? 100, 200);
  const offset = input?.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (typeof input?.active === 'boolean') filter.active = input.active;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    PlatformService.find(filter).sort({ sortOrder: 1, name: 1 }).skip(offset).limit(limit),
    PlatformService.countDocuments(filter),
  ]);

  return { total, items: items.map(mapPlatformService) };
}

export async function createPlatformService(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
  priceCents: number;
  active?: boolean | null;
  sortOrder?: number | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const priceCents = Math.round(Number(input.priceCents));
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    throw new Error('priceCents must be a non-negative integer');
  }

  const slug = await uniqueSlug(input.slug?.trim() || name);
  const doc = await PlatformService.create({
    name,
    slug,
    description: input.description?.trim() || '',
    priceCents,
    active: input.active !== false,
    sortOrder: input.sortOrder ?? 0,
  });
  return mapPlatformService(doc);
}

export async function updatePlatformService(
  id: string,
  input: {
    name?: string | null;
    slug?: string | null;
    description?: string | null;
    priceCents?: number | null;
    active?: boolean | null;
    sortOrder?: number | null;
  },
) {
  const doc = await PlatformService.findById(id);
  if (!doc) throw new Error('Service not found');

  if (input.name != null) {
    const name = input.name.trim();
    if (!name) throw new Error('Name is required');
    doc.name = name;
  }
  if (input.slug != null && input.slug.trim()) {
    doc.slug = await uniqueSlug(input.slug.trim(), id);
  }
  if (input.description != null) doc.description = input.description.trim();
  if (input.priceCents != null) {
    const priceCents = Math.round(Number(input.priceCents));
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      throw new Error('priceCents must be a non-negative integer');
    }
    doc.priceCents = priceCents;
  }
  if (typeof input.active === 'boolean') doc.active = input.active;
  if (input.sortOrder != null) doc.sortOrder = input.sortOrder;

  await doc.save();
  return mapPlatformService(doc);
}

export async function deletePlatformService(id: string) {
  const res = await PlatformService.findByIdAndDelete(id);
  if (!res) throw new Error('Service not found');
  return true;
}

export async function getPlatformServicesByIds(ids: string[]) {
  if (!ids.length) return [];
  const docs = await PlatformService.find({ _id: { $in: ids } });
  return docs.map(mapPlatformService);
}
