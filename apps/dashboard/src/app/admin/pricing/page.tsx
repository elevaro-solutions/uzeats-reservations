'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { BulbOutlined, HolderOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  computeAnnualSavings,
  computeAmountOffPriceCents,
  computeDiscountedPriceCents,
  formatAnnualSavingsNote,
  formatPlanDollars,
  getAnnualSavingsPercentFromSettings,
  type PlanDiscountType,
} from '@reservations/shared';
import {
  ADMIN_PLANS,
  CREATE_PLAN_PACKAGE,
  DELETE_PLAN_PACKAGE,
  GENERATE_PLAN_DESCRIPTION,
  PLATFORM_CONFIG,
  REORDER_PLAN_PACKAGES,
  UPDATE_PLATFORM_CONFIG,
  UPDATE_PLAN_PACKAGE,
} from '@/lib/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useFormDirty } from '@/lib/useFormDirty';

const { Text, Paragraph } = Typography;

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
  {
    key: 'threeDView',
    label: '3D view',
    tooltip: 'Included free with the package — Live floor 3D view for hosts (no Virtual 3D add-on charge).',
  },
];

const FIELD_TIPS = {
  name: 'Public package name shown on pricing, billing, and registration.',
  description: 'Short blurb under the plan name on the public pricing page.',
  highlights: 'Bullet lines under Includes on the public pricing card. Leave empty to show no includes.',
  generateDescription:
    'Drafts the short description from the package name, includes, features, and manager accounts. You can edit it before saving.',
  visibleOnPricing:
    'When on, this package appears as a card on the public /pricing page and in partner registration. When off (Hidden), partners and the public cannot select it — platform admins can still assign it when creating or editing restaurants, assigning packages, and creating invoices.',
  monthlyPrice: 'Recurring monthly subscription price charged after any trial ends.',
  listPrice:
    'Original list price shown with strikethrough when a discount is active (e.g. before 50% off or 1st month free).',
  discountType:
    'Optional promotional pricing: percent off, fixed amount off, first month free, or free months on annual billing.',
  discountPercent: 'Percentage taken off the list price each month (e.g. 50 for half off).',
  discountAmount: 'Fixed dollar amount taken off the list price each month (e.g. $20 off $99).',
  annualFreeMonths:
    'Per-package override: free months when paying annually. Used only when global annual billing is off or does not include this package.',
  globalAnnualEnabled: 'When on, annual billing discounts apply on the public pricing page.',
  globalAnnualScope: 'Apply the annual discount to every package or only selected ones.',
  globalAnnualPlanKeys: 'Packages that receive the annual discount when scope is “Selected packages”.',
  globalAnnualDiscountType:
    'How annual savings are calculated: free months off the yearly total, or a percentage off the annual price.',
  globalAnnualFreeMonths: 'Months free when paying annually (e.g. 2 months free = pay for 10, get 12).',
  globalAnnualDiscountPercent: 'Percentage taken off the full annual price when billing annually.',
  networkCoverFee:
    'Per-cover fee when a diner discovers and books via the Tablevera network, app, or affiliates.',
  websiteCoverFee:
    'Per-cover fee for bookings that come through the restaurant’s own website widget. Set $0 for free website covers.',
  trialEnabled:
    'When on, new subscriptions start in a free trial before the first charge. Turn off for paid-from-day-one plans.',
  trialPeriod: 'How long the free trial lasts for new subscriptions on this package.',
  customTrialDays: 'Exact number of free trial days (1–365) when using a custom period.',
  managerSeats:
    'How many manager accounts the restaurant owner can invite. Every package must include at least 1. The owner does not use a seat.',
} as const;

const TRIAL_PRESETS = [1, 3, 7, 14, 30] as const;

const DISCOUNT_OPTIONS: { value: PlanDiscountType; label: string }[] = [
  { value: 'none', label: 'No discount' },
  { value: 'percent_off', label: 'Percent off' },
  { value: 'amount_off', label: 'Fixed amount off' },
  { value: 'first_month_free', label: '1st month free' },
  { value: 'annual_months_free', label: 'Annual — months free' },
];

function dollarsToCents(v: number | null | undefined) {
  return Math.round((v ?? 0) * 100);
}

function centsToDollars(cents: number) {
  return cents / 100;
}

function featuresInput(features: Record<string, unknown> | undefined | null) {
  if (!features) return {};
  const { __typename: _typename, ...rest } = features;
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => typeof value === 'boolean'),
  );
}

