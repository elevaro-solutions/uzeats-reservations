import {
  CUISINES,
  DISCOVERY_OCCASIONS,
  RESTAURANT_DISCOVERY_CATEGORIES,
  cuisineSlug,
  discoverySlug,
  landmarkSlug,
  type DiscoveryTaxonomyInput,
  type DiscoveryTaxonomyKind,
} from '@reservations/shared';
import {
  DiscoveryTaxonomy,
  type DiscoveryTaxonomyDocument,
} from '../models/DiscoveryTaxonomy.js';
import { paginateQuery } from '../lib/pagination.js';

/** Curated landmark seed (mirrors apps/web POPULAR_LANDMARKS). */
const LANDMARK_SEEDS: Array<{
  landmark: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}> = [
  { landmark: 'Times Square', city: 'New York', state: 'NY', lat: 40.758, lng: -73.9855 },
  { landmark: 'Empire State Building', city: 'New York', state: 'NY', lat: 40.7484, lng: -73.9857 },
  { landmark: 'Central Park', city: 'New York', state: 'NY', lat: 40.7829, lng: -73.9654 },
  { landmark: 'Brooklyn Bridge', city: 'Brooklyn', state: 'NY', lat: 40.7061, lng: -73.9969 },
  { landmark: 'Statue of Liberty', city: 'Jersey City', state: 'NJ', lat: 40.6892, lng: -74.0445 },
  { landmark: 'South Beach', city: 'Miami', state: 'FL', lat: 25.7826, lng: -80.1341 },
  { landmark: 'Walt Disney World', city: 'Orlando', state: 'FL', lat: 28.3852, lng: -81.5639 },
  { landmark: 'Independence Hall', city: 'Philadelphia', state: 'PA', lat: 39.9489, lng: -75.15 },
];

let seedPromise: Promise<void> | null = null;

