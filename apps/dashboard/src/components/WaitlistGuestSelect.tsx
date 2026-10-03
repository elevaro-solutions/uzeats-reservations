'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Spin, Tag, Typography } from 'antd';
import { CloseCircleOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@/lib/apollo-hooks';
import { WAITLIST_GUEST_SEARCH } from '@/lib/graphql';
import { colors, radii } from '@reservations/ui';

const SEARCH_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 300;

export type WaitlistGuestOption = {
  dinerId: string;
  guestName: string;
  guestPhone?: string;
  label: string;
};

type GuestHit = {
  dinerId: string;
  guestName: string;
  guestPhone?: string | null;
  email?: string | null;
  totalVisits: number;
  vipStatus?: string | null;
  inGuestBook: boolean;
};

function useDebouncedValue(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function hitLabel(hit: GuestHit): string {
  const parts = [
    hit.guestName,
    hit.guestPhone?.trim() || null,
    hit.inGuestBook && hit.totalVisits > 0 ? `${hit.totalVisits} visits` : null,
    !hit.inGuestBook ? 'Account' : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export type WaitlistGuestSelectProps = {
  restaurantId?: string | null;
  value?: WaitlistGuestOption | null;
  onChange: (guest: WaitlistGuestOption | null) => void;
  disabled?: boolean;
};

/** Search platform diners / guest book to link a walk-in waitlist entry. */
export function WaitlistGuestSelect({
  restaurantId,
  value,
  onChange,
  disabled,
}: WaitlistGuestSelectProps) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const { data, loading, error } = useQuery(WAITLIST_GUEST_SEARCH, {
    skip: !restaurantId || debounced.length < 2,
    variables: {
      restaurantId,
      search: debounced,
      limit: SEARCH_LIMIT,
    },
    fetchPolicy: 'network-only',
  });

  const hits = (data?.searchWaitlistGuests ?? []) as GuestHit[];

  if (value) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          border: `1px solid ${colors.bordersubtle}`,
          borderRadius: radii.md,
          background: colors.neutral?.[50] ?? '#fafafa',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Typography.Text strong>
            <UserOutlined style={{ marginRight: 6 }} />
            {value.guestName}
          </Typography.Text>
          {value.guestPhone ? (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {value.guestPhone}
            </Typography.Text>
          ) : null}
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseCircleOutlined />}
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label="Clear selected guest"
        />
      </div>
    );
  }

  return (
    <div>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search by name, phone, or email"
        value={search}
        disabled={disabled || !restaurantId}
        onChange={(e) => setSearch(e.target.value)}
      />
      {debounced.length > 0 && debounced.length < 2 ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
          Type at least 2 characters
        </Typography.Text>
      ) : null}
      {error ? (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
          {error.message || 'Search failed'}
        </Typography.Text>
      ) : null}
      {loading ? (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : null}
      {!loading && debounced.length >= 2 && hits.length === 0 ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          No matching guests — enter name manually below
        </Typography.Text>
      ) : null}
      {hits.length > 0 ? (
        <div
          style={{
            marginTop: 8,
            border: `1px solid ${colors.bordersubtle}`,
            borderRadius: radii.md,
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {hits.map((hit) => (
            <button
              key={hit.dinerId}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  dinerId: hit.dinerId,
                  guestName: hit.guestName,
                  guestPhone: hit.guestPhone ?? undefined,
                  label: hitLabel(hit),
                })
              }
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                borderBottom: `1px solid ${colors.bordersubtle}`,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600 }}>{hit.guestName}</span>
              {hit.vipStatus && hit.vipStatus !== 'none' ? (
                <Tag color="gold" style={{ marginLeft: 8 }}>
                  VIP
                </Tag>
              ) : null}
              {!hit.inGuestBook ? (
                <Tag style={{ marginLeft: 8 }}>Account</Tag>
              ) : null}
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                {[hit.guestPhone, hit.email, hit.inGuestBook ? `${hit.totalVisits} visits` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
