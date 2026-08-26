'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Card, Result, Space, Spin, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii, shadows } from '@reservations/ui';
import {
  CONFIRM_INVOICE_PAYMENT,
  EXPORT_INVOICE_PDF_BY_TOKEN,
  INVOICE_BY_PAY_TOKEN,
  START_INVOICE_PAYMENT,
} from '@/lib/graphql';

const { Text, Title } = Typography;

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

function isStubClientSecret(secret: string | null | undefined) {
  if (!secret) return false;
  return secret.includes('_secret_dev') || secret.startsWith('pi_dev_');
}

function downloadBase64File(filename: string, content: string, mimeType: string) {
  const blob = new Blob(
    [Uint8Array.from(atob(content), (c) => c.charCodeAt(0))],
    { type: mimeType },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function InvoicePayForm({
  token,
  paymentIntentId,
  amountCents,
  currency,
  onPaid,
}: {
  token: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirmPayment] = useMutation(CONFIRM_INVOICE_PAYMENT);
  const [loading, setLoading] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/invoice/${token}?paid=1`,
        },
      });
      if (result.error) {
        message.error(result.error.message ?? 'Payment failed');
        return;
      }
      await confirmPayment({
        variables: { token, paymentIntentId },
      });
      message.success('Payment successful');
      onPaid();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Text>
        Amount due: <Text strong>{money(amountCents, currency)}</Text>
      </Text>
      <PaymentElement />
      <Button type="primary" size="large" block loading={loading} onClick={onPay}>
        Pay invoice
      </Button>
    </Space>
  );
}

function StubPayForm({
  token,
  paymentIntentId,
  amountCents,
  currency,
  onPaid,
}: {
  token: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  onPaid: () => void;
}) {
  const [confirmPayment] = useMutation(CONFIRM_INVOICE_PAYMENT);
  const [loading, setLoading] = useState(false);

  const onPay = async () => {
    setLoading(true);
    try {
      await confirmPayment({
        variables: { token, paymentIntentId },
      });
      message.success('Payment recorded (test mode)');
      onPaid();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Test payment mode"
        description="Set STRIPE_SECRET_KEY (sk_test_…) in apps/api/.env and restart the API to enable card payments. Until then you can mark this invoice paid for local testing."
      />
      <Text>
        Amount due: <Text strong>{money(amountCents, currency)}</Text>
      </Text>
      <Button type="primary" size="large" block loading={loading} onClick={onPay}>
        Mark paid (test)
      </Button>
    </Space>
  );
}

export default function InvoicePayClient({ token }: { token: string }) {
  const { data, loading, refetch, error } = useQuery(INVOICE_BY_PAY_TOKEN, {
    variables: { token },
    skip: !token,
  });
  const [startPayment, { loading: starting }] = useMutation(START_INVOICE_PAYMENT);
  const [exportPdf] = useLazyQuery(EXPORT_INVOICE_PDF_BY_TOKEN);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isStub, setIsStub] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const invoice = (data as any)?.invoiceByPayToken;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [],
  );

  useEffect(() => {
    if (!invoice || invoice.status === 'paid' || invoice.status === 'canceled') return;
    if (clientSecret || paymentIntentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await startPayment({ variables: { token } });
        const session = (res.data as any)?.startInvoicePayment;
        if (cancelled) return;
        if (session?.alreadyPaid) {
          setPaid(true);
          refetch();
          return;
        }
        const secret = session?.clientSecret ?? null;
        const stub = Boolean(session?.isStub) || isStubClientSecret(secret);
        setClientSecret(secret);
        setPaymentIntentId(session?.paymentIntentId ?? null);
        setIsStub(stub);
        setPayError(null);
      } catch (err) {
        if (!cancelled) {
          setPayError(err instanceof Error ? err.message : 'Could not start payment');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice, token, clientSecret, paymentIntentId, startPayment, refetch]);

  const onDownloadPdf = async () => {
    try {
      const res = await exportPdf({ variables: { token } });
      const payload = (res.data as any)?.exportInvoicePdfByToken;
      if (!payload?.content) throw new Error('No PDF returned');
      downloadBase64File(payload.filename, payload.content, payload.mimeType);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <Result
          status="404"
          title="Invoice not found"
          subTitle="This payment link is invalid or expired."
        />
      </div>
    );
  }

  const isPaid = paid || invoice.status === 'paid';
  const isCanceled = invoice.status === 'canceled';
  const canUseStripeElements = Boolean(
    stripePromise && clientSecret && paymentIntentId && !isStub,
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        subtitle={invoice.restaurantName || 'Platform invoice'}
      />
      <Card
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
          marginBottom: 16,
        }}
      >
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Text type="secondary">
            Period {invoice.billingPeriod}
            {invoice.dueDate
              ? ` · Due ${new Date(invoice.dueDate).toLocaleDateString()}`
              : ''}
          </Text>
          {(invoice.lines ?? []).map((line: any, idx: number) => (
            <div
              key={idx}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
            >
              <Text>{line.description}</Text>
              <Text>{money(line.amountCents, invoice.currency)}</Text>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              Total
            </Title>
            <Space size={8}>
              {invoice.isDiscounted && invoice.originalTotalCents != null && (
                <Text delete type="secondary">
                  {money(invoice.originalTotalCents, invoice.currency)}
                </Text>
              )}
              <Title level={5} style={{ margin: 0 }}>
                {money(invoice.totalCents, invoice.currency)}
              </Title>
            </Space>
          </div>
          <Button icon={<DownloadOutlined />} onClick={onDownloadPdf}>
            Download PDF
          </Button>
        </Space>
      </Card>

      {isPaid ? (
        <Result status="success" title="Paid" subTitle="Thank you — this invoice is paid." />
      ) : isCanceled ? (
        <Result status="info" title="Canceled" subTitle="This invoice is no longer payable." />
      ) : (
        <Card
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          {payError ? (
            <Result status="error" title="Payment unavailable" subTitle={payError} />
          ) : starting || !paymentIntentId ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Preparing secure payment…</Text>
              </div>
            </div>
          ) : isStub || !publishableKey ? (
            <StubPayForm
              token={token}
              paymentIntentId={paymentIntentId}
              amountCents={invoice.totalCents}
              currency={invoice.currency}
              onPaid={() => {
                setPaid(true);
                refetch();
              }}
            />
          ) : canUseStripeElements ? (
            <Elements stripe={stripePromise} options={{ clientSecret: clientSecret! }}>
              <InvoicePayForm
                token={token}
                paymentIntentId={paymentIntentId}
                amountCents={invoice.totalCents}
                currency={invoice.currency}
                onPaid={() => {
                  setPaid(true);
                  refetch();
                }}
              />
            </Elements>
          ) : (
            <Result
              status="warning"
              title="Payments unavailable"
              subTitle="Stripe is not configured on this environment."
            />
          )}
        </Card>
      )}
    </div>
  );
}
