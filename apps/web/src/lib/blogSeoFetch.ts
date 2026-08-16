import { cache } from 'react';
import { serverGraphql } from '@/lib/serverGraphql';

export type BlogPostSeo = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  coverImageUrl?: string | null;
  status: string;
  publishedAt?: string | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  faq: Array<{ question: string; answer: string }>;
  author?: { firstName?: string | null; lastName?: string | null } | null;
  updatedAt?: string | null;
};

const POST_SELECTION = `
  id
  title
  slug
  excerpt
  bodyHtml
  coverImageUrl
  status
  publishedAt
  seoTitle
  seoDescription
  tags
  faq { question answer }
  author { firstName lastName }
  updatedAt
`;

const BLOG_FETCH = { revalidate: 30, tags: ['blog-posts'] } as const;

export const fetchPublishedBlogPosts = cache(async (limit = 50, offset = 0) => {
  const data = await serverGraphql<{
    blogPosts: { items: BlogPostSeo[]; total: number };
  }>(
    `query BlogPosts($limit: Int, $offset: Int) {
      blogPosts(limit: $limit, offset: $offset) {
        total
        items { ${POST_SELECTION} }
      }
    }`,
    { limit, offset },
    BLOG_FETCH,
  );
  return data.blogPosts;
});

export const fetchBlogPostBySlug = cache(async (slug: string) => {
  const data = await serverGraphql<{ blogPost: BlogPostSeo | null }>(
    `query BlogPost($slug: String!) {
      blogPost(slug: $slug) {
        ${POST_SELECTION}
      }
    }`,
    { slug },
    BLOG_FETCH,
  );
  return data.blogPost;
});

export async function fetchBlogSitemapEntries() {
  try {
    const { items } = await fetchPublishedBlogPosts(100, 0);
    return items.map((p) => ({
      slug: p.slug,
      lastModified: p.updatedAt || p.publishedAt || undefined,
    }));
  } catch {
    return [];
  }
}
