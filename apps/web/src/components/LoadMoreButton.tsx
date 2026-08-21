'use client';

import { Button } from 'antd';

type LoadMoreButtonProps = {
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
};

export function LoadMoreButton({ onLoadMore, hasMore, loading }: LoadMoreButtonProps) {
  if (!hasMore && !loading) return null;

  return (
    <div className="rt-load-more">
      <Button type="default" size="large" loading={loading} onClick={onLoadMore} disabled={!hasMore}>
        Load more
      </Button>
    </div>
  );
}
