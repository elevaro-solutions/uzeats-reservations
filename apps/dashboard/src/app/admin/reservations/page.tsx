'use client';

import { Suspense, useCallback, useEffect, useState, type Key } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApolloClient, useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EyeOutlined, LoginOutlined, MoreOutlined, RollbackOutlined, SearchOutlined, ShopOutlined, UserDeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatUsDateTime, restaurantTimeZone } from '@reservations/shared';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import {
  ADMIN_RESERVATIONS,
  ADMIN_RESTAURANT_NAMES,
  DELETE_RESERVATION,
  REFUND_RESERVATION_DEPOSIT,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import {
  canRefundDeposit,
  formatDepositStatus,
  formatOccasion,
  formatSource,
  formatUsd,
  guestName,
} from '@/lib/reservationFormat';
import { sourceOriginTooltip } from '@/lib/reservationAttribution';
import { isSuperAdmin } from '@/lib/roles';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { RefundDepositModal } from '@/components/RefundDepositModal';

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
  confirmationNumber?: string | null;
  restaurantId: string;
  dinerId: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string;
  occasion?: string;
  guestNotes?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  landingPath?: string;
  originUrl?: string;
  referrer?: string;
  depositAmountCents?: number;
  depositRefundedCents?: number;
  depositRefundableCents?: number;
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
  restaurant?: {
    id: string;
    name: string;
    address?: { state?: string; zip?: string; country?: string } | null;
    location?: { lat?: number; lng?: number } | null;
  } | null;
  tables?: { id: string; name: string }[];
};

