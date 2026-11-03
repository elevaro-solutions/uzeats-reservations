/**
 * Copy legacy DigitalOcean Spaces objects (`uploads/<file>`) into the folder
 * layout and rewrite the URLs stored in Mongo. Bytes are copied inside the
 * bucket. Original objects stay until a later run with `--delete-sources`.
 *
 * Production (tablevera.online) — from apps/api, with prod MONGODB_URI and
 * DO_SPACES_* in the environment. Deploy the folder-aware API first so new
 * uploads are not still landing in `uploads/`.
 *
 *   pnpm exec tsx scripts/migrate-spaces-layout.ts
 *   pnpm exec tsx scripts/migrate-spaces-layout.ts --list-orphans
 *   pnpm exec tsx scripts/migrate-spaces-layout.ts --apply --confirm-production
 *   # at least 14 days later, after spot-checking live pages:
 *   pnpm exec tsx scripts/migrate-spaces-layout.ts --apply --confirm-production --delete-sources
 *
 * Dry-run is the default. `--confirm-production` is required when the database
 * host is not localhost. External (non-Spaces) image URLs are reported only;
 * rehost those with scripts/rehost-external-images.ts.
 */
import mongoose, { type Model } from 'mongoose';
import { uploadKeyPrefix, type RestaurantUploadKind } from '@reservations/shared';
import { env } from '../src/config/env.js';
import { BlogPost } from '../src/models/BlogPost.js';
import { DiscoveryTaxonomy } from '../src/models/DiscoveryTaxonomy.js';
import { Experience } from '../src/models/Experience.js';
import { Menu } from '../src/models/Menu.js';
import { PrivateDiningSpace } from '../src/models/PrivateDining.js';
import { QaIssue } from '../src/models/QaIssue.js';
import { Restaurant } from '../src/models/Restaurant.js';
import { RestaurantPackage } from '../src/models/RestaurantPackage.js';
import { RestaurantProfileChangeRequest } from '../src/models/RestaurantProfileChangeRequest.js';
import { Review } from '../src/models/Review.js';
import { SupportTicket } from '../src/models/SupportTicket.js';
import { Table } from '../src/models/Table.js';
import { TableShapeDef } from '../src/models/TableShapeDef.js';
import { User } from '../src/models/User.js';
import { VirtualRoom } from '../src/models/VirtualRoom.js';
import {
  chooseMigrationPrefix,
  legacyUploadsFilename,
  migratedObjectKey,
  rewriteStoredValue,
} from '../src/services/spacesMigration.js';
import {
  copyUploadObject,
  deleteLegacyUploadObject,
  isScopedUploadPrefix,
  listLegacyUploadKeys,
  publicUrlForUploadKey,
  uploadObjectKeyFromUrl,
} from '../src/services/spaces.js';

const OBJECT_ID = /^[a-f0-9]{24}$/;

type Hit = {
  key: string;
  urls: Set<string>;
  prefixes: Map<string, number>;
  samples: string[];
};

type ExternalHit = { host: string; count: number; sample: string };

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes('--apply'),
    confirmProduction: argv.includes('--confirm-production'),
    deleteSources: argv.includes('--delete-sources'),
    listOrphans: argv.includes('--list-orphans'),
  };
}

function databaseHost(uri: string): string {
  const afterAt = uri.includes('@') ? uri.slice(uri.lastIndexOf('@') + 1) : uri;
  return afterAt.split('/')[0]?.split('?')[0] ?? 'unknown';
}

