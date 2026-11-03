'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExportOutlined,
  LinkOutlined,
  MailOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageHeader, colors, radii, shadows, spacing, typography } from '@reservations/ui';
import {
  formatPlanDuration,
  formatUtcCalendarDate,
  resolveInvoiceDuration,
} from '@reservations/shared';
import {
  ADMIN_INVOICE,
  EMAIL_DELIVERY_CONFIGURED,
  ENSURE_INVOICE_PAY_LINK,
  EXPORT_INVOICE_PDF,
  SEND_INVOICE_EMAIL,
  SET_INVOICE_STATUS,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text, Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  overdue: 'Overdue',
  paid: 'Paid',
  canceled: 'Canceled',
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : status);
}

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
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

function fmtDate(value?: string | null) {
  if (!value) return null;
  return formatUtcCalendarDate(value, { month: 'short', day: 'numeric', year: 'numeric' }) || null;
}

function amountLabel(status: string) {
  if (status === 'paid') return 'Amount paid';
  if (status === 'canceled') return 'Invoice total';
  if (status === 'overdue') return 'Amount overdue';
  return 'Amount due';
}

function amountColor(status: string) {
  if (status === 'paid') return colors.success;
  if (status === 'overdue') return colors.error;
  if (status === 'canceled') return colors.textTertiary;
  return colors.textPrimary;
}

function heroTint(status: string) {
  if (status === 'paid') return colors.successBg;
  if (status === 'overdue') return colors.errorBg;
  if (status === 'canceled') return colors.neutral[50];
  if (status === 'pending') return colors.warningBg;
  return colors.brand[50];
}

