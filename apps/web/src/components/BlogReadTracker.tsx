'use client';

import { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { RECORD_BLOG_POST_READ } from '@/lib/graphql';

const STORAGE_PREFIX = 'blog-read:';

type Props = {
  slug: string;
};

/**
 * Records one read per browser tab session for a published article.
 * Client-only so ISR/crawlers do not inflate counts.
 */
export function BlogReadTracker({ slug }: Props) {
  const [recordRead] = useMutation(RECORD_BLOG_POST_READ);
  const recordedForSlug = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || recordedForSlug.current === slug) return;

    const key = `${STORAGE_PREFIX}${slug}`;
    try {
      if (sessionStorage.getItem(key)) {
        recordedForSlug.current = slug;
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode / blocked storage — fall through; ref still dedupes this mount tree.
    }

    recordedForSlug.current = slug;
    void recordRead({ variables: { slug } }).catch(() => {
      // Best-effort analytics; ignore network errors.
    });
  }, [slug, recordRead]);

  return null;
}
