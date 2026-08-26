'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  LinkOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_INVOICE,
  EMAIL_DELIVERY_CONFIGURED,
  ENSURE_INVOICE_PAY_LINK,
  EXPORT_INVOICE_PDF,
  SEND_INVOICE_EMAIL,
  SET_INVOICE_STATUS,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}

function money(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString(undefined, {
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
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();

  const { data, loading, refetch } = useQuery(ADMIN_INVOICE, {
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
        <Empty description="Invoice not found" />
      </Space>
    );
  }

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
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
              {invoice ? (
                <Tag color={STATUS_COLORS[invoice.status] ?? 'default'}>
                  {statusLabel(invoice.status)}
                </Tag>
              ) : null}
            </Space>
          }
        />

        {loading || !invoice ? (
          <Card>
            <Spin />
          </Card>
        ) : (
          <>
            <Card>
              <Space wrap style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={() => void onDownloadPdf()}
                >
                  Download PDF
                </Button>
                {invoice.status !== 'paid' && invoice.status !== 'canceled' && (
                  <Button icon={<LinkOutlined />} onClick={() => void onCopyPayLink()}>
                    Copy pay link
                  </Button>
                )}
                {emailConfigured && (
                  <Button
                    icon={<MailOutlined />}
                    loading={sendingEmail}
                    onClick={() => void onSendEmail()}
                  >
                    Send via email
                  </Button>
                )}
                {invoice.status !== 'paid' && invoice.status !== 'canceled' && (
                  <Button loading={updating} onClick={() => void updateStatus('paid')}>
                    Mark paid
                  </Button>
                )}
                {invoice.status !== 'canceled' && (
                  <Button danger loading={updating} onClick={() => void updateStatus('canceled')}>
                    Cancel
                  </Button>
                )}
                {invoice.status === 'canceled' && (
                  <Button loading={updating} onClick={() => void updateStatus('pending')}>
                    Reopen
                  </Button>
                )}
              </Space>

              <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="Number">{invoice.number}</Descriptions.Item>
                <Descriptions.Item label="Restaurant">
                  {invoice.restaurantId ? (
                    <Link href={`/admin/restaurants/${invoice.restaurantId}`}>
                      {invoice.restaurantName || invoice.restaurantId}
                    </Link>
                  ) : (
                    invoice.restaurantName || '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={STATUS_COLORS[invoice.status] ?? 'default'}>
                    {statusLabel(invoice.status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Billing period">{invoice.billingPeriod}</Descriptions.Item>
                <Descriptions.Item label="Package duration">
                  {invoice.packageDurationMonths ? `${invoice.packageDurationMonths} mo` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Plan">
                  {invoice.planKey
                    ? `${invoice.planKey}${invoice.billingCycle ? ` (${invoice.billingCycle})` : ''}`
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Due">{fmtDate(invoice.dueDate)}</Descriptions.Item>
                <Descriptions.Item label="Paid">{fmtDate(invoice.paidAt)}</Descriptions.Item>
                <Descriptions.Item label="Canceled">{fmtDate(invoice.canceledAt)}</Descriptions.Item>
                <Descriptions.Item label="Subtotal">
                  {money(invoice.subtotalCents, invoice.currency)}
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                  <Space size={6}>
                    {invoice.isDiscounted && invoice.originalTotalCents != null && (
                      <Typography.Text delete type="secondary">
                        {money(invoice.originalTotalCents, invoice.currency)}
                      </Typography.Text>
                    )}
                    <Typography.Text strong>
                      {money(invoice.totalCents, invoice.currency)}
                    </Typography.Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Created">{fmtDate(invoice.createdAt)}</Descriptions.Item>
                {invoice.payUrl ? (
                  <Descriptions.Item label="Pay link" span={3}>
                    <Typography.Link href={invoice.payUrl} target="_blank" rel="noreferrer">
                      {invoice.payUrl}
                    </Typography.Link>
                  </Descriptions.Item>
                ) : null}
                {invoice.notes ? (
                  <Descriptions.Item label="Notes" span={3}>
                    {invoice.notes}
                  </Descriptions.Item>
                ) : null}
              </Descriptions>
            </Card>

            <Card title="Line items">
              <Table
                size="small"
                pagination={false}
                rowKey={(_, idx) => String(idx)}
                dataSource={invoice.lines ?? []}
                columns={[
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', width: 80 },
                  {
                    title: 'Unit',
                    dataIndex: 'unitAmountCents',
                    width: 120,
                    render: (v: number) => money(v, invoice.currency),
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amountCents',
                    width: 140,
                    render: (v: number, line: any) => (
                      <Space size={6}>
                        {line.originalAmountCents != null && line.originalAmountCents > v && (
                          <Typography.Text delete type="secondary">
                            {money(line.originalAmountCents, invoice.currency)}
                          </Typography.Text>
                        )}
                        <span>{money(v, invoice.currency)}</span>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Space>
    </div>
  );
}
