'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Alert, Button, Card, DatePicker, Input, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { spacing } from '@reservations/ui';
import {
  ADMIN_INVOICES,
  EXTEND_BILLING_GRACE,
  FORCE_RESTORE_BILLING_ACCESS,
  PAUSE_BILLING_ENFORCEMENT,
  RESTAURANT_BILLING_ENFORCEMENT,
  RESUME_BILLING_ENFORCEMENT,
  SET_INVOICE_STATUS,
  WAIVE_INVOICE_ENFORCEMENT_FEES,
} from '@/lib/graphql';

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
  return (cents / 100).toLocaleString('en-US', {
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
  const { data: enforcementData, refetch: refetchEnforcement } = useQuery(
    RESTAURANT_BILLING_ENFORCEMENT,
    { variables: { restaurantId } },
  );
  const [setInvoiceStatus, { loading: updating }] = useMutation(SET_INVOICE_STATUS);
  const [pauseEnforcement, { loading: pausing }] = useMutation(PAUSE_BILLING_ENFORCEMENT);
  const [resumeEnforcement, { loading: resuming }] = useMutation(RESUME_BILLING_ENFORCEMENT);
  const [extendGrace, { loading: extending }] = useMutation(EXTEND_BILLING_GRACE);
  const [forceRestore, { loading: restoring }] = useMutation(FORCE_RESTORE_BILLING_ACCESS);
  const [waiveFees, { loading: waiving }] = useMutation(WAIVE_INVOICE_ENFORCEMENT_FEES);
  const [pauseReason, setPauseReason] = useState('');
  const [graceUntil, setGraceUntil] = useState<dayjs.Dayjs | null>(null);

  const items = data?.adminInvoices?.items ?? [];
  const enforcement = enforcementData?.restaurant?.subscription?.billingEnforcement;
  const busy = updating || pausing || resuming || extending || restoring || waiving;

  const refreshAll = () => {
    void refetch();
    void refetchEnforcement();
  };

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
      {enforcement ? (
        <Alert
          style={{ marginBottom: spacing.md }}
          type={enforcement.paused || enforcement.stage === 'current' || enforcement.stage === 'grace' ? 'info' : 'warning'}
          message={`Fail-to-pay: ${enforcement.stage}${enforcement.paused ? ' (paused)' : ''}`}
          description={
            <span>
              {enforcement.daysPastDue != null ? `${enforcement.daysPastDue} days past due. ` : ''}
              {enforcement.outstandingCents
                ? `Outstanding ${money(enforcement.outstandingCents)}. `
                : ''}
              Listing {enforcement.publiclyListed ? 'visible' : 'hidden'}.
            </span>
          }
        />
      ) : null}
      <Space wrap style={{ marginBottom: spacing.md, width: '100%' }}>
        <Link href={`/admin/invoices`}>
          <Button icon={<PlusOutlined />}>Open invoices admin</Button>
        </Link>
        <Button icon={<ReloadOutlined />} onClick={refreshAll}>
          Refresh
        </Button>
        {enforcement?.paused ? (
          <Button
            loading={resuming}
            onClick={async () => {
              try {
                await resumeEnforcement({ variables: { restaurantId } });
                message.success('Enforcement resumed');
                refreshAll();
              } catch (err: any) {
                message.error(err.message || 'Failed to resume');
              }
            }}
          >
            Resume ladder
          </Button>
        ) : (
          <Space.Compact>
            <Input
              placeholder="Pause reason"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              style={{ width: 180 }}
            />
            <Button
              loading={pausing}
              onClick={async () => {
                try {
                  await pauseEnforcement({
                    variables: { restaurantId, reason: pauseReason || undefined },
                  });
                  message.success('Enforcement paused');
                  refreshAll();
                } catch (err: any) {
                  message.error(err.message || 'Failed to pause');
                }
              }}
            >
              Pause
            </Button>
          </Space.Compact>
        )}
        <Space.Compact>
          <DatePicker
            value={graceUntil}
            onChange={(value) => setGraceUntil(value)}
            placeholder="Extend grace until"
          />
          <Button
            loading={extending}
            disabled={!graceUntil}
            onClick={async () => {
              if (!graceUntil) return;
              try {
                await extendGrace({
                  variables: { restaurantId, until: graceUntil.endOf('day').toISOString() },
                });
                message.success('Grace extended');
                refreshAll();
              } catch (err: any) {
                message.error(err.message || 'Failed to extend grace');
              }
            }}
          >
            Extend grace
          </Button>
        </Space.Compact>
        <Button
          loading={restoring}
          onClick={async () => {
            try {
              await forceRestore({
                variables: { restaurantId, reason: pauseReason || 'Force-restored by admin' },
              });
              message.success('Listing restored (ladder paused)');
              refreshAll();
            } catch (err: any) {
              message.error(err.message || 'Failed to restore');
            }
          }}
        >
          Force restore
        </Button>
        <Text type="secondary">
          {data?.adminInvoices?.total ?? 0} invoice
          {(data?.adminInvoices?.total ?? 0) === 1 ? '' : 's'} for this restaurant
        </Text>
      </Space>
      <Table<InvoiceRow>
        loading={loading || busy}
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
            render: (v: string) => new Date(v).toLocaleDateString('en-US'),
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
                {r.status !== 'paid' && r.status !== 'canceled' ? (
                  <Button
                    size="small"
                    type="link"
                    onClick={async () => {
                      try {
                        await waiveFees({ variables: { invoiceId: r.id } });
                        message.success('Fees waived');
                        refreshAll();
                      } catch (err: any) {
                        message.error(err.message || 'Failed to waive fees');
                      }
                    }}
                  >
                    Waive fees
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
