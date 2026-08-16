'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Alert, Button, Space, Typography } from 'antd';
import { colors } from '@reservations/ui';

const { Text } = Typography;

const BRAND_COLOR = colors.brand[600];
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export type SignupPaymentMode = 'payment' | 'setup';

function PaymentInner({
  mode,
  onSuccess,
}: {
  mode: SignupPaymentMode;
  onSuccess: () => void;
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
      const returnUrl = `${window.location.origin}/`;
      const result =
        mode === 'setup'
          ? await stripe.confirmSetup({
              elements,
              redirect: 'if_required',
              confirmParams: { return_url: returnUrl },
            })
          : await stripe.confirmPayment({
              elements,
              redirect: 'if_required',
              confirmParams: { return_url: returnUrl },
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
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <PaymentElement />
      {error ? (
        <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />
      ) : null}
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={!stripe || !elements}
        onClick={() => void handleSubmit()}
        style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
      >
        {mode === 'setup' ? 'Save card and continue' : 'Pay and continue'}
      </Button>
    </Space>
  );
}

export function SignupPaymentForm({
  clientSecret,
  paymentMode,
  planName,
  monthlyLabel,
  trialDays,
  chargingStartsOn,
  description,
  onSuccess,
}: {
  clientSecret: string;
  paymentMode: SignupPaymentMode;
  planName: string;
  monthlyLabel: string;
  trialDays: number;
  chargingStartsOn?: string | null;
  description?: string;
  onSuccess: () => void;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [],
  );

  if (!publishableKey || !stripePromise) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          message="Payment processing is in demo mode"
          description="Stripe is not configured. Continue without charging."
          showIcon
        />
        <Button
          type="primary"
          size="large"
          block
          onClick={onSuccess}
          style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
        >
          Continue
        </Button>
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>
          {planName} — {monthlyLabel}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {description
            ? description
            : trialDays > 0
              ? `Add a card to start your ${trialDays}-day trial. You will not be charged until ${chargingStartsOn ?? 'the trial ends'}.`
              : 'Enter payment details to activate your subscription.'}
        </Text>
      </div>
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
        <PaymentInner mode={paymentMode} onSuccess={onSuccess} />
      </Elements>
    </Space>
  );
}
