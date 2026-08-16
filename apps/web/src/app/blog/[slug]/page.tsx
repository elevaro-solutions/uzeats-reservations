import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchBlogPostBySlug, fetchPublishedBlogPosts } from '@/lib/blogSeoFetch';
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

/** Keep article pages fresh after admin edits. */
export const revalidate = 30;

export async function generateStaticParams() {
  try {
    const { items } = await fetchPublishedBlogPosts(100, 0);
    return items.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug).catch(() => null);
  if (!post) {
    return { title: 'Article not found — Tablevera' };
  }

  const title = post.seoTitle || `${post.title} — Tablevera`;
  const description =
    post.seoDescription ||
    post.excerpt ||
    `${post.title} — restaurant reservations insights from Tablevera.`;
  const path = `/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title,
      description,
      url: absoluteUrl(path),
      siteName: 'Tablevera',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function authorName(post: { author?: { firstName?: string | null; lastName?: string | null } | null }) {
  const first = post.author?.firstName?.trim() ?? '';
  const last = post.author?.lastName?.trim() ?? '';
  const name = `${first} ${last}`.trim();
  return name || 'Tablevera';
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug).catch(() => null);
  if (!post) notFound();

  const published = formatDate(post.publishedAt);
  const name = authorName(post);

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: post.title, href: `/blog/${post.slug}` },
  ]);

  const articleLd = articleJsonLd({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    seoDescription: post.seoDescription,
    authorName: name,
    tags: post.tags,
  });

  const faqLd = post.faq?.length ? faqJsonLd(post.faq) : null;

  return (
    <article className="blog-page blog-article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      ) : null}

      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/blog">Blog</Link>
        <span>/</span>
        <span>{post.title}</span>
      </nav>

      <header className="blog-article__header">
        <p className="blog-kicker">Tablevera Blog</p>
        <h1 className="blog-hero__title">{post.title}</h1>
        <p className="blog-article__meta">
          {published ? <time dateTime={post.publishedAt ?? undefined}>{published}</time> : null}
          {published ? <span aria-hidden>·</span> : null}
          <span>{name}</span>
        </p>
        {post.excerpt ? <p className="blog-hero__lede">{post.excerpt}</p> : null}
      </header>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="blog-article__cover" />
      ) : null}

      <div
        className="blog-article__content"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />

      {post.faq?.length ? (
        <section className="blog-faq" aria-labelledby="blog-faq-heading">
          <h2 id="blog-faq-heading">Frequently asked questions</h2>
          <dl>
            {post.faq.map((item) => (
              <div key={item.question} className="blog-faq__item">
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {post.tags?.length ? (
        <div className="blog-tags blog-tags--footer">
          {post.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      <p className="blog-back">
        <Link href="/blog">← All articles</Link>
      </p>
    </article>
  );
}
