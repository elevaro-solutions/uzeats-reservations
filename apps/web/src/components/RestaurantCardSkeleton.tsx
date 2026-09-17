'use client';

import { Col, Row } from 'antd';

/** Card grid: 1 / 2 / 2 / 3 / 4 columns from phone → desktop. */
export const RESTAURANT_CARD_COL = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 8,
  xl: 6,
} as const;

function SkeletonBone({ className }: { className?: string }) {
  return <span className={`rt-skeleton${className ? ` ${className}` : ''}`} aria-hidden />;
}

export function RestaurantCardSkeleton() {
  return (
    <article className="rt-restaurant-card-skeleton" aria-hidden>
      <div className="rt-restaurant-card-skeleton__media">
        <SkeletonBone className="rt-restaurant-card-skeleton__photo" />
        <SkeletonBone className="rt-restaurant-card-skeleton__pill rt-restaurant-card-skeleton__pill--left" />
        <SkeletonBone className="rt-restaurant-card-skeleton__pill rt-restaurant-card-skeleton__pill--right" />
      </div>
      <div className="rt-restaurant-card-skeleton__body">
        <div className="rt-restaurant-card-skeleton__title-row">
          <SkeletonBone className="rt-restaurant-card-skeleton__title" />
          <SkeletonBone className="rt-restaurant-card-skeleton__price" />
        </div>
        <SkeletonBone className="rt-restaurant-card-skeleton__meta" />
        <SkeletonBone className="rt-restaurant-card-skeleton__rating" />
        <div className="rt-restaurant-card-skeleton__slots">
          <SkeletonBone className="rt-restaurant-card-skeleton__slot" />
          <SkeletonBone className="rt-restaurant-card-skeleton__slot" />
          <SkeletonBone className="rt-restaurant-card-skeleton__slot" />
        </div>
      </div>
    </article>
  );
}

export function RestaurantCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <Row gutter={[20, 20]}>
      {Array.from({ length: count }, (_, i) => (
        <Col key={i} {...RESTAURANT_CARD_COL}>
          <RestaurantCardSkeleton />
        </Col>
      ))}
    </Row>
  );
}
