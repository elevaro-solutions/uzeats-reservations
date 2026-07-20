'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_PLANS,
  CREATE_PLAN_PACKAGE,
  DELETE_PLAN_PACKAGE,
  UPDATE_PLAN_PACKAGE,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text } = Typography;

const FEATURE_TOGGLES = [
  {
    key: 'floorPlans',
    label: 'Floor plans',
    tooltip: 'Interactive table map for seating and floor layout management.',
  },
  {
    key: 'waitlist',
    label: 'Waitlist',
    tooltip: 'In-house and online waitlist so guests can join when fully booked.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    tooltip: 'Advanced reporting on covers, revenue trends, and performance.',
  },
  {
    key: 'emailCampaigns',
    label: 'Email campaigns',
    tooltip: 'Automated guest email campaigns for marketing and re-engagement.',
  },
  {
    key: 'premiumSms',
    label: 'Premium SMS',
    tooltip: 'Two-way premium SMS messaging with guests (confirmations, reminders).',
  },
  {
    key: 'customWidget',
    label: 'Custom widget',
    tooltip: 'Fully customizable booking widget for the restaurant website.',
  },
  {
    key: 'featuredPlacement',
    label: 'Featured placement',
    tooltip: 'Highlighted listing placement in network search and discovery.',
  },
  {
    key: 'boostCampaigns',
    label: 'Boost campaigns',
    tooltip: 'Paid boost campaigns to increase visibility for slower nights.',
  },
];

const FIELD_TIPS = {
  name: 'Public package name shown on pricing, billing, and registration.',
  description: 'Short blurb under the plan name on the public pricing page.',
  visibleOnPricing:
    'When on, this package appears as a card on the public /pricing page and in partner registration.',
  monthlyPrice: 'Recurring monthly subscription price charged after any trial ends.',
  networkCoverFee:
    'Per-cover fee when a diner discovers and books via the Tablevera network, app, or affiliates.',
  websiteCoverFee:
    'Per-cover fee for bookings that come through the restaurant’s own website widget. Set $0 for free website covers.',
  trialEnabled:
    'When on, new subscriptions start in a free trial before the first charge. Turn off for paid-from-day-one plans.',
  trialPeriod: 'How long the free trial lasts for new subscriptions on this package.',
  customTrialDays: 'Exact number of free trial days (1–365) when using a custom period.',
} as const;

const TRIAL_PRESETS = [1, 3, 7, 14, 30] as const;

function dollarsToCents(v: number | null | undefined) {
  return Math.round((v ?? 0) * 100);
}

function centsToDollars(cents: number) {
  return cents / 100;
}

function trialPeriodValue(trialDays: number): number | 'custom' {
  if (trialDays <= 0) return 30;
  return (TRIAL_PRESETS as readonly number[]).includes(trialDays) ? trialDays : 'custom';
}