function InfoRow({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        gap: 12,
        padding: '12px 0',
        borderBottom: last ? 'none' : `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Text type="secondary" style={{ fontSize: typography.fontSize.sm, paddingTop: 2 }}>
        {label}
      </Text>
      <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 88,
        padding: '10px 14px',
        borderRadius: radii.md,
        background: colors.surface,
        border: `1px solid ${colors.bordersubtle}`,
        boxShadow: shadows.xs,
      }}
    >
      <Text
        type="secondary"
        style={{
          fontSize: 11,
          fontWeight: typography.fontWeight.semibold,
          letterSpacing: typography.letterSpacing.wide,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text strong style={{ fontSize: typography.fontSize.sm, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      type="secondary"
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: typography.fontWeight.semibold,
        letterSpacing: typography.letterSpacing.wide,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();

  const { data, loading, error, refetch } = useQuery(ADMIN_INVOICE, {
    skip: !ready || !id,
    variables: { id },
  });
  const { data: emailConfigData } = useQuery(EMAIL_DELIVERY_CONFIGURED, { skip: !ready });
  const [ensurePayLink] = useMutation(ENSURE_INVOICE_PAY_LINK);
  const [sendInvoiceEmail, { loading: sendingEmail }] = useMutation(SEND_INVOICE_EMAIL);
  const [exportPdf, { loading: downloading }] = useLazyQuery(EXPORT_INVOICE_PDF);
  const [setInvoiceStatus, { loading: updating }] = useMutation(SET_INVOICE_STATUS);

  const invoice = data?.adminInvoice ?? null;
  const emailConfigured = Boolean(emailConfigData?.emailDeliveryConfigured);

  const onDownloadPdf = async () => {
    try {
      const res = await exportPdf({ variables: { id } });
      const payload = res.data?.exportInvoicePdf;
      if (!payload?.content) throw new Error('No PDF returned');
      downloadBase64File(payload.filename, payload.content, payload.mimeType);
    } catch (err: any) {
      message.error(err.message || 'Failed to download PDF');
    }
  };

  const onCopyPayLink = async () => {
    try {
      let url = invoice?.payUrl as string | null | undefined;
      if (!url) {
        const res = await ensurePayLink({ variables: { id } });
        url = res.data?.ensureInvoicePayLink?.payUrl;
        refetch();
      }
      if (!url) throw new Error('No payment link available');
      await navigator.clipboard.writeText(url);
      message.success('Payment link copied');
    } catch (err: any) {
      message.error(err.message || 'Failed to copy payment link');
    }
  };

  const onSendEmail = async () => {
    try {
      const res = await sendInvoiceEmail({ variables: { id } });
      const to = res.data?.sendInvoiceEmail?.to;
      message.success(to ? `Invoice emailed to ${to}` : 'Invoice emailed');
    } catch (err: any) {
      message.error(err.message || 'Failed to send invoice email');
    }
  };

  const updateStatus = async (next: string) => {
    try {
      await setInvoiceStatus({ variables: { id, status: next } });
      message.success('Invoice updated');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoice');
    }
  };

  if (!ready) return null;

  if (!loading && !invoice) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Invoice"
          extra={
            <Link href="/admin/invoices">
              <Button icon={<ArrowLeftOutlined />}>Back to invoices</Button>
            </Link>
          }
        />
        <Card>
          <Empty description={error ? error.message || 'Failed to load invoice' : 'Invoice not found'} />
        </Card>
      </Space>
    );
  }

  const currency = invoice?.currency || 'usd';
  const duration = invoice ? resolveInvoiceDuration(invoice) : null;
  const durationLabel = duration
    ? formatPlanDuration(duration.durationUnit, duration.durationCount)
    : null;
  const planLabel = invoice?.planKey
    ? `${invoice.planKey}${invoice.billingCycle ? ` (${invoice.billingCycle})` : ''}`
    : null;
  const dueLabel = invoice ? fmtDate(invoice.dueDate) : null;
  const paidLabel = invoice ? fmtDate(invoice.paidAt) : null;
  const canceledLabel = invoice ? fmtDate(invoice.canceledAt) : null;
  const createdLabel = invoice ? fmtDate(invoice.createdAt) : null;
  const isPaid = invoice?.status === 'paid';
  const isCanceled = invoice?.status === 'canceled';
  const isOverdue = invoice?.status === 'overdue';
  const canMutateStatus = invoice && !isPaid && !isCanceled;
  const lines = invoice?.lines ?? [];

  return (
    <div component="AdminInvoiceDetailPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title={invoice?.number ?? 'Invoice'}
          subtitle={
            invoice
              ? `${invoice.restaurantName || 'Restaurant'} · ${invoice.billingPeriod}`
              : 'Invoice details'
          }
          extra={
            <Space wrap>
              <Link href="/admin/invoices">
                <Button type="text" icon={<ArrowLeftOutlined />} style={{ paddingInline: 8 }}>
                  Invoices
                </Button>
              </Link>
              {invoice ? (
                <Tag
                  color={STATUS_COLORS[invoice.status] ?? 'default'}
                  icon={
                    isPaid ? (
                      <CheckCircleOutlined />
                    ) : isOverdue ? (
                      <WarningOutlined />
                    ) : undefined
                  }
                >
                  {statusLabel(invoice.status)}
                </Tag>
              ) : null}
            </Space>
          }
        />

        {!invoice ? (
          <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: radii.lg }}>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
              <Spin size="large" />
            </div>
          </Card>
        ) : (
          <>
            <Card
              style={{
                borderRadius: radii.lg,
                overflow: 'hidden',
                border: `1px solid ${colors.bordersubtle}`,
                boxShadow: shadows.sm,
              }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  padding: '28px 28px 24px',
                  background: `linear-gradient(180deg, ${heroTint(invoice.status)} 0%, ${colors.surface} 78%)`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <SectionLabel>{amountLabel(invoice.status)}</SectionLabel>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: typography.fontWeight.bold,
                        lineHeight: typography.lineHeight.tight,
                        letterSpacing: typography.letterSpacing.tight,
                        color: amountColor(invoice.status),
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {invoice.isDiscounted && invoice.originalTotalCents != null ? (
                        <Text
                          delete
                          type="secondary"
                          style={{
                            display: 'block',
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.medium,
                            marginBottom: 4,
                          }}
                        >
                          {money(invoice.originalTotalCents, currency)}
                        </Text>
                      ) : null}
                      {money(invoice.totalCents, currency)}
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      {invoice.number}
                      {isPaid && paidLabel
                        ? ` · Paid ${paidLabel}`
                        : isCanceled && canceledLabel
                          ? ` · Canceled ${canceledLabel}`
                          : dueLabel
                            ? ` · Due ${dueLabel}`
                            : null}
                    </Text>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <MetaChip label="Period" value={invoice.billingPeriod} />
                    {dueLabel ? <MetaChip label="Due" value={dueLabel} /> : null}
                    {paidLabel ? <MetaChip label="Paid" value={paidLabel} /> : null}
                    {createdLabel ? <MetaChip label="Created" value={createdLabel} /> : null}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '8px 28px 22px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={() => void onDownloadPdf()}
                >
                  Download PDF
                </Button>
                {canMutateStatus ? (
                  <Button icon={<LinkOutlined />} onClick={() => void onCopyPayLink()}>
                    Copy pay link
                  </Button>
                ) : null}
                {emailConfigured ? (
                  <Button
                    icon={<MailOutlined />}
                    loading={sendingEmail}
                    onClick={() => void onSendEmail()}
                  >
                    Send via email
                  </Button>
                ) : null}
                {canMutateStatus ? (
                  <Button loading={updating} onClick={() => void updateStatus('paid')}>
                    Mark paid
                  </Button>
                ) : null}
                {!isCanceled ? (
                  <Button danger loading={updating} onClick={() => void updateStatus('canceled')}>
                    Cancel
                  </Button>
                ) : (
                  <Button loading={updating} onClick={() => void updateStatus('pending')}>
                    Reopen
                  </Button>
                )}
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title="Details"
                  style={{
                    borderRadius: radii.lg,
                    height: '100%',
                    border: `1px solid ${colors.bordersubtle}`,
                  }}
                >
                  <InfoRow label="Restaurant">
                    {invoice.restaurantId ? (
                      <Link href={`/admin/restaurants/${invoice.restaurantId}`}>
                        <Text strong>{invoice.restaurantName || invoice.restaurantId}</Text>
                      </Link>
                    ) : (
                      <Text strong>{invoice.restaurantName || '—'}</Text>
                    )}
                  </InfoRow>
                  <InfoRow label="Billing period">
                    <Text>{invoice.billingPeriod}</Text>
                  </InfoRow>
                  {durationLabel ? (
                    <InfoRow label="Package duration">
                      <Text>{durationLabel}</Text>
                    </InfoRow>
                  ) : null}
                  {planLabel ? (
                    <InfoRow label="Plan">
                      <Text>{planLabel}</Text>
                    </InfoRow>
                  ) : null}
                  {invoice.payUrl ? (
                    <InfoRow label="Pay link" last={!invoice.notes}>
                      <Space size={8} wrap>
                        <Tooltip title={invoice.payUrl}>
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => void onCopyPayLink()}
                          >
                            Copy link
                          </Button>
                        </Tooltip>
                        <Button
                          size="small"
                          type="link"
                          icon={<ExportOutlined />}
                          href={invoice.payUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ paddingInline: 0 }}
                        >
                          Open
                        </Button>
                      </Space>
                    </InfoRow>
                  ) : null}
                  {invoice.notes ? (
                    <InfoRow label="Notes" last>
                      <Text>{invoice.notes}</Text>
                    </InfoRow>
                  ) : null}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title="Line items"
                  style={{
                    borderRadius: radii.lg,
                    height: '100%',
                    border: `1px solid ${colors.bordersubtle}`,
                  }}
                  styles={{ body: { paddingTop: spacing.sm } }}
                >
                  {lines.length === 0 ? (
                    <Text type="secondary">No line items.</Text>
                  ) : (
                    lines.map((line: any, index: number) => (
                      <div
                        key={`${line.description}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          gap: '4px 16px',
                          padding: '14px 0',
                          borderBottom:
                            index === lines.length - 1
                              ? 'none'
                              : `1px solid ${colors.bordersubtle}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ display: 'block' }}>
                            {line.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                            {line.quantity} × {money(line.unitAmountCents, currency)}
                          </Text>
                        </div>
                        <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                          {line.originalAmountCents != null &&
                          line.originalAmountCents > line.amountCents ? (
                            <Text
                              type="secondary"
                              delete
                              style={{
                                display: 'block',
                                fontSize: 12,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {money(line.originalAmountCents, currency)}
                            </Text>
                          ) : null}
                          <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {money(line.amountCents, currency)}
                          </Text>
                        </div>
                      </div>
                    ))
                  )}

                  <div
                    style={{
                      marginTop: spacing.sm,
                      paddingTop: spacing.md,
                      borderTop: `1px solid ${colors.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <Text type="secondary">Subtotal</Text>
                      <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {money(invoice.subtotalCents, currency)}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 12,
                      }}
                    >
                      <Text strong>{isPaid ? 'Paid total' : isOverdue ? 'Amount due' : 'Total'}</Text>
                      <div style={{ textAlign: 'right' }}>
                        {invoice.isDiscounted && invoice.originalTotalCents != null ? (
                          <Text
                            type="secondary"
                            delete
                            style={{
                              display: 'block',
                              fontSize: 12,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {money(invoice.originalTotalCents, currency)}
                          </Text>
                        ) : null}
                        <Title
                          level={4}
                          style={{
                            margin: 0,
                            color: amountColor(invoice.status),
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {money(invoice.totalCents, currency)}
                        </Title>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </div>
  );
}
