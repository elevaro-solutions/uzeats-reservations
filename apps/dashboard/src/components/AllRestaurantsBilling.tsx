'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Modal, Space, Table, Tag, Typography } from 'antd';
import { App } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageBilling } from '@/lib/roles';
import {
  CONFIRM_ALL_OPEN_INVOICES_PAYMENT,
  CONFIRM_OPEN_INVOICES_PAYMENT,
  MY_BILLING_OVERVIEW,
  MY_RESTAURANTS_SHELL,
  START_ALL_OPEN_INVOICES_PAYMENT,
  START_OPEN_INVOICES_PAYMENT,
} from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { SignupPaymentForm } from '@/components/SignupPaymentForm';

const { Text } = Typography;

type BillingLocation = {
  restaurantId: string;
  name: string;
  plan?: string | null;
  subscriptionStatus?: string | null;
  openInvoiceCount: number;
  outstandingCents: number;
};

type OpenInvoice = {
  id: string;
  number: string;
  restaurantId: string;
  restaurantName?: string | null;
  status: string;
  totalCents: number;
  dueDate: string;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function statusColor(status: string) {
  if (status === 'overdue' || status === 'past_due') return 'error';
  if (status === 'active' || status === 'paid') return 'success';
  if (status === 'trialing' || status === 'upcoming') return 'gold';
  return 'default';
}

export function AllRestaurantsBilling() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const canPay = Boolean(user && canManageBilling(user.role));
  const { data: restData } = useQuery(MY_RESTAURANTS_SHELL, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { setRestaurantId } = usePartnerRestaurant(restaurants);
  const { data, loading, refetch } = useQuery(MY_BILLING_OVERVIEW, { skip: !user });
  const [startOpenInvoicesPayment, { loading: startingPay }] = useMutation(START_OPEN_INVOICES_PAYMENT);
  const [confirmOpenInvoicesPayment] = useMutation(CONFIRM_OPEN_INVOICES_PAYMENT);
  const [startAllOpenInvoicesPayment, { loading: startingAll }] = useMutation(
    START_ALL_OPEN_INVOICES_PAYMENT,
  );
  const [confirmAllOpenInvoicesPayment] = useMutation(CONFIRM_ALL_OPEN_INVOICES_PAYMENT);
  const [payment, setPayment] = useState<{
    scope: 'restaurant' | 'all';
    restaurantId?: string;
    clientSecret: string;
    paymentIntentId: string;
    totalCents: number;
    invoiceCount: number;
  } | null>(null);

  const overview = data?.myBillingOverview;
  const locations = (overview?.locations ?? []) as BillingLocation[];
  const openInvoices = (overview?.openInvoices ?? []) as OpenInvoice[];

  const payRestaurant = async (restaurantId: string) => {
    try {
      const { data: payData } = await startOpenInvoicesPayment({
        variables: { restaurantId },
      });
      const session = payData?.startOpenInvoicesPayment;
      if (!session) {
        message.error('Could not start payment');
        return;
      }
      if (session.alreadyPaid || !session.clientSecret || !session.paymentIntentId) {
        message.success('Open invoices for this restaurant are already paid');
        await refetch();
        return;
      }
      setPayment({
        scope: 'restaurant',
        restaurantId,
        clientSecret: session.clientSecret,
        paymentIntentId: session.paymentIntentId,
        totalCents: session.totalCents,
        invoiceCount: session.invoices?.length ?? 1,
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start payment');
    }
  };

  const payAll = async () => {
    try {
      const { data: payData } = await startAllOpenInvoicesPayment();
      const session = payData?.startAllOpenInvoicesPayment;
      if (!session) {
        message.error('Could not start payment');
        return;
      }
      if (session.alreadyPaid || !session.clientSecret || !session.paymentIntentId) {
        message.success('Open invoices are already paid');
        await refetch();
        return;
      }
      setPayment({
        scope: 'all',
        clientSecret: session.clientSecret,
        paymentIntentId: session.paymentIntentId,
        totalCents: session.totalCents,
        invoiceCount: session.invoices?.length ?? overview?.openInvoiceCount ?? 1,
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start payment');
    }
  };

  const finishPayment = async () => {
    if (!payment) return;
    try {
      if (payment.scope === 'all') {
        await confirmAllOpenInvoicesPayment({
          variables: { paymentIntentId: payment.paymentIntentId },
        });
      } else if (payment.restaurantId) {
        await confirmOpenInvoicesPayment({
          variables: {
            restaurantId: payment.restaurantId,
            paymentIntentId: payment.paymentIntentId,
          },
        });
      }
      const count = payment.invoiceCount;
      setPayment(null);
      message.success(count > 1 ? `Paid ${count} invoices` : 'Invoice paid');
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not confirm payment');
      throw err;
    }
  };

  const outstandingCents = overview?.outstandingCents ?? 0;
  const openInvoiceCount = overview?.openInvoiceCount ?? 0;
  const paying = startingPay || startingAll;

  return (
    <div component="AllRestaurantsBilling" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Billing"
          subtitle="Plans and open invoices for every restaurant. Select a restaurant to change its plan."
          extra={
            canPay && openInvoiceCount > 0 ? (
              <Button
                type="primary"
                icon={<DollarOutlined />}
                loading={startingAll}
                onClick={() => void payAll()}
              >
                Pay all invoices {formatCents(outstandingCents)}
              </Button>
            ) : null
          }
        />

        <Space size={spacing.lg} wrap>
          <Card style={{ minWidth: 180 }}>
            <Text type="secondary">Restaurants</Text>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{locations.length}</div>
          </Card>
          <Card style={{ minWidth: 180 }}>
            <Text type="secondary">Open invoices</Text>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{openInvoiceCount}</div>
          </Card>
          <Card style={{ minWidth: 180 }}>
            <Text type="secondary">Outstanding</Text>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {formatCents(outstandingCents)}
            </div>
          </Card>
        </Space>

        <Card title="Restaurants" style={{ borderRadius: radii.lg }} styles={{ body: { padding: 0 } }}>
          <Table<BillingLocation>
            rowKey="restaurantId"
            loading={loading}
            dataSource={locations}
            pagination={false}
            columns={[
              {
                title: 'Restaurant',
                dataIndex: 'name',
                render: (name: string, row) => (
                  <Button type="link" style={{ paddingInline: 0 }} onClick={() => setRestaurantId(row.restaurantId)}>
                    {name}
                  </Button>
                ),
              },
              {
                title: 'Plan',
                dataIndex: 'plan',
                render: (plan: string | null | undefined) => (
                  <Text style={{ textTransform: 'capitalize' }}>{plan ?? '—'}</Text>
                ),
              },
              {
                title: 'Status',
                dataIndex: 'subscriptionStatus',
                render: (status: string | null | undefined) =>
                  status ? (
                    <Tag color={statusColor(status)} style={{ textTransform: 'capitalize' }}>
                      {status.replaceAll('_', ' ')}
                    </Tag>
                  ) : (
                    '—'
                  ),
              },
              {
                title: 'Open invoices',
                dataIndex: 'openInvoiceCount',
                width: 140,
              },
              {
                title: 'Outstanding',
                dataIndex: 'outstandingCents',
                render: (cents: number) => formatCents(cents),
              },
              {
                title: '',
                key: 'actions',
                width: 180,
                render: (_: unknown, row) => (
                  <Space>
                    {canPay && row.outstandingCents > 0 ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<DollarOutlined />}
                        loading={paying}
                        onClick={() => void payRestaurant(row.restaurantId)}
                      >
                        Pay
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => setRestaurantId(row.restaurantId)}>
                      Manage
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card title="Open invoices" style={{ borderRadius: radii.lg }} styles={{ body: { padding: 0 } }}>
          <Table<OpenInvoice>
            rowKey="id"
            loading={loading}
            dataSource={openInvoices}
            pagination={openInvoices.length > 10 ? { pageSize: 10 } : false}
            locale={{ emptyText: 'No open invoices.' }}
            columns={[
              {
                title: 'Restaurant',
                dataIndex: 'restaurantName',
                render: (name: string | null | undefined, row) => name ?? row.restaurantId,
              },
              { title: 'Invoice', dataIndex: 'number' },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (status: string) => (
                  <Tag color={statusColor(status)} style={{ textTransform: 'capitalize' }}>
                    {status.replaceAll('_', ' ')}
                  </Tag>
                ),
              },
              {
                title: 'Amount',
                dataIndex: 'totalCents',
                render: (cents: number) => (
                  <Text strong style={{ color: colors.textPrimary }}>
                    {formatCents(cents)}
                  </Text>
                ),
              },
              {
                title: '',
                key: 'pay',
                width: 100,
                render: (_: unknown, row) =>
                  canPay ? (
                    <Button size="small" onClick={() => void payRestaurant(row.restaurantId)}>
                      Pay
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Card>
      </Space>

      <Modal
        title={
          payment?.scope === 'all'
            ? 'Pay all invoices'
            : payment && payment.invoiceCount > 1
              ? 'Pay open invoices'
              : 'Pay invoice'
        }
        open={Boolean(payment)}
        footer={null}
        destroyOnHidden
        onCancel={() => setPayment(null)}
      >
        {payment ? (
          <SignupPaymentForm
            clientSecret={payment.clientSecret}
            paymentMode="payment"
            planName={payment.invoiceCount > 1 ? `${payment.invoiceCount} invoices` : 'Open invoice'}
            monthlyLabel={formatCents(payment.totalCents)}
            trialDays={0}
            description={
              payment.scope === 'all'
                ? `One charge of ${formatCents(payment.totalCents)} covers every open invoice.`
                : `One charge of ${formatCents(payment.totalCents)} for this restaurant.`
            }
            onSuccess={() => finishPayment()}
          />
        ) : null}
      </Modal>
    </div>
  );
}
