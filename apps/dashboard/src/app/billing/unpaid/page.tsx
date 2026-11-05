'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  formatUtcBillingPeriod,
  formatUtcCalendarDate,
} from '@reservations/shared';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageBilling } from '@/lib/roles';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  CONFIRM_OPEN_INVOICES_PAYMENT,
  MY_RESTAURANTS_SHELL,
  RESTAURANT_INVOICES,
  START_OPEN_INVOICES_PAYMENT,
} from '@/lib/graphql';
import { SignupPaymentForm } from '@/components/SignupPaymentForm';

const { Text } = Typography;

const OPEN_STATUSES = new Set(['pending', 'overdue', 'upcoming']);

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  pending: 'Due',
  overdue: 'Overdue',
};

type OpenInvoice = {
  id: string;
  number: string;
  status: string;
  billingPeriod: string;
  totalCents: number;
  dueDate: string;
  payUrl?: string | null;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function isOpenInvoice(invoice: OpenInvoice) {
  return OPEN_STATUSES.has(invoice.status) && invoice.totalCents > 0;
}

function rankStatus(status: string) {
  if (status === 'overdue') return 0;
  if (status === 'pending') return 1;
  return 2;
}

export default function UnpaidInvoicesPage() {
  const { message } = App.useApp();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canPay = Boolean(user && canManageBilling(user.role));

  const { data: restData } = useQuery(MY_RESTAURANTS_SHELL, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, setRestaurantId } = usePartnerRestaurant(restaurants);
  const restaurantFromUrl = searchParams.get('restaurant');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (restaurantFromUrl && restaurantFromUrl !== activeRestaurantId) {
      setRestaurantId(restaurantFromUrl);
    }
  }, [restaurantFromUrl, activeRestaurantId, setRestaurantId]);

  const activeRestaurant = restaurants.find(
    (r: { id: string; name?: string }) => r.id === activeRestaurantId,
  ) as { id: string; name?: string } | undefined;

  const {
    data: invoiceData,
    loading: invoiceLoading,
    refetch: refetchInvoices,
  } = useQuery(RESTAURANT_INVOICES, {
    variables: { restaurantId: activeRestaurantId, limit: 100, offset: 0 },
    skip: !user || !activeRestaurantId,
  });

  const [startOpenInvoicesPayment, { loading: startingPay }] = useMutation(
    START_OPEN_INVOICES_PAYMENT,
  );
  const [confirmOpenInvoicesPayment] = useMutation(CONFIRM_OPEN_INVOICES_PAYMENT);
  const [payment, setPayment] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    totalCents: number;
    invoiceCount: number;
  } | null>(null);

  const openInvoices = useMemo(() => {
    const items = (invoiceData?.restaurantInvoices?.items ?? []) as OpenInvoice[];
    return items
      .filter(isOpenInvoice)
      .sort((a, b) => {
        const byStatus = rankStatus(a.status) - rankStatus(b.status);
        if (byStatus !== 0) return byStatus;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [invoiceData?.restaurantInvoices?.items]);

  const totalCents = openInvoices.reduce((sum, inv) => sum + inv.totalCents, 0);
  const billingQs = activeRestaurantId
    ? `?restaurant=${encodeURIComponent(activeRestaurantId)}`
    : '';
  const backHref = `/billing${billingQs}`;

  const openPayAll = async () => {
    if (!activeRestaurantId) return;
    try {
      const { data } = await startOpenInvoicesPayment({
        variables: { restaurantId: activeRestaurantId },
      });
      const session = data?.startOpenInvoicesPayment;
      if (!session) {
        message.error('Could not start payment');
        return;
      }
      if (session.alreadyPaid || !session.clientSecret || !session.paymentIntentId) {
        message.success('All open invoices are already paid');
        await refetchInvoices();
        return;
      }
      setPayment({
        clientSecret: session.clientSecret,
        paymentIntentId: session.paymentIntentId,
        totalCents: session.totalCents,
        invoiceCount: session.invoices?.length ?? openInvoices.length,
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start payment');
    }
  };

  const finishPayAll = async () => {
    if (!activeRestaurantId || !payment) return;
    try {
      await confirmOpenInvoicesPayment({
        variables: {
          restaurantId: activeRestaurantId,
          paymentIntentId: payment.paymentIntentId,
        },
      });
      const count = payment.invoiceCount;
      setPayment(null);
      message.success(count > 1 ? `Paid ${count} invoices` : 'Invoice paid');
      await refetchInvoices();
      router.replace(backHref);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not confirm payment');
      throw err;
    }
  };

  return (
    <div style={{ display: 'contents' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="Unpaid invoices"
          subtitle={
            activeRestaurant
              ? `Open balances for ${activeRestaurant.name}`
              : 'Open balances for this location'
          }
          extra={
            <Link href={backHref}>
              <Button icon={<ArrowLeftOutlined />}>Back to Billing</Button>
            </Link>
          }
        />

        {!activeRestaurantId ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Empty description="Select a restaurant from Billing to view unpaid invoices." />
          </Card>
        ) : invoiceLoading && openInvoices.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <Spin size="large" />
          </div>
        ) : openInvoices.length === 0 ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Empty
              description="No unpaid invoices for this restaurant."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link href={backHref}>
                <Button type="primary">Back to Billing</Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Space
            orientation="vertical"
            size={spacing.lg}
            style={{ width: '100%', marginTop: spacing.lg }}
          >
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title={`${formatCents(totalCents)} across ${openInvoices.length} unpaid invoice${
                openInvoices.length === 1 ? '' : 's'
              }`}
              description={
                openInvoices.length > 1
                  ? 'Pay once to settle every open invoice in a single charge, or open an invoice for its breakdown and PDF.'
                  : 'Open the invoice to pay, or use Pay below.'
              }
              action={
                canPay ? (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    loading={startingPay}
                    onClick={() => void openPayAll()}
                  >
                    {openInvoices.length > 1
                      ? `Pay all ${formatCents(totalCents)}`
                      : `Pay ${formatCents(totalCents)}`}
                  </Button>
                ) : null
              }
            />

            <Card styles={{ body: { padding: spacing.sm } }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {openInvoices.map((invoice) => {
                  const href = `/billing/invoices/${invoice.id}${billingQs}`;
                  return (
                    <Link
                      key={invoice.id}
                      href={href}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '12px 14px',
                          border: `1px solid ${
                            invoice.status === 'overdue' ? '#f0c4bc' : colors.bordersubtle
                          }`,
                          borderRadius: radii.md,
                          background:
                            invoice.status === 'overdue' ? colors.errorBg : colors.neutral[0],
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Text strong style={{ color: colors.textPrimary }}>
                              {formatUtcBillingPeriod(invoice.billingPeriod, { month: 'short' })}
                            </Text>
                            <Tag
                              color={STATUS_COLORS[invoice.status] ?? 'default'}
                              style={{ marginInlineEnd: 0 }}
                            >
                              {STATUS_LABELS[invoice.status] ?? invoice.status}
                            </Tag>
                          </div>
                          <Text
                            type="secondary"
                            style={{ display: 'block', marginTop: 2, fontSize: 13 }}
                          >
                            {invoice.number}
                            {' · '}
                            {invoice.status === 'overdue'
                              ? `Overdue · was due ${formatUtcCalendarDate(invoice.dueDate)}`
                              : `Due ${formatUtcCalendarDate(invoice.dueDate)}`}
                          </Text>
                        </div>
                        <Text
                          strong
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            flexShrink: 0,
                            color:
                              invoice.status === 'overdue'
                                ? colors.error
                                : colors.textPrimary,
                          }}
                        >
                          {formatCents(invoice.totalCents)}
                        </Text>
                        <RightOutlined
                          style={{ color: colors.neutral[400], fontSize: 12, flexShrink: 0 }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>

            {canPay ? (
              <Button
                type="primary"
                size="large"
                block
                icon={<DollarOutlined />}
                loading={startingPay}
                onClick={() => void openPayAll()}
                style={{ height: 48, fontWeight: 600 }}
              >
                {openInvoices.length > 1
                  ? `Pay all ${formatCents(totalCents)}`
                  : `Pay ${formatCents(totalCents)}`}
              </Button>
            ) : null}
          </Space>
        )}

        <Modal
          title={
            payment && payment.invoiceCount > 1 ? 'Pay all open invoices' : 'Pay invoice'
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
              planName={
                payment.invoiceCount > 1
                  ? `${payment.invoiceCount} invoices`
                  : 'Open invoice'
              }
              monthlyLabel={formatCents(payment.totalCents)}
              trialDays={0}
              description={
                payment.invoiceCount > 1
                  ? `One charge of ${formatCents(payment.totalCents)} covers all open invoices for this location.`
                  : `Pay ${formatCents(payment.totalCents)} to settle this invoice.`
              }
              onSuccess={() => finishPayAll()}
            />
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
