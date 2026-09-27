/**
 * Rehost non–DigitalOcean Spaces image URLs (restaurant gallery, logo, menu
 * item photos) into DO Spaces and rewrite Mongo fields.
 *
 * Production audit (tablevera.online, 2026-09-26): 7 restaurants, ~62 gallery
 * + ~174 menu URLs on netlify / Google / restaurant sites / Uber CDN.
 *
 * Usage (from apps/api, with prod MONGODB_URI + DO_SPACES_* in env):
 *   pnpm exec tsx scripts/rehost-external-images.ts           # dry-run
 *   pnpm exec tsx scripts/rehost-external-images.ts --apply   # upload + update
 *   pnpm exec tsx scripts/rehost-external-images.ts --apply --slug=new-york-pasta-garden
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import {
  isPrivateIpAddress,
  SafeRemoteImageError,
} from '../src/lib/safeRemoteImage.js';
import {
  buildUploadKey,
  sniffAllowedImageContentType,
  uploadObject,
} from '../src/services/spaces.js';
import { Menu } from '../src/models/Menu.js';
import { Restaurant } from '../src/models/Restaurant.js';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;

type Ref =
  | { kind: 'restaurant.photos'; restaurantId: string; index: number }
  | { kind: 'restaurant.logoUrl'; restaurantId: string }
  | {
      kind: 'menu.item.photoUrl';
      menuId: string;
      sectionIndex: number;
      itemIndex: number;
    };

type UrlHit = {
  url: string;
  host: string;
  refs: Ref[];
};

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const slugArg = argv.find((a) => a.startsWith('--slug='));
  const slug = slugArg?.slice('--slug='.length)?.trim() || undefined;
  return { apply, slug };
}

function isSpacesUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host.endsWith('.digitaloceanspaces.com')) return true;
    const cdn = env.DO_SPACES_CDN?.trim();
    if (cdn) {
      try {
        if (new URL(cdn).hostname.toLowerCase() === host) return true;
      } catch {
        /* ignore bad CDN env */
      }
    }
    return false;
  } catch {
    return false;
  }
}

function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '(invalid)';
  }
}

async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeRemoteImageError('Invalid imageUrl', 400);
  }
  if (url.protocol !== 'https:') {
    throw new SafeRemoteImageError('Only https image URLs are allowed', 400);
  }
  if (url.username || url.password) {
    throw new SafeRemoteImageError('Image URL must not include credentials', 400);
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new SafeRemoteImageError('Image host not allowed', 400);
  }
  if (isPrivateIpAddress(host)) {
    throw new SafeRemoteImageError('Image host not allowed', 400);
  }
  const { address } = await import('node:dns/promises').then((dns) =>
    dns.lookup(url.hostname),
  );
  if (isPrivateIpAddress(address)) {
    throw new SafeRemoteImageError('Image host not allowed', 400);
  }
  return url;
}

/** SSRF-safe fetch for URLs already stored in Mongo (any public https host). */
async function fetchStoredImage(url: string): Promise<{ body: Buffer; contentType: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = await assertPublicHttpsUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'tablevera-rehost-bot/1.0',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
    } catch (err) {
      if (err instanceof SafeRemoteImageError) throw err;
      throw new SafeRemoteImageError(
        `Could not download image: ${err instanceof Error ? err.message : 'unknown'}`,
        422,
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new SafeRemoteImageError(`Could not download image (${res.status})`, 422);
      }
      current = new URL(location, parsed).toString();
      continue;
    }

    if (!res.ok) {
      throw new SafeRemoteImageError(`Could not download image (${res.status})`, 422);
    }

    const body = Buffer.from(await res.arrayBuffer());
    if (body.length === 0) {
      throw new SafeRemoteImageError('Downloaded image is empty', 422);
    }
    if (body.length > MAX_BYTES) {
      throw new SafeRemoteImageError('Image too large (max 5 MB)', 413);
    }
    const contentType = sniffAllowedImageContentType(body);
    if (!contentType) {
      throw new SafeRemoteImageError('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF', 400);
    }
    return { body, contentType };
  }
  throw new SafeRemoteImageError('Too many redirects', 400);
}

function filenameHintFromUrl(url: string): string {
  try {
    const base = new URL(url).pathname.split('/').pop() || 'image';
    return base.slice(0, 80) || 'image';
  } catch {
    return 'image';
  }
}