function highlightsInput(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => String(line).trim())
    .filter(Boolean)
    .slice(0, 12);
}

function PackageHighlightsField() {
  return (
    <Form.Item label="Includes" tooltip={FIELD_TIPS.highlights} style={{ marginBottom: 12 }}>
      <Form.List name="highlights">
        {(fields, { add, remove }) => (
          <div>
            {fields.map(({ key, name, ...rest }) => (
              <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                <Form.Item
                  {...rest}
                  name={name}
                  style={{ flex: 1, marginBottom: 0, minWidth: 280 }}
                  rules={[{ required: true, whitespace: true, message: 'Enter a line or remove it' }]}
                >
                  <Input placeholder="What's included" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  aria-label="Remove include"
                  icon={<MinusCircleOutlined />}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add('')} icon={<PlusOutlined />} block>
              Add include
            </Button>
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}

function trialPeriodValue(trialDays: number): number | 'custom' {
  if (trialDays <= 0) return 30;
  return (TRIAL_PRESETS as readonly number[]).includes(trialDays) ? trialDays : 'custom';
}

export default function AdminPricingPage() {
  const { ready, user } = useRequireAdmin();
  const isSuperAdminUser = user ? isSuperAdmin(user.role) : false;
  const canDeleteBuiltin = isSuperAdminUser;
  const { data, loading, refetch } = useQuery(ADMIN_PLANS, { skip: !ready });
  const { data: configData, refetch: refetchConfig } = useQuery(PLATFORM_CONFIG, {
    skip: !ready,
  });
  const [updatePlan, { loading: saving }] = useMutation(UPDATE_PLAN_PACKAGE);
  const [updateConfig, { loading: savingAnnual }] = useMutation(UPDATE_PLATFORM_CONFIG);
  const [createPlan, { loading: creating }] = useMutation(CREATE_PLAN_PACKAGE);
  const [deletePlan, { loading: deleting }] = useMutation(DELETE_PLAN_PACKAGE);
  const [reorderPlans, { loading: reordering }] = useMutation(REORDER_PLAN_PACKAGES);
  const [generateDescription, { loading: generatingDescription }] = useMutation(
    GENERATE_PLAN_DESCRIPTION,
  );
  const [activeKey, setActiveKey] = useState<string>('basic');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [orderedKeys, setOrderedKeys] = useState<string[] | null>(null);
  const suppressClick = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [annualForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const packageDirty = useFormDirty();
  const annualDirty = useFormDirty();
  const createDirty = useFormDirty();

  const plans = data?.plans ?? [];
  const smsEnabled = configData?.platformConfig?.featureFlags?.sms !== false;
  const featureToggles = useMemo(
    () => (smsEnabled ? FEATURE_TOGGLES : FEATURE_TOGGLES.filter((f) => f.key !== 'premiumSms')),
    [smsEnabled],
  );
  const displayPlans = (() => {
    if (!orderedKeys?.length) return plans;
    const byKey = new Map(plans.map((plan: { key: string }) => [plan.key, plan]));
    const ordered = orderedKeys
      .map((key) => byKey.get(key))
      .filter((plan): plan is (typeof plans)[number] => Boolean(plan));
    for (const plan of plans) {
      if (!orderedKeys.includes(plan.key)) ordered.push(plan);
    }
    return ordered;
  })();
  const trialEnabled = Form.useWatch('trialEnabled', form);
  const trialPeriod = Form.useWatch('trialPeriod', form);
  const discountType = Form.useWatch('discountType', form) as PlanDiscountType | undefined;
  const listPrice = Form.useWatch('listPrice', form);
  const discountPercent = Form.useWatch('discountPercent', form);
  const discountAmount = Form.useWatch('discountAmount', form);
  const monthlyPrice = Form.useWatch('monthlyPrice', form);
  const annualFreeMonths = Form.useWatch('annualFreeMonths', form);
  const createTrialEnabled = Form.useWatch('trialEnabled', createForm);
  const createTrialPeriod = Form.useWatch('trialPeriod', createForm);
  const createDiscountType = Form.useWatch('discountType', createForm) as
    | PlanDiscountType
    | undefined;
  const createMonthlyPrice = Form.useWatch('monthlyPrice', createForm);
  const createAnnualFreeMonths = Form.useWatch('annualFreeMonths', createForm);
  const globalAnnualEnabled = Form.useWatch('enabled', annualForm);
  const globalAnnualScope = Form.useWatch('scope', annualForm);
  const globalAnnualDiscountType = Form.useWatch('discountType', annualForm);
  const globalAnnualFreeMonths = Form.useWatch('freeMonths', annualForm);
  const globalAnnualDiscountPercent = Form.useWatch('discountPercent', annualForm);

  useEffect(() => {
    if (!configData?.platformConfig?.annualBilling) return;
    annualForm.setFieldsValue(configData.platformConfig.annualBilling);
    annualDirty.clearDirty();
  }, [configData, annualForm, annualDirty.clearDirty]);

  useEffect(() => {
    const plan = plans.find((p: any) => p.key === activeKey) ?? plans[0];
    if (!plan) return;
    setActiveKey(plan.key);
    const days = plan.trialDays ?? 0;
    form.setFieldsValue({
      name: plan.name,
      description: plan.description ?? '',
      monthlyPrice: centsToDollars(plan.monthlyPriceCents),
      listPrice: plan.originalMonthlyPriceCents
        ? centsToDollars(plan.originalMonthlyPriceCents)
        : centsToDollars(plan.monthlyPriceCents),
      discountType: plan.discountType ?? 'none',
      discountPercent: plan.discountPercent ?? 50,
      discountAmount: plan.discountAmountCents ? centsToDollars(plan.discountAmountCents) : 10,
      annualFreeMonths: plan.annualFreeMonths ?? 2,
      networkCoverFee: centsToDollars(plan.networkCoverFeeCents),
      websiteCoverFee: centsToDollars(plan.websiteCoverFeeCents),
      trialEnabled: days > 0,
      trialPeriod: trialPeriodValue(days),
      customTrialDays: days > 0 && !(TRIAL_PRESETS as readonly number[]).includes(days) ? days : 7,
      visibleOnPricing: plan.visibleOnPricing !== false,
      managerSeats: plan.managerSeats ?? 1,
      highlights: Array.isArray(plan.highlights) ? plan.highlights : [],
      features: featuresInput(plan.features),
    });
    packageDirty.clearDirty();
  }, [plans, activeKey, form, packageDirty.clearDirty]);

  if (!ready) return null;

  const resolveTrialDays = (values: {
    trialEnabled?: boolean;
    trialPeriod?: number | 'custom' | string;
    customTrialDays?: number;
  }) => {
    if (values.trialEnabled !== true) return 0;
    if (values.trialPeriod === 'custom') {
      const custom = Number(values.customTrialDays);
      return Number.isFinite(custom) ? Math.min(365, Math.max(1, Math.round(custom))) : 1;
    }
    const days = Number(values.trialPeriod ?? 30);
    return Number.isFinite(days) && days > 0 ? days : 30;
  };

  const resolveDiscountInput = (values: {
    discountType?: PlanDiscountType;
    monthlyPrice?: number;
    listPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    annualFreeMonths?: number;
  }) => {
    const type = values.discountType ?? 'none';
    if (type === 'none') {
      return {
        discountType: 'none' as const,
        originalMonthlyPriceCents: null,
        discountPercent: null,
        discountAmountCents: null,
        annualFreeMonths: null,
      };
    }
    if (type === 'percent_off') {
      const original = dollarsToCents(values.listPrice ?? values.monthlyPrice);
      const percent = Math.min(100, Math.max(1, values.discountPercent ?? 50));
      return {
        discountType: type,
        originalMonthlyPriceCents: original,
        discountPercent: percent,
        discountAmountCents: null,
        annualFreeMonths: null,
        monthlyPriceCents: computeDiscountedPriceCents(original, percent),
      };
    }
    if (type === 'amount_off') {
      const original = dollarsToCents(values.listPrice ?? values.monthlyPrice);
      const amountOff = dollarsToCents(values.discountAmount ?? 0);
      return {
        discountType: type,
        originalMonthlyPriceCents: original,
        discountPercent: null,
        discountAmountCents: amountOff,
        annualFreeMonths: null,
        monthlyPriceCents: computeAmountOffPriceCents(original, amountOff),
      };
    }
    if (type === 'first_month_free') {
      const monthly = dollarsToCents(values.monthlyPrice);
      return {
        discountType: type,
        originalMonthlyPriceCents: dollarsToCents(values.listPrice ?? values.monthlyPrice),
        discountPercent: null,
        discountAmountCents: null,
        annualFreeMonths: null,
        monthlyPriceCents: monthly,
      };
    }
    return {
      discountType: type,
      originalMonthlyPriceCents: null,
      discountPercent: null,
      discountAmountCents: null,
      annualFreeMonths: Math.min(11, Math.max(1, values.annualFreeMonths ?? 1)),
      monthlyPriceCents: dollarsToCents(values.monthlyPrice),
    };
  };

  const onSaveAnnualBilling = async () => {
    if (!annualDirty.dirty) return;
    try {
      const values = await annualForm.validateFields();
      await updateConfig({
        variables: {
          input: {
            annualBilling: {
              enabled: values.enabled,
              scope: values.scope,
              planKeys: values.planKeys ?? [],
              discountType: values.discountType,
              freeMonths: values.freeMonths,
              discountPercent: values.discountPercent,
            },
          },
        },
      });
      message.success('Global annual billing updated');
      annualDirty.clearDirty();
      refetchConfig();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to update annual billing');
    }
  };

  const onSave = async () => {
    if (!packageDirty.dirty) return;
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);
      const discount = resolveDiscountInput(values);
      const nextFeatures = featuresInput(values.features);
      // Premium SMS toggle is hidden when the platform kill switch is off — keep stored value.
      if (!smsEnabled) {
        const current = plans.find((p: { key: string }) => p.key === activeKey);
        if (current?.features && typeof current.features.premiumSms === 'boolean') {
          nextFeatures.premiumSms = current.features.premiumSms;
        }
      }
      await updatePlan({
        variables: {
          input: {
            key: activeKey,
            name: values.name,
            description: values.description || null,
            monthlyPriceCents:
              discount.monthlyPriceCents ?? dollarsToCents(values.monthlyPrice),
            originalMonthlyPriceCents: discount.originalMonthlyPriceCents,
            discountType: discount.discountType,
            discountPercent: discount.discountPercent,
            discountAmountCents: discount.discountAmountCents,
            annualFreeMonths: discount.annualFreeMonths,
            networkCoverFeeCents: dollarsToCents(values.networkCoverFee),
            websiteCoverFeeCents: dollarsToCents(values.websiteCoverFee),
            trialDays: resolveTrialDays(values),
            visibleOnPricing: values.visibleOnPricing,
            ...(isSuperAdminUser ? { highlights: highlightsInput(values.highlights) } : {}),
            managerSeats: Math.max(1, Math.round(Number(values.managerSeats) || 1)),
            features: nextFeatures,
          },
        },
      });
      message.success('Plan updated');
      packageDirty.clearDirty();
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to update plan');
    }
  };

  const onCreate = async () => {
    if (!createDirty.dirty) return;
    try {
      await createForm.validateFields();
      const values = createForm.getFieldsValue(true);
      const discount = resolveDiscountInput(values);
      const result = await createPlan({
        variables: {
          input: {
            name: values.name,
            description: values.description || null,
            monthlyPriceCents:
              discount.monthlyPriceCents ?? dollarsToCents(values.monthlyPrice),
            originalMonthlyPriceCents: discount.originalMonthlyPriceCents,
            discountType: discount.discountType,
            discountPercent: discount.discountPercent,
            discountAmountCents: discount.discountAmountCents,
            annualFreeMonths: discount.annualFreeMonths,
            networkCoverFeeCents: dollarsToCents(values.networkCoverFee),
            websiteCoverFeeCents: dollarsToCents(values.websiteCoverFee),
            trialDays: resolveTrialDays(values),
            visibleOnPricing: values.visibleOnPricing !== false,
            ...(isSuperAdminUser ? { highlights: highlightsInput(values.highlights) } : {}),
            managerSeats: Math.max(1, Math.round(Number(values.managerSeats) || 1)),
            features: featuresInput(values.features),
          },
        },
      });
      message.success('Package created');
      setCreateOpen(false);
      createForm.resetFields();
      createDirty.clearDirty();
      await refetch();
      const key = result.data?.createPlanPackage?.key;
      if (key) setActiveKey(key);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to create package');
    }
  };

  const onGenerateDescription = async (target: 'edit' | 'create') => {
    const source = target === 'edit' ? form : createForm;
    const values = source.getFieldsValue(true);
    const name = String(values.name ?? '').trim();
    if (!name) {
      message.error('Enter a package name first');
      return;
    }
    const enabled = featuresInput(values.features);
    try {
      const result = await generateDescription({
        variables: {
          input: {
            name,
            highlights: highlightsInput(values.highlights),
            featureLabels: featureToggles.filter((feature) => enabled[feature.key]).map(
              (feature) => feature.label,
            ),
            managerSeats: Math.max(1, Math.round(Number(values.managerSeats) || 1)),
            monthlyPriceCents: dollarsToCents(values.monthlyPrice),
          },
        },
      });
      const text = result.data?.generatePlanPackageDescription;
      if (!text) throw new Error('No description returned');
      source.setFieldValue('description', text);
      if (target === 'edit') packageDirty.markDirty();
      else createDirty.markDirty();
    } catch (err: any) {
      message.error(err.message || 'Failed to generate description');
    }
  };

  const onDelete = () => {
    const plan = plans.find((p: any) => p.key === activeKey);
    if (!plan) return;
    if (!plan.isCustom && !canDeleteBuiltin) return;
    Modal.confirm({
      title: `Delete ${plan.name}?`,
      content: plan.isCustom
        ? 'This removes the custom package. Restaurants already on it keep their current plan key.'
        : 'This removes the package from pricing, signup, and plan pickers. Restaurants already on it keep this package.',
      okType: 'danger',
      okText: 'Delete',
      onOk: async () => {
        try {
          await deletePlan({ variables: { key: activeKey } });
          message.success('Package deleted');
          const next = plans.find((p: any) => p.key !== activeKey);
          if (next) setActiveKey(next.key);
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Failed to delete package');
        }
      },
    });
  };

  const commitReorder = async (from: number, to: number) => {
    setDragIndex(null);
    setDropIndex(null);
    if (reordering || from === to || from < 0 || to < 0) return;
    const keys = displayPlans.map((plan: { key: string }) => plan.key);
    const [moved] = keys.splice(from, 1);
    if (!moved) return;
    keys.splice(to, 0, moved);
    setOrderedKeys(keys);
    try {
      await reorderPlans({ variables: { keys } });
      await refetch();
      setOrderedKeys(null);
    } catch (err: any) {
      setOrderedKeys(null);
      message.error(err.message || 'Failed to reorder packages');
    }
  };

  const activePlan = plans.find((p: any) => p.key === activeKey);

  const globalAnnualPreview = {
    enabled: globalAnnualEnabled !== false,
    scope: globalAnnualScope === 'selected' ? 'selected' as const : 'all' as const,
    planKeys: [],
    discountType: globalAnnualDiscountType === 'percent_off' ? 'percent_off' as const : 'months_free' as const,
    freeMonths: globalAnnualFreeMonths ?? 2,
    discountPercent: globalAnnualDiscountPercent ?? 17,
  };
  const globalAnnualSavingsPercent = getAnnualSavingsPercentFromSettings(globalAnnualPreview);

  const percentPreviewCents =
    discountType === 'percent_off' && listPrice && discountPercent
      ? computeDiscountedPriceCents(dollarsToCents(listPrice), discountPercent)
      : null;

  const amountPreviewCents =
    discountType === 'amount_off' && listPrice && discountAmount
      ? computeAmountOffPriceCents(dollarsToCents(listPrice), dollarsToCents(discountAmount))
      : null;

  const discountFields = (
    type: PlanDiscountType | undefined,
    percentPreviewCents: number | null,
    amountPreviewCents: number | null,
    previewMonthlyPrice?: number,
    previewAnnualFreeMonths?: number,
  ) => {
    const annualSavingsPreview =
      type === 'annual_months_free' && previewMonthlyPrice && previewAnnualFreeMonths
        ? computeAnnualSavings(dollarsToCents(previewMonthlyPrice), previewAnnualFreeMonths)
        : null;

    return (
    <>
      <Form.Item
        name="discountType"
        label="Discount"
        tooltip={FIELD_TIPS.discountType}
        style={{ marginBottom: 12 }}
      >
        <Select options={DISCOUNT_OPTIONS} />
      </Form.Item>
      {type === 'percent_off' ? (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="listPrice"
              label="List price (USD)"
              tooltip={FIELD_TIPS.listPrice}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="discountPercent"
              label="Discount %"
              tooltip={FIELD_TIPS.discountPercent}
              rules={[{ required: true, type: 'number', min: 1, max: 99 }]}
            >
              <InputNumber min={1} max={99} style={{ width: '100%' }} addonAfter="%" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Text type="secondary">
              Sale price:{' '}
              {percentPreviewCents != null ? (
                <Text strong>{formatPlanDollars(percentPreviewCents)}/mo</Text>
              ) : (
                '—'
              )}
            </Text>
          </Col>
        </Row>
      ) : null}
      {type === 'amount_off' ? (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="listPrice"
              label="List price (USD)"
              tooltip={FIELD_TIPS.listPrice}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="discountAmount"
              label="Discount amount (USD)"
              tooltip={FIELD_TIPS.discountAmount}
              rules={[{ required: true, type: 'number', min: 0.01 }]}
            >
              <InputNumber min={0.01} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Text type="secondary">
              Sale price:{' '}
              {amountPreviewCents != null ? (
                <Text strong>{formatPlanDollars(amountPreviewCents)}/mo</Text>
              ) : (
                '—'
              )}
            </Text>
          </Col>
        </Row>
      ) : null}
      {type === 'first_month_free' ? (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="monthlyPrice"
              label="Regular monthly price (USD)"
              tooltip={FIELD_TIPS.monthlyPrice}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="listPrice"
              label="Strikethrough price (USD)"
              tooltip={FIELD_TIPS.listPrice}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
        </Row>
      ) : null}
      {type === 'annual_months_free' ? (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="annualFreeMonths"
              label="Free months on annual"
              tooltip={FIELD_TIPS.annualFreeMonths}
              rules={[{ required: true, type: 'number', min: 1, max: 11 }]}
            >
              <InputNumber min={1} max={11} style={{ width: '100%' }} addonAfter="months" />
            </Form.Item>
          </Col>
          {annualSavingsPreview ? (
            <Col span={24}>
              <Text type="secondary" style={{ display: 'block' }}>
                Annual total:{' '}
                <Text delete>{formatPlanDollars(annualSavingsPreview.annualFullCents)}/yr</Text>{' '}
                <Text strong>
                  {formatPlanDollars(annualSavingsPreview.annualDiscountedCents)}/yr
                </Text>
              </Text>
              <Text style={{ display: 'block', color: '#389e0d', fontWeight: 600, marginTop: 4 }}>
                {formatAnnualSavingsNote(
                  annualSavingsPreview.annualSavingsCents,
                  annualSavingsPreview.annualSavingsPercent,
                )}
              </Text>
            </Col>
          ) : null}
        </Row>
      ) : null}
    </>
    );
  };

  const trialFields = (enabled: boolean, period: number | 'custom' | string) => (
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
      <Form.Item
        name="trialPeriod"
        label="Trial period"
        tooltip={FIELD_TIPS.trialPeriod}
        hidden={!enabled}
        rules={enabled ? [{ required: true }] : []}
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
      <Form.Item
        name="customTrialDays"
        label="Custom trial days"
        tooltip={FIELD_TIPS.customTrialDays}
        hidden={!enabled || period !== 'custom'}
        rules={
          enabled && period === 'custom' ? [{ required: true, type: 'number', min: 1 }] : []
        }
      >
        <InputNumber min={1} max={365} style={{ width: '100%' }} addonAfter="days" />
      </Form.Item>
    </>
  );

  return (
    <div component="AdminPricingPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Plans & pricing"
        subtitle="Edit package prices, cover fees, trial length, and included features. Changes apply to new subscriptions and plan changes."
      />

      <Card
        title="Global annual billing"
        loading={loading}
        extra={
          <Button
            type="primary"
            loading={savingAnnual}
            disabled={!annualDirty.dirty}
            onClick={onSaveAnnualBilling}
          >
            Save annual settings
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Control the annual billing discount shown on the public pricing page. Applies to all
          packages or only the ones you select. Per-package &ldquo;Annual — months free&rdquo;
          discounts apply only when global billing is disabled or excludes that package.
        </Paragraph>
        <Form form={annualForm} layout="vertical" onValuesChange={annualDirty.onValuesChange}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="enabled"
                label="Annual discount"
                tooltip={FIELD_TIPS.globalAnnualEnabled}
                valuePropName="checked"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="scope"
                label="Apply to"
                tooltip={FIELD_TIPS.globalAnnualScope}
              >
                <Select
                  options={[
                    { value: 'all', label: 'All packages' },
                    { value: 'selected', label: 'Selected packages' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="discountType"
                label="Discount type"
                tooltip={FIELD_TIPS.globalAnnualDiscountType}
              >
                <Select
                  options={[
                    { value: 'months_free', label: 'Free months' },
                    { value: 'percent_off', label: 'Percent off annual total' },
                  ]}
                />
              </Form.Item>
            </Col>
            {globalAnnualScope === 'selected' ? (
              <Col span={24}>
                <Form.Item
                  name="planKeys"
                  label="Packages"
                  tooltip={FIELD_TIPS.globalAnnualPlanKeys}
                  rules={[{ required: true, message: 'Select at least one package' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Choose packages"
                    options={plans.map((p: any) => ({ value: p.key, label: p.name }))}
                  />
                </Form.Item>
              </Col>
            ) : null}
            {globalAnnualDiscountType === 'percent_off' ? (
              <Col xs={24} md={8}>
                <Form.Item
                  name="discountPercent"
                  label="Annual discount %"
                  tooltip={FIELD_TIPS.globalAnnualDiscountPercent}
                  rules={[{ required: true, type: 'number', min: 1, max: 99 }]}
                >
                  <InputNumber min={1} max={99} style={{ width: '100%' }} addonAfter="%" />
                </Form.Item>
              </Col>
            ) : (
              <Col xs={24} md={8}>
                <Form.Item
                  name="freeMonths"
                  label="Free months on annual"
                  tooltip={FIELD_TIPS.globalAnnualFreeMonths}
                  rules={[{ required: true, type: 'number', min: 1, max: 11 }]}
                >
                  <InputNumber min={1} max={11} style={{ width: '100%' }} addonAfter="months" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Text type="secondary">
                Pricing page label:{' '}
                <Text strong>
                  {globalAnnualEnabled === false
                    ? 'Annual (no global discount)'
                    : `Annual (save ${globalAnnualSavingsPercent}%)`}
                </Text>
              </Text>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            title="Packages"
            loading={loading && !data}
            extra={
              <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => {
                  createDirty.clearDirty();
                  setCreateOpen(true);
                }}
              >
                Add
              </Button>
            }
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Drag the handle to reorder. This order is used on the public pricing page.
            </Text>
            <Space orientation="vertical" style={{ width: '100%' }}>
              {displayPlans.map((p: any, index: number) => {
                const selected = p.key === activeKey;
                const isDropTarget = dropIndex === index && dragIndex !== index;
                return (
                  <div
                    key={p.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      setActiveKey(p.key);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveKey(p.key);
                      }
                    }}
                    onDragOver={(event) => {
                      if (dragIndex === null || reordering) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDropIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = dragIndex ?? Number(event.dataTransfer.getData('text/plain'));
                      suppressClick.current = true;
                      void commitReorder(from, index);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: isDropTarget ? '1px dashed #0b3d2e' : '1px solid transparent',
                      background: selected ? '#0b3d2e' : '#f5f5f5',
                      color: selected ? '#fff' : 'inherit',
                      cursor: 'pointer',
                      opacity: dragIndex === index ? 0.55 : 1,
                    }}
                  >
                    <span
                      draggable={!reordering}
                      aria-label={`Reorder ${p.name}`}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        suppressClick.current = true;
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(index));
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDropIndex(null);
                        setTimeout(() => {
                          suppressClick.current = false;
                        }, 0);
                      }}
                      style={{ cursor: reordering ? 'wait' : 'grab', display: 'inline-flex' }}
                    >
                      <HolderOutlined />
                    </span>
                    <span style={{ flex: 1 }}>
                      {p.name} · ${(p.monthlyPriceCents / 100).toFixed(0)}/mo
                      {typeof p.managerSeats === 'number' ? ` · ${p.managerSeats} mgr` : ''}
                    </span>
                    {p.visibleOnPricing === false ? (
                      <Tag style={{ marginInlineEnd: 0 }}>Hidden</Tag>
                    ) : (
                      <Tag color="green" style={{ marginInlineEnd: 0 }}>
                        Pricing
                      </Tag>
                    )}
                  </div>
                );
              })}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card
            title={`Edit ${activePlan?.name ?? activeKey}`}
            loading={loading && !data}
            extra={
              <Space>
                {activePlan && (activePlan.isCustom || canDeleteBuiltin) ? (
                  <Button danger loading={deleting} onClick={onDelete}>
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="primary"
                  loading={saving}
                  disabled={!packageDirty.dirty}
                  onClick={onSave}
                >
                  Save package
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical" onValuesChange={packageDirty.onValuesChange}>
              <Form.Item
                name="name"
                label="Display name"
                tooltip={FIELD_TIPS.name}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Short description" tooltip={FIELD_TIPS.description}>
                <Form.Item name="description" noStyle>
                  <Input.TextArea rows={2} placeholder="Shown on the public pricing page" />
                </Form.Item>
                {isSuperAdminUser ? (
                  <Button
                    type="link"
                    icon={<BulbOutlined />}
                    loading={generatingDescription}
                    title={FIELD_TIPS.generateDescription}
                    onClick={() => onGenerateDescription('edit')}
                    style={{ paddingLeft: 0 }}
                  >
                    Generate description
                  </Button>
                ) : null}
              </Form.Item>
              {isSuperAdminUser ? <PackageHighlightsField /> : null}
              <Form.Item
                name="visibleOnPricing"
                label="Show on public pricing page"
                tooltip={FIELD_TIPS.visibleOnPricing}
                valuePropName="checked"
              >
                <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
              </Form.Item>
              <Row gutter={16}>
                {discountType !== 'first_month_free' &&
                discountType !== 'percent_off' &&
                discountType !== 'amount_off' ? (
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
                ) : null}
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
              {discountFields(
                discountType,
                percentPreviewCents,
                amountPreviewCents,
                monthlyPrice,
                annualFreeMonths,
              )}
              {trialFields(Boolean(trialEnabled), trialPeriod)}
              <Form.Item
                name="managerSeats"
                label="Manager seats"
                tooltip={FIELD_TIPS.managerSeats}
                rules={[{ required: true, message: 'At least 1 manager seat is required' }]}
              >
                <InputNumber min={1} max={100} step={1} style={{ width: 160 }} />
              </Form.Item>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                Features
              </Text>
              <Row gutter={[12, 12]}>
                {featureToggles.map((f) => (
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
        onCancel={() => {
          setCreateOpen(false);
          createDirty.clearDirty();
        }}
        onOk={onCreate}
        confirmLoading={creating}
        okText="Create package"
        okButtonProps={{ disabled: !createDirty.dirty }}
        destroyOnClose
        width={640}
      >
        <Form
          form={createForm}
          layout="vertical"
          onValuesChange={createDirty.onValuesChange}
          initialValues={{
            trialEnabled: true,
            trialPeriod: 30,
            customTrialDays: 7,
            visibleOnPricing: true,
            discountType: 'none',
            discountPercent: 50,
            discountAmount: 10,
            annualFreeMonths: 2,
            monthlyPrice: 0,
            listPrice: 0,
            networkCoverFee: 0,
            websiteCoverFee: 0,
            managerSeats: 1,
            highlights: [],
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
          <Form.Item label="Short description" tooltip={FIELD_TIPS.description}>
            <Form.Item name="description" noStyle>
              <Input.TextArea rows={2} />
            </Form.Item>
            {isSuperAdminUser ? (
              <Button
                type="link"
                icon={<BulbOutlined />}
                    loading={generatingDescription}
                    title={FIELD_TIPS.generateDescription}
                    onClick={() => onGenerateDescription('create')}
                style={{ paddingLeft: 0 }}
              >
                Generate description
              </Button>
            ) : null}
          </Form.Item>
          {isSuperAdminUser ? <PackageHighlightsField /> : null}
          <Form.Item
            name="visibleOnPricing"
            label="Show on public pricing page"
            tooltip={FIELD_TIPS.visibleOnPricing}
            valuePropName="checked"
          >
            <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
          </Form.Item>
          <Form.Item
            name="managerSeats"
            label="Manager seats"
            tooltip={FIELD_TIPS.managerSeats}
            rules={[{ required: true, message: 'At least 1 manager seat is required' }]}
          >
            <InputNumber min={1} max={100} step={1} style={{ width: 160 }} />
          </Form.Item>
          <Row gutter={16}>
            {createDiscountType !== 'first_month_free' &&
            createDiscountType !== 'percent_off' &&
            createDiscountType !== 'amount_off' ? (
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
            ) : null}
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
          {discountFields(
            createDiscountType,
            null,
            null,
            createMonthlyPrice,
            createAnnualFreeMonths,
          )}
          {trialFields(Boolean(createTrialEnabled), createTrialPeriod)}
        </Form>
      </Modal>
    </Space></div>
  );
}
