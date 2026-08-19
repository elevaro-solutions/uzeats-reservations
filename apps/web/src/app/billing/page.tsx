'use client';

import { useQuery } from '@apollo/client/react';
import { Alert, Button, Card, Empty, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, CreditCardOutlined, RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState, PageHeader, colors, radii, shadows, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESERVATIONS } from '@/lib/graphql';

const { Text } = Typography;

type BillingReservation = {
  id: string;
  createdAt: string;
  slotStart: string;
  partySize: number;
  occasion?: string;
  depositAmountCents: number;
  depositStatus: string;
  status: string;
  restaurant?: {
    id?: string;
    name?: string;
    slug?: string;
    address?: {
      city?: string;
      state?: string;
    };
  } | null;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDepositStatus(status: string) {
  switch (status) {
    case 'requires_payment':
      return 'Payment due';
    case 'authorized':
      return 'Authorized';
    case 'captured':
      return 'Captured';
    case 'refunded':
      return 'Refunded';
    case 'failed':
      return 'Failed';
    default:
      return status.replace(/_/g, ' ');
  }
}

function depositTagColor(status: string) {
  switch (status) {
    case 'requires_payment':
      return 'gold';
    case 'authorized':
      return 'blue';
    case 'captured':
      return 'green';
    case 'refunded':
      return 'purple';
    case 'failed':
      return 'red';
    default:
      return 'default';
  }
}

export default function BillingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data, loading } = useQuery(MY_RESERVATIONS, {
    skip: !user,
    fetchPolicy: 'network-only',
  });

  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login?next=/billing');
    return null;
  }

  const reservations = ((data as any)?.myReservations ?? []) as BillingReservation[];
  const billedReservations = reservations
    .filter((r) => (r.depositAmountCents ?? 0) > 0)
    .sort((a, b) => new Date(b.createdAt || b.slotStart).getTime() - new Date(a.createdAt || a.slotStart).getTime());

  const totalAuthorizedOrCaptured = billedReservations
    .filter((r) => r.depositStatus === 'authorized' || r.depositStatus === 'captured')
    .reduce((sum, r) => sum + r.depositAmountCents, 0);

  const totalRefunded = billedReservations
    .filter((r) => r.depositStatus === 'refunded')
    .reduce((sum, r) => sum + r.depositAmountCents, 0);

  const totalPending = billedReservations
    .filter((r) => r.depositStatus === 'requires_payment')
    .reduce((sum, r) => sum + r.depositAmountCents, 0);

  return (
    <div style={{ maxWidth: 920 }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/reservations')}
        style={{ marginBottom: 8, paddingLeft: 0 }}
      >
        My reservations
      </Button>

      <PageHeader
        title="Billing & invoices"
        subtitle="Track booking deposits, payment status, and refunded holds"
      />

      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 16 }}
        message="Diner billing currently shows reservation deposit activity"
        description="Deposits are authorization holds tied to reservations. Full restaurant receipts are usually issued at the venue after dining."
      />

      {loading ? (
        <Card
          loading
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
            minHeight: 220,
          }}
        />
      ) : billedReservations.length === 0 ? (
        <EmptyState
          icon={<CreditCardOutlined />}
          title="No billing activity yet"
          description="When you place a reservation deposit, it will appear here with its current status."
          action={
            <Button type="primary" onClick={() => router.push('/reservations')}>
              View reservations
            </Button>
          }
        />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Authorized/captured', value: formatMoney(totalAuthorizedOrCaptured) },
              { label: 'Refunded', value: formatMoney(totalRefunded) },
              { label: 'Pending payment', value: formatMoney(totalPending) },
            ].map((item) => (
              <Card
                key={item.label}
                style={{
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.bordersubtle}`,
                  boxShadow: shadows.sm,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                  {item.label}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ fontSize: 24 }}>
                    {item.value}
                  </Text>
                </div>
              </Card>
            ))}
          </div>

          <Card
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.bordersubtle}`,
              boxShadow: shadows.sm,
            }}
          >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              {billedReservations.map((reservation, idx) => (
                <div
                  key={reservation.id}
                  style={{
                    padding: '18px 0',
                    borderBottom:
                      idx < billedReservations.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <Space size={8} wrap>
                        <Text strong style={{ fontSize: typography.fontSize.md }}>
                          {reservation.restaurant?.name ?? 'Restaurant'}
                        </Text>
                        <Tag color={depositTagColor(reservation.depositStatus)}>
                          {formatDepositStatus(reservation.depositStatus)}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Reservation #{reservation.id.slice(-8).toUpperCase()}
                      </Text>
                      <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                        <CalendarOutlined style={{ marginRight: 6 }} />
                        {new Date(reservation.slotStart).toLocaleString()} · {reservation.partySize}{' '}
                        {reservation.partySize === 1 ? 'guest' : 'guests'}
                      </Text>
                      {(reservation.restaurant?.address?.city || reservation.restaurant?.address?.state) && (
                        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                          {[reservation.restaurant?.address?.city, reservation.restaurant?.address?.state]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      )}
                      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Added {new Date(reservation.createdAt).toLocaleString()}
                      </Text>
                    </div>

                    <div style={{ minWidth: 180, textAlign: 'right' }}>
                      <Text type="secondary" style={{ display: 'block', fontSize: typography.fontSize.sm }}>
                        Deposit amount
                      </Text>
                      <Text strong style={{ fontSize: 24 }}>
                        {formatMoney(reservation.depositAmountCents)}
                      </Text>
                      <Space style={{ marginTop: 12 }} wrap>
                        {reservation.depositStatus === 'requires_payment' ? (
                          <Button type="primary" onClick={() => router.push(`/reservations/${reservation.id}`)}>
                            Pay now
                          </Button>
                        ) : null}
                        <Link href={`/reservations/${reservation.id}`}>
                          <Button icon={<RightOutlined />}>View reservation</Button>
                        </Link>
                      </Space>
                    </div>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Space>
      )}
    </div>
  );
}
