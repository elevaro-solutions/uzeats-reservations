'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useMutation, useQuery } from '@apollo/client/react';
import { Button, Card, Space, Spin, Typography, message, Result } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii, shadows } from '@reservations/ui';
import { prepaymentPolicyText } from '@reservations/shared';
import { CONFIRM_DEPOSIT, STRIPE_CLIENT_CONFIG } from '@/lib/graphql';
import { isCardSetupSecret } from '@/components/DepositPayment';

const { Title, Text, Paragraph } = Typography;

const ENV_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function DepositForm({
  reservationId,
  paymentIntentId,
  amountCents,
  saveCardOnly,
}: {
  reservationId: string;
  paymentIntentId: string;
  amountCents: number;
  saveCardOnly: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [loading, setLoading] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [elementFailed, setElementFailed] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const confirmParams = {
        return_url: `${window.location.origin}/reservations?paid=${reservationId}`,
      };
      const result = saveCardOnly
        ? await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams })
        : await stripe.confirmPayment({ elements, redirect: 'if_required', confirmParams });
      if (result.error) {
        message.error(result.error.message ?? 'Payment failed');
        return;
      }
      await confirmDeposit({ variables: { paymentIntentId } });
      message.success(saveCardOnly ? 'Card saved — reservation confirmed' : 'Payment received — reservation confirmed');
      router.push('/reservations');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div component="DepositForm" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {!saveCardOnly ? (
        <Text>
          Due now: <Text strong>${(amountCents / 100).toFixed(2)}</Text>
        </Text>
      ) : null}
      <PaymentElement
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          setElementFailed(true);
          setElementReady(true);
          message.error(event.error.message ?? 'Could not load the card form. Please try again.');
        }}
      />
      {elementReady ? (
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          disabled={!stripe || !elements || elementFailed}
          onClick={onPay}
        >
          {saveCardOnly ? 'Save card' : 'Pay now'}
        </Button>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <Spin />
        </div>
      )}
    </Space></div>
  );
}

export default function DepositPayPage() {
  const search = useSearchParams();
  const router = useRouter();
  const clientSecret = search.get('clientSecret') ?? '';
  const reservationId = search.get('reservationId') ?? '';
  const amountCents = Number(search.get('amount') ?? 0);
  const paymentIntentId = clientSecret.split('_secret')[0] ?? '';
  const saveCardOnly = isCardSetupSecret(clientSecret);
  const { data: stripeConfig, loading: stripeLoading } = useQuery(STRIPE_CLIENT_CONFIG);
  const publishableKey =
    (stripeConfig as { stripeClientConfig?: { publishableKey?: string | null } } | undefined)
      ?.stripeClientConfig?.publishableKey ||
    ENV_PUBLISHABLE_KEY ||
    '';

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (!clientSecret || !reservationId) {
    return (
      <div component="DepositPayPage" style={{ maxWidth: 560, margin: '0 auto' }}>
        <PageHeader
          title="Deposit payment"
          subtitle="Complete a pending deposit from your reservation email or booking flow"
        />
        <Card
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          <Result
            status="info"
            title="No payment session found"
            subTitle="This page opens automatically when a restaurant requires a deposit. If you arrived here from a link, it may have expired or already been paid."
            extra={
              <Space>
                <Button type="primary" icon={<CalendarOutlined />} onClick={() => router.push('/reservations')}>
                  My reservations
                </Button>
                <Button onClick={() => router.push('/')}>Find a table</Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  if (stripeLoading && !publishableKey) {
    return (
      <Card style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <Spin />
      </Card>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <Card style={{ maxWidth: 520, margin: '40px auto' }}>
        <Title level={3}>Deposit payment</Title>
        <Paragraph>
          Stripe publishable key is not configured. Set{' '}
          <Text code>STRIPE_PUBLISHABLE_KEY_TEST</Text> /{' '}
          <Text code>STRIPE_PUBLISHABLE_KEY_LIVE</Text> on the API (or{' '}
          <Text code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</Text>) and matching secret keys.
        </Paragraph>
        <Paragraph type="secondary">
          In local stub mode, deposits are auto-confirmed when booking.
        </Paragraph>
        <Button type="primary" onClick={() => router.push('/reservations')}>
          View reservations
        </Button>
      </Card>
    );
  }

  return (
    <div component="DepositPayPage" style={{ display: 'contents' }}><Card style={{ maxWidth: 520, margin: '40px auto' }}>
      <Title level={3}>{saveCardOnly ? 'Hold your table with a card' : 'Complete your payment'}</Title>
      <Paragraph type="secondary">
        {saveCardOnly
          ? 'Your card is saved securely with Stripe and is only charged for a no-show or late cancellation.'
          : prepaymentPolicyText()}
      </Paragraph>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <DepositForm
          reservationId={reservationId}
          paymentIntentId={paymentIntentId}
          amountCents={amountCents}
          saveCardOnly={saveCardOnly}
        />
      </Elements>
    </Card></div>
  );
}