export default function AdminPricingPage() {
  const { ready } = useRequireAdmin();
  const { data, loading, refetch } = useQuery(ADMIN_PLANS, { skip: !ready });
  const [updatePlan, { loading: saving }] = useMutation(UPDATE_PLAN_PACKAGE);
  const [createPlan, { loading: creating }] = useMutation(CREATE_PLAN_PACKAGE);
  const [deletePlan, { loading: deleting }] = useMutation(DELETE_PLAN_PACKAGE);
  const [activeKey, setActiveKey] = useState<string>('basic');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  const plans = data?.plans ?? [];
  const trialEnabled = Form.useWatch('trialEnabled', form);
  const trialPeriod = Form.useWatch('trialPeriod', form);
  const createTrialEnabled = Form.useWatch('trialEnabled', createForm);
  const createTrialPeriod = Form.useWatch('trialPeriod', createForm);

  useEffect(() => {
    const plan = plans.find((p: any) => p.key === activeKey) ?? plans[0];
    if (!plan) return;
    setActiveKey(plan.key);
    const days = plan.trialDays ?? 0;
    form.setFieldsValue({
      name: plan.name,
      description: plan.description ?? '',
      monthlyPrice: centsToDollars(plan.monthlyPriceCents),
      networkCoverFee: centsToDollars(plan.networkCoverFeeCents),
      websiteCoverFee: centsToDollars(plan.websiteCoverFeeCents),
      trialEnabled: days > 0,
      trialPeriod: trialPeriodValue(days),
      customTrialDays: days > 0 && !(TRIAL_PRESETS as readonly number[]).includes(days) ? days : 7,
      visibleOnPricing: plan.visibleOnPricing !== false,
      features: plan.features ?? {},
    });
  }, [plans, activeKey, form]);

  if (!ready) return null;

  const resolveTrialDays = (values: {
    trialEnabled?: boolean;
    trialPeriod?: number | 'custom';
    customTrialDays?: number;
  }) => {
    if (!values.trialEnabled) return 0;
    if (values.trialPeriod === 'custom') return Math.max(1, values.customTrialDays ?? 1);
    return Number(values.trialPeriod ?? 30);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      await updatePlan({
        variables: {
          input: {
            key: activeKey,
            name: values.name,
            description: values.description || null,
            monthlyPriceCents: dollarsToCents(values.monthlyPrice),
            networkCoverFeeCents: dollarsToCents(values.networkCoverFee),
            websiteCoverFeeCents: dollarsToCents(values.websiteCoverFee),
            trialDays: resolveTrialDays(values),
            visibleOnPricing: values.visibleOnPricing,
            features: values.features,
          },
        },
      });
      message.success('Plan updated');
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to update plan');
    }
  };

  const onCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const result = await createPlan({
        variables: {
          input: {
            name: values.name,
            description: values.description || null,
            monthlyPriceCents: dollarsToCents(values.monthlyPrice),
            networkCoverFeeCents: dollarsToCents(values.networkCoverFee),
            websiteCoverFeeCents: dollarsToCents(values.websiteCoverFee),
            trialDays: resolveTrialDays(values),
            visibleOnPricing: values.visibleOnPricing !== false,
            features: values.features ?? {},
          },
        },
      });
      message.success('Package created');
      setCreateOpen(false);
      createForm.resetFields();
      await refetch();
      const key = result.data?.createPlanPackage?.key;
      if (key) setActiveKey(key);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to create package');
    }
  };

  const onDelete = () => {
    const plan = plans.find((p: any) => p.key === activeKey);
    if (!plan?.isCustom) return;
    Modal.confirm({
      title: `Delete ${plan.name}?`,
      content: 'This removes the custom package. Existing subscriptions keep their current plan key.',
      okType: 'danger',
      okText: 'Delete',
      onOk: async () => {
        try {
          await deletePlan({ variables: { key: activeKey } });
          message.success('Package deleted');
          setActiveKey('basic');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Failed to delete package');
        }
      },
    });
  };

  const activePlan = plans.find((p: any) => p.key === activeKey);

  const trialFields = (enabled: boolean, period: number | 'custom') => (
    <>
      <Form.Item
        name="trialEnabled"
        label="Free trial"
        tooltip={FIELD_TIPS.trialEnabled}
        valuePropName="checked"
        style={{ marginBottom: 12 }}
      >
        <Switch checkedChildren="On" unCheckedChildren="Off" />
      </Form.Item>
      {enabled ? (
        <>
          <Form.Item
            name="trialPeriod"
            label="Trial period"
            tooltip={FIELD_TIPS.trialPeriod}
            rules={[{ required: true }]}
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {TRIAL_PRESETS.map((d) => (
                <Radio.Button key={d} value={d}>
                  {d} {d === 1 ? 'day' : 'days'}
                </Radio.Button>
              ))}
              <Radio.Button value="custom">Custom</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {period === 'custom' ? (
            <Form.Item
              name="customTrialDays"
              label="Custom trial days"
              tooltip={FIELD_TIPS.customTrialDays}
              rules={[{ required: true, type: 'number', min: 1 }]}
            >
              <InputNumber min={1} max={365} style={{ width: '100%' }} addonAfter="days" />
            </Form.Item>
          ) : null}
        </>
      ) : null}
    </>
  );

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Plans & pricing"
        subtitle="Edit package prices, cover fees, trial length, and included features. Changes apply to new subscriptions and plan changes."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            title="Packages"
            loading={loading}
            extra={
              <Button type="link" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Add
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {plans.map((p: any) => (
                <Button
                  key={p.key}
                  block
                  type={p.key === activeKey ? 'primary' : 'default'}
                  onClick={() => setActiveKey(p.key)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>
                    {p.name} · ${(p.monthlyPriceCents / 100).toFixed(0)}/mo
                  </span>
                  <span>
                    {p.visibleOnPricing === false ? (
                      <Tag style={{ marginInlineEnd: 0 }}>Hidden</Tag>
                    ) : (
                      <Tag color="green" style={{ marginInlineEnd: 0 }}>
                        Pricing
                      </Tag>
                    )}
                  </span>
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card
            title={`Edit ${activePlan?.name ?? activeKey}`}
            loading={loading}
            extra={
              <Space>
                {activePlan?.isCustom ? (
                  <Button danger loading={deleting} onClick={onDelete}>
                    Delete
                  </Button>
                ) : null}
                <Button type="primary" loading={saving} onClick={onSave}>
                  Save package
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="Display name"
                tooltip={FIELD_TIPS.name}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="description"
                label="Short description"
                tooltip={FIELD_TIPS.description}
              >
                <Input.TextArea rows={2} placeholder="Shown on the public pricing page" />
              </Form.Item>
              <Form.Item
                name="visibleOnPricing"
                label="Show on public pricing page"
                tooltip={FIELD_TIPS.visibleOnPricing}
                valuePropName="checked"
              >
                <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="monthlyPrice"
                    label="Monthly price (USD)"
                    tooltip={FIELD_TIPS.monthlyPrice}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="networkCoverFee"
                    label="Network cover fee (USD)"
                    tooltip={FIELD_TIPS.networkCoverFee}
                  >
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="websiteCoverFee"
                    label="Website cover fee (USD)"
                    tooltip={FIELD_TIPS.websiteCoverFee}
                  >
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
                  </Form.Item>
                </Col>
              </Row>
              {trialFields(Boolean(trialEnabled), trialPeriod)}
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                Features
              </Text>
              <Row gutter={[12, 12]}>
                {FEATURE_TOGGLES.map((f) => (
                  <Col xs={12} md={8} key={f.key}>
                    <Form.Item
                      name={['features', f.key]}
                      label={f.label}
                      tooltip={f.tooltip}
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Add package"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={creating}
        okText="Create package"
        destroyOnClose
        width={640}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            trialEnabled: true,
            trialPeriod: 30,
            customTrialDays: 7,
            visibleOnPricing: true,
            monthlyPrice: 0,
            networkCoverFee: 0,
            websiteCoverFee: 0,
            features: {},
          }}
        >
          <Form.Item
            name="name"
            label="Display name"
            tooltip={FIELD_TIPS.name}
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g. Starter" />
          </Form.Item>
          <Form.Item name="description" label="Short description" tooltip={FIELD_TIPS.description}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="visibleOnPricing"
            label="Show on public pricing page"
            tooltip={FIELD_TIPS.visibleOnPricing}
            valuePropName="checked"
          >
            <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monthlyPrice"
                label="Monthly price (USD)"
                tooltip={FIELD_TIPS.monthlyPrice}
                rules={[{ required: true }]}
              >
                <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="networkCoverFee"
                label="Network cover fee (USD)"
                tooltip={FIELD_TIPS.networkCoverFee}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="websiteCoverFee"
                label="Website cover fee (USD)"
                tooltip={FIELD_TIPS.websiteCoverFee}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          {trialFields(Boolean(createTrialEnabled), createTrialPeriod)}
        </Form>
      </Modal>
    </Space>
  );
}
