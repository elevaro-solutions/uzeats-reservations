'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { Key } from 'react';
import type { MenuProps } from 'antd';
import {
  CloudSyncOutlined,
  DownOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileAddOutlined,
  LinkOutlined,
  MailOutlined,
  MoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import {
  getPlanPriceDisplay,
  planForBillingPeriod,
  type BillingPeriod,
} from '@reservations/shared';
import dayjs, { type Dayjs } from 'dayjs';
import {
  ADMIN_INVOICES,
  ADMIN_PLANS,
  ADMIN_RESTAURANTS,
  CREATE_MANUAL_INVOICE,
  EMAIL_DELIVERY_CONFIGURED,
  ENSURE_INVOICE_PAY_LINK,
  EXPORT_INVOICE_PDF,
  GENERATE_INVOICES,
  PLATFORM_CONFIG,
  PLATFORM_SERVICES,
  SEND_INVOICE_EMAIL,
  SET_INVOICE_STATUS,
  SET_INVOICE_STATUSES,
  SYNC_STRIPE_INVOICES,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

const STATUS_OPTIONS = [
  { value: undefined, label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'canceled', label: 'Canceled' },
];

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
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
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

type ManualInvoiceForm = {
  restaurantId: string;
  billingPeriod: Dayjs;
  dueDate: Dayjs;
  planKey?: string;
  billingCycle?: BillingPeriod;
  serviceIds?: string[];
  amountDollars: number;
  packageDurationMonths?: number;
  description?: string;
  notes?: string;
  markPaid?: boolean;
  paidJustification?: string;
};

function AdminInvoicesContent() {
  const { ready } = useRequireAdmin();
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    status: string;
    totalCents: number;
    currency: string;
    billingPeriod: string;
    pendingInput: Record<string, unknown>;
  } | null>(null);
  const [duplicateJustification, setDuplicateJustification] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [manualForm] = Form.useForm<ManualInvoiceForm>();
  const planKey = Form.useWatch('planKey', manualForm);
  const billingCycle = Form.useWatch('billingCycle', manualForm) as BillingPeriod | undefined;
  const serviceIds = Form.useWatch('serviceIds', manualForm) as string[] | undefined;
  const amountDollars = Form.useWatch('amountDollars', manualForm) as number | undefined;
  const markPaid = Form.useWatch('markPaid', manualForm) as boolean | undefined;
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data, loading, refetch } = useQuery(ADMIN_INVOICES, {
    skip: !ready,
    variables: {
      status: status || undefined,
      search: search || undefined,
      limit,
      offset,
    },
  });
  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const { data: plansData } = useQuery(ADMIN_PLANS, { skip: !ready });
  const { data: configData } = useQuery(PLATFORM_CONFIG, { skip: !ready });
  const { data: servicesData } = useQuery(PLATFORM_SERVICES, {
    skip: !ready,
    variables: { active: true },
  });
  const { data: emailConfigData } = useQuery(EMAIL_DELIVERY_CONFIGURED, { skip: !ready });
  const [generate, { loading: generating }] = useMutation(GENERATE_INVOICES);
  const [createManual, { loading: creatingManual }] = useMutation(CREATE_MANUAL_INVOICE);
  const [ensurePayLink] = useMutation(ENSURE_INVOICE_PAY_LINK);
  const [sendInvoiceEmail, { loading: sendingEmail }] = useMutation(SEND_INVOICE_EMAIL);
  const [exportPdf] = useLazyQuery(EXPORT_INVOICE_PDF);
  const [syncStripe, { loading: syncing }] = useMutation(SYNC_STRIPE_INVOICES);
  const [setInvoiceStatus] = useMutation(SET_INVOICE_STATUS);
  const [setInvoiceStatuses, { loading: bulkUpdating }] = useMutation(SET_INVOICE_STATUSES);

  const emailConfigured = Boolean(emailConfigData?.emailDeliveryConfigured);
  const restaurants = useMemo(
    () =>
      (restaurantsData?.adminRestaurants?.items ?? []) as Array<{
        id: string;
        name: string;
        subscription?: {
          plan?: string | null;
          currentPeriodStart?: string | null;
          currentPeriodEnd?: string | null;
        } | null;
      }>,
    [restaurantsData],
  );
  const restaurantOptions = useMemo(
    () =>
      restaurants.map((r) => ({
        value: r.id,
        label: r.name,
      })),
    [restaurants],
  );

  const plans = plansData?.plans ?? [];
  const services = servicesData?.platformServices ?? [];
  const annualBilling = configData?.platformConfig?.annualBilling;

  const inferBillingCycle = (sub?: {
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
  } | null): BillingPeriod => {
    if (sub?.currentPeriodStart && sub?.currentPeriodEnd) {
      const months = dayjs(sub.currentPeriodEnd).diff(dayjs(sub.currentPeriodStart), 'month', true);
      if (months >= 10) return 'annual';
    }
    return 'monthly';
  };

  const computeCatalog = (
    nextPlanKey?: string | null,
    nextCycle?: BillingPeriod | null,
    nextServiceIds?: string[] | null,
  ) => {
    let listCents = 0;
    let chargeCents = 0;
    let durationMonths: number | null = null;

    if (nextPlanKey) {
      const plan = plans.find((p: { key: string }) => p.key === nextPlanKey);
      if (plan) {
        const cycle: BillingPeriod = nextCycle || 'monthly';
        const priced = planForBillingPeriod(plan, cycle, {
          annualBilling,
          planKey: plan.key,
        });
        const display = getPlanPriceDisplay(priced);
        chargeCents += display.primaryCents;
        listCents +=
          display.originalCents != null && display.originalCents > display.primaryCents
            ? display.originalCents
            : display.primaryCents;
        durationMonths = cycle === 'annual' ? 12 : 1;
      }
    }

    for (const id of nextServiceIds ?? []) {
      const svc = services.find((s: { id: string }) => s.id === id);
      if (svc) {
        const price = svc.priceCents ?? 0;
        chargeCents += price;
        listCents += price;
      }
    }

    return { listCents, chargeCents, durationMonths };
  };

  const catalog = useMemo(
    () => computeCatalog(planKey, billingCycle, serviceIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plans/services/annualBilling captured via computeCatalog deps below
    [planKey, billingCycle, serviceIds, plans, services, annualBilling],
  );

  const syncAmountFromCatalog = (
    nextPlanKey?: string | null,
    nextCycle?: BillingPeriod | null,
    nextServiceIds?: string[] | null,
  ) => {
    const next = computeCatalog(nextPlanKey, nextCycle, nextServiceIds);
    manualForm.setFieldsValue({
      amountDollars: next.chargeCents / 100,
      ...(next.durationMonths != null
        ? { packageDurationMonths: next.durationMonths }
        : {}),
    });
  };

  const amountCentsPreview = Math.round(Number(amountDollars ?? 0) * 100);
  const showDiscount =
    catalog.listCents > 0 &&
    Number.isFinite(amountCentsPreview) &&
    amountCentsPreview < catalog.listCents;
  const cycle: BillingPeriod = billingCycle === 'annual' ? 'annual' : 'monthly';
  const isAnnual = cycle === 'annual';

  const packageOptions = useMemo(
    () =>
      plans.map(
        (p: {
          key: string;
          name: string;
          monthlyPriceCents: number;
          visibleOnPricing?: boolean | null;
        }) => {
          const priced = planForBillingPeriod(p, cycle, {
            annualBilling,
            planKey: p.key,
          });
          const display = getPlanPriceDisplay(priced);
          const priceLabel =
            display.primaryCents === 0
              ? 'Free'
              : isAnnual
                ? `${money(display.primaryCents)}/yr`
                : `${money(display.primaryCents)}/mo`;
          const hiddenSuffix = p.visibleOnPricing === false ? ' · Hidden' : '';
          return {
            value: p.key,
            label: `${p.name} — ${priceLabel}${hiddenSuffix}`,
          };
        },
      ),
    [plans, cycle, isAnnual, annualBilling],
  );

  if (!ready) return null;

  const items = data?.adminInvoices?.items ?? [];
  const selected = items.filter((r: { id: string }) => selectedRowKeys.includes(r.id));
  const markPaidIds = selected
    .filter((r: { status: string }) => r.status !== 'paid' && r.status !== 'canceled')
    .map((r: { id: string }) => r.id);
  const cancelIds = selected
    .filter((r: { status: string }) => r.status !== 'canceled')
    .map((r: { id: string }) => r.id);
  const reopenIds = selected
    .filter((r: { status: string }) => r.status === 'canceled')
    .map((r: { id: string }) => r.id);

  const onGenerate = async () => {
    try {
      const res = await generate({ variables: { period } });
      const r = res.data?.generateInvoices;
      message.success(
        `Generated ${r?.created ?? 0} invoices for ${r?.period} (${r?.updated ?? 0} updated, ${r?.skipped ?? 0} skipped)`,
      );
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to generate invoices');
    }
  };

  const openManualModal = () => {
    const now = dayjs();
    manualForm.resetFields();
    manualForm.setFieldsValue({
      billingPeriod: now,
      dueDate: now.startOf('month'),
      billingCycle: 'monthly',
      packageDurationMonths: 1,
      serviceIds: [],
      markPaid: false,
    });
    setDuplicateConfirm(null);
    setDuplicateJustification('');
    setManualOpen(true);
  };

  const buildManualInput = (values: ManualInvoiceForm) => {
    const amountCents = Math.round(Number(values.amountDollars) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 0) {
      throw new Error('Enter a valid amount');
    }
    const originalAmountCents =
      catalog.listCents > amountCents ? catalog.listCents : undefined;
    const durationMonths =
      (values.billingCycle || 'monthly') === 'annual'
        ? 12
        : values.packageDurationMonths || undefined;
    return {
      restaurantId: values.restaurantId,
      billingPeriod: values.billingPeriod.format('YYYY-MM'),
      dueDate: values.dueDate.toISOString(),
      amountCents,
      originalAmountCents,
      packageDurationMonths: durationMonths,
      planKey: values.planKey || undefined,
      billingCycle: values.planKey ? values.billingCycle || 'monthly' : undefined,
      serviceIds: values.serviceIds?.length ? values.serviceIds : undefined,
      description: values.description?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      markPaid: Boolean(values.markPaid),
      paidJustification: values.markPaid
        ? values.paidJustification?.trim() || undefined
        : undefined,
    };
  };

  const submitManualInvoice = async (
    input: Record<string, unknown>,
    opts?: {
      forceCreate?: boolean;
      replaceExisting?: boolean;
      duplicateJustification?: string;
    },
  ) => {
    const res = await createManual({
      variables: {
        input: {
          ...input,
          forceCreate: opts?.forceCreate || undefined,
          replaceExisting: opts?.replaceExisting || undefined,
          duplicateJustification: opts?.duplicateJustification || undefined,
        },
      },
    });
    const inv = res.data?.createManualInvoice;
    message.success(
      opts?.forceCreate && opts?.replaceExisting
        ? `Replaced invoice ${inv?.number ?? ''}`
        : `Created invoice ${inv?.number ?? ''}`,
    );
    setManualOpen(false);
    setDuplicateConfirm(null);
    setDuplicateJustification('');
    setReplaceExisting(false);
    manualForm.resetFields();
    refetch();
  };

  const onCreateManual = async () => {
    try {
      const values = await manualForm.validateFields();
      const input = buildManualInput(values);
      try {
        await submitManualInvoice(input);
      } catch (err: any) {
        const graphQLError =
          err?.graphQLErrors?.[0] ??
          err?.cause?.graphQLErrors?.[0] ??
          err?.errors?.[0];
        const extensions = (graphQLError?.extensions ?? err?.extensions) as
          | {
              code?: string;
              invoiceId?: string;
              invoiceNumber?: string;
              status?: string;
              totalCents?: number;
              currency?: string;
              billingPeriod?: string;
            }
          | undefined;
        if (
          (extensions?.code === 'CONFLICT' ||
            /already exists for this restaurant and period/i.test(String(err?.message ?? ''))) &&
          (extensions?.invoiceNumber || /INV-/i.test(String(err?.message ?? '')))
        ) {
          const numberFromMessage =
            extensions?.invoiceNumber ||
            String(err?.message ?? '').match(/\(([^)]+)\)/)?.[1] ||
            'existing invoice';
          setDuplicateConfirm({
            invoiceId: String(extensions?.invoiceId ?? ''),
            invoiceNumber: String(numberFromMessage),
            status: String(extensions?.status ?? 'unknown'),
            totalCents: Number(extensions?.totalCents ?? 0),
            currency: String(extensions?.currency ?? 'usd'),
            billingPeriod: String(extensions?.billingPeriod ?? input.billingPeriod),
            pendingInput: input,
          });
          setDuplicateJustification('');
          setReplaceExisting(false);
          return;
        }
        throw err;
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to create invoice');
    }
  };

  const onConfirmDuplicateCreate = async () => {
    if (!duplicateConfirm) return;
    const justification = duplicateJustification.trim();
    if (justification.length < 3) {
      message.error('Enter a justification to create an invoice for this period anyway');
      return;
    }
    try {
      await submitManualInvoice(duplicateConfirm.pendingInput, {
        forceCreate: true,
        replaceExisting,
        duplicateJustification: justification,
      });
    } catch (err: any) {
      message.error(err.message || 'Failed to create invoice');
    }
  };

  const updateStatus = async (id: string, next: string) => {
    try {
      await setInvoiceStatus({ variables: { id, status: next } });
      message.success('Invoice updated');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoice');
    }
  };

  const bulkUpdateStatus = async (ids: string[], next: string) => {
    if (!ids.length) return;
    try {
      const res = await setInvoiceStatuses({
        variables: { ids, status: next },
      });
      const updated = res.data?.setInvoiceStatuses?.updated ?? ids.length;
      message.success(`Updated ${updated} invoice${updated === 1 ? '' : 's'}`);
      setSelectedRowKeys([]);
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to update invoices');
    }
  };

  const onDownloadPdf = async (id: string) => {
    try {
      const res = await exportPdf({ variables: { id } });
      const payload = res.data?.exportInvoicePdf;
      if (!payload?.content) throw new Error('No PDF returned');
      downloadBase64File(payload.filename, payload.content, payload.mimeType);
    } catch (err: any) {
      message.error(err.message || 'Failed to download PDF');
    }
  };

  const onCopyPayLink = async (id: string, existingUrl?: string | null) => {
    try {
      let url = existingUrl;
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

  const onSendEmail = async (id: string) => {
    try {
      const res = await sendInvoiceEmail({ variables: { id } });
      const to = res.data?.sendInvoiceEmail?.to;
      message.success(to ? `Invoice emailed to ${to}` : 'Invoice emailed');
    } catch (err: any) {
      message.error(err.message || 'Failed to send invoice email');
    }
  };

  const onSyncStripe = async () => {
    try {
      const res = await syncStripe({ variables: { limit: 50 } });
      message.success(res.data?.syncStripeInvoices?.message || 'Synced');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Stripe sync failed');
    }
  };

  const toolbarActionItems: MenuProps['items'] = [
    {
      key: 'generate',
      icon: <ThunderboltOutlined />,
      label: 'Generate for period',
      disabled: generating,
      onClick: () => void onGenerate(),
    },
    {
      key: 'manual',
      icon: <FileAddOutlined />,
      label: 'Manual invoice',
      onClick: openManualModal,
    },
    {
      key: 'sync',
      icon: <CloudSyncOutlined />,
      label: 'Sync Stripe invoices',
      disabled: syncing,
      onClick: () => void onSyncStripe(),
    },
  ];

  const rowActionItems = (r: any): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View invoice',
        onClick: () => router.push(`/admin/invoices/${r.id}`),
      },
      {
        key: 'pdf',
        icon: <DownloadOutlined />,
        label: 'Download PDF',
        onClick: () => void onDownloadPdf(r.id),
      },
    ];
    if (r.status !== 'paid' && r.status !== 'canceled') {
      items.push({
        key: 'pay-link',
        icon: <LinkOutlined />,
        label: 'Copy pay link',
        onClick: () => void onCopyPayLink(r.id, r.payUrl),
      });
    }
    if (emailConfigured) {
      items.push({
        key: 'email',
        icon: <MailOutlined />,
        label: 'Send via email',
        disabled: sendingEmail,
        onClick: () => void onSendEmail(r.id),
      });
    }
    items.push({ type: 'divider' });
    if (r.status !== 'paid' && r.status !== 'canceled') {
      items.push({
        key: 'paid',
        label: 'Mark paid',
        onClick: () => void updateStatus(r.id, 'paid'),
      });
    }
    if (r.status !== 'canceled') {
      items.push({
        key: 'cancel',
        danger: true,
        label: 'Cancel',
        onClick: () => void updateStatus(r.id, 'canceled'),
      });
    }
    if (r.status === 'canceled') {
      items.push({
        key: 'reopen',
        label: 'Reopen',
        onClick: () => void updateStatus(r.id, 'pending'),
      });
    }
    return items;
  };

  return (
    <div component="AdminInvoicesContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Invoices"
          subtitle="Generate monthly invoices, create custom bills with packages and services, download PDFs, and share payment links."
        />
        <Card>
          <Space wrap style={{ marginBottom: 16, width: '100%' }}>
            <Select
              allowClear
              placeholder="Filter status"
              style={{ width: 180 }}
              options={STATUS_OPTIONS.filter((o) => o.value)}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPagination(1);
                setSelectedRowKeys([]);
              }}
            />
            <Input.Search
              placeholder="Search invoice # or restaurant"
              allowClear
              style={{ width: 280 }}
              onSearch={(v) => {
                setSearch(v);
                setPagination(1);
                setSelectedRowKeys([]);
              }}
            />
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: 160 }}
            />
            <Dropdown menu={{ items: toolbarActionItems }} trigger={['click']}>
              <Button type="primary" loading={generating || syncing}>
                Actions <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
          {selectedRowKeys.length > 0 && (
            <Space wrap style={{ marginBottom: 16, width: '100%' }}>
              <Typography.Text>{selectedRowKeys.length} selected</Typography.Text>
              <Button
                type="primary"
                size="small"
                disabled={!markPaidIds.length}
                loading={bulkUpdating}
                onClick={() => bulkUpdateStatus(markPaidIds, 'paid')}
              >
                Mark paid
              </Button>
              <Button
                danger
                size="small"
                disabled={!cancelIds.length}
                loading={bulkUpdating}
                onClick={() => bulkUpdateStatus(cancelIds, 'canceled')}
              >
                Cancel
              </Button>
              <Button
                size="small"
                disabled={!reopenIds.length}
                loading={bulkUpdating}
                onClick={() => bulkUpdateStatus(reopenIds, 'pending')}
              >
                Reopen
              </Button>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Clear
              </Button>
            </Space>
          )}
          <Table
            className="rt-invoices-table"
            loading={loading}
            rowKey="id"
            dataSource={items}
            pagination={tablePagination(data?.adminInvoices?.total ?? 0)}
            onChange={() => setSelectedRowKeys([])}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            expandable={{
              expandedRowRender: (record: any) => (
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  {(record.notes || record.packageDurationMonths || record.planKey) && (
                    <Typography.Text type="secondary">
                      {[
                        record.planKey
                          ? `Plan: ${record.planKey}${record.billingCycle ? ` (${record.billingCycle})` : ''}`
                          : null,
                        record.packageDurationMonths
                          ? `Package: ${record.packageDurationMonths} mo`
                          : null,
                        record.notes ? `Notes: ${record.notes}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography.Text>
                  )}
                  <Table
                    size="small"
                    pagination={false}
                    rowKey={(_, idx) => String(idx)}
                    dataSource={record.lines ?? []}
                    columns={[
                      { title: 'Description', dataIndex: 'description' },
                      { title: 'Qty', dataIndex: 'quantity', width: 80 },
                      {
                        title: 'Amount',
                        dataIndex: 'amountCents',
                        render: (v: number, line: any) => (
                          <Space size={6} wrap={false}>
                            {line.originalAmountCents != null &&
                              line.originalAmountCents > v && (
                                <Typography.Text delete type="secondary">
                                  {money(line.originalAmountCents, record.currency)}
                                </Typography.Text>
                              )}
                            <span>{money(v, record.currency)}</span>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Space>
              ),
            }}
            columns={[
              {
                title: 'Number',
                dataIndex: 'number',
                ellipsis: true,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (number: string, r: any) => (
                  <Link href={`/admin/invoices/${r.id}`} style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {number}
                  </Link>
                ),
              },
              {
                title: 'Restaurant',
                dataIndex: 'restaurantName',
                ellipsis: true,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (v: string | null, r: any) =>
                  r.restaurantId ? (
                    <Link
                      href={`/admin/restaurants/${r.restaurantId}`}
                      style={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                      {v || 'Restaurant'}
                    </Link>
                  ) : (
                    <span style={{ whiteSpace: 'nowrap' }}>{v || '—'}</span>
                  ),
              },
              {
                title: 'Period',
                dataIndex: 'billingPeriod',
                width: 110,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
              },
              {
                title: 'Duration',
                dataIndex: 'packageDurationMonths',
                width: 90,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (v: number | null) => (v ? `${v} mo` : '—'),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 120,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (s: string) => (
                  <Tag color={STATUS_COLORS[s] ?? 'default'}>{statusLabel(s)}</Tag>
                ),
              },
              {
                title: 'Due',
                dataIndex: 'dueDate',
                width: 120,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (v: string) => new Date(v).toLocaleDateString('en-US'),
              },
              {
                title: 'Total',
                dataIndex: 'totalCents',
                width: 160,
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (v: number, r: any) => (
                  <Space size={6} wrap={false}>
                    {r.isDiscounted && r.originalTotalCents != null && (
                      <Typography.Text delete type="secondary">
                        {money(r.originalTotalCents, r.currency)}
                      </Typography.Text>
                    )}
                    <span>{money(v, r.currency)}</span>
                  </Space>
                ),
              },
              {
                title: 'Actions',
                width: 72,
                fixed: 'right',
                onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
                render: (_: unknown, r: any) => (
                  <Dropdown
                    menu={{ items: rowActionItems(r) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button size="small" icon={<MoreOutlined />} aria-label="More actions" />
                  </Dropdown>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <Modal
        title="Create manual invoice"
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={onCreateManual}
        confirmLoading={creatingManual}
        okText="Create invoice"
        destroyOnHidden
        width={600}
        styles={{ body: { paddingTop: 8, maxHeight: 'min(72vh, 720px)', overflowY: 'auto' } }}
      >
        <Form
          form={manualForm}
          layout="vertical"
          requiredMark="optional"
          onValuesChange={(changed, all) => {
            if (changed.billingPeriod && dayjs.isDayjs(changed.billingPeriod)) {
              const currentDue = manualForm.getFieldValue('dueDate') as Dayjs | undefined;
              if (
                !currentDue ||
                currentDue.format('YYYY-MM') !== changed.billingPeriod.format('YYYY-MM')
              ) {
                manualForm.setFieldValue('dueDate', changed.billingPeriod.startOf('month'));
              }
            }
            if ('restaurantId' in changed) {
              const restaurant = restaurants.find((r) => r.id === changed.restaurantId);
              const planFromAccount = restaurant?.subscription?.plan ?? null;
              const planExists =
                Boolean(planFromAccount) &&
                plans.some((p: { key: string }) => p.key === planFromAccount);
              if (planExists && planFromAccount) {
                const nextCycle = inferBillingCycle(restaurant?.subscription);
                manualForm.setFieldsValue({
                  planKey: planFromAccount,
                  billingCycle: nextCycle,
                });
                syncAmountFromCatalog(planFromAccount, nextCycle, all.serviceIds || []);
              } else {
                manualForm.setFieldsValue({
                  planKey: undefined,
                  billingCycle: 'monthly',
                  packageDurationMonths: 1,
                });
                syncAmountFromCatalog(null, 'monthly', all.serviceIds || []);
              }
              return;
            }
            if (
              'planKey' in changed ||
              'billingCycle' in changed ||
              'serviceIds' in changed
            ) {
              syncAmountFromCatalog(
                all.planKey,
                all.billingCycle || 'monthly',
                all.serviceIds || [],
              );
            }
          }}
        >
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
            Bill a restaurant for a package and optional add-ons. Amounts update from the catalog;
            edit the total to apply a discount.
          </Typography.Text>

          <Form.Item
            name="restaurantId"
            label="Restaurant"
            required
            rules={[{ required: true, message: 'Select a restaurant' }]}
          >
            <Select
              showSearch
              placeholder="Search restaurants"
              options={restaurantOptions}
              optionFilterProp="label"
              size="large"
            />
          </Form.Item>

          <div
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radii.md,
              background: colors.neutral[50],
              border: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <Typography.Text
              strong
              style={{ display: 'block', marginBottom: spacing.sm }}
            >
              Package
            </Typography.Text>
            <Form.Item name="billingCycle" style={{ marginBottom: spacing.sm }}>
              <Segmented
                block
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Annual', value: 'annual' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="planKey"
              label="Plan"
              style={{ marginBottom: isAnnual ? 0 : undefined }}
              extra="Defaults to the restaurant’s current subscription when you pick a restaurant."
            >
              <Select
                allowClear
                placeholder="Select plan package"
                options={packageOptions}
                size="large"
              />
            </Form.Item>
            {!isAnnual ? (
              <Form.Item
                name="packageDurationMonths"
                label="Package duration (months)"
                style={{ marginBottom: 0 }}
                extra="How many months of plan coverage this invoice includes."
              >
                <InputNumber min={1} max={120} step={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Annual billing covers 12 months.
              </Typography.Text>
            )}
          </div>

          <Form.Item name="serviceIds" label="Services (optional)">
            <Select
              mode="multiple"
              allowClear
              placeholder="Add services"
              options={services.map((s: { id: string; name: string; priceCents: number }) => ({
                value: s.id,
                label: `${s.name} — ${s.priceCents === 0 ? 'Free' : money(s.priceCents)}`,
              }))}
            />
          </Form.Item>

          <Divider style={{ margin: `${spacing.sm}px 0 ${spacing.md}px` }} />

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="billingPeriod"
                label="Billing period"
                required
                rules={[{ required: true, message: 'Select a period' }]}
              >
                <DatePicker picker="month" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="dueDate"
                label="Due date"
                required
                rules={[{ required: true, message: 'Select a due date' }]}
              >
                <DatePicker style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="amountDollars"
            label="Amount"
            required
            rules={[{ required: true, message: 'Enter an amount' }]}
            extra={
              showDiscount ? (
                <Space size={8}>
                  <Typography.Text delete type="secondary">
                    {money(catalog.listCents)}
                  </Typography.Text>
                  <Typography.Text type="success">
                    Discounted to {money(amountCentsPreview)}
                  </Typography.Text>
                </Space>
              ) : catalog.chargeCents > 0 ? (
                <Typography.Text type="secondary">
                  Catalog total {money(catalog.chargeCents)}
                  {isAnnual ? ' / year' : ' / month'} — edit to discount
                </Typography.Text>
              ) : null
            }
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              prefix="$"
              size="large"
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="description" label="Custom line description (optional)">
            <Input placeholder="Used when no package/services selected" />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={2} placeholder="Internal note" />
          </Form.Item>
          <Form.Item name="markPaid" valuePropName="checked" style={{ marginBottom: markPaid ? 12 : 0 }}>
            <Checkbox>Mark as paid immediately</Checkbox>
          </Form.Item>
          {markPaid ? (
            <Form.Item
              name="paidJustification"
              label="Paid justification"
              required
              rules={[
                {
                  required: true,
                  whitespace: true,
                  min: 3,
                  message: 'Explain why this invoice is marked paid',
                },
              ]}
              extra="Required when marking paid without collecting payment (e.g. offline payment, courtesy credit)."
              style={{ marginBottom: 0 }}
            >
              <Input.TextArea
                rows={3}
                placeholder="e.g. Received wire transfer #4821 on Sep 29"
                maxLength={500}
                showCount
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title="Invoice already exists for this period"
        open={Boolean(duplicateConfirm)}
        onCancel={() => {
          setDuplicateConfirm(null);
          setDuplicateJustification('');
          setReplaceExisting(false);
        }}
        onOk={() => void onConfirmDuplicateCreate()}
        confirmLoading={creatingManual}
        okText={replaceExisting ? 'Replace & create' : 'Create anyway'}
        okButtonProps={{ danger: replaceExisting }}
        destroyOnHidden
        width={520}
      >
        {duplicateConfirm ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message={`${duplicateConfirm.invoiceNumber} already covers ${dayjs(duplicateConfirm.billingPeriod).format('MMMM YYYY')}`}
              description={
                <>
                  Status:{' '}
                  <Tag color={STATUS_COLORS[duplicateConfirm.status] ?? 'default'}>
                    {statusLabel(duplicateConfirm.status)}
                  </Tag>
                  · Total {money(duplicateConfirm.totalCents, duplicateConfirm.currency)}. You can
                  still create an invoice for this period — by default a new invoice is created and
                  the existing one is canceled. Check Replace below to overwrite the existing
                  invoice in place (same number).
                </>
              }
            />
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                Justification <Typography.Text type="danger">*</Typography.Text>
              </Typography.Text>
              <Input.TextArea
                rows={4}
                value={duplicateJustification}
                onChange={(e) => setDuplicateJustification(e.target.value)}
                placeholder="Why create another invoice for this period? e.g. Corrected package amount after plan change"
                maxLength={500}
                showCount
              />
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                Saved on the invoice notes and audit log.
              </Typography.Text>
            </div>
            <Checkbox
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
            >
              Replace existing invoice ({duplicateConfirm.invoiceNumber})
            </Checkbox>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <div component="AdminInvoicesPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminInvoicesContent />
      </Suspense>
    </div>
  );
}
