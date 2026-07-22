'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Alert, Button, Card, Space, Spin, Typography } from 'antd';
import { colors } from '@reservations/ui';

const { Title, Text } = Typography;

const BRAND_COLOR = colors.brand[600];
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function PaymentForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/reservations`,
        },
      });
      if (result.error) {
        setError(result.error.message ?? 'Payment failed. Please try again.');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div component="PaymentForm" style={{ display: 'contents' }}><Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Text>
        Deposit due:{' '}
        <Text strong style={{ fontSize: 18 }}>
          ${(amount / 100).toFixed(2)}
        </Text>
      </Text>

      <PaymentElement />

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="primary"
          size="large"
          loading={loading}
          disabled={!stripe || !elements}
          onClick={handleSubmit}
          style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
        >
          Pay deposit
        </Button>
      </Space>
    </Space></div>
  );
}

export default function DepositPayment({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [],
  );

  if (!publishableKey || !stripePromise) {
    return (
      <Card style={{ maxWidth: 520, margin: '0 auto' }}>
        <Title level={4} style={{ marginTop: 0 }}>
          Deposit payment
        </Title>
        <Alert
          type="info"
          message="Payment processing is in demo mode"
          description="Stripe publishable key is not configured. Your reservation has been recorded."
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button
          type="primary"
          onClick={onSuccess}
          style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
        >
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <div component="DepositPayment" style={{ display: 'contents' }}><Card style={{ maxWidth: 520, margin: '0 auto' }}>
      <Title level={4} style={{ marginTop: 0 }}>
        Complete your deposit
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Your table is held pending deposit authorization. The charge is only
        captured if you no-show.
      </Text>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: BRAND_COLOR },
          },
        }}
      >
        <PaymentForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
      </Elements>
    </Card></div>
  );
}
