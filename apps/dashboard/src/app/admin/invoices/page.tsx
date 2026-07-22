'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { Key } from 'react';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_INVOICES,
  GENERATE_INVOICES,
  SET_INVOICE_STATUS,
  SET_INVOICE_STATUSES,
  SYNC_STRIPE_INVOICES,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

const STATUS_OPTIONS = [
  { value: undefined, label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'canceled', label: 'Canceled' },
];

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function AdminInvoicesContent() {
  const { ready } = useRequireAdmin();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data, loading, refetch } = useQuery(ADMIN_INVOICES, {
    skip: !ready,
    variables: {
      status: status || undefined,
      search: search || undefined,
      limit,
      offset,
    },
  });
  const [generate, { loading: generating }] = useMutation(GENERATE_INVOICES);
  const [syncStripe, { loading: syncing }] = useMutation(SYNC_STRIPE_INVOICES);
  const [setInvoiceStatus] = useMutation(SET_INVOICE_STATUS);
  const [setInvoiceStatuses, { loading: bulkUpdating }] = useMutation(SET_INVOICE_STATUSES);

  if (!ready) return null;

  const items = data?.adminInvoices?.items ?? [];
  const selected = items.filter((r: { id: string }) => selectedRowKeys.includes(r.id));
  const markPaidIds = selected
    .filter((r: { status: string }) => r.status !== 'paid' && r.status !== 'canceled')
    .map((r: { id: string }) => r.id);
  const cancelIds = selected
    .filter((r: { status: string }) => r.status !== 'canceled')
    .map((r: { id: string }) => r.id);
  const reopenIds = selected
    .filter((r: { status: string }) => r.status === 'canceled')
    .map((r: { id: string }) => r.id);

  const onGenerate = async () => {
    try {
      const res = await generate({ variables: { period } });
      const r = res.data?.generateInvoices;
      message.success(
        `Generated ${r?.created ?? 0} invoices for ${r?.period} (${r?.skipped ?? 0} skipped)`,
      );
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to generate invoices');
    }
  };

  const updateStatus = async (id: string, next: string) => {
    try {
      await setInvoiceStatus({ variables: { id, status: next } });
      message.success('Invoice updated');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoice');
    }
  };

  const bulkUpdateStatus = async (ids: string[], next: string) => {
    if (!ids.length) return;
    try {
      const res = await setInvoiceStatuses({
        variables: { ids, status: next },
      });
      const updated = res.data?.setInvoiceStatuses?.updated ?? ids.length;
      message.success(`Updated ${updated} invoice${updated === 1 ? '' : 's'}`);
      setSelectedRowKeys([]);
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoices');
    }
  };

  return (
    <div component="AdminInvoicesContent" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Invoices"
        subtitle="Generate monthly invoices and track upcoming, pending, overdue, and canceled bills."
      />
      <Card>
        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Select
            allowClear
            placeholder="Filter status"
            style={{ width: 180 }}
            options={STATUS_OPTIONS.filter((o) => o.value)}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPagination(1);
              setSelectedRowKeys([]);
            }}
          />
          <Input.Search
            placeholder="Search invoice # or restaurant"
            allowClear
            style={{ width: 280 }}
            onSearch={(v) => {
              setSearch(v);
              setPagination(1);
              setSelectedRowKeys([]);
            }}
          />
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: 160 }}
          />
          <Button type="primary" loading={generating} onClick={onGenerate}>
            Generate for period
          </Button>
          <Button
            loading={syncing}
            onClick={async () => {
              try {
                const res = await syncStripe({ variables: { limit: 50 } });
                message.success(res.data?.syncStripeInvoices?.message || 'Synced');
                refetch();
              } catch (err: any) {
                message.error(err.message || 'Stripe sync failed');
              }
            }}
          >
            Sync Stripe invoices
          </Button>
        </Space>
        {selectedRowKeys.length > 0 && (
          <Space wrap style={{ marginBottom: 16, width: '100%' }}>
            <Typography.Text>
              {selectedRowKeys.length} selected
            </Typography.Text>
            <Button
              type="primary"
              size="small"
              disabled={!markPaidIds.length}
              loading={bulkUpdating}
              onClick={() => bulkUpdateStatus(markPaidIds, 'paid')}
            >
              Mark paid
            </Button>
            <Button
              danger
              size="small"
              disabled={!cancelIds.length}
              loading={bulkUpdating}
              onClick={() => bulkUpdateStatus(cancelIds, 'canceled')}
            >
              Cancel
            </Button>
            <Button
              size="small"
              disabled={!reopenIds.length}
              loading={bulkUpdating}
              onClick={() => bulkUpdateStatus(reopenIds, 'pending')}
            >
              Reopen
            </Button>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Clear
            </Button>
          </Space>
        )}
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          pagination={tablePagination(data?.adminInvoices?.total ?? 0)}
          onChange={() => setSelectedRowKeys([])}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          expandable={{
            expandedRowRender: (record: any) => (
              <Table
                size="small"
                pagination={false}
                rowKey={(_, idx) => String(idx)}
                dataSource={record.lines ?? []}
                columns={[
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', width: 80 },
                  {
                    title: 'Amount',
                    dataIndex: 'amountCents',
                    render: (v: number) => money(v, record.currency),
                  },
                ]}
              />
            ),
          }}
          columns={[
            { title: 'Number', dataIndex: 'number' },
            {
              title: 'Restaurant',
              dataIndex: 'restaurantName',
              render: (v: string | null) => v || '—',
            },
            { title: 'Period', dataIndex: 'billingPeriod', width: 110 },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (s: string) => <Tag color={STATUS_COLORS[s] ?? 'default'}>{s}</Tag>,
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
              render: (v: number, r: any) => money(v, r.currency),
            },
            {
              title: 'Actions',
              width: 220,
              render: (_: unknown, r: any) => (
                <Space wrap>
                  {r.status !== 'paid' && r.status !== 'canceled' && (
                    <Button size="small" type="primary" onClick={() => updateStatus(r.id, 'paid')}>
                      Mark paid
                    </Button>
                  )}
                  {r.status !== 'canceled' && (
                    <Button size="small" danger onClick={() => updateStatus(r.id, 'canceled')}>
                      Cancel
                    </Button>
                  )}
                  {r.status === 'canceled' && (
                    <Button size="small" onClick={() => updateStatus(r.id, 'pending')}>
                      Reopen
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space></div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <div component="AdminInvoicesPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <AdminInvoicesContent />
    </Suspense></div>
  );
}