export function mapDiscoveryTaxonomy(doc: any) {
  return {
    id: doc._id.toString(),
    kind: doc.kind as DiscoveryTaxonomyKind,
    slug: doc.slug,
    label: doc.label,
    description: doc.description ?? '',
    imageUrl: doc.imageUrl || null,
    iconUrl: doc.iconUrl || null,
    sortOrder: doc.sortOrder ?? 0,
    active: doc.active !== false,
    cuisine: doc.cuisine || null,
    query: doc.query || null,
    city: doc.city || null,
    state: doc.state || null,
    lat: doc.lat ?? null,
    lng: doc.lng ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type MappedDiscoveryTaxonomy = ReturnType<typeof mapDiscoveryTaxonomy>;

function stableSlugify(input: string) {
  return discoverySlug(input).slice(0, 120) || 'item';
}

async function ensureUniqueSlug(kind: DiscoveryTaxonomyKind, base: string, excludeId?: string) {
  const root = stableSlugify(base);
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await DiscoveryTaxonomy.findOne({
      kind,
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id')
      .lean();
    if (!existing) return candidate;
    candidate = `${root}-${n}`.slice(0, 120);
    n += 1;
  }
}

function seedRows(): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  RESTAURANT_DISCOVERY_CATEGORIES.forEach((c, index) => {
    rows.push({
      kind: 'category',
      slug: c.id,
      label: c.label,
      cuisine: 'cuisine' in c ? c.cuisine : '',
      query: 'query' in c ? c.query : '',
      sortOrder: index,
      active: true,
    });
  });

  CUISINES.filter((c) => c !== 'Other' && c !== 'Uzbek').forEach((cuisine, index) => {
    rows.push({
      kind: 'cuisine',
      slug: cuisineSlug(cuisine),
      label: cuisine,
      sortOrder: index,
      active: true,
    });
  });

  DISCOVERY_OCCASIONS.forEach((occasion, index) => {
    rows.push({
      kind: 'occasion',
      slug: discoverySlug(occasion),
      label: occasion,
      sortOrder: index,
      active: true,
    });
  });

  LANDMARK_SEEDS.forEach((l, index) => {
    rows.push({
      kind: 'landmark',
      slug: landmarkSlug(l.landmark, l.state),
      label: l.landmark,
      city: l.city,
      state: l.state,
      lat: l.lat,
      lng: l.lng,
      sortOrder: index,
      active: true,
    });
  });

  return rows;
}

/** Idempotent seed of curated taxonomies (skips existing kind+slug). */
export async function ensureDiscoveryTaxonomySeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const rows = seedRows();
      for (const row of rows) {
        await DiscoveryTaxonomy.updateOne(
          { kind: row.kind, slug: row.slug },
          { $setOnInsert: row },
          { upsert: true },
        );
      }
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

export async function listAdminDiscoveryTaxonomies(args: {
  kind: DiscoveryTaxonomyKind;
  search?: string | null;
  active?: boolean | null;
  limit?: number | null;
  offset?: number | null;
}) {
  await ensureDiscoveryTaxonomySeeded();
  const filter: Record<string, unknown> = { kind: args.kind };
  if (typeof args.active === 'boolean') filter.active = args.active;
  if (args.search?.trim()) {
    const q = args.search.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { label: new RegExp(escaped, 'i') },
      { slug: new RegExp(escaped, 'i') },
      { description: new RegExp(escaped, 'i') },
      { city: new RegExp(escaped, 'i') },
      { state: new RegExp(escaped, 'i') },
    ];
  }

  return paginateQuery(DiscoveryTaxonomy, filter, {
    sort: { sortOrder: 1, label: 1 },
    limit: args.limit,
    offset: args.offset,
    defaultLimit: 50,
    maxLimit: 200,
    map: (doc) => mapDiscoveryTaxonomy(doc),
  });
}

export async function listPublicDiscoveryTaxonomies(
  kind?: DiscoveryTaxonomyKind | null,
): Promise<MappedDiscoveryTaxonomy[]> {
  await ensureDiscoveryTaxonomySeeded();
  const filter: Record<string, unknown> = { active: true };
  if (kind) filter.kind = kind;
  const docs = await DiscoveryTaxonomy.find(filter)
    .sort({ kind: 1, sortOrder: 1, label: 1 })
    .lean();
  return docs.map(mapDiscoveryTaxonomy);
}

export async function getDiscoveryTaxonomyById(id: string) {
  const doc = await DiscoveryTaxonomy.findById(id);
  return doc ? mapDiscoveryTaxonomy(doc) : null;
}

export async function getDiscoveryTaxonomyBySlug(kind: DiscoveryTaxonomyKind, slug: string) {
  await ensureDiscoveryTaxonomySeeded();
  const doc = await DiscoveryTaxonomy.findOne({ kind, slug: slug.toLowerCase(), active: true });
  return doc ? mapDiscoveryTaxonomy(doc) : null;
}

function applyInput(doc: DiscoveryTaxonomyDocument, input: DiscoveryTaxonomyInput) {
  doc.label = input.label;
  doc.description = input.description ?? '';
  doc.imageUrl = input.imageUrl ?? '';
  doc.iconUrl = input.iconUrl ?? '';
  doc.sortOrder = input.sortOrder ?? 0;
  doc.active = input.active ?? true;
  doc.cuisine = input.cuisine ?? '';
  doc.query = input.query ?? '';
  doc.city = input.city ?? '';
  doc.state = input.state ?? '';
  doc.lat = input.lat ?? undefined;
  doc.lng = input.lng ?? undefined;
}

export async function createDiscoveryTaxonomy(input: DiscoveryTaxonomyInput) {
  const kind = input.kind;
  let baseSlug = input.slug?.trim();
  if (!baseSlug) {
    if (kind === 'landmark' && input.state) {
      baseSlug = landmarkSlug(input.label, input.state);
    } else if (kind === 'cuisine') {
      baseSlug = cuisineSlug(input.label);
    } else {
      baseSlug = stableSlugify(input.label);
    }
  }
  const slug = await ensureUniqueSlug(kind, baseSlug);

  const doc = await DiscoveryTaxonomy.create({
    kind,
    slug,
    label: input.label,
    description: input.description ?? '',
    imageUrl: input.imageUrl ?? '',
    iconUrl: input.iconUrl ?? '',
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
    cuisine: input.cuisine ?? '',
    query: input.query ?? '',
    city: input.city ?? '',
    state: input.state ?? '',
    lat: input.lat ?? undefined,
    lng: input.lng ?? undefined,
  });
  return mapDiscoveryTaxonomy(doc);
}

export async function updateDiscoveryTaxonomy(id: string, input: DiscoveryTaxonomyInput) {
  const doc = await DiscoveryTaxonomy.findById(id);
  if (!doc) throw new Error('Discovery taxonomy item not found');
  if (doc.kind !== input.kind) {
    throw new Error('Cannot change taxonomy kind');
  }

  let baseSlug = input.slug?.trim() || doc.slug;
  if (!input.slug?.trim() && input.kind === 'landmark' && input.state) {
    baseSlug = landmarkSlug(input.label, input.state);
  }
  doc.slug = await ensureUniqueSlug(input.kind, baseSlug, id);
  applyInput(doc, input);
  await doc.save();
  return mapDiscoveryTaxonomy(doc);
}

export async function deleteDiscoveryTaxonomy(id: string) {
  const res = await DiscoveryTaxonomy.findByIdAndDelete(id);
  return Boolean(res);
}

/** Active category defs for discovery search (DB first, constants fallback). */
export async function listActiveCategoryDefs(): Promise<
  Array<{ id: string; cuisine?: string; query?: string }>
> {
  await ensureDiscoveryTaxonomySeeded();
  const docs = await DiscoveryTaxonomy.find({ kind: 'category', active: true })
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  if (docs.length === 0) {
    return RESTAURANT_DISCOVERY_CATEGORIES.map((c) => ({
      id: c.id,
      ...('cuisine' in c ? { cuisine: c.cuisine } : {}),
      ...('query' in c ? { query: c.query } : {}),
    }));
  }
  return docs.map((d) => ({
    id: d.slug,
    ...(d.cuisine ? { cuisine: d.cuisine } : {}),
    ...(d.query ? { query: d.query } : {}),
  }));
}
