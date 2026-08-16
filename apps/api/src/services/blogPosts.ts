import type { BlogPostInput } from '@reservations/shared';
import { BlogPost, type BlogPostDocument } from '../models/BlogPost.js';
import { User } from '../models/User.js';
import { paginateQuery } from '../lib/pagination.js';
import { mapUser } from '../graphql/mappers.js';

export function stableSlugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

async function ensureUniqueSlug(base: string, excludeId?: string) {
  const root = stableSlugify(base) || 'post';
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await BlogPost.findOne({
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

function normalizeTags(tags: string[] | undefined) {
  return [...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

function resolvePublishedAt(
  status: BlogPostInput['status'],
  publishedAt: BlogPostInput['publishedAt'],
  previous?: Date | null,
) {
  if (status !== 'published') return publishedAt ?? previous ?? null;
  if (publishedAt) return publishedAt;
  return previous ?? new Date();
}

export function mapBlogPost(doc: any, author?: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt ?? '',
    bodyHtml: doc.bodyHtml,
    coverImageUrl: doc.coverImageUrl || null,
    status: doc.status,
    publishedAt: doc.publishedAt ?? null,
    seoTitle: doc.seoTitle ?? '',
    seoDescription: doc.seoDescription ?? '',
    tags: doc.tags ?? [],
    faq: (doc.faq ?? []).map((f: any) => ({
      question: f.question,
      answer: f.answer,
    })),
    authorId: doc.authorId ? doc.authorId.toString() : null,
    author: author ? mapUser(author) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function attachAuthors(items: ReturnType<typeof mapBlogPost>[]) {
  const authorIds = [...new Set(items.map((i) => i.authorId).filter(Boolean))] as string[];
  if (!authorIds.length) return items;
  const users = await User.find({ _id: { $in: authorIds } }).lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return items.map((item) => ({
    ...item,
    author: item.authorId && byId.has(item.authorId) ? mapUser(byId.get(item.authorId)) : null,
  }));
}

export async function listAdminBlogPosts(args: {
  search?: string | null;
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
}) {
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.search?.trim()) {
    const q = args.search.trim();
    filter.$or = [
      { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { slug: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { tags: q.toLowerCase() },
    ];
  }

  const page = await paginateQuery(BlogPost, filter, {
    sort: { updatedAt: -1 },
    limit: args.limit,
    offset: args.offset,
    defaultLimit: 20,
    map: (doc) => mapBlogPost(doc),
  });
  return {
    ...page,
    items: await attachAuthors(page.items),
  };
}

export async function listPublishedBlogPosts(args: {
  tag?: string | null;
  limit?: number | null;
  offset?: number | null;
}) {
  const filter: Record<string, unknown> = { status: 'published' };
  if (args.tag?.trim()) filter.tags = args.tag.trim().toLowerCase();

  const page = await paginateQuery(BlogPost, filter, {
    sort: { publishedAt: -1, createdAt: -1 },
    limit: args.limit,
    offset: args.offset,
    defaultLimit: 20,
    map: (doc) => mapBlogPost(doc),
  });
  return {
    ...page,
    items: await attachAuthors(page.items),
  };
}

export async function getBlogPostBySlug(slug: string, opts?: { includeDrafts?: boolean }) {
  const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
  if (!opts?.includeDrafts) filter.status = 'published';
  const doc = await BlogPost.findOne(filter);
  if (!doc) return null;
  const mapped = mapBlogPost(doc);
  const [withAuthor] = await attachAuthors([mapped]);
  return withAuthor;
}

export async function getBlogPostById(id: string) {
  const doc = await BlogPost.findById(id);
  if (!doc) return null;
  const mapped = mapBlogPost(doc);
  const [withAuthor] = await attachAuthors([mapped]);
  return withAuthor;
}

export async function listPublishedBlogSitemapEntries() {
  const docs = await BlogPost.find({ status: 'published' })
    .select('slug updatedAt publishedAt')
    .sort({ publishedAt: -1 })
    .lean();
  return docs.map((d) => ({
    slug: d.slug,
    lastModified: (d.updatedAt as Date | undefined) ?? (d.publishedAt as Date | undefined) ?? new Date(),
  }));
}

export async function createBlogPost(input: BlogPostInput, authorId: string) {
  const baseSlug = input.slug?.trim() || stableSlugify(input.title);
  const slug = await ensureUniqueSlug(baseSlug);
  const status = input.status ?? 'draft';
  const doc = await BlogPost.create({
    title: input.title,
    slug,
    excerpt: input.excerpt ?? '',
    bodyHtml: input.bodyHtml,
    coverImageUrl: input.coverImageUrl ?? '',
    status,
    publishedAt: resolvePublishedAt(status, input.publishedAt ?? null),
    authorId,
    seoTitle: input.seoTitle ?? '',
    seoDescription: input.seoDescription ?? '',
    tags: normalizeTags(input.tags),
    faq: input.faq ?? [],
  });
  return mapBlogPost(doc, await User.findById(authorId));
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  const doc = await BlogPost.findById(id);
  if (!doc) throw new Error('Blog post not found');

  const status = input.status ?? doc.status;
  const baseSlug = input.slug?.trim() || doc.slug || stableSlugify(input.title);
  doc.title = input.title;
  doc.slug = await ensureUniqueSlug(baseSlug, id);
  doc.excerpt = input.excerpt ?? '';
  doc.bodyHtml = input.bodyHtml;
  doc.coverImageUrl = input.coverImageUrl ?? '';
  doc.status = status;
  doc.publishedAt = resolvePublishedAt(status, input.publishedAt ?? null, doc.publishedAt as Date | null);
  doc.seoTitle = input.seoTitle ?? '';
  doc.seoDescription = input.seoDescription ?? '';
  doc.tags = normalizeTags(input.tags);
  doc.set('faq', input.faq ?? []);
  await doc.save();

  const author = doc.authorId ? await User.findById(doc.authorId) : null;
  return mapBlogPost(doc, author);
}

export async function deleteBlogPost(id: string) {
  const res = await BlogPost.findByIdAndDelete(id);
  return Boolean(res);
}

export async function publishBlogPost(id: string) {
  const doc = await BlogPost.findById(id);
  if (!doc) throw new Error('Blog post not found');
  doc.status = 'published';
  if (!doc.publishedAt) doc.publishedAt = new Date();
  await doc.save();
  const author = doc.authorId ? await User.findById(doc.authorId) : null;
  return mapBlogPost(doc, author);
}

export type { BlogPostDocument };
