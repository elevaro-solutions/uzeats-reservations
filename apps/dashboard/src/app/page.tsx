'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { CUISINES, RESTAURANT_STATUSES, formatPlanDollars, getPlanDiscountLabel, getPlanPriceDisplay } from '@reservations/shared';
import {
  AddressAutocomplete,
  EmptyState,
  PageHeader,
  PlanPrice,
  StatusTag,
  colors,
  radii,
  spacing,
  typography,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, MY_RESTAURANT_LOCATIONS_META, CREATE_RESTAURANT, PLANS } from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import {
  MANY_LOCATIONS_THRESHOLD,
  type OwnerRestaurant,
} from '@/lib/restaurants';

const { Text } = Typography;

type PlanOption = {
  key: string;
  name: string;
  monthly: string;
  blurb: string;
  trialDays: number;
  discountLabel: string | null;
  pricing: {
    monthlyPriceCents: number;
    originalMonthlyPriceCents?: number | null;
    discountType?: string | null;
    discountPercent?: number | null;
    annualFreeMonths?: number | null;
  };
};

const FALLBACK_PLAN_OPTIONS: PlanOption[] = [
  {
    key: 'basic',
    name: 'Basic',
    monthly: '$49',
    blurb: 'Essential reservation management to get started.',
    trialDays: 30,
    discountLabel: null,
    pricing: { monthlyPriceCents: 4900 },
  },
  {
    key: 'core',
    name: 'Core',
    monthly: '$99',
    blurb: 'Table management, waitlist, and free website covers.',
    trialDays: 30,
    discountLabel: null,
    pricing: { monthlyPriceCents: 9900 },
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: '$199',
    blurb: 'Full suite with guest insights, campaigns, and SMS.',
    trialDays: 30,
    discountLabel: null,
    pricing: { monthlyPriceCents: 19900 },
  },
];

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [createRestaurant, { loading: creating }] = useMutation(CREATE_RESTAURANT);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('core');
  const [createForm] = Form.useForm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [cityFilter, setCityFilter] = useState<string>();
  const { data: metaData, refetch: refetchMeta } = useQuery(MY_RESTAURANT_LOCATIONS_META, {
    skip: !user,
  });
  const { data, refetch } = useQuery(MY_RESTAURANTS, {
    skip: !user,
    variables: {
      search: search || undefined,
      status: statusFilter,
      city: cityFilter,
    },
  });
  const { data: plansData } = useQuery(PLANS, { skip: !user });

  const closeCreateForm = () => {
    setShowCreate(false);
    setCreateStep(0);
    setSelectedPlan('core');
    createForm.resetFields();
  };

  const submitCreateRestaurant = async () => {
    try {
      await createForm.validateFields([
        'plan',
        'name',
        'cuisine',
        'description',
        'line1',
        'city',
        'state',
        'zip',
        'priceRange',
        'lat',
        'lng',
        'depositRequired',
        'depositAmountCents',
      ]);
      const values = createForm.getFieldsValue(true);
      const { data } = await createRestaurant({
        variables: {
          plan: values.plan,
          input: {
            name: values.name,
            description: values.description,
            cuisine: values.cuisine,
            priceRange: values.priceRange,
            address: {
              line1: values.line1,
              city: values.city,
              state: values.state,
              zip: values.zip,
              country: 'US',
            },
            location: { lng: values.lng, lat: values.lat },
            depositRequired: values.depositRequired ?? false,
            depositAmountCents: values.depositAmountCents ?? 0,
          },
        },
      });
      const created = data?.createRestaurant;
      const confirmedPlan =
        planOptions.find((p) => p.key === values.plan) ?? planInfo;
      localStorage.setItem('activeRestaurantId', created.id);
      window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: created.id }));
      message.success(
        confirmedPlan.trialDays > 0
          ? `${created.name} submitted — ${confirmedPlan.name} trial started`
          : `${created.name} submitted — ${confirmedPlan.name} plan active`,
      );
      closeCreateForm();
      await Promise.all([refetch(), refetchMeta()]);
      router.push('/onboarding');
    } catch (err) {
      const errorFields =
        err && typeof err === 'object' && 'errorFields' in err
          ? (err as { errorFields?: { name: (string | number)[] }[] }).errorFields
          : undefined;
      if (errorFields?.length) {
        const names = new Set(errorFields.flatMap((f) => f.name.map(String)));
        if (names.has('plan')) setCreateStep(0);
        else setCreateStep(1);
        return;
      }
      message.error(err instanceof Error ? err.message : 'Failed to add restaurant');
    }
  };

  const goCreateNext = async () => {
    try {
      if (createStep === 0) {
        await createForm.validateFields(['plan']);
      } else if (createStep === 1) {
        await createForm.validateFields([
          'name',
          'cuisine',
          'description',
          'line1',
          'city',
          'state',
          'zip',
          'priceRange',
          'lat',
          'lng',
          'depositRequired',
          'depositAmountCents',
        ]);
      }
      setCreateStep((step) => Math.min(step + 1, 2));
    } catch {
      /* validation errors shown by Form */
    }
  };

  const planOptions = useMemo((): PlanOption[] => {
    const fromApi = ((plansData as { plans?: Array<{
      key: string;
      name: string;
      description?: string | null;
      monthlyPriceCents: number;
      originalMonthlyPriceCents?: number | null;
      discountType?: string | null;
      discountPercent?: number | null;
      discountAmountCents?: number | null;
      annualFreeMonths?: number | null;
      trialDays: number;
      visibleOnPricing?: boolean;
    }> })?.plans ?? []);
    if (!fromApi.length) return FALLBACK_PLAN_OPTIONS;
    const visible = fromApi.filter((p) => p.visibleOnPricing !== false);
    const list = visible.length ? visible : fromApi;
    return list.map((p) => {
      const pricing = {
        monthlyPriceCents: p.monthlyPriceCents,
        originalMonthlyPriceCents: p.originalMonthlyPriceCents,
        discountType: p.discountType,
        discountPercent: p.discountPercent,
        discountAmountCents: p.discountAmountCents,
        annualFreeMonths: p.annualFreeMonths,
      };
      const display = getPlanPriceDisplay(pricing);
      return {
        key: p.key,
        name: p.name,
        monthly: formatPlanDollars(display.primaryCents),
        blurb: p.description?.trim() || `${p.name} package`,
        trialDays: p.trialDays ?? 0,
        discountLabel: getPlanDiscountLabel(pricing),
        pricing,
      };
    });
  }, [plansData]);

  const planInfo = useMemo(
    () => planOptions.find((p) => p.key === selectedPlan) ?? planOptions[0] ?? FALLBACK_PLAN_OPTIONS[1],
    [selectedPlan, planOptions],
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user?.role === 'admin') router.replace('/admin');
  }, [authLoading, user, router]);

  const restaurants: OwnerRestaurant[] = data?.myRestaurants ?? [];
  const totalLocations = metaData?.myRestaurantLocationsMeta?.total ?? restaurants.length;
  const showLocationFilters = totalLocations >= MANY_LOCATIONS_THRESHOLD;

  const cityOptions = useMemo(
    () =>
      (metaData?.myRestaurantLocationsMeta?.cities ?? []).map((city: string) => ({
        value: city,
        label: city,
      })),
    [metaData],
  );

  const statusOptions = useMemo(
    () =>
      RESTAURANT_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    [],
  );

  const hasActiveFilters = Boolean(search || statusFilter || cityFilter);

  return (
    <div component="OverviewPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Overview"
        subtitle="Your venues at a glance — jump into service or add a new listing"
        extra={
          <Button
            type="primary"
            size="large"
            onClick={() => {
              if (showCreate) closeCreateForm();
              else setShowCreate(true);
            }}
          >
            {showCreate ? 'Cancel' : 'Add restaurant'}
          </Button>
        }
      />

      {showCreate && (
        <Card
          className="rt-surface-card"
          styles={{ body: { padding: spacing.lg } }}
          style={{ borderRadius: radii.lg }}
        >
          <h3 className="rt-form-section-title">New restaurant listing</h3>
          <p className="rt-form-section-desc">
            Choose a plan for this location, then submit for approval. You can refine photos, menu,
            and booking rules in Settings after.
          </p>

          <Steps
            size="small"
            current={createStep}
            style={{ marginBottom: spacing.lg }}
            items={[{ title: 'Plan' }, { title: 'Details' }, { title: 'Confirm' }]}
          />

          <Form
            form={createForm}
            layout="vertical"
            requiredMark="optional"
            preserve
            initialValues={{ plan: 'core', priceRange: 2, lat: 40.7128, lng: -74.006, depositAmountCents: 0 }}
          >
            <div style={{ display: createStep === 0 ? 'block' : 'none' }}>
              <h3 className="rt-form-section-title">Subscription plan</h3>
              <p className="rt-form-section-desc">
                Each location has its own subscription. Billing starts after your free trial.
              </p>
              <Row gutter={[24, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="plan"
                    label="Plan"
                    rules={[{ required: true, message: 'Select a plan' }]}
                  >
                    <Select
                      value={selectedPlan}
                      onChange={(value: string) => {
                        setSelectedPlan(value);
                        createForm.setFieldValue('plan', value);
                      }}
                      options={planOptions.map((p) => ({
                        value: p.key,
                        label: `${p.name} — ${p.monthly}/mo`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <div
                    style={{
                      padding: '14px 16px',
                      background: colors.neutral[50],
                      borderRadius: radii.md,
                      border: `1px solid ${colors.bordersubtle}`,
                      height: '100%',
                    }}
                  >
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>
                      {planInfo.name}
                    </Text>
                    <PlanPrice plan={planInfo.pricing} size="medium" />
                    <Text
                      type="secondary"
                      style={{ fontSize: typography.fontSize.sm, display: 'block', marginTop: 8 }}
                    >
                      {planInfo.blurb}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      {planInfo.discountLabel ? (
                        <Tag color="gold" style={{ marginInlineEnd: 8 }}>
                          {planInfo.discountLabel}
                        </Tag>
                      ) : null}
                      {planInfo.trialDays > 0 ? (
                        <Tag color="green">Free {planInfo.trialDays}-day trial</Tag>
                      ) : (
                        <Tag>Billed immediately</Tag>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ display: createStep === 1 ? 'block' : 'none' }}>
            <Row gutter={[24, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Name"
                  tooltip={tips.name}
                  rules={[
                    { required: true, message: 'Name is required' },
                    { max: 120, message: 'Max 120 characters' },
                  ]}
                >
                  <Input maxLength={120} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="cuisine"
                  label="Cuisine"
                  tooltip={tips.cuisine}
                  rules={[{ required: true, message: 'Cuisine is required' }]}
                >
                  <Select options={CUISINES.map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description"
                  tooltip={tips.description}
                  rules={[{ max: 2000, message: 'Max 2000 characters' }]}
                >
                  <Input.TextArea rows={3} maxLength={2000} showCount />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
            <h3 className="rt-form-section-title">Location</h3>
            <p className="rt-form-section-desc">Where diners will find you.</p>

            <Row gutter={[24, 8]}>
              <Col xs={24} md={10}>
                <Form.Item
                  name="line1"
                  label="Street address"
                  tooltip={tips.line1}
                  rules={[{ required: true, message: 'Address is required' }]}
                >
                  <AddressAutocomplete
                    placeholder="Start typing an address"
                    inputProps={{ size: 'middle' }}
                    onSelect={(selection) =>
                      createForm.setFieldsValue(addressSelectionToFields(selection))
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="city"
                  label="City"
                  tooltip={tips.city}
                  rules={[{ required: true, message: 'City is required' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item
                  name="state"
                  label="State"
                  tooltip={tips.state}
                  rules={[
                    { required: true, message: 'State is required' },
                    { len: 2, message: 'Use 2-letter state code' },
                  ]}
                >
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item
                  name="zip"
                  label="ZIP"
                  tooltip={tips.zip}
                  rules={[
                    { required: true, message: 'ZIP is required' },
                    { min: 5, max: 10, message: 'ZIP must be 5–10 characters' },
                  ]}
                >
                  <Input maxLength={10} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="priceRange"
                  label="Price range"
                  tooltip={tips.priceRange}
                  initialValue={2}
                  rules={[{ required: true, message: 'Price range is required' }]}
                >
                  <Select options={priceRangeOptions} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="lat"
                  label="Latitude"
                  tooltip={tips.lat}
                  initialValue={40.7128}
                  rules={[
                    { required: true, message: 'Latitude is required' },
                    {
                      type: 'number',
                      min: -90,
                      max: 90,
                      message: 'Latitude must be between -90 and 90',
                    },
                  ]}
                >
                  <InputNumber min={-90} max={90} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="lng"
                  label="Longitude"
                  tooltip={tips.lng}
                  initialValue={-74.006}
                  rules={[
                    { required: true, message: 'Longitude is required' },
                    {
                      type: 'number',
                      min: -180,
                      max: 180,
                      message: 'Longitude must be between -180 and 180',
                    },
                  ]}
                >
                  <InputNumber min={-180} max={180} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
            <h3 className="rt-form-section-title">Deposits</h3>
            <p className="rt-form-section-desc">Optional hold when guests book.</p>

            <Row gutter={[24, 8]}>
              <Col xs={12} md={8}>
                <Form.Item
                  name="depositRequired"
                  label="Require deposit"
                  tooltip={tips.depositRequired}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="depositAmountCents"
                  label="Deposit (cents / guest)"
                  tooltip={tips.depositAmountCents}
                  initialValue={0}
                  rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            </div>

            <div style={{ display: createStep === 2 ? 'block' : 'none' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: spacing.sm,
                }}
              >
                <ConfirmRow
                  label="Plan"
                  value={`${planInfo.name} (${planInfo.monthly}/mo)`}
                />
                <ConfirmRow label="Restaurant" value={createForm.getFieldValue('name')} />
                <ConfirmRow label="Cuisine" value={createForm.getFieldValue('cuisine')} />
                <ConfirmRow
                  label="Location"
                  value={[
                    createForm.getFieldValue('line1'),
                    createForm.getFieldValue('city'),
                    `${createForm.getFieldValue('state') ?? ''} ${createForm.getFieldValue('zip') ?? ''}`.trim(),
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
                <ConfirmRow
                  label="Price range"
                  value={
                    priceRangeOptions.find(
                      (option) => option.value === createForm.getFieldValue('priceRange'),
                    )?.label
                  }
                />
                <ConfirmRow
                  label="Deposit"
                  value={
                    createForm.getFieldValue('depositRequired')
                      ? `$${((createForm.getFieldValue('depositAmountCents') ?? 0) / 100).toFixed(2)} per guest`
                      : 'Not required'
                  }
                />
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm, marginTop: 4 }}>
                  Your listing will be pending approval.
                  {planInfo.trialDays > 0
                    ? ` Your ${planInfo.trialDays}-day ${planInfo.name} trial starts immediately.`
                    : ` Your ${planInfo.name} subscription starts immediately.`}
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: spacing.lg }}>
              {createStep > 0 && (
                <Button size="large" onClick={() => setCreateStep((step) => step - 1)} style={{ flex: 1 }}>
                  Back
                </Button>
              )}
              {createStep < 2 ? (
                <Button type="primary" size="large" onClick={goCreateNext} style={{ flex: 1 }}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  loading={creating}
                  onClick={submitCreateRestaurant}
                  style={{ flex: 1 }}
                >
                  {planInfo.trialDays > 0
                    ? `Start ${planInfo.trialDays}-day trial & submit`
                    : 'Subscribe & submit for approval'}
                </Button>
              )}
            </div>
          </Form>
        </Card>
      )}

      {totalLocations === 0 && !showCreate ? (
        <EmptyState
          title="No restaurants yet"
          description="Add your first venue to start taking reservations."
          action={
            <Button type="primary" onClick={() => setShowCreate(true)}>
              Add restaurant
            </Button>
          }
        />
      ) : (
        <>
          {showLocationFilters && (
            <Space wrap style={{ width: '100%' }}>
              <Input.Search
                placeholder="Search name, cuisine, or city"
                allowClear
                style={{ width: 280 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                placeholder="Status"
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
              {cityOptions.length > 1 && (
                <Select
                  placeholder="City"
                  allowClear
                  style={{ width: 180 }}
                  value={cityFilter}
                  onChange={setCityFilter}
                  options={cityOptions}
                />
              )}
              <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                {restaurants.length} of {totalLocations} locations
              </Text>
            </Space>
          )}

          {restaurants.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'No matching locations' : 'No restaurants yet'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first venue to start taking reservations.'
              }
              action={
                hasActiveFilters ? undefined : (
                  <Button type="primary" onClick={() => setShowCreate(true)}>
                    Add restaurant
                  </Button>
                )
              }
            />
          ) : (
        <Row gutter={[16, 16]}>
          {restaurants.map((r) => (
            <Col key={r.id} xs={24} md={12} lg={8}>
              <Card
                title={r.name}
                extra={<StatusTag status={r.status} />}
                style={{ borderRadius: radii.lg, height: '100%' }}
                styles={{ body: { paddingTop: spacing.sm } }}
                actions={[
                  <Button
                    key="res"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/reservations');
                    }}
                  >
                    Reservations
                  </Button>,
                  <Button
                    key="floor"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/floor-plan');
                    }}
                  >
                    Floor
                  </Button>,
                  <Button
                    key="settings"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/settings');
                    }}
                  >
                    Settings
                  </Button>,
                ]}
              >
                <Text type="secondary">
                  {r.cuisine} · {r.address.city}, {r.address.state}
                </Text>
                <Row gutter={12} style={{ marginTop: spacing.md }}>
                  <Col span={12}>
                    <Statistic title="Tables" value={r.tables?.length ?? 0} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Shifts" value={r.shifts?.length ?? 0} />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
          )}
        </>
      )}
    </Space></div>
  );
}

function ConfirmRow({ label, value }: { label: string; value?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        paddingBottom: 10,
        borderBottom: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Text type="secondary">{label}</Text>
      <Text strong style={{ textAlign: 'right' }}>
        {value || '—'}
      </Text>
    </div>
  );
}
