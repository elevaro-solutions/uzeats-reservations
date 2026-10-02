'use client';

import Link from 'next/link';
import { useLazyQuery } from '@/lib/apollo-hooks';
import { Alert, Button, Space, Spin, Tag, Typography, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExportOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { colors, radii, spacing } from '@reservations/ui';
import { EXPORT_INVOICE_PDF } from '@/lib/graphql';

const { Text } = Typography;

export type PartnerInvoiceDetailData = {
  id: string;
  number: string;
  status: string;
  billingPeriod: string;
  currency?: string | null;
  subtotalCents?: number | null;
  totalCents: number;
  originalTotalCents?: number | null;
  isDiscounted?: boolean | null;
  dueDate: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  notes?: string | null;
  payUrl?: string | null;
  createdAt?: string | null;
  restaurantId?: string | null;
  restaurantName?: string | null;
  lines?: Array<{
    description: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
    originalAmountCents?: number | null;
  }> | null;
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  pending: 'Due',
  overdue: 'Overdue',
  paid: 'Paid',
  canceled: 'Canceled',
};

function formatCents(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  });
}

function downloadBase64File(filename: string, content: string, mimeType: string) {
  const blob = new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], {
    type: mimeType,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function canPay(invoice: PartnerInvoiceDetailData) {
  return Boolean(
    invoice.payUrl &&
      invoice.status !== 'paid' &&
      invoice.status !== 'canceled' &&
      invoice.totalCents > 0,
  );
}

function daysPastDue(dueDate: string) {
  return Math.max(0, dayjs().startOf('day').diff(dayjs(dueDate).startOf('day'), 'day'));
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

export function PartnerInvoiceDetail({
  invoice,
  loading,
  showOpenPageLink,
  restaurantQuery,
}: {
  invoice: PartnerInvoiceDetailData | null;
  loading?: boolean;
  showOpenPageLink?: boolean;
  /** Preserve active restaurant when linking to the full page. */
  restaurantQuery?: string | null;
}) {
  const [exportPdf, { loading: downloading }] = useLazyQuery(EXPORT_INVOICE_PDF);

  const onDownloadPdf = async () => {
    if (!invoice?.id) return;
    try {
      const res = await exportPdf({ variables: { id: invoice.id } });
      const payload = res.data?.exportInvoicePdf;
      if (!payload?.content) throw new Error('No PDF returned');
      downloadBase64File(payload.filename, payload.content, payload.mimeType);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
        <Spin />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: spacing.lg }}>
        <Text type="secondary">Invoice not found.</Text>
      </div>
    );
  }

  const currency = invoice.currency || 'usd';
  const pageHref = restaurantQuery
    ? `/billing/invoices/${invoice.id}?restaurant=${encodeURIComponent(restaurantQuery)}`
    : `/billing/invoices/${invoice.id}`;
  const payable = canPay(invoice);
  const overdueDays =
    invoice.status === 'overdue' ? daysPastDue(invoice.dueDate) : 0;
  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';
  const isCanceled = invoice.status === 'canceled';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {isPaid ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={
            invoice.paidAt
              ? `Paid on ${dayjs(invoice.paidAt).format('MMM D, YYYY · h:mm A')}`
              : 'This invoice is paid'
          }
          description="No payment is due. You can download a PDF copy anytime."
        />
      ) : null}
      {isOverdue ? (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={
            overdueDays > 0
              ? `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
              : 'This invoice is overdue'
          }
          description={`Due ${dayjs(invoice.dueDate).format('MMM D, YYYY')}. Pay now to bring your account current.`}
        />
      ) : null}
      {invoice.status === 'pending' ? (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          message="Payment due"
          description={`Please pay by ${dayjs(invoice.dueDate).format('MMM D, YYYY')}.`}
        />
      ) : null}
      {isCanceled ? (
        <Alert
          type="info"
          showIcon
          message="Canceled"
          description="This invoice was canceled and does not require payment."
        />
      ) : null}

      <div>
        <Space size={8} wrap style={{ marginBottom: 8 }}>
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
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </Tag>
          <Text type="secondary">{dayjs(invoice.billingPeriod).format('MMMM YYYY')}</Text>
        </Space>
        <Text
          type="secondary"
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {amountLabel(invoice.status)}
        </Text>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: amountColor(invoice.status),
          }}
        >
          {formatCents(invoice.totalCents, currency)}
        </div>
        <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
          {invoice.number}
          {isPaid && invoice.paidAt
            ? ` · Paid ${dayjs(invoice.paidAt).format('MMM D, YYYY · h:mm A')}`
            : isCanceled && invoice.canceledAt
              ? ` · Canceled ${dayjs(invoice.canceledAt).format('MMM D, YYYY · h:mm A')}`
              : isOverdue
                ? ` · Due ${dayjs(invoice.dueDate).format('MMM D, YYYY')}${
                    overdueDays > 0 ? ` · ${overdueDays}d overdue` : ''
                  }`
                : ` · Due ${dayjs(invoice.dueDate).format('MMM D, YYYY')}`}
        </Text>
      </div>

      <Space wrap>
        <Button
          type={payable ? 'default' : 'primary'}
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={() => void onDownloadPdf()}
        >
          Download PDF
        </Button>
        {showOpenPageLink ? (
          <Link href={pageHref}>
            <Button icon={<ExportOutlined />}>Open page</Button>
          </Link>
        ) : null}
      </Space>

      <div
        style={{
          padding: spacing.md,
          borderRadius: radii.md,
          background: isOverdue ? colors.errorBg : isPaid ? colors.successBg : colors.neutral[50],
          border: `1px solid ${
            isOverdue ? '#f0c4bc' : isPaid ? '#c6e9d5' : colors.bordersubtle
          }`,
        }}
      >
        <Text
          type="secondary"
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: spacing.sm,
          }}
        >
          Line items
        </Text>
        {(invoice.lines ?? []).length === 0 ? (
          <Text type="secondary">No line items.</Text>
        ) : (
          (invoice.lines ?? []).map((line, index) => (
            <div
              key={`${line.description}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '4px 16px',
                padding: '12px 0',
                borderBottom:
                  index === (invoice.lines?.length ?? 0) - 1
                    ? 'none'
                    : `1px solid ${colors.bordersubtle}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {line.description}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {line.quantity} × {formatCents(line.unitAmountCents, currency)}
                </Text>
              </div>
              <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                {line.originalAmountCents != null &&
                line.originalAmountCents !== line.amountCents ? (
                  <Text
                    type="secondary"
                    delete
                    style={{ display: 'block', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCents(line.originalAmountCents, currency)}
                  </Text>
                ) : null}
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCents(line.amountCents, currency)}
                </Text>
              </div>
            </div>
          ))
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <Text strong>{isPaid ? 'Paid total' : isOverdue ? 'Amount due' : 'Total'}</Text>
          <div style={{ textAlign: 'right' }}>
            {invoice.isDiscounted && invoice.originalTotalCents != null ? (
              <Text
                type="secondary"
                delete
                style={{ display: 'block', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCents(invoice.originalTotalCents, currency)}
              </Text>
            ) : null}
            <Text
              strong
              style={{
                fontSize: 18,
                fontVariantNumeric: 'tabular-nums',
                color: amountColor(invoice.status),
              }}
            >
              {formatCents(invoice.totalCents, currency)}
            </Text>
          </div>
        </div>
      </div>

      {payable ? (
        <Button
          type="primary"
          danger={isOverdue}
          size="large"
          block
          icon={<DollarOutlined />}
          href={invoice.payUrl!}
          target="_blank"
          style={{ height: 48, fontSize: 16, fontWeight: 600 }}
        >
          {isOverdue ? 'Pay overdue' : 'Pay invoice'}{' '}
          {formatCents(invoice.totalCents, currency)}
        </Button>
      ) : null}

      {(invoice.notes || invoice.createdAt) && (
        <div>
          {invoice.notes ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Notes: {invoice.notes}
            </Text>
          ) : null}
          {invoice.createdAt ? (
            <Text type="secondary" style={{ fontSize: 13 }}>
              Created {dayjs(invoice.createdAt).format('MMM D, YYYY')}
            </Text>
          ) : null}
        </div>
      )}
    </div>
  );
}
