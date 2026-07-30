'use client';

import { useEffect, useRef } from 'react';
import { Spin } from 'antd';

type InfiniteScrollSentinelProps = {
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  root?: Element | null;
};

export function InfiniteScrollSentinel({
  onLoadMore,
  hasMore,
  loading,
  root,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { root: root ?? null, rootMargin: '240px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, root]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={sentinelRef}
      aria-hidden={!loading}
      style={{
        padding: '20px 0',
        display: 'flex',
        justifyContent: 'center',
        minHeight: loading ? 48 : 1,
      }}
    >
      {loading ? <Spin /> : null}
    </div>
  );
}
