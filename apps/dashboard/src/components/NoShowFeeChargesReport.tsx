'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DocumentNode } from '@apollo/client';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  SearchOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { formatUsDateTime } from '@reservations/shared';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import { useQuery } from '@/lib/apollo-hooks';
import {
  formatNoShowFee,
  formatUsd,
  guestName,
} from '@/lib/reservationFormat';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';
import {
  buildNoShowFeeActionItems,
  useNoShowFeeMutations,
} from '@/lib/useNoShowFeeActions';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const FEE_STATUS_OPTIONS = [
  { value: 'charged', label: 'Charged' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending charge' },
];

const REASON_OPTIONS = [
  { value: 'no_show', label: 'No-show' },
  { value: 'late_cancel', label: 'Late cancel' },
];

const FEE_STATUS_COLOR: Record<string, string> = {
  charged: 'green',
  refunded: 'blue',
  failed: 'red',
  card_saved: 'gold',
  requires_card: 'default',
  released: 'default',
};

export type NoShowFeeChargeRow = {
  id: string;
  restaurantId: string;
  dinerId?: string;
  partySize: number;
  slotStart: string;
  status: string;
  noShowFeeCents?: number | null;
  cardGuaranteeStatus?: string | null;
  noShowFeeReason?: string | null;
  noShowFeeChargedAt?: string | null;
  noShowFeeError?: string | null;
  diner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
  restaurant?: { id: string; name: string } | null;
  tables?: { id: string; name: string }[];
};

type Summary = {
  chargedCount: number;
  chargedCents: number;
  refundedCount: number;
  refundedCents: number;
  failedCount: number;
  failedCents: number;
  pendingCount: number;
  pendingCents: number;
  netCollectedCents: number;
};

type Props = {
  mode: 'partner' | 'admin';
  query: DocumentNode;
  /** Fixed restaurant for partner hub (active venue). Omit for all owned / platform. */
  restaurantId?: string;
  restaurantOptions?: { value: string; label: string }[];
  /** Show restaurant column (admin or multi-location partner). */
  showRestaurant?: boolean;
  detailBasePath: string;
  title?: string;
  subtitle?: string;
};

function NoShowFeeChargesReportContent({
  mode,
  query,
  restaurantId: fixedRestaurantId,
  restaurantOptions,
  showRestaurant = mode === 'admin',
  detailBasePath,
  title = 'No-show fees',
  subtitle = 'Collected card-guarantee fees for no-shows and late cancellations.',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const feeMutations = useNoShowFeeMutations();

  const { search, searchQuery, status: feeStatus, setSearch, setStatus: setFeeStatus } =
    useUrlListFilters({
      search: 'q',
      status: 'feeStatus',
    });
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 25,
  });

  const reason = searchParams.get('reason') || undefined;
  const startDate = searchParams.get('start') || undefined;
  const endDate = searchParams.get('end') || undefined;
  const filterRestaurantId =
    fixedRestaurantId ?? searchParams.get('restaurant') ?? undefined;

  const setListParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const rangeValue = useMemo((): [Dayjs, Dayjs] | null => {
    if (!startDate || !endDate) return null;
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid()) return null;
    return [start, end];
  }, [endDate, startDate]);

  const variables = {
    restaurantId: filterRestaurantId,
    feeStatus: feeStatus || undefined,
    reason,
    startDate,
    endDate,
    search: searchQuery || undefined,
    limit,
    offset,
  };

  const { data, loading, refetch } = useQuery(query, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  const connection =
    mode === 'admin'
      ? data?.adminNoShowFeeCharges
      : data?.restaurantNoShowFeeCharges;
  const items: NoShowFeeChargeRow[] = connection?.items ?? [];
  const total: number = connection?.total ?? 0;
  const summary: Summary = connection?.summary ?? {
    chargedCount: 0,
    chargedCents: 0,
    refundedCount: 0,
    refundedCents: 0,
    failedCount: 0,
    failedCents: 0,
    pendingCount: 0,
    pendingCents: 0,
    netCollectedCents: 0,
  };

  const openDetail = (id: string, edit = false) => {
    const href = edit ? `${detailBasePath}/${id}?edit=1` : `${detailBasePath}/${id}`;
    router.push(href);
  };

  const rowMenu = (r: NoShowFeeChargeRow): MenuProps['items'] => {
    const primary: NonNullable<MenuProps['items']> = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View reservation',
        onClick: () => openDetail(r.id),
      },
      {
        key: 'manage',
        icon: <EditOutlined />,
        label: 'Manage',
        onClick: () => openDetail(r.id),
      },
    ];
    if (['pending', 'confirmed', 'seated'].includes(r.status)) {
      primary.push({
        key: 'edit',
        icon: <CalendarOutlined />,
        label: 'Change date & time',
        onClick: () => openDetail(r.id, true),
      });
    }

    const feeItems = buildNoShowFeeActionItems(r, feeMutations, () => {
      void refetch();
    });

    const secondary: NonNullable<MenuProps['items']> = [];
    if (mode === 'admin') {
      secondary.push({
        key: 'venue',
        icon: <ShopOutlined />,
        label: 'Open restaurant',
        onClick: () =>
          router.push(`/admin/restaurants/${r.restaurantId}?tab=reservations`),
      });
    }

    const sections = [primary, feeItems, secondary].filter((s) => s.length > 0);
    const itemsMenu: NonNullable<MenuProps['items']> = [];
    sections.forEach((section, index) => {
      if (index > 0) itemsMenu.push({ type: 'divider' });
      itemsMenu.push(...section);
    });
    return itemsMenu;
  };

  return (
    <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader title={title} subtitle={subtitle} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Collected"
              value={(summary.netCollectedCents ?? 0) / 100}
              precision={2}
              prefix="$"
              suffix={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ({summary.chargedCount})
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Refunded"
              value={(summary.refundedCents ?? 0) / 100}
              precision={2}
              prefix="$"
              suffix={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ({summary.refundedCount})
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Failed"
              value={(summary.failedCents ?? 0) / 100}
              precision={2}
              prefix="$"
              suffix={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ({summary.failedCount})
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Pending charge"
              value={(summary.pendingCents ?? 0) / 100}
              precision={2}
              prefix="$"
              suffix={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ({summary.pendingCount})
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space wrap style={{ marginBottom: spacing.md }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search guest, email, phone, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          {mode === 'admin' && restaurantOptions && (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Restaurant"
              aria-label="Restaurant"
              value={filterRestaurantId}
              onChange={(v) => setListParams({ restaurant: v })}
              options={restaurantOptions}
              style={{ width: 220 }}
            />
          )}
          <Select
            allowClear
            placeholder="Fee status"
            aria-label="Fee status"
            value={feeStatus}
            onChange={(v) => setFeeStatus(v)}
            options={FEE_STATUS_OPTIONS}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Reason"
            aria-label="Reason"
            value={reason}
            onChange={(v) => setListParams({ reason: v })}
            options={REASON_OPTIONS}
            style={{ width: 140 }}
          />
          <RangePicker
            value={rangeValue}
            onChange={(dates) => {
              if (!dates?.[0] || !dates?.[1]) {
                setListParams({ start: undefined, end: undefined });
                return;
              }
              setListParams({
                start: dates[0].format('YYYY-MM-DD'),
                end: dates[1].format('YYYY-MM-DD'),
              });
            }}
          />
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{
            ...tablePagination(total),
            showTotal: (n) => `${n} fee${n === 1 ? '' : 's'}`,
          }}
          scroll={{ x: 960 }}
          onRow={(r) => ({
            onClick: () => openDetail(r.id),
            style: { cursor: 'pointer' },
          })}
          columns={[
            ...(showRestaurant
              ? [
                  {
                    title: 'Restaurant',
                    width: 160,
                    ellipsis: true,
                    render: (_: unknown, r: NoShowFeeChargeRow) =>
                      r.restaurant?.name ?? '—',
                  },
                ]
              : []),
            {
              title: 'Charged',
              dataIndex: 'noShowFeeChargedAt',
              width: 150,
              render: (v: string | null | undefined) =>
                v
                  ? formatUsDateTime(v, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—',
            },
            {
              title: 'Guest',
              ellipsis: true,
              render: (_: unknown, r: NoShowFeeChargeRow) => guestName(r.diner),
            },
            {
              title: 'Reservation',
              dataIndex: 'slotStart',
              width: 150,
              render: (v: string) =>
                formatUsDateTime(v, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 110,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Amount',
              width: 100,
              render: (_: unknown, r: NoShowFeeChargeRow) =>
                formatUsd(r.noShowFeeCents) ?? '—',
            },
            {
              title: 'Fee',
              width: 160,
              render: (_: unknown, r: NoShowFeeChargeRow) => {
                const status = r.cardGuaranteeStatus ?? 'none';
                const pending =
                  r.status === 'no_show' && status === 'card_saved'
                    ? 'Pending charge'
                    : null;
                return (
                  <Space size={4} wrap>
                    <Tag color={FEE_STATUS_COLOR[status] ?? 'default'}>
                      {pending ??
                        (status === 'charged'
                          ? 'Charged'
                          : status === 'refunded'
                            ? 'Refunded'
                            : status === 'failed'
                              ? 'Failed'
                              : status.replace(/_/g, ' '))}
                    </Tag>
                    {r.noShowFeeReason && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.noShowFeeReason === 'late_cancel' ? 'Late cancel' : 'No-show'}
                      </Text>
                    )}
                  </Space>
                );
              },
            },
            {
              title: 'Details',
              ellipsis: true,
              render: (_: unknown, r: NoShowFeeChargeRow) =>
                formatNoShowFee(r) ?? '—',
            },
            {
              title: '',
              key: 'actions',
              width: 56,
              align: 'right' as const,
              fixed: 'right' as const,
              render: (_: unknown, r: NoShowFeeChargeRow) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Dropdown
                    menu={{ items: rowMenu(r) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={<MoreOutlined />}
                      aria-label="More actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

export function NoShowFeeChargesReport(props: Props) {
  return (
    <Suspense fallback={null}>
      <NoShowFeeChargesReportContent {...props} />
    </Suspense>
  );
}
