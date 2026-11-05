'use client';

import { useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Alert, Button, Space, Spin, Typography } from 'antd';
import { colors } from '@reservations/ui';
import { useQuery } from '@/lib/apollo-hooks';
import { STRIPE_CLIENT_CONFIG } from '@/lib/graphql';

const { Text } = Typography;

const BRAND_COLOR = colors.brand[600];
const ENV_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export type SignupPaymentMode = 'payment' | 'setup';

/** Local/dev PaymentIntent secrets (`pi_dev_*_secret_dev`) are not valid Stripe Elements secrets. */
function isStubClientSecret(secret: string | null | undefined) {
  if (!secret) return false;
  return (
    secret.includes('_secret_dev') ||
    secret.startsWith('pi_dev_') ||
    secret.startsWith('seti_dev_')
  );
}

/** Stripe already captured this charge. Confirming it again is not a new payment. */
function succeededPaymentIntentId(error: {
  payment_intent?: { id?: string; status?: string } | string | null;
} | null | undefined) {
  const intent = error?.payment_intent;
  if (!intent || typeof intent === 'string') return null;
  if (intent.status === 'succeeded' && intent.id) return intent.id;
  return null;
}

function PaymentInner({
  mode,
  onSuccess,
}: {
  mode: SignupPaymentMode;
  onSuccess: (intentId?: string) => void | Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const started = useRef(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementFailed, setElementFailed] = useState(false);

  const handleSubmit = async () => {
    if (started.current || !stripe || !elements || elementFailed) return;
    started.current = true;
    setLoading(true);
    setError(null);
    let holdLoading = false;
    try {
      const returnUrl = `${window.location.origin}/`;
      if (mode === 'setup') {
        const result = await stripe.confirmSetup({
          elements,
          redirect: 'if_required',
          confirmParams: { return_url: returnUrl },
        });
        if (result.error) {
          started.current = false;
          setError(result.error.message ?? 'Payment failed. Please try again.');
          return;
        }
        holdLoading = true;
        setNotice('Card received. Saving it to this restaurant…');
        await onSuccess(result.setupIntent?.id);
        return;
      }
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: returnUrl },
      });
      const paidId = result.error
        ? succeededPaymentIntentId(result.error)
        : result.paymentIntent?.id;
      if (result.error && !paidId) {
        started.current = false;
        setError(result.error.message ?? 'Payment failed. Please try again.');
        return;
      }
      holdLoading = true;
      setNotice('Payment received. Updating your invoices…');
      await onSuccess(paidId ?? undefined);
    } catch (err) {
      started.current = false;
      holdLoading = false;
      setNotice(null);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      if (!holdLoading) setLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <PaymentElement
        onReady={() => setElementReady(true)}
        onLoadError={(event) => {
          setElementFailed(true);
          setElementReady(true);
          setError(event.error.message ?? 'Could not load the card form. Close this and try again.');
        }}
      />
      {notice ? <Alert type="success" title={notice} showIcon /> : null}
      {error ? (
        <Alert type="error" title={error} showIcon closable onClose={() => setError(null)} />
      ) : null}
      {elementReady ? (
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={!stripe || !elements || elementFailed || loading}
        onClick={() => void handleSubmit()}
        style={{ background: BRAND_COLOR, borderColor: BRAND_COLOR }}
      >
        {notice
          ? mode === 'setup'
            ? 'Saving card…'
            : 'Updating invoices…'
          : mode === 'setup'
            ? 'Save card and continue'
            : 'Pay and continue'}
      </Button>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <Spin />
        </div>
      )}
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
  /** Receives the confirmed SetupIntent / PaymentIntent id (omitted in demo mode). */
  onSuccess: (intentId?: string) => void | Promise<void>;
}) {
  const { data, loading } = useQuery(STRIPE_CLIENT_CONFIG);
  const publishableKey =
    data?.stripeClientConfig?.publishableKey || ENV_PUBLISHABLE_KEY || '';

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (loading && !publishableKey) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%', alignItems: 'center' }}>
        <Spin />
      </Space>
    );
  }

  if (!publishableKey || !stripePromise || !clientSecret || isStubClientSecret(clientSecret)) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          title="Payment processing is in demo mode"
          description="Continue without charging a real card."
          showIcon
        />
        <Button
          type="primary"
          size="large"
          block
          onClick={() => onSuccess()}
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
        key={clientSecret}
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
