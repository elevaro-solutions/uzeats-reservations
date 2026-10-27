'use client';

import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  GiftOutlined,
  HistoryOutlined,
  RollbackOutlined,
  StarOutlined,
  TagOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { EmptyState } from '@reservations/ui';
import {
  filterLoyaltyHistory,
  groupLoyaltyHistoryByMonth,
  toLoyaltyHistoryEntries,
  type LoyaltyHistoryFilter,
  type LoyaltyHistoryKind,
  type LoyaltyTransactionItem,
} from '@/lib/loyaltyHistory';
import { formatPoints } from './loyaltyFormat';

const KIND_ICONS: Record<LoyaltyHistoryKind, ReactNode> = {
  visit: <CalendarOutlined />,
  deposit: <CreditCardOutlined />,
  firstBooking: <GiftOutlined />,
  review: <StarOutlined />,
  referral: <TeamOutlined />,
  redeem: <TagOutlined />,
  refund: <UndoOutlined />,
  expired: <ClockCircleOutlined />,
  reversal: <RollbackOutlined />,
  other: <ThunderboltOutlined />,
};

const FILTER_OPTIONS: { label: string; value: LoyaltyHistoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Earned', value: 'earned' },
  { label: 'Redeemed', value: 'redeemed' },
  { label: 'Expired', value: 'expired' },
];

const EMPTY_FILTER_COPY: Record<Exclude<LoyaltyHistoryFilter, 'all'>, string> = {
  earned: 'No points earned in your recent activity.',
  redeemed: 'You haven’t redeemed points yet. Use them for a discount on your next booking deposit.',
  expired: 'None of your points have expired.',
};

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface LoyaltyHistoryProps {
  items: readonly LoyaltyTransactionItem[];
}

export function LoyaltyHistory({ items }: LoyaltyHistoryProps) {
  const [filter, setFilter] = useState<LoyaltyHistoryFilter>('all');
  const entries = useMemo(() => toLoyaltyHistoryEntries(items), [items]);
  const groups = useMemo(() => groupLoyaltyHistoryByMonth(filterLoyaltyHistory(entries, filter)), [entries, filter]);
  const counts = useMemo(() => {
    const result: Record<LoyaltyHistoryFilter, number> = { all: entries.length, earned: 0, redeemed: 0, expired: 0 };
    for (const entry of entries) {
      if (entry.group !== 'adjusted') result[entry.group] += 1;
    }
    return result;
  }, [entries]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const idx = FILTER_OPTIONS.findIndex((option) => option.value === filter);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = FILTER_OPTIONS[(idx + step + FILTER_OPTIONS.length) % FILTER_OPTIONS.length]!;
    setFilter(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-filter="${next.value}"]`)?.focus();
  };

  return (
    <section component="LoyaltyHistory" className="rt-loyalty-card" aria-labelledby="loyalty-history-title">
      <header className="rt-loyalty-card__header">
        <div>
          <h2 id="loyalty-history-title" className="rt-loyalty-card__title">Points history</h2>
          <p className="rt-loyalty-card__subtitle">
            {items.length >= 50
              ? 'Showing your 50 most recent transactions'
              : 'Points you’ve earned, redeemed, or lost'}
          </p>
        </div>
      </header>

      {entries.length > 0 ? (
        <div
          className="rt-loyalty-tabs"
          role="tablist"
          aria-label="Filter points history"
          onKeyDown={handleTabKeyDown}
        >
          {FILTER_OPTIONS.map((option) => {
            const selected = option.value === filter;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                data-filter={option.value}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className={`rt-loyalty-tabs__tab${selected ? ' is-active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                <span className="rt-loyalty-tabs__count">{counts[option.value]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          icon={<HistoryOutlined />}
          title="No points activity yet"
          description="Book a table and complete your visit to start earning points."
          action={
            <Link href="/">
              <Button type="primary">Find a table</Button>
            </Link>
          }
        />
      ) : groups.length === 0 ? (
        <div className="rt-loyalty-empty" role="tabpanel">
          <span>{EMPTY_FILTER_COPY[filter as Exclude<LoyaltyHistoryFilter, 'all'>]}</span>
        </div>
      ) : (
        <div className="rt-loyalty-history" role="tabpanel">
          {groups.map((group) => (
            <div key={group.key} className="rt-loyalty-history__group">
              <h3 className="rt-loyalty-history__month">{group.label}</h3>
              <ul className="rt-loyalty-history__list">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="rt-loyalty-history__row">
                    <span className={`rt-loyalty-history__icon rt-loyalty-history__icon--${entry.group}`} aria-hidden>
                      {KIND_ICONS[entry.kind]}
                    </span>
                    <div className="rt-loyalty-history__body">
                      <span className="rt-loyalty-history__label">{entry.label}</span>
                      <span className="rt-loyalty-history__date">{formatEntryDate(entry.createdAt)}</span>
                    </div>
                    <span
                      className={`rt-loyalty-amount ${entry.points > 0 ? 'rt-loyalty-amount--plus' : 'rt-loyalty-amount--minus'}`}
                    >
                      {entry.points > 0 ? '+' : ''}
                      {formatPoints(entry.points)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
