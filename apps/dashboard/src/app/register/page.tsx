'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useLazyQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Select,
  Steps,
  Tag,
  Typography,
  message,
  Spin,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import { CUISINES } from '@reservations/shared';
import { AddressAutocomplete, PhoneInput, PlanPrice, colors, formatPhoneDisplay, toE164Us, typography, usPhoneRules } from '@reservations/ui';
import { formatPlanDollars, getPlanDiscountLabel, getPlanPriceDisplay } from '@reservations/shared';
import { AuthLayout } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { getPublicWebUrl } from '@/lib/webUrl';
import { addressSelectionToFields } from '@/lib/address';
import { PARTNER_EMAIL_AVAILABLE, PARTNER_RESTAURANT_NAME_AVAILABLE, PLANS, REGISTER_RESTAURANT_PARTNER } from '@/lib/graphql';
import { SignupPaymentForm, type SignupPaymentMode } from '@/components/SignupPaymentForm';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';

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


type PendingSignup = {
  user: {
    id: string;
    email?: string | null;
    firstName: string;
    lastName: string;
    role: string;
    restaurantIds: string[];
  };
  restaurant: { id: string; name: string };
  clientSecret: string;
  paymentMode: SignupPaymentMode;
};

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, setSession } = useAuth();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(() => searchParams.get('plan') || 'core');
  const [form] = Form.useForm();
  const [registerPartner, { loading }] = useMutation(REGISTER_RESTAURANT_PARTNER);
  const [checkEmailAvailable] = useLazyQuery(PARTNER_EMAIL_AVAILABLE, { fetchPolicy: 'network-only' });
  const [checkRestaurantNameAvailable] = useLazyQuery(PARTNER_RESTAURANT_NAME_AVAILABLE, {
    fetchPolicy: 'network-only',
  });
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [addressDetailsOpen, setAddressDetailsOpen] = useState(false);
  const { data: plansData } = useQuery(PLANS);

  const planOptions = useMemo((): PlanOption[] => {
    const fromApi = ((plansData as any)?.plans ?? []) as Array<{
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
    }>;
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
    () => planOptions.find((p) => p.key === plan) ?? planOptions[0] ?? FALLBACK_PLAN_OPTIONS[1],
    [plan, planOptions],
  );

  const isFreePlan = planInfo.pricing.monthlyPriceCents <= 0;

  const chargingStartsOn = useMemo(() => {
    if (isFreePlan || planInfo.trialDays <= 0) return null;
    return dayjs().add(planInfo.trialDays, 'day').format('MMM D, YYYY');
  }, [isFreePlan, planInfo.trialDays]);

  useEffect(() => {
    const requested = searchParams.get('plan');
    if (!requested || !planOptions.length) return;
    if (planOptions.some((p) => p.key === requested)) {
      setPlan(requested);
      form.setFieldValue('plan', requested);
    }
  }, [searchParams, planOptions, form]);

  useEffect(() => {
    if (!authLoading && user && !pendingSignup) router.replace('/');
  }, [authLoading, user, router, pendingSignup]);

  if (authLoading || (user && !pendingSignup)) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  const goNext = async () => {
    try {
      if (step === 0) {
        await form.validateFields(['plan']);
      } else if (step === 1) {
        setCheckingEmail(true);
        try {
          await form.validateFields([
            'firstName',
            'lastName',
            'email',
            'ownerPhone',
            'password',
            'confirmPassword',
          ]);
        } finally {
          setCheckingEmail(false);
        }
      } else if (step === 2) {
        if (!addressDetailsOpen) {
          message.warning('Search and select an address to continue.');
          return;
        }
        setCheckingName(true);
        try {
          await form.validateFields([
            'name',
            'cuisine',
            'description',
            'phone',
            'website',
            'line1',
            'city',
            'state',
            'zip',
            'priceRange',
            'lat',
            'lng',
          ]);
        } finally {
          setCheckingName(false);
        }
      }
      setStep((s) => Math.min(s + 1, 4));
    } catch {
      /* validation errors shown by Form */
    }
  };

  const submit = async () => {
    try {
      // Fields from earlier steps are unmounted on Confirm — validate by name +
      // read preserved values (Form preserve defaults to true).
      await form.validateFields([
        'plan',
        'firstName',
        'lastName',
        'email',
        'ownerPhone',
        'password',
        'confirmPassword',
        'name',
        'cuisine',
        'description',
        'phone',
        'website',
        'line1',
        'city',
        'state',
        'zip',
        'priceRange',
        'lat',
        'lng',
      ]);
      const values = form.getFieldsValue(true);
      const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
      const websiteRaw = str(values.website);
      const website = websiteRaw || undefined;

      const { data } = await registerPartner({
        variables: {
          input: {
            plan,
            account: {
              firstName: str(values.firstName),
              lastName: str(values.lastName),
              email: str(values.email),
              phone: toE164Us(str(values.ownerPhone)),
              password: values.password,
            },
            restaurant: {
              name: str(values.name),
              description: str(values.description),
              cuisine: values.cuisine,
              priceRange: values.priceRange,
              phone: toE164Us(str(values.phone)),
              website,
              address: {
                line1: str(values.line1),
                city: str(values.city),
                state: str(values.state).toUpperCase(),
                zip: str(values.zip),
                country: 'US',
              },
              location: { lat: values.lat, lng: values.lng },
              depositRequired: false,
              depositAmountCents: 0,
            },
          },
        },
      });

      const payload = data.registerRestaurantPartner;
      localStorage.setItem('activeRestaurantId', payload.restaurant.id);

      const mode = payload.paymentMode === 'setup' ? 'setup' : 'payment';
      const needsPayment = Boolean(payload.clientSecret) && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (needsPayment && payload.clientSecret) {
        setPendingSignup({
          user: payload.user,
          restaurant: payload.restaurant,
          clientSecret: payload.clientSecret,
          paymentMode: mode,
        });
        setStep(4);
        return;
      }

      finishToDashboard(payload.user, payload.restaurant.name);
    } catch (err) {
      const errorFields =
        err && typeof err === 'object' && 'errorFields' in err
          ? (err as { errorFields?: { name: (string | number)[] }[] }).errorFields
          : undefined;
      if (errorFields?.length) {
        const names = new Set(errorFields.flatMap((f) => f.name.map(String)));
        if (
          ['firstName', 'lastName', 'email', 'ownerPhone', 'password', 'confirmPassword'].some(
            (n) => names.has(n),
          )
        ) {
          setStep(1);
        } else if (
          [
            'name',
            'cuisine',
            'description',
            'phone',
            'website',
            'line1',
            'city',
            'state',
            'zip',
            'priceRange',
            'lat',
            'lng',
          ].some((n) => names.has(n))
        ) {
          setStep(2);
        }
        return;
      }
      const msg = err instanceof Error ? err.message : '';
      if (/already exists|duplicate key|slug/i.test(msg)) {
        form.setFields([
          {
            name: 'name',
            errors: ['A restaurant with this name already exists. Choose a different name.'],
          },
        ]);
        setStep(2);
        return;
      }
      message.error(msg || 'Registration failed. Please try again.');
    }
  };

  const finishToDashboard = (
    nextUser: PendingSignup['user'],
    restaurantName: string,
  ) => {
    setSession(nextUser);
    message.success(
      `${restaurantName} submitted — ${planInfo.name}${planInfo.trialDays > 0 ? ' trial started' : ' selected'}`,
    );
    router.push('/');
  };

  return (
    <div component="RegisterForm" style={{ display: 'contents' }}><AuthLayout       heading="Register your restaurant"
      subheading="Pick a plan, create your owner account, and tell us about your venue."
      maxWidth={560}
    >
      <Steps
        size="small"
        current={step}
        responsive={false}
        labelPlacement="vertical"
        className="register-steps"
        style={{ marginBottom: 28 }}
        items={
          isFreePlan
            ? [
                { title: 'Plan' },
                { title: 'Account' },
                { title: 'Business' },
                { title: 'Confirm' },
              ]
            : [
                { title: 'Plan' },
                { title: 'Account' },
                { title: 'Business' },
                { title: 'Confirm' },
                { title: 'Payment' },
              ]
        }
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        preserve
        initialValues={{
          plan,
          priceRange: 2,
          lat: 40.7128,
          lng: -74.006,
        }}
      >
        <div style={{ display: step === 0 ? 'block' : 'none' }}>
          <Form.Item
            name="plan"
            label="Subscription plan"
            rules={[{ required: true, message: 'Select a plan' }]}
          >
            <Select
              size="large"
              value={plan}
              onChange={(v: string) => {
                setPlan(v);
                form.setFieldValue('plan', v);
              }}
              options={planOptions.map((p) => ({
                value: p.key,
                label: `${p.name} — ${p.monthly}/mo`,
              }))}
            />
          </Form.Item>
          <div
            style={{
              padding: '14px 16px',
              background: colors.neutral[50],
              borderRadius: 8,
              border: `1px solid ${colors.bordersubtle}`,
              marginBottom: 8,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {planInfo.name}
            </Text>
            <PlanPrice plan={planInfo.pricing} size="medium" />
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm, display: 'block', marginTop: 8 }}>
              {planInfo.blurb}
            </Text>
            <div style={{ marginTop: 8 }}>
              {planInfo.discountLabel ? (
                <Tag color="gold" style={{ marginInlineEnd: 8 }}>
                  {planInfo.discountLabel}
                </Tag>
              ) : null}
              {isFreePlan ? (
                <Tag color="green">Free plan</Tag>
              ) : planInfo.trialDays > 0 ? (
                <Tag color="green">Free {planInfo.trialDays}-day trial</Tag>
              ) : (
                <Tag>No free trial</Tag>
              )}
            </div>
            {chargingStartsOn ? (
              <Text type="secondary" style={{ fontSize: typography.fontSize.sm, display: 'block', marginTop: 10 }}>
                You will not be charged until {chargingStartsOn}.
              </Text>
            ) : null}
          </div>
          <Text type="secondary" style={{ fontSize: typography.fontSize.xs }}>
            Prefer a different tier?{' '}
            <a href={`${getPublicWebUrl()}/pricing`}>
              Compare plans
            </a>
          </Text>
        </div>

        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input size="large" autoComplete="given-name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastName"
                label="Last name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input size="large" autoComplete="family-name" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="email"
                label="Work email"
                validateTrigger="onBlur"
                rules={[
                  { required: true, message: 'Required' },
                  { type: 'email', message: 'Enter a valid email' },
                  {
                    validator: async (_, value) => {
                      const email = typeof value === 'string' ? value.trim() : '';
                      if (!email || !email.includes('@')) return Promise.resolve();
                      try {
                        const { data } = await checkEmailAvailable({ variables: { email } });
                        if (!data?.partnerEmailAvailable) {
                          return Promise.reject(
                            new Error(
                              'This email is already registered. Sign in or use a different email.',
                            ),
                          );
                        }
                        return Promise.resolve();
                      } catch {
                        return Promise.reject(
                          new Error('Could not verify this email. Please try again.'),
                        );
                      }
                    },
                  },
                ]}
              >
                <Input size="large" autoComplete="email" placeholder="you@restaurant.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="ownerPhone"
                label="Your phone"
                rules={usPhoneRules({ required: true })}
              >
                <PhoneInput size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Required' },
                  { min: 8, message: 'At least 8 characters' },
                  { pattern: /[a-z]/, message: 'Include a lowercase letter' },
                  { pattern: /[A-Z]/, message: 'Include an uppercase letter' },
                  { pattern: /\d/, message: 'Include a number' },
                ]}
              >
                <Input.Password size="large" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="confirmPassword"
                label="Confirm password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password size="large" autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Restaurant name"
                tooltip={tips.name}
                validateTrigger="onBlur"
                rules={[
                  { required: true, message: 'Required' },
                  { max: 120, message: 'Max 120 characters' },
                  {
                    validator: async (_, value) => {
                      const name = typeof value === 'string' ? value.trim() : '';
                      if (!name) return Promise.resolve();
                      try {
                        const { data } = await checkRestaurantNameAvailable({ variables: { name } });
                        if (!data?.partnerRestaurantNameAvailable) {
                          return Promise.reject(
                            new Error('A restaurant with this name already exists. Choose a different name.'),
                          );
                        }
                        return Promise.resolve();
                      } catch {
                        return Promise.reject(
                          new Error('Could not verify this restaurant name. Please try again.'),
                        );
                      }
                    },
                  },
                ]}
              >
                <Input size="large" maxLength={120} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="cuisine"
                label="Cuisine"
                tooltip={tips.cuisine}
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select
                  size="large"
                  showSearch
                  options={CUISINES.map((c) => ({ value: c, label: c }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="priceRange"
                label="Price range"
                tooltip={tips.priceRange}
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select size="large" options={priceRangeOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="description"
                label="About your restaurant"
                tooltip={tips.description}
                rules={[
                  { required: true, message: 'Tell guests about your venue' },
                  { max: 2000, message: 'Max 2000 characters' },
                ]}
              >
                <Input.TextArea rows={3} maxLength={2000} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Restaurant phone"
                tooltip={tips.phone}
                rules={usPhoneRules({ required: true })}
              >
                <PhoneInput size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="website"
                label="Website"
                tooltip={tips.website}
                rules={[
                  {
                    validator(_, value) {
                      if (!value || !String(value).trim()) return Promise.resolve();
                      try {
                        new URL(String(value).trim());
                        return Promise.resolve();
                      } catch {
                        return Promise.reject(
                          new Error('Enter a full URL including https://'),
                        );
                      }
                    },
                  },
                ]}
              >
                <Input size="large" placeholder="https://yourrestaurant.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Address search"
                tooltip="Search Google Places to fill street, city, state, ZIP, and map coordinates."
                style={{ marginBottom: addressDetailsOpen ? 16 : 24 }}
              >
                <AddressAutocomplete
                  placeholder="Start typing an address"
                  style={{ width: '100%' }}
                  inputProps={{ size: 'large', style: { width: '100%' } }}
                  onSelect={(selection) => {
                    form.setFieldsValue(addressSelectionToFields(selection));
                    setAddressDetailsOpen(true);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={24} style={{ display: addressDetailsOpen ? undefined : 'none' }}>
              <Form.Item
                name="line1"
                label="Street address"
                tooltip={tips.line1}
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input size="large" autoComplete="street-address" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10} style={{ display: addressDetailsOpen ? undefined : 'none' }}>
              <Form.Item
                name="city"
                label="City"
                tooltip={tips.city}
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input size="large" autoComplete="address-level2" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={7} style={{ display: addressDetailsOpen ? undefined : 'none' }}>
              <Form.Item
                name="state"
                label="State"
                tooltip={tips.state}
                rules={[
                  { required: true, message: 'Required' },
                  { len: 2, message: '2-letter code' },
                ]}
              >
                <Input
                  size="large"
                  maxLength={2}
                  autoComplete="address-level1"
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={7} style={{ display: addressDetailsOpen ? undefined : 'none' }}>
              <Form.Item
                name="zip"
                label="ZIP"
                tooltip={tips.zip}
                rules={[
                  { required: true, message: 'Required' },
                  { min: 5, max: 10, message: '5–10 characters' },
                ]}
              >
                <Input size="large" maxLength={10} autoComplete="postal-code" />
              </Form.Item>
            </Col>
            <Form.Item name="lat" hidden rules={[{ required: true }]}>
              <InputNumber />
            </Form.Item>
            <Form.Item name="lng" hidden rules={[{ required: true }]}>
              <InputNumber />
            </Form.Item>
          </Row>
        </div>

        <div style={{ display: step === 3 ? 'block' : 'none' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <ConfirmRow
              label="Plan"
              value={
                isFreePlan
                  ? `${planInfo.name} (Free)`
                  : `${planInfo.name} (${planInfo.monthly}/mo)`
              }
            />
            {chargingStartsOn ? (
              <ConfirmRow label="Charging starts" value={chargingStartsOn} />
            ) : null}
            <ConfirmRow
              label="Owner"
              value={`${form.getFieldValue('firstName') ?? ''} ${form.getFieldValue('lastName') ?? ''}`.trim()}
            />
            <ConfirmRow label="Email" value={form.getFieldValue('email')} />
            <ConfirmRow label="Restaurant" value={form.getFieldValue('name')} />
            <ConfirmRow
              label="Location"
              value={[
                form.getFieldValue('line1'),
                form.getFieldValue('city'),
                `${form.getFieldValue('state') ?? ''} ${form.getFieldValue('zip') ?? ''}`.trim(),
              ]
                .filter(Boolean)
                .join(', ')}
            />
            <ConfirmRow label="Cuisine" value={form.getFieldValue('cuisine')} />
            <ConfirmRow label="Phone" value={formatPhoneDisplay(form.getFieldValue('phone'))} />
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm, marginTop: 4 }}>
              Your listing will be pending approval.
              {isFreePlan
                ? ` No payment is required for the ${planInfo.name} plan.`
                : planInfo.trialDays > 0 && chargingStartsOn
                  ? ` Add a payment method to start your ${planInfo.trialDays}-day ${planInfo.name} trial. Charging starts ${chargingStartsOn}.`
                  : ` Enter payment details to start your ${planInfo.name} subscription.`}
            </Text>
          </div>
        </div>

        <div style={{ display: step === 4 ? 'block' : 'none' }}>
          {pendingSignup ? (
            <SignupPaymentForm
              clientSecret={pendingSignup.clientSecret}
              paymentMode={pendingSignup.paymentMode}
              planName={planInfo.name}
              monthlyLabel={planInfo.monthly}
              trialDays={planInfo.trialDays}
              chargingStartsOn={chargingStartsOn}
              onSuccess={() =>
                finishToDashboard(pendingSignup.user, pendingSignup.restaurant.name)
              }
            />
          ) : (
            <Alert
              type="info"
              message="Continue from the confirm step to enter payment details."
              showIcon
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {step > 0 && step < 4 && (
            <Button size="large" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="primary"
              size="large"
              onClick={goNext}
              loading={checkingEmail || checkingName}
              style={{ flex: 1, background: colors.brand[600] }}
            >
              Continue
            </Button>
          ) : step === 3 ? (
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={submit}
              style={{ flex: 1, background: colors.brand[600] }}
            >
              {isFreePlan ? 'Create account' : 'Continue to payment'}
            </Button>
          ) : null}
        </div>
      </Form>

      <p
        style={{
          marginTop: 20,
          marginBottom: 0,
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
        }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: colors.brand[600], fontWeight: typography.fontWeight.semibold }}
        >
          Sign in
        </Link>
      </p>
    </AuthLayout></div>
  );
}

function ConfirmRow({ label, value }: { label: string; value?: string }) {
  return (
    <div component="ConfirmRow"
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

export default function RegisterPage() {
  return (
    <div component="RegisterPage" style={{ display: 'contents' }}><Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense></div>
  );
}
