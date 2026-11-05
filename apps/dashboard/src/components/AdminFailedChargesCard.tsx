'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, Empty, Table, Tag, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@/lib/apollo-hooks';
import { ADMIN_FAILED_CHARGES } from '@/lib/graphql';

const { Text } = Typography;

export const FAILED_CHARGES_SECTION = 'failed-charges';

type FailedCharge = {
  id: string;
  number: string;
  restaurantId: string;
  restaurantName?: string | null;
  status: string;
  totalCents: number;
  currency?: string | null;
  dueDate: string;
  autoChargeError?: string | null;
  autoChargeAttemptedAt?: string | null;
  autoChargeAttempts: number;
  autoChargePaused: boolean;
  autoChargeRetriedByStripe: boolean;
  nextAutoChargeAt?: string | null;
};

function formatCents(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  });
}

function nextStep(row: FailedCharge) {
  if (row.autoChargePaused) return <Tag color="red">Paused — needs new card</Tag>;
  if (row.autoChargeRetriedByStripe) return <Tag color="blue">Stripe retries</Tag>;
  if (row.nextAutoChargeAt) return dayjs(row.nextAutoChargeAt).format('MMM D');
  return '—';
}

export function AdminFailedChargesCard() {
  const searchParams = useSearchParams();
  const anchorRef = useRef<HTMLDivElement>(null);
  const { data, loading } = useQuery(ADMIN_FAILED_CHARGES, {
    variables: { limit: 100 },
    fetchPolicy: 'cache-and-network',
  });
  const rows = (data?.adminFailedCharges ?? []) as FailedCharge[];
  const focused = searchParams.get('section') === FAILED_CHARGES_SECTION;

  useEffect(() => {
    if (focused && !loading) {
      anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focused, loading]);

  return (
    <div ref={anchorRef} id={FAILED_CHARGES_SECTION} style={{ marginTop: 24 }}>
      <Card
        title={
          <span>
            <WarningOutlined style={{ marginRight: 8 }} />
            Failed charges
            {rows.length ? (
              <Tag color="red" style={{ marginLeft: 8 }}>
                {rows.length}
              </Tag>
            ) : null}
          </span>
        }
      >
        <Table<FailedCharge>
          rowKey="id"
          size="small"
          loading={loading && !rows.length}
          dataSource={rows}
          pagination={rows.length > 20 ? { pageSize: 20 } : false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: <Empty description="No failed automatic charges" />,
          }}
          columns={[
            {
              title: 'Restaurant',
              key: 'restaurant',
              render: (_, row) => (
                <Link href={`/admin/restaurants/${row.restaurantId}`}>
                  {row.restaurantName ?? 'Restaurant'}
                </Link>
              ),
            },
            {
              title: 'Invoice',
              key: 'invoice',
              render: (_, row) => <Link href={`/admin/invoices/${row.id}`}>{row.number}</Link>,
            },
            {
              title: 'Amount',
              key: 'amount',
              align: 'right',
              render: (_, row) => formatCents(row.totalCents, row.currency ?? 'usd'),
            },
            {
              title: 'Reason',
              dataIndex: 'autoChargeError',
              render: (value: string | null) => <Text type="danger">{value ?? '—'}</Text>,
            },
            { title: 'Attempts', dataIndex: 'autoChargeAttempts', align: 'right' },
            {
              title: 'Last attempt',
              dataIndex: 'autoChargeAttemptedAt',
              render: (value: string | null) => (value ? dayjs(value).format('MMM D, h:mm A') : '—'),
            },
            {
              title: 'Due',
              dataIndex: 'dueDate',
              render: (value: string) => dayjs(value).format('MMM D'),
            },
            { title: 'Next retry', key: 'next', render: (_, row) => nextStep(row) },
          ]}
        />
      </Card>
    </div>
  );
}
