import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchPublishedBlogPosts } from '@/lib/blogSeoFetch';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from '@/lib/seo';

/** Keep listing fresh after admins publish new posts. */
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Blog — Tablevera',
  description:
    'Guides on restaurant reservations, dining discovery, and running a busier book with Tablevera.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'Blog — Tablevera',
    description:
      'Guides on restaurant reservations, dining discovery, and running a busier book with Tablevera.',
    url: absoluteUrl('/blog'),
    siteName: 'Tablevera',
  },
};

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogIndexPage() {
  let posts: Awaited<ReturnType<typeof fetchPublishedBlogPosts>>['items'] = [];
  let loadError: string | null = null;
  try {
    const result = await fetchPublishedBlogPosts(50, 0);
    posts = result.items;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load articles';
    posts = [];
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
  ]);

  const listLd = itemListJsonLd({
    name: 'Tablevera Blog',
    description: 'Articles about dining, reservations, and restaurant operations.',
    url: '/blog',
    items: posts.map((p) => ({ name: p.title, url: `/blog/${p.slug}` })),
  });

  return (
    <div className="blog-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />

      <header className="blog-hero">
        <p className="blog-kicker">Tablevera Blog</p>
        <h1 className="blog-hero__title">Insights for diners and restaurants</h1>
        <p className="blog-hero__lede">
          Practical guides on booking tables, filling seats, and making hospitality easier — written
          for search and answer engines as much as for people.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="blog-empty">
          {loadError
            ? `Articles are temporarily unavailable. ${loadError}`
            : 'No published articles yet. Publish a post from the admin Blog page to see it here.'}
        </p>
      ) : (
        <ul className="blog-list">
          {posts.map((post) => {
            const date = formatDate(post.publishedAt);
            return (
              <li key={post.id} className="blog-list__item">
                <Link
                  href={`/blog/${post.slug}`}
                  className={`blog-list__link${post.coverImageUrl ? '' : ' blog-list__link--text'}`}
                >
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      className="blog-list__image"
                    />
                  ) : null}
                  <div className="blog-list__body">
                    {date ? <time dateTime={post.publishedAt ?? undefined}>{date}</time> : null}
                    <h2>{post.title}</h2>
                    {post.excerpt ? <p>{post.excerpt}</p> : null}
                    {post.tags?.length ? (
                      <div className="blog-tags">
                        {post.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
