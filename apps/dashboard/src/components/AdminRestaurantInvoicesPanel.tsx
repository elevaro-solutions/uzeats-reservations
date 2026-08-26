'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { spacing } from '@reservations/ui';
import { ADMIN_INVOICES, SET_INVOICE_STATUS } from '@/lib/graphql';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

type InvoiceRow = {
  id: string;
  number?: string;
  billingPeriod?: string;
  status: string;
  dueDate?: string;
  totalCents?: number;
  currency?: string;
};

export function AdminRestaurantInvoicesPanel({ restaurantId }: { restaurantId: string }) {
  const { data, loading, refetch } = useQuery(ADMIN_INVOICES, {
    variables: { restaurantId, limit: 50, offset: 0 },
  });
  const [setInvoiceStatus, { loading: updating }] = useMutation(SET_INVOICE_STATUS);

  const items = data?.adminInvoices?.items ?? [];

  const updateStatus = async (id: string, status: string) => {
    try {
      await setInvoiceStatus({ variables: { id, status } });
      message.success('Invoice updated');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoice');
    }
  };

  return (
    <Card>
      <Space wrap style={{ marginBottom: spacing.md, width: '100%' }}>
        <Link href={`/admin/invoices`}>
          <Button icon={<PlusOutlined />}>Open invoices admin</Button>
        </Link>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
          Refresh
        </Button>
        <Text type="secondary">
          {data?.adminInvoices?.total ?? 0} invoice
          {(data?.adminInvoices?.total ?? 0) === 1 ? '' : 's'} for this restaurant
        </Text>
      </Space>
      <Table<InvoiceRow>
        loading={loading || updating}
        rowKey="id"
        dataSource={items as InvoiceRow[]}
        pagination={false}
        columns={[
          {
            title: 'Number',
            dataIndex: 'number',
            render: (number: string, r: InvoiceRow) => (
              <Link href={`/admin/invoices/${r.id}`} style={{ fontWeight: 500 }}>
                {number}
              </Link>
            ),
          },
          { title: 'Period', dataIndex: 'billingPeriod', width: 110 },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (s: string) => (
              <Tag color={STATUS_COLORS[s] ?? 'default'}>{statusLabel(s)}</Tag>
            ),
          },
          {
            title: 'Due',
            dataIndex: 'dueDate',
            width: 120,
            render: (v: string) => new Date(v).toLocaleDateString(),
          },
          {
            title: 'Total',
            dataIndex: 'totalCents',
            width: 120,
            render: (v: number, r: InvoiceRow) => money(v, r.currency),
          },
          {
            title: 'Actions',
            width: 180,
            render: (_: unknown, r: InvoiceRow) => (
              <Space size="small">
                {r.status !== 'paid' && r.status !== 'canceled' ? (
                  <Button size="small" type="link" onClick={() => void updateStatus(r.id, 'paid')}>
                    Mark paid
                  </Button>
                ) : null}
                {r.status !== 'canceled' ? (
                  <Button
                    size="small"
                    type="link"
                    danger
                    onClick={() => void updateStatus(r.id, 'canceled')}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => void updateStatus(r.id, 'pending')}
                  >
                    Reopen
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
