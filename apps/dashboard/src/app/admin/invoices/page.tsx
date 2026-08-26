'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
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
import { PageHeader, spacing } from '@reservations/ui';
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
  return (cents / 100).toLocaleString(undefined, {
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
};

function AdminInvoicesContent() {
  const { ready } = useRequireAdmin();
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm] = Form.useForm<ManualInvoiceForm>();
  const planKey = Form.useWatch('planKey', manualForm);
  const billingCycle = Form.useWatch('billingCycle', manualForm) as BillingPeriod | undefined;
  const serviceIds = Form.useWatch('serviceIds', manualForm) as string[] | undefined;
  const amountDollars = Form.useWatch('amountDollars', manualForm) as number | undefined;
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
  const restaurantOptions = useMemo(
    () =>
      (restaurantsData?.adminRestaurants?.items ?? []).map((r: { id: string; name: string }) => ({
        value: r.id,
        label: r.name,
      })),
    [restaurantsData],
  );

  const plans = plansData?.plans ?? [];
  const services = servicesData?.platformServices ?? [];
  const annualBilling = configData?.platformConfig?.annualBilling;

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

  const amountCentsPreview = Math.round(Number(amountDollars ?? 0) * 100);
  const showDiscount =
    catalog.listCents > 0 &&
    Number.isFinite(amountCentsPreview) &&
    amountCentsPreview < catalog.listCents;

  const onGenerate = async () => {
    try {
      const res = await generate({ variables: { period } });
      const r = res.data?.generateInvoices;
      message.success(
        `Generated ${r?.created ?? 0} invoices for ${r?.period} (${r?.skipped ?? 0} skipped)`,
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
    setManualOpen(true);
  };

  const onCreateManual = async () => {
    try {
      const values = await manualForm.validateFields();
      const amountCents = Math.round(Number(values.amountDollars) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 0) {
        message.error('Enter a valid amount');
        return;
      }
      const originalAmountCents =
        catalog.listCents > amountCents ? catalog.listCents : undefined;
      const res = await createManual({
        variables: {
          input: {
            restaurantId: values.restaurantId,
            billingPeriod: values.billingPeriod.format('YYYY-MM'),
            dueDate: values.dueDate.toISOString(),
            amountCents,
            originalAmountCents,
            packageDurationMonths: values.packageDurationMonths || undefined,
            planKey: values.planKey || undefined,
            billingCycle: values.planKey ? values.billingCycle || 'monthly' : undefined,
            serviceIds: values.serviceIds?.length ? values.serviceIds : undefined,
            description: values.description?.trim() || undefined,
            notes: values.notes?.trim() || undefined,
            markPaid: Boolean(values.markPaid),
          },
        },
      });
      const inv = res.data?.createManualInvoice;
      message.success(`Created invoice ${inv?.number ?? ''}`);
      setManualOpen(false);
      manualForm.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
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
                          <Space size={6}>
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
                render: (number: string, r: any) => (
                  <Link href={`/admin/invoices/${r.id}`} style={{ fontWeight: 500 }}>
                    {number}
                  </Link>
                ),
              },
              {
                title: 'Restaurant',
                dataIndex: 'restaurantName',
                render: (v: string | null, r: any) =>
                  r.restaurantId ? (
                    <Link href={`/admin/restaurants/${r.restaurantId}`} style={{ fontWeight: 500 }}>
                      {v || 'Restaurant'}
                    </Link>
                  ) : (
                    v || '—'
                  ),
              },
              { title: 'Period', dataIndex: 'billingPeriod', width: 110 },
              {
                title: 'Duration',
                dataIndex: 'packageDurationMonths',
                width: 90,
                render: (v: number | null) => (v ? `${v} mo` : '—'),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 120,
                render: (s: string) => (
                  <Tag color={STATUS_COLORS[s] ?? 'default'}>{statusLabel(s)}</Tag>
                ),
              },
              {
                title: 'Due',
                dataIndex: 'dueDate',
                width: 120,
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
              {
                title: 'Total',
                dataIndex: 'totalCents',
                width: 160,
                render: (v: number, r: any) => (
                  <Space size={6}>
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
        width={560}
      >
        <Form
          form={manualForm}
          layout="vertical"
          style={{ marginTop: 8 }}
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
          <Form.Item
            name="restaurantId"
            label="Restaurant"
            rules={[{ required: true, message: 'Select a restaurant' }]}
          >
            <Select
              showSearch
              placeholder="Select restaurant"
              options={restaurantOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="planKey" label="Package (optional)">
            <Select
              allowClear
              placeholder="Select plan package"
              options={plans.map((p: { key: string; name: string; monthlyPriceCents: number }) => ({
                value: p.key,
                label: `${p.name} — ${money(p.monthlyPriceCents)}/mo`,
              }))}
            />
          </Form.Item>
          <Form.Item name="billingCycle" label="Billing cycle">
            <Select
              disabled={!planKey}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'annual', label: 'Annual' },
              ]}
            />
          </Form.Item>
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
          <Form.Item
            name="billingPeriod"
            label="Billing period"
            rules={[{ required: true, message: 'Select a period' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="Due date"
            rules={[{ required: true, message: 'Select a due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="packageDurationMonths" label="Package duration (months)">
            <InputNumber min={1} max={120} step={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="amountDollars"
            label="Amount"
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
                  Package total {money(catalog.chargeCents)} — edit to discount
                </Typography.Text>
              ) : null
            }
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              prefix="$"
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
          <Form.Item name="markPaid" valuePropName="checked">
            <Checkbox>Mark as paid immediately</Checkbox>
          </Form.Item>
        </Form>
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