function AdminReservationsContent() {
  const { ready, user } = useRequireAdmin();
  const canBulkDelete = user ? isSuperAdmin(user.role) : false;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { search, searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { page, pageSize, limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const apolloClient = useApolloClient();

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
    fetchPolicy: 'cache-and-network',
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
  const [cancelFor, setCancelFor] = useState<ReservationRow | null>(null);
  const [refundFor, setRefundFor] = useState<ReservationRow | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [refundDeposit, { loading: refunding }] = useMutation(REFUND_RESERVATION_DEPOSIT);
  const [deleteReservation] = useMutation(DELETE_RESERVATION);

  const loadedTotal: number | undefined = data?.adminReservations?.total;
  useEffect(() => {
    if (loading || loadedTotal == null) return;
    const lastPage = Math.max(1, Math.ceil(loadedTotal / pageSize));
    if (page > lastPage) setPagination(lastPage);
  }, [loading, loadedTotal, page, pageSize, setPagination]);

  const evictDeleted = (ids: string[]) => {
    const { cache } = apolloClient;
    for (const id of ids) {
      cache.evict({ id: cache.identify({ __typename: 'Reservation', id }) });
    }
    // Every cached page/search result may now have shifted rows and a stale total.
    cache.evict({ id: 'ROOT_QUERY', fieldName: 'adminReservations' });
    cache.gc();
  };

  if (!ready) return null;

  const items = (data?.adminReservations?.items ?? []) as ReservationRow[];
  const total = data?.adminReservations?.total ?? 0;
  const restaurantOptions = (restaurantsData?.adminRestaurants?.items ?? []).map(
    (r: { id: string; name: string }) => ({ value: r.id, label: r.name }),
  );

  const runStatus = async (
    id: string,
    nextStatus: string,
    successMessage: string,
    reason?: string,
  ) => {
    try {
      await updateStatus({ variables: { id, status: nextStatus, reason } });
      message.success(successMessage);
      refetch();
      return true;
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
      return false;
    }
  };

  const confirmDeleteOne = (r: ReservationRow) => {
    Modal.confirm({
      title: 'Delete this reservation?',
      content: `Permanently deletes the booking for ${guestName(r.diner)}. This cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteReservation({ variables: { id: r.id } });
          message.success('Reservation deleted');
          setSelectedRowKeys((keys) => keys.filter((k) => String(k) !== r.id));
          evictDeleted([r.id]);
          refetch();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Delete failed');
          throw err;
        }
      },
    });
  };

  const bulkDelete = () => {
    const ids = selectedRowKeys.map(String);
    if (!ids.length) return;
    Modal.confirm({
      title: `Delete ${ids.length} reservation${ids.length === 1 ? '' : 's'}?`,
      content: 'Permanently deletes the selected bookings. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBulkDeleting(true);
        try {
          const results = await Promise.allSettled(
            ids.map((id) => deleteReservation({ variables: { id } })),
          );
          const deletedIds = ids.filter((_, i) => results[i]!.status === 'fulfilled');
          const deleted = deletedIds.length;
          const failed = results.length - deleted;
          if (deleted > 0) evictDeleted(deletedIds);
          if (deleted > 0) {
            message.success(`Deleted ${deleted} reservation${deleted === 1 ? '' : 's'}`);
          }
          if (failed > 0) {
            message.warning(`${failed} reservation${failed === 1 ? '' : 's'} could not be deleted`);
          }
          setSelectedRowKeys([]);
          refetch();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Bulk delete failed');
        } finally {
          setBulkDeleting(false);
        }
      },
    });
  };

  const rowMenu = (r: ReservationRow): MenuProps['items'] => {
    const primary: NonNullable<MenuProps['items']> = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View details',
        onClick: () => router.push(`/admin/reservations/${r.id}`),
      },
    ];
    if (['pending', 'confirmed', 'seated'].includes(r.status)) {
      primary.push({
        key: 'edit',
        icon: <CalendarOutlined />,
        label: 'Change date & time',
        onClick: () => router.push(`/admin/reservations/${r.id}?edit=1`),
      });
    }

    const statusActions: NonNullable<MenuProps['items']> = [];
    if (r.status === 'pending') {
      statusActions.push({
        key: 'confirm',
        icon: <CheckCircleOutlined />,
        label: 'Confirm',
        onClick: () => void runStatus(r.id, 'confirmed', 'Confirmed'),
      });
    }
    if (r.status === 'confirmed') {
      statusActions.push({
        key: 'seat',
        icon: <LoginOutlined />,
        label: 'Seat',
        onClick: () => void runStatus(r.id, 'seated', 'Seated'),
      });
    }
    if (r.status === 'seated') {
      statusActions.push({
        key: 'complete',
        icon: <CheckCircleOutlined />,
        label: 'Complete',
        onClick: () => void runStatus(r.id, 'completed', 'Completed'),
      });
    }
    if (r.status === 'confirmed' || r.status === 'seated') {
      statusActions.push({
        key: 'no_show',
        icon: <UserDeleteOutlined />,
        label: 'No-show',
        onClick: () => void runStatus(r.id, 'no_show', 'Marked no-show'),
      });
    }
    if (r.status === 'pending' || r.status === 'confirmed') {
      statusActions.push({
        key: 'cancel',
        icon: <CloseCircleOutlined />,
        danger: true,
        label: 'Cancel',
        onClick: () => setCancelFor(r),
      });
    }
    if (canRefundDeposit(r)) {
      statusActions.push({
        key: 'refund_deposit',
        icon: <RollbackOutlined />,
        danger: true,
        label: r.depositStatus === 'authorized' ? 'Release deposit' : 'Refund deposit',
        disabled: refunding,
        onClick: () => setRefundFor(r),
      });
    }

    const secondary: NonNullable<MenuProps['items']> = [
      {
        key: 'venue',
        icon: <ShopOutlined />,
        label: 'Open restaurant',
        onClick: () => router.push(`/admin/restaurants/${r.restaurantId}?tab=reservations`),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
        label: 'Delete',
        onClick: () => confirmDeleteOne(r),
      },
    ];

    const sections = [primary, statusActions, secondary].filter((s) => s.length > 0);
    const items: NonNullable<MenuProps['items']> = [];
    sections.forEach((section, index) => {
      if (index > 0) items.push({ type: 'divider' });
      items.push(...section);
    });
    return items;
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
            placeholder="Guest, email, phone, restaurant, or confirmation #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {canBulkDelete && selectedRowKeys.length > 0 ? (
            <Space wrap>
              <Text type="secondary">{selectedRowKeys.length} selected</Text>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={bulkDeleting}
                onClick={bulkDelete}
              >
                Delete
              </Button>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Clear
              </Button>
            </Space>
          ) : null}
          <Table
            rowKey="id"
            loading={loading || updating || bulkDeleting}
            scroll={{ x: 1100 }}
            onChange={() => setSelectedRowKeys([])}
            rowSelection={
              canBulkDelete
                ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    preserveSelectedRowKeys: true,
                  }
                : undefined
            }
            columns={[
              {
                title: 'When',
                dataIndex: 'slotStart',
                width: 180,
                render: (v: string, r: ReservationRow) => (
                  <Link href={`/admin/reservations/${r.id}`} style={{ whiteSpace: 'nowrap' }}>
                    {formatUsDateTime(v, {
                      timeZone: restaurantTimeZone(r.restaurant ?? {}),
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Link>
                ),
              },
              {
                title: 'Restaurant',
                width: 180,
                ellipsis: true,
                render: (_: unknown, r: ReservationRow) => {
                  const name = r.restaurant?.name || r.restaurantId;
                  return (
                    <Link
                      href={`/admin/restaurants/${r.restaurantId}?tab=reservations`}
                      title={name}
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </Link>
                  );
                },
              },
              {
                title: 'Conf #',
                dataIndex: 'confirmationNumber',
                width: 100,
                render: (v: string | null | undefined) => v || '—',
              },
              {
                title: 'Guest',
                width: 220,
                render: (_: unknown, r: ReservationRow) => {
                  const contact = [r.diner?.phone, r.diner?.email].filter(Boolean).join(' · ');
                  return (
                    <Space orientation="vertical" size={0} style={{ maxWidth: '100%' }}>
                      {r.diner?.id ? (
                        <Link
                          href={`/admin/diners/${r.diner.id}`}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {guestName(r.diner)}
                        </Link>
                      ) : (
                        <Text style={{ whiteSpace: 'nowrap' }}>{guestName(r.diner)}</Text>
                      )}
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, maxWidth: 200 }}
                        ellipsis={{ tooltip: contact || undefined }}
                      >
                        {contact || '—'}
                      </Text>
                    </Space>
                  );
                },
              },
              { title: 'Party', dataIndex: 'partySize', width: 70 },
              {
                title: 'Deposit',
                width: 110,
                render: (_: unknown, r: ReservationRow) => {
                  if (!(r.depositAmountCents && r.depositAmountCents > 0)) {
                    return <Text type="secondary">—</Text>;
                  }
                  return (
                    <Space orientation="vertical" size={0}>
                      <Text style={{ whiteSpace: 'nowrap' }}>{formatUsd(r.depositAmountCents)}</Text>
                      <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDepositStatus(r.depositStatus, {
                          depositAmountCents: r.depositAmountCents,
                          depositRefundedCents: r.depositRefundedCents,
                        })}
                      </Text>
                    </Space>
                  );
                },
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 120,
                render: (s: string) => <StatusTag status={s} />,
              },
              {
                title: 'Source',
                dataIndex: 'source',
                width: 110,
                render: (_: unknown, r: ReservationRow) => {
                  const label = formatSource(r.source);
                  if (!label) return '—';
                  const origin = sourceOriginTooltip(r);
                  const tag = <Tag style={{ marginInlineEnd: 0 }}>{label}</Tag>;
                  return origin ? (
                    <Tooltip title={<span style={{ wordBreak: 'break-all' }}>{origin}</span>}>
                      {tag}
                    </Tooltip>
                  ) : (
                    tag
                  );
                },
              },
              {
                title: '',
                width: 56,
                fixed: 'right',
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
        </Space>
      </Card>

      <CancelReservationModal
        open={!!cancelFor}
        guestName={cancelFor ? guestName(cancelFor.diner) : undefined}
        loading={updating}
        onClose={() => setCancelFor(null)}
        onConfirm={async (reason) => {
          if (!cancelFor) return;
          const ok = await runStatus(cancelFor.id, 'cancelled', 'Reservation cancelled', reason);
          if (ok) setCancelFor(null);
        }}
      />

      <RefundDepositModal
        open={!!refundFor}
        isHold={refundFor?.depositStatus === 'authorized'}
        guestName={refundFor ? guestName(refundFor.diner) : undefined}
        amountLabel={refundFor ? formatUsd(refundFor.depositAmountCents) : null}
        maxRefundableCents={
          refundFor
            ? refundFor.depositRefundableCents ??
              Math.max(
                0,
                (refundFor.depositAmountCents ?? 0) - (refundFor.depositRefundedCents ?? 0),
              )
            : null
        }
        loading={refunding}
        onClose={() => setRefundFor(null)}
        onConfirm={async (reason, amountCents) => {
          if (!refundFor) return;
          const isHold = refundFor.depositStatus === 'authorized';
          try {
            await refundDeposit({
              variables: { id: refundFor.id, reason, amountCents },
            });
            message.success(
              isHold
                ? 'Deposit hold released'
                : amountCents != null &&
                    amountCents <
                      (refundFor.depositRefundableCents ?? refundFor.depositAmountCents ?? 0)
                  ? 'Partial deposit refunded'
                  : 'Deposit refunded',
            );
            setRefundFor(null);
            refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Refund failed');
            throw err;
          }
        }}
      />
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
