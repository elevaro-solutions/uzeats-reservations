'use client';

import Link from 'next/link';
import { Collapse } from 'antd';
import { RightOutlined, ShopOutlined } from '@ant-design/icons';
import { buildRestaurantBookingPath } from '@reservations/shared';
import { formatPoints } from './loyaltyFormat';

export type RestaurantLoyaltyBalanceItem = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug?: string | null;
  points: number;
};

export type RestaurantLoyaltyActivityItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: string;
  points: number;
  description: string;
  createdAt: string;
};

export interface LoyaltyRestaurantRewardsProps {
  balances: readonly RestaurantLoyaltyBalanceItem[];
  history: readonly RestaurantLoyaltyActivityItem[];
}

export function LoyaltyRestaurantRewards({ balances, history }: LoyaltyRestaurantRewardsProps) {
  const isEmpty = balances.length === 0 && history.length === 0;

  return (
    <section component="LoyaltyRestaurantRewards" className="rt-loyalty-card" aria-labelledby="loyalty-restaurants-title">
      <header className="rt-loyalty-card__header">
        <span className="rt-loyalty-card__icon" aria-hidden>
          <ShopOutlined />
        </span>
        <div>
          <h2 id="loyalty-restaurants-title" className="rt-loyalty-card__title">Restaurant rewards</h2>
          <p className="rt-loyalty-card__subtitle">
            Some restaurants run their own points on top of Tablevera points. These can only be used at that
            restaurant.
          </p>
        </div>
      </header>

      {isEmpty ? (
        <div className="rt-loyalty-empty">
          <strong>No restaurant rewards yet</strong>
          <span>
            Look for &ldquo;Plus restaurant points for this visit&rdquo; on a restaurant&apos;s booking card. After
            your visit is completed, your balance for that restaurant appears here.
          </span>
        </div>
      ) : null}

      {balances.length > 0 ? (
        <ul className="rt-loyalty-restaurants">
          {balances.map((item) => (
            <li key={item.restaurantId}>
              <Link
                href={buildRestaurantBookingPath(item.restaurantSlug, item.restaurantId)}
                className="rt-loyalty-restaurants__row"
              >
                <span className="rt-loyalty-restaurants__avatar" aria-hidden>
                  {item.restaurantName.charAt(0).toUpperCase()}
                </span>
                <span className="rt-loyalty-restaurants__name">{item.restaurantName}</span>
                <span className="rt-loyalty-points-chip">{formatPoints(item.points)} pts</span>
                <span className="rt-loyalty-restaurants__action">
                  Book
                  <RightOutlined aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {history.length > 0 ? (
        <Collapse
          ghost
          className="rt-loyalty-collapse"
          items={[
            {
              key: 'activity',
              label: `Recent restaurant activity (${history.length})`,
              children: (
                <ul className="rt-loyalty-activity">
                  {history.map((item) => (
                    <li key={item.id} className="rt-loyalty-activity__row">
                      <div>
                        <strong>{item.restaurantName}</strong>
                        <span>
                          {item.description} ·{' '}
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span
                        className={`rt-loyalty-amount ${item.points > 0 ? 'rt-loyalty-amount--plus' : 'rt-loyalty-amount--minus'}`}
                      >
                        {item.points > 0 ? '+' : ''}
                        {formatPoints(item.points)}
                      </span>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      ) : null}
    </section>
  );
}