function isLocalHost(host: string) {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function objectId(value: unknown): string | null {
  const id = String(value ?? '').toLowerCase();
  return OBJECT_ID.test(id) ? id : null;
}

class Catalog {
  readonly hits = new Map<string, Hit>();
  readonly external = new Map<string, ExternalHit>();
  alreadyScoped = 0;
  badIds = 0;

  note(url: unknown, prefix: string | null, sample: string) {
    if (typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const key = uploadObjectKeyFromUrl(trimmed);
    if (key?.startsWith('restaurants/') || key?.startsWith('accounts/') || key?.startsWith('platform/')) {
      this.alreadyScoped += 1;
      return;
    }
    if (key && legacyUploadsFilename(key)) {
      if (!prefix) {
        this.badIds += 1;
        return;
      }
      const hit = this.hits.get(key) ?? {
        key,
        urls: new Set<string>(),
        prefixes: new Map<string, number>(),
        samples: [],
      };
      hit.urls.add(trimmed);
      hit.prefixes.set(prefix, (hit.prefixes.get(prefix) ?? 0) + 1);
      if (hit.samples.length < 4) hit.samples.push(sample);
      this.hits.set(key, hit);
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;
    let host = '(invalid)';
    try {
      host = new URL(trimmed).hostname.toLowerCase();
    } catch {
      /* keep invalid */
    }
    const current = this.external.get(host);
    if (current) current.count += 1;
    else this.external.set(host, { host, count: 1, sample: trimmed });
  }

  noteText(text: unknown, prefix: string | null, sample: string) {
    if (typeof text !== 'string' || !text.includes('http')) return;
    for (const match of text.matchAll(/https?:\/\/[^\s"'<>\\)]+/g)) {
      this.note(match[0], prefix, sample);
    }
  }
}

function restaurantPrefix(restaurantId: unknown, kind: RestaurantUploadKind): string | null {
  const id = objectId(restaurantId);
  if (!id) return null;
  return uploadKeyPrefix({ scope: 'restaurant', restaurantId: id, kind });
}

function accountPrefix(userId: unknown, kind: 'avatar' | 'support' | 'drafts'): string | null {
  const id = objectId(userId);
  if (!id) return null;
  return uploadKeyPrefix({ scope: 'account', kind }, id);
}

function visitBackgrounds(value: unknown, note: (url: unknown) => void) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) visitBackgrounds(item, note);
    return;
  }
  const record = value as Record<string, unknown>;
  note(record.backgroundUrl);
  if (record.areaAppearances) visitBackgrounds(record.areaAppearances, note);
}

function visitAttachments(
  attachments: unknown,
  catalog: Catalog,
  prefixFor: (attachment: Record<string, unknown>) => string | null,
  sample: string,
) {
  if (!Array.isArray(attachments)) return;
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object') continue;
    const record = attachment as Record<string, unknown>;
    catalog.note(record.url, prefixFor(record), sample);
  }
}

type PhotoModel = Model<{
  restaurantId?: unknown;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
}>;

async function scan(catalog: Catalog) {
  const restaurants = await Restaurant.find({})
    .select({
      logoUrl: 1,
      photos: 1,
      featuredIn: 1,
      floorPlanBackgroundUrl: 1,
      floorPlanAreaAppearances: 1,
      floorPlanDraft: 1,
    })
    .lean();
  for (const restaurant of restaurants) {
    const branding = restaurantPrefix(restaurant._id, 'branding');
    const floor = restaurantPrefix(restaurant._id, 'floor');
    const sample = `restaurant ${String(restaurant._id)}`;
    catalog.note(restaurant.logoUrl, branding, `${sample} logo`);
    for (const photo of restaurant.photos ?? []) catalog.note(photo, branding, `${sample} photo`);
    for (const feature of restaurant.featuredIn ?? []) {
      catalog.note(feature.logoUrl, branding, `${sample} featured logo`);
    }
    catalog.note(restaurant.floorPlanBackgroundUrl, floor, `${sample} floor`);
    visitBackgrounds(restaurant.floorPlanAreaAppearances, (url) =>
      catalog.note(url, floor, `${sample} floor area`),
    );
    visitBackgrounds(restaurant.floorPlanDraft, (url) =>
      catalog.note(url, floor, `${sample} floor draft`),
    );
  }

  const menus = await Menu.find({}).select({ restaurantId: 1, sections: 1 }).lean();
  for (const menu of menus) {
    const prefix = restaurantPrefix(menu.restaurantId, 'menu');
    for (const section of menu.sections ?? []) {
      for (const item of section.items ?? []) {
        catalog.note(item.photoUrl, prefix, `menu ${String(menu.restaurantId)}`);
      }
    }
  }

  await scanPhotoUrl(Table as unknown as PhotoModel, 'floor', 'table');
  await scanPhotoUrl(Experience as unknown as PhotoModel, 'experiences', 'experience');
  await scanPhotoUrl(RestaurantPackage as unknown as PhotoModel, 'packages', 'package');
  await scanPhotoUrl(PrivateDiningSpace as unknown as PhotoModel, 'other', 'private dining');

  const rooms = await VirtualRoom.find({})
    .select({ restaurantId: 1, media: 1, reconstruction: 1 })
    .lean();
  for (const room of rooms) {
    const prefix = restaurantPrefix(room.restaurantId, 'virtual-room');
    const sample = `virtual room ${String(room.restaurantId)}`;
    for (const media of room.media ?? []) catalog.note(media.url, prefix, sample);
    catalog.note(room.reconstruction?.modelUrl, prefix, `${sample} model`);
  }

  const reviews = await Review.find({})
    .select({ restaurantId: 1, photos: 1, reportResponses: 1 })
    .lean();
  for (const review of reviews) {
    const prefix = restaurantPrefix(review.restaurantId, 'reviews');
    for (const photo of review.photos ?? []) {
      catalog.note(photo, prefix, `review ${String(review.restaurantId)}`);
    }
    for (const response of review.reportResponses ?? []) {
      visitAttachments(response.attachments, catalog, () => uploadKeyPrefix({ scope: 'platform', kind: 'support' }), `review report ${String(review._id)}`);
    }
  }

  const users = await User.find({ avatarUrl: { $exists: true, $ne: '' } })
    .select({ avatarUrl: 1 })
    .lean();
  for (const user of users) {
    catalog.note(user.avatarUrl, accountPrefix(user._id, 'avatar'), `avatar ${String(user._id)}`);
  }

  const tickets = await SupportTicket.find({}).select({ attachments: 1, notes: 1 }).lean();
  for (const ticket of tickets) {
    const sample = `support ${String(ticket._id)}`;
    const prefixFor = (attachment: Record<string, unknown>) =>
      accountPrefix(attachment.uploadedById, 'support') ??
      uploadKeyPrefix({ scope: 'platform', kind: 'support' });
    visitAttachments(ticket.attachments, catalog, prefixFor, sample);
    for (const note of ticket.notes ?? []) visitAttachments(note.attachments, catalog, prefixFor, sample);
  }

  const issues = await QaIssue.find({}).select({ reporterId: 1, attachments: 1 }).lean();
  for (const issue of issues) {
    visitAttachments(
      issue.attachments,
      catalog,
      () => accountPrefix(issue.reporterId, 'support') ?? uploadKeyPrefix({ scope: 'platform', kind: 'support' }),
      `qa ${String(issue._id)}`,
    );
  }

  const posts = await BlogPost.find({}).select({ coverImageUrl: 1, bodyHtml: 1, slug: 1 }).lean();
  for (const post of posts) {
    const prefix = uploadKeyPrefix({ scope: 'platform', kind: 'blog' });
    catalog.note(post.coverImageUrl, prefix, `blog ${post.slug}`);
    catalog.noteText(post.bodyHtml, prefix, `blog ${post.slug} body`);
  }

  const taxonomies = await DiscoveryTaxonomy.find({}).select({ imageUrl: 1, iconUrl: 1, slug: 1 }).lean();
  for (const taxonomy of taxonomies) {
    const prefix = uploadKeyPrefix({ scope: 'platform', kind: 'discovery' });
    catalog.note(taxonomy.imageUrl, prefix, `discovery ${taxonomy.slug ?? taxonomy._id}`);
    catalog.note(taxonomy.iconUrl, prefix, `discovery icon ${taxonomy.slug ?? taxonomy._id}`);
  }

  const shapes = await TableShapeDef.find({}).select({ iconUrl: 1, key: 1 }).lean();
  for (const shape of shapes) {
    catalog.note(
      shape.iconUrl,
      uploadKeyPrefix({ scope: 'platform', kind: 'table-shapes' }),
      `table shape ${shape.key ?? shape._id}`,
    );
  }

  const changes = await RestaurantProfileChangeRequest.find({})
    .select({ restaurantId: 1, current: 1, proposed: 1 })
    .lean();
  for (const change of changes) {
    const prefix = restaurantPrefix(change.restaurantId, 'branding');
    const sample = `profile change ${String(change.restaurantId)}`;
    for (const side of [change.current, change.proposed]) {
      if (!side || typeof side !== 'object') continue;
      const record = side as { logoUrl?: unknown; photos?: unknown; featuredIn?: unknown };
      catalog.note(record.logoUrl, prefix, sample);
      if (Array.isArray(record.photos)) {
        for (const photo of record.photos) catalog.note(photo, prefix, sample);
      }
      if (Array.isArray(record.featuredIn)) {
        for (const feature of record.featuredIn) {
          if (feature && typeof feature === 'object') {
            catalog.note((feature as { logoUrl?: unknown }).logoUrl, prefix, sample);
          }
        }
      }
    }
  }

  async function scanPhotoUrl(model: PhotoModel, kind: RestaurantUploadKind, label: string) {
    const docs = await model.find({}).select({ restaurantId: 1, photoUrl: 1, photoUrls: 1 }).lean();
    for (const doc of docs) {
      const prefix = restaurantPrefix(doc.restaurantId, kind);
      const sample = `${label} ${String(doc.restaurantId)}`;
      catalog.note(doc.photoUrl, prefix, sample);
      for (const photo of doc.photoUrls ?? []) catalog.note(photo, prefix, sample);
    }
  }
}

async function rewriteCollection(
  label: string,
  model: Model<Record<string, unknown>>,
  apply: boolean,
  urlMap: Map<string, string>,
  keyMap: Map<string, string>,
) {
  const docs = await model.find({}).lean();
  let changed = 0;
  for (const doc of docs) {
    const rewritten = rewriteStoredValue(doc, urlMap, keyMap);
    if (!rewritten.changed || !rewritten.value || typeof rewritten.value !== 'object') continue;
    changed += 1;
    if (!apply) continue;
    const { _id, ...rest } = rewritten.value as { _id: unknown };
    await model.updateOne({ _id }, { $set: rest });
  }
  console.log(`  ${label}: ${changed} document${changed === 1 ? '' : 's'}${apply ? ' updated' : ' to update'}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = databaseHost(env.MONGODB_URI);
  console.log(`Database host: ${host}`);
  console.log(`Spaces bucket: ${env.DO_SPACES_BUCKET}`);
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);

  if ((args.apply || args.deleteSources) && !isLocalHost(host) && !args.confirmProduction) {
    console.error('Refusing to modify a non-local database. Re-run with --confirm-production.');
    process.exitCode = 1;
    return;
  }
  if (args.deleteSources && !args.apply) {
    console.error('--delete-sources requires --apply.');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
  const catalog = new Catalog();
  await scan(catalog);

  const hits = [...catalog.hits.values()].sort((a, b) => a.key.localeCompare(b.key));
  const folderCounts = new Map<string, number>();
  let conflicts = 0;
  const plan: { from: string; to: string; urls: string[] }[] = [];
  for (const hit of hits) {
    const prefix = chooseMigrationPrefix(hit.prefixes.keys());
    if (hit.prefixes.size > 1) conflicts += 1;
    folderCounts.set(prefix, (folderCounts.get(prefix) ?? 0) + 1);
    try {
      const toKey = migratedObjectKey(prefix, hit.key);
      if (!isScopedUploadPrefix(prefix)) throw new Error(`Unsafe prefix ${prefix}`);
      plan.push({ from: hit.key, to: toKey, urls: [...hit.urls] });
    } catch (err) {
      console.error(`SKIP ${hit.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nLegacy objects referenced in Mongo: ${hits.length}`);
  console.log(`Already in a scoped folder (left as-is): ${catalog.alreadyScoped}`);
  console.log(`References skipped for a bad id: ${catalog.badIds}`);
  console.log(`Objects used by more than one folder (copied to platform/imports): ${conflicts}`);
  console.log('Destination folders:');
  for (const [prefix, count] of [...folderCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${prefix}`);
  }
  console.log('\nSample moves (up to 15):');
  for (const item of plan.slice(0, 15)) {
    console.log(`  ${item.from} -> ${item.to}`);
  }

  if (catalog.external.size > 0) {
    console.log('\nNon-Spaces image URLs (not copied; see rehost-external-images.ts):');
    for (const hit of [...catalog.external.values()].sort((a, b) => b.count - a.count)) {
      console.log(`  ${hit.count}\t${hit.host}\t${hit.sample}`);
    }
  }

  if (args.listOrphans) {
    const referenced = new Set(hits.map((hit) => hit.key));
    const listed = await listLegacyUploadKeys();
    const orphans = listed.filter((key) => !referenced.has(key));
    console.log(`\nBucket keys under uploads/: ${listed.length}`);
    console.log(`Unreferenced uploads/ keys (left in place): ${orphans.length}`);
    for (const key of orphans.slice(0, 20)) console.log(`  ${key}`);
  }

  const ready: typeof plan = [];
  if (args.apply) {
    for (const item of plan) {
      try {
        const copied = await copyUploadObject(item.from, item.to);
        ready.push(item);
        console.log(`${copied.copied ? 'COPIED' : 'EXISTS'} ${item.from} -> ${item.to}`);
      } catch (err) {
        console.error(`COPY FAIL ${item.from}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else {
    ready.push(...plan);
  }

  const urlMap = new Map<string, string>();
  const keyMap = new Map<string, string>();
  for (const item of ready) {
    keyMap.set(item.from, item.to);
    const nextUrl = publicUrlForUploadKey(item.to);
    for (const url of item.urls) urlMap.set(url, nextUrl);
  }

  console.log(`\nMongo ${args.apply ? 'updates' : 'that would change'}:`);
  const collections: [string, Model<Record<string, unknown>>][] = [
    ['restaurants', Restaurant as unknown as Model<Record<string, unknown>>],
    ['menus', Menu as unknown as Model<Record<string, unknown>>],
    ['tables', Table as unknown as Model<Record<string, unknown>>],
    ['experiences', Experience as unknown as Model<Record<string, unknown>>],
    ['packages', RestaurantPackage as unknown as Model<Record<string, unknown>>],
    ['private dining', PrivateDiningSpace as unknown as Model<Record<string, unknown>>],
    ['virtual rooms', VirtualRoom as unknown as Model<Record<string, unknown>>],
    ['reviews', Review as unknown as Model<Record<string, unknown>>],
    ['users', User as unknown as Model<Record<string, unknown>>],
    ['support tickets', SupportTicket as unknown as Model<Record<string, unknown>>],
    ['qa issues', QaIssue as unknown as Model<Record<string, unknown>>],
    ['blog posts', BlogPost as unknown as Model<Record<string, unknown>>],
    ['discovery', DiscoveryTaxonomy as unknown as Model<Record<string, unknown>>],
    ['table shapes', TableShapeDef as unknown as Model<Record<string, unknown>>],
    ['profile changes', RestaurantProfileChangeRequest as unknown as Model<Record<string, unknown>>],
  ];
  for (const [label, model] of collections) {
    await rewriteCollection(label, model, args.apply, urlMap, keyMap);
  }

  if (args.apply && args.deleteSources) {
    let removed = 0;
    for (const item of ready) {
      try {
        await deleteLegacyUploadObject(item.from);
        removed += 1;
        console.log(`DELETED ${item.from}`);
      } catch (err) {
        console.error(`DELETE FAIL ${item.from}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(`Deleted legacy objects: ${removed}`);
  } else if (args.apply) {
    console.log('\nLegacy objects were kept. Delete them only after live pages check out, with --delete-sources.');
  } else {
    console.log('\nDry-run only. Re-run with --apply --confirm-production to copy objects and rewrite Mongo.');
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
