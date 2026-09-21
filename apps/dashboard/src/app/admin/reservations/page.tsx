'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatUsDateTime } from '@reservations/shared';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import {
  ADMIN_RESERVATIONS,
  ADMIN_RESTAURANT_NAMES,
  DELETE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { formatOccasion, formatSource, guestName } from '@/lib/reservationFormat';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text } = Typography;

const DATE_PERIOD_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'custom', label: 'Custom date' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'seated', label: 'Seated' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

const SOURCE_OPTIONS = [
  { value: 'network', label: 'Network' },
  { value: 'website', label: 'Website' },
  { value: 'widget', label: 'Widget' },
  { value: 'phone', label: 'Phone' },
  { value: 'walkin', label: 'Walk-in' },
];

type ReservationRow = {
  id: string;
  restaurantId: string;
  dinerId: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string;
  occasion?: string;
  guestNotes?: string;
  source?: string;
  depositAmountCents?: number;
  depositStatus?: string;
  experienceTitle?: string;
  packageTitle?: string;
  privateDiningSpaceName?: string;
  createdAt?: string;
  diner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  restaurant?: { id: string; name: string } | null;
  tables?: { id: string; name: string }[];
};

function AdminReservationsContent() {
  const { ready } = useRequireAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });

  const restaurantId = searchParams.get('restaurant') || undefined;
  const periodParam = searchParams.get('period') || 'all';
  const source = searchParams.get('source') || undefined;
  const customDate = searchParams.get('date') || dayjs().format('YYYY-MM-DD');
  const isCustom = periodParam === 'custom';

  const setListParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete('page');
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const { data, loading, refetch } = useQuery(ADMIN_RESERVATIONS, {
    skip: !ready,
    variables: {
      restaurantId,
      status: status || undefined,
      period: isCustom || periodParam === 'all' ? undefined : periodParam,
      date: isCustom ? customDate : undefined,
      search: searchQuery || undefined,
      source,
      limit,
      offset,
    },
  });

  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANT_NAMES, {
    skip: !ready,
    variables: { limit: 200 },
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [deleteReservation] = useMutation(DELETE_RESERVATION);

  if (!ready) return null;

  const items = (data?.adminReservations?.items ?? []) as ReservationRow[];
  const total = data?.adminReservations?.total ?? 0;
  const restaurantOptions = (restaurantsData?.adminRestaurants?.items ?? []).map(
    (r: { id: string; name: string }) => ({ value: r.id, label: r.name }),
  );

  const runStatus = async (id: string, nextStatus: string, successMessage: string) => {
    try {
      await updateStatus({ variables: { id, status: nextStatus } });
      message.success(successMessage);
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const rowMenu = (r: ReservationRow): MenuProps['items'] => {
    const actions: MenuProps['items'] = [];
    if (r.status === 'pending') {
      actions.push({
        key: 'confirm',
        label: 'Confirm',
        onClick: () => void runStatus(r.id, 'confirmed', 'Confirmed'),
      });
    }
    if (r.status === 'confirmed') {
      actions.push({
        key: 'seat',
        label: 'Seat',
        onClick: () => void runStatus(r.id, 'seated', 'Seated'),
      });
    }
    if (r.status === 'seated') {
      actions.push({
        key: 'complete',
        label: 'Complete',
        onClick: () => void runStatus(r.id, 'completed', 'Completed'),
      });
    }
    if (r.status === 'confirmed' || r.status === 'seated') {
      actions.push({
        key: 'no_show',
        label: 'No-show',
        onClick: () => void runStatus(r.id, 'no_show', 'Marked no-show'),
      });
    }
    if (r.status === 'pending' || r.status === 'confirmed') {
      actions.push({
        key: 'cancel',
        danger: true,
        label: 'Cancel',
        onClick: () => void runStatus(r.id, 'cancelled', 'Cancelled'),
      });
    }
    actions.push({ type: 'divider' });
    actions.push({
      key: 'venue',
      label: 'Open restaurant',
      onClick: () => router.push(`/admin/restaurants/${r.restaurantId}?tab=reservations`),
    });
    actions.push({
      key: 'delete',
      danger: true,
      label: 'Delete',
      onClick: async () => {
        try {
          await deleteReservation({ variables: { id: r.id } });
          message.success('Reservation deleted');
          refetch();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Delete failed');
        }
      },
    });
    return actions;
  };

  return (
    <>
      <PageHeader
        title="Reservations"
        subtitle="All bookings across restaurants. Filter by venue, guest, status, or date."
      />

      <Card style={{ marginBottom: spacing.md }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search guest, email, phone, or restaurant"
            defaultValue={searchQuery}
            onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
            onBlur={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Restaurant"
            aria-label="Restaurant"
            value={restaurantId}
            onChange={(v) => setListParams({ restaurant: v })}
            options={restaurantOptions}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="Status"
            aria-label="Status"
            value={status || undefined}
            onChange={(v) => setStatus(v ?? '')}
            options={STATUS_OPTIONS}
            style={{ width: 150 }}
          />
          <Select
            allowClear
            placeholder="Source"
            aria-label="Source"
            value={source}
            onChange={(v) => setListParams({ source: v })}
            options={SOURCE_OPTIONS}
            style={{ width: 140 }}
          />
          <Select
            value={periodParam}
            onChange={(v) =>
              setListParams({
                period: v === 'all' ? undefined : v,
                date: v === 'custom' ? customDate : undefined,
              })
            }
            options={DATE_PERIOD_OPTIONS}
            style={{ width: 160 }}
            aria-label="Date period"
          />
          {isCustom ? (
            <DatePicker
              value={dayjs(customDate)}
              onChange={(d) => {
                if (d) setListParams({ period: 'custom', date: d.format('YYYY-MM-DD') });
              }}
              allowClear={false}
            />
          ) : null}
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading || updating}
          columns={[
            {
              title: 'When',
              dataIndex: 'slotStart',
              width: 170,
              render: (v: string) =>
                formatUsDateTime(v, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
            },
            {
              title: 'Restaurant',
              render: (_: unknown, r: ReservationRow) => (
                <Link href={`/admin/restaurants/${r.restaurantId}?tab=reservations`}>
                  {r.restaurant?.name || r.restaurantId}
                </Link>
              ),
            },
            {
              title: 'Guest',
              render: (_: unknown, r: ReservationRow) => (
                <Space orientation="vertical" size={0}>
                  {r.diner?.id ? (
                    <Link href={`/admin/diners/${r.diner.id}`}>{guestName(r.diner)}</Link>
                  ) : (
                    <Text>{guestName(r.diner)}</Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[r.diner?.phone, r.diner?.email].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </Space>
              ),
            },
            { title: 'Party', dataIndex: 'partySize', width: 70 },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Source',
              dataIndex: 'source',
              width: 100,
              render: (s?: string) => {
                const label = formatSource(s);
                return label ? <Tag>{label}</Tag> : '—';
              },
            },
            {
              title: '',
              width: 56,
              render: (_: unknown, r: ReservationRow) => (
                <Dropdown menu={{ items: rowMenu(r) }} trigger={['click']}>
                  <Button size="small" icon={<MoreOutlined />} aria-label="Reservation actions" />
                </Dropdown>
              ),
            },
          ]}
          dataSource={items}
          pagination={{
            ...tablePagination(total),
            showTotal: (n) => `${n} reservation${n === 1 ? '' : 's'}`,
          }}
          expandable={{
            expandedRowRender: (r: ReservationRow) => (
              <Space orientation="vertical" size={4}>
                <Text>
                  <Text strong>Tables: </Text>
                  {r.tables?.map((t) => t.name).join(', ') || '—'}
                </Text>
                <Text>
                  <Text strong>Occasion: </Text>
                  {formatOccasion(r.occasion) || '—'}
                </Text>
                {(r.packageTitle || r.experienceTitle || r.privateDiningSpaceName) && (
                  <Text>
                    <Text strong>Add-on: </Text>
                    {[r.packageTitle, r.experienceTitle, r.privateDiningSpaceName]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
                {r.guestNotes ? (
                  <Text>
                    <Text strong>Notes: </Text>
                    {r.guestNotes}
                  </Text>
                ) : null}
                <Text type="secondary">
                  Booked {r.createdAt ? formatUsDateTime(r.createdAt, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }) : '—'}
                </Text>
              </Space>
            ),
          }}
        />
      </Card>
    </>
  );
}

export default function AdminReservationsPage() {
  return (
    <Suspense>
      <AdminReservationsContent />
    </Suspense>
  );
}