function collectHits(
  restaurants: Array<{
    _id: mongoose.Types.ObjectId;
    slug?: string | null;
    name: string;
    photos?: string[] | null;
    logoUrl?: string | null;
  }>,
  menus: Array<{
    _id: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    sections?: Array<{
      items?: Array<{ photoUrl?: string | null }>;
    }>;
  }>,
): Map<string, UrlHit> {
  const byUrl = new Map<string, UrlHit>();

  const add = (url: string | null | undefined, ref: Ref) => {
    const trimmed = url?.trim();
    if (!trimmed || isSpacesUrl(trimmed)) return;
    const existing = byUrl.get(trimmed);
    if (existing) {
      existing.refs.push(ref);
      return;
    }
    byUrl.set(trimmed, {
      url: trimmed,
      host: hostOf(trimmed),
      refs: [ref],
    });
  };

  for (const r of restaurants) {
    const id = String(r._id);
    (r.photos ?? []).forEach((photo, index) => {
      add(photo, { kind: 'restaurant.photos', restaurantId: id, index });
    });
    add(r.logoUrl, { kind: 'restaurant.logoUrl', restaurantId: id });
  }

  for (const menu of menus) {
    const menuId = String(menu._id);
    (menu.sections ?? []).forEach((section, sectionIndex) => {
      (section.items ?? []).forEach((item, itemIndex) => {
        add(item.photoUrl, {
          kind: 'menu.item.photoUrl',
          menuId,
          sectionIndex,
          itemIndex,
        });
      });
    });
  }

  return byUrl;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const { apply, slug } = parseArgs(process.argv.slice(2));

  if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET) {
    console.warn(
      '[warn] DO_SPACES_KEY/SECRET unset — uploadObject will write local .data/uploads (dev only).',
    );
  }

  await mongoose.connect(env.MONGODB_URI);

  const restaurantFilter = slug ? { slug } : {};
  const restaurants = await Restaurant.find(restaurantFilter)
    .select({ _id: 1, name: 1, slug: 1, photos: 1, logoUrl: 1 })
    .lean();

  if (slug && restaurants.length === 0) {
    console.error(`No restaurant with slug=${slug}`);
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const restaurantIds = restaurants.map((r) => r._id);
  const menus = await Menu.find({ restaurantId: { $in: restaurantIds } })
    .select({ _id: 1, restaurantId: 1, sections: 1 })
    .lean();

  const hits = collectHits(restaurants, menus);
  const list = [...hits.values()].sort((a, b) => a.host.localeCompare(b.host) || a.url.localeCompare(b.url));

  const hostCounts = new Map<string, number>();
  for (const hit of list) {
    hostCounts.set(hit.host, (hostCounts.get(hit.host) ?? 0) + 1);
  }

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Restaurants scanned: ${restaurants.length}${slug ? ` (slug=${slug})` : ''}`);
  console.log(`Menus scanned: ${menus.length}`);
  console.log(`Unique non-Spaces URLs: ${list.length}`);
  console.log('Hosts:');
  for (const [host, count] of [...hostCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${host}`);
  }

  if (list.length === 0) {
    console.log('Nothing to rehost.');
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    console.log('\nSample URLs (up to 20):');
    for (const hit of list.slice(0, 20)) {
      console.log(`  [${hit.refs.length} refs] ${hit.url}`);
    }
    console.log('\nRe-run with --apply to download, upload to Spaces, and rewrite Mongo.');
    await mongoose.disconnect();
    return;
  }

  const urlToSpaces = new Map<string, string>();
  let ok = 0;
  let failed = 0;

  await mapPool(list, CONCURRENCY, async (hit) => {
    try {
      const fetched = await fetchStoredImage(hit.url);
      const key = buildUploadKey(filenameHintFromUrl(hit.url), fetched.contentType);
      const uploaded = await uploadObject({
        key,
        contentType: fetched.contentType,
        body: fetched.body,
      });
      urlToSpaces.set(hit.url, uploaded.publicUrl);
      ok += 1;
      console.log(`OK  ${hit.url} -> ${uploaded.publicUrl}`);
    } catch (err) {
      failed += 1;
      console.error(
        `FAIL ${hit.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // Apply restaurant updates
  let restaurantsUpdated = 0;
  for (const r of restaurants) {
    const photos = [...(r.photos ?? [])];
    let changed = false;
    for (let i = 0; i < photos.length; i += 1) {
      const next = urlToSpaces.get(photos[i]!);
      if (next) {
        photos[i] = next;
        changed = true;
      }
    }
    const $set: { photos: string[]; logoUrl?: string } = { photos };
    if (r.logoUrl && urlToSpaces.has(r.logoUrl)) {
      $set.logoUrl = urlToSpaces.get(r.logoUrl)!;
      changed = true;
    }
    if (!changed) continue;
    await Restaurant.updateOne({ _id: r._id }, { $set });
    restaurantsUpdated += 1;
    console.log(`Updated restaurant ${r.slug ?? String(r._id)}`);
  }

  // Apply menu updates (replace nested photoUrl strings)
  let menusUpdated = 0;
  for (const menu of menus) {
    const sections = structuredClone(menu.sections ?? []);
    let changed = false;
    for (const section of sections) {
      for (const item of section.items ?? []) {
        const current = item.photoUrl?.trim();
        if (!current) continue;
        const next = urlToSpaces.get(current);
        if (next) {
          item.photoUrl = next;
          changed = true;
        }
      }
    }
    if (!changed) continue;
    await Menu.updateOne({ _id: menu._id }, { $set: { sections } });
    menusUpdated += 1;
    console.log(`Updated menu ${String(menu._id)} (restaurant ${String(menu.restaurantId)})`);
  }

  console.log('\nDone.');
  console.log(`  uploaded: ${ok}`);
  console.log(`  failed:   ${failed}`);
  console.log(`  restaurants updated: ${restaurantsUpdated}`);
  console.log(`  menus updated: ${menusUpdated}`);

  await mongoose.disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
