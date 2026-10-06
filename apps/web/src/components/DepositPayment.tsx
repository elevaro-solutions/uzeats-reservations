'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, Card, Space, Spin, Typography } from 'antd';
import { noShowFeePolicyText, prepaymentPolicyText } from '@reservations/shared';
import { colors } from '@reservations/ui';
import { STRIPE_CLIENT_CONFIG } from '@/lib/graphql';

const { Title, Text } = Typography;

const BRAND_COLOR = colors.brand[600];
const ENV_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/** SetupIntent secrets (`seti_…`) only save the card; PaymentIntents charge now. */
export function isCardSetupSecret(clientSecret: string) {
  return clientSecret.startsWith('seti_');
}

function PaymentForm({
  amount,
  noShowFeeCents,
  saveCardOnly,
  onSuccess,
  onCancel,
}: {
  amount: number;
  noShowFeeCents: number;
  saveCardOnly: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementFailed, setElementFailed] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const confirmParams = { return_url: `${window.location.origin}/reservations` };
      const result = saveCardOnly
        ? await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams })
        : await stripe.confirmPayment({ elements, redirect: 'if_required', confirmParams });
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
    <div component="PaymentForm" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {!saveCardOnly ? (
        <Text>
          Due now:{' '}
          <Text strong style={{ fontSize: 18 }}>
            ${(amount / 100).toFixed(2)}
          </Text>
        </Text>
      ) : null}
      {noShowFeeCents > 0 ? (
        <Text type="secondary">{noShowFeePolicyText(noShowFeeCents)}</Text>
      ) : null}

      <PaymentElement
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          setElementFailed(true);
          setElementReady(true);
          setError(event.error.message ?? 'Could not load the card form. Please try again.');
        }}
      />

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      {elementReady ? (
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={!stripe || !elements || elementFailed}
            onClick={handleSubmit}
            style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
          >
            {saveCardOnly ? 'Save card' : 'Pay now'}
          </Button>
        </Space>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <Spin />
        </div>
      )}
    </Space></div>
  );
}

export default function DepositPayment({
  clientSecret,
  amount,
  noShowFeeCents = 0,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  /** Charged now; ignored for card-guarantee SetupIntents. */
  amount: number;
  noShowFeeCents?: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data, loading } = useQuery(STRIPE_CLIENT_CONFIG);
  const publishableKey =
    (data as { stripeClientConfig?: { publishableKey?: string | null } } | undefined)
      ?.stripeClientConfig?.publishableKey ||
    ENV_PUBLISHABLE_KEY ||
    '';

  const saveCardOnly = isCardSetupSecret(clientSecret);
  const title = saveCardOnly ? 'Hold your table with a card' : 'Complete your payment';
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (loading && !publishableKey) {
    return (
      <Card style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <Spin />
      </Card>
    );
  }

  if (!publishableKey || !stripePromise) {
    return (
      <Card style={{ maxWidth: 520, margin: '0 auto' }}>
        <Title level={4} style={{ marginTop: 0 }}>
          {title}
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
        {title}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {saveCardOnly
          ? 'Your card is saved securely with Stripe and is not charged today.'
          : prepaymentPolicyText()}
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
        <PaymentForm
          amount={amount}
          noShowFeeCents={noShowFeeCents}
          saveCardOnly={saveCardOnly}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </Card></div>
  );
}
