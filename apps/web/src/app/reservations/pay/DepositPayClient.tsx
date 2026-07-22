'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useMutation } from '@apollo/client/react';
import { Button, Card, Space, Typography, message, Alert } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { CONFIRM_DEPOSIT } from '@/lib/graphql';

const { Title, Text, Paragraph } = Typography;

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function DepositForm({
  reservationId,
  paymentIntentId,
  amountCents,
}: {
  reservationId: string;
  paymentIntentId: string;
  amountCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [loading, setLoading] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/reservations?paid=${reservationId}`,
        },
      });
      if (result.error) {
        message.error(result.error.message ?? 'Payment failed');
        return;
      }
      await confirmDeposit({ variables: { paymentIntentId } });
      message.success('Deposit authorized — reservation confirmed');
      router.push('/reservations');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div component="DepositForm" style={{ display: 'contents' }}><Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Text>
        Deposit due: <Text strong>${(amountCents / 100).toFixed(2)}</Text>
      </Text>
      <PaymentElement />
      <Button type="primary" size="large" block loading={loading} onClick={onPay}>
        Authorize deposit
      </Button>
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

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [],
  );

  if (!clientSecret || !reservationId) {
    return (
      <Card>
        <Alert type="error" message="Missing payment details" />
        <Button style={{ marginTop: 16 }} onClick={() => router.push('/reservations')}>
          Back to reservations
        </Button>
      </Card>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <Card style={{ maxWidth: 520, margin: '40px auto' }}>
        <Title level={3}>Deposit payment</Title>
        <Paragraph>
          Stripe publishable key is not configured. Set{' '}
          <Text code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</Text> and{' '}
          <Text code>STRIPE_SECRET_KEY</Text> to collect real deposits.
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
      <Title level={3}>Complete your deposit</Title>
      <Paragraph type="secondary">
        Your table is held pending deposit authorization. The charge is only captured if you
        no-show.
      </Paragraph>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <DepositForm
          reservationId={reservationId}
          paymentIntentId={paymentIntentId}
          amountCents={amountCents}
        />
      </Elements>
    </Card></div>
  );
}
