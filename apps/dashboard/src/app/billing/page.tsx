'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CrownOutlined,
  DollarOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  PhoneOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPlanDiscountLabel } from '@reservations/shared';
import {
  EmptyState,
  PageHeader,
  PlanPrice,
  StatCard,
  colors,
  radii,
  spacing,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageBilling } from '@/lib/roles';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
  PLANS,
  COVER_FEE_SUMMARY,
  RESTAURANT_INVOICES,
  CREATE_SUBSCRIPTION,
  CANCEL_SUBSCRIPTION,
  CHANGE_PLAN,
  PREVIEW_PLAN_CHANGE,
  CANCEL_PENDING_PLAN_CHANGE,
  SET_PREMIUM_SMS_ADDON,
  PLAN_CHANGE_PAYMENT,
  CONFIRM_PLAN_CHANGE_PAYMENT,
} from '@/lib/graphql';
import { SignupPaymentForm, type SignupPaymentMode } from '@/components/SignupPaymentForm';

const { Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  trialing: 'blue',
  active: 'green',
  past_due: 'orange',
  cancelled: 'red',
  paused: 'default',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

const FEATURE_LABELS: Record<string, string> = {
  floorPlans: 'Customizable floor plans',
  smartAssign: 'Smart Assign',
  waitlist: 'Waitlist',
  premiumSms: 'Premium SMS messaging',
  premiumSmsAddon: 'Premium SMS add-on',
  guestProfiles360: '360 guest profiles',
  emailCampaigns: 'Automated email campaigns',
  customWidget: 'Customizable booking widget',
  analytics: 'Advanced analytics',
  dedicatedSupport: 'Dedicated account manager',
  accessRules: 'Access Rules',
  posIntegration: 'POS integration',
  twoWayMessaging: 'Two-way messaging',
  spendAlerts: 'Guest spend alerts',
  ticketedEvents: 'Ticketed events & experiences',
  preShift: 'Pre-shift reports',
  autoTags: 'Automated guest tags',
  surveys: 'Custom post-dining surveys',
  revenueForecasting: 'Revenue forecasting',
  customReports: 'Custom report builder',
  multiLocationAnalytics: 'Multi-location analytics',
  promotions: 'Promotion & offer management',
  featuredPlacement: 'Featured placement',
  boostCampaigns: 'Boost campaigns',
};

const PLAN_BLURBS: Record<string, string> = {
  basic: 'Essential reservation management to get started with online bookings.',
  core: 'Best-in-class table management to maximize seatings and streamline operations.',
  pro: 'Our most comprehensive plan with relationship management and data tools.',
};

type PlanRecord = {
  key: string;
  name: string;
  description?: string | null;
  monthlyPriceCents: number;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  visibleOnPricing?: boolean | null;
  isCustom?: boolean | null;
  features?: Record<string, boolean | null>;
  originalMonthlyPriceCents?: number | null;
  discountType?: string | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  annualFreeMonths?: number | null;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function featureLabel(key: string) {
  return (
    FEATURE_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
  );
}

function isPartnerSelectablePlan(plan: PlanRecord) {
  if (plan.key === 'free') return false;
  if (plan.isCustom) return false;
  if (plan.visibleOnPricing === false) return false;
  return true;
}

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : status;
}

function enabledFeatureEntries(
  features: Record<string, boolean | null | undefined> | null | undefined,
  opts?: { hideAddonWhenIncluded?: boolean },
) {
  if (!features) return [];
  const premiumSms = Boolean(features.premiumSms);
  return Object.entries(features).filter(([key, enabled]) => {
    if (key === '__typename' || !enabled) return false;
    if (opts?.hideAddonWhenIncluded && key === 'premiumSmsAddon' && premiumSms) return false;
    return true;
  });
}

function PlanFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <div style={{ fontSize: 15, color: colors.textPrimary, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

function PlanPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: '100%',
        padding: spacing.md,
        borderRadius: radii.md,
        background: colors.neutral[50],
        border: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Space size={8} style={{ marginBottom: spacing.sm }}>
        {icon ? <span style={{ color: colors.brand[600] }}>{icon}</span> : null}
        <Text strong>{title}</Text>
      </Space>
      {children}
    </div>
  );
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState(() => dayjs().format('YYYY-MM'));

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const activeRestaurant = restaurants.find(
    (r: { id: string }) => r.id === activeRestaurantId,
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const { data: subData, loading: subLoading, refetch: refetchSub } = useQuery(
    MY_SUBSCRIPTION,
    { variables: { restaurantId: activeRestaurantId }, skip: !activeRestaurantId },
  );
  const { data: plansData } = useQuery(PLANS);
  const { data: feesData, loading: feesLoading } = useQuery(COVER_FEE_SUMMARY, {
    variables: { restaurantId: activeRestaurantId, period },
    skip: !activeRestaurantId,
  });
  const { data: invoiceData, loading: invoiceLoading } = useQuery(RESTAURANT_INVOICES, {
    variables: { restaurantId: activeRestaurantId, period, limit: 1, offset: 0 },
    skip: !activeRestaurantId,
  });

  const [createSubscription, { loading: creating }] = useMutation(CREATE_SUBSCRIPTION);
  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION);
  const [changePlan, { loading: changing }] = useMutation(CHANGE_PLAN);
  const [cancelPendingPlan, { loading: cancellingPending }] = useMutation(CANCEL_PENDING_PLAN_CHANGE);
  const [previewPlanChange] = useLazyQuery(PREVIEW_PLAN_CHANGE);
  const [loadPlanChangePayment] = useLazyQuery(PLAN_CHANGE_PAYMENT);
  const [confirmPlanPayment] = useMutation(CONFIRM_PLAN_CHANGE_PAYMENT);
  const [setPremiumSmsAddon, { loading: togglingSms }] = useMutation(SET_PREMIUM_SMS_ADDON);
  const [upgradePayment, setUpgradePayment] = useState<{
    clientSecret: string;
    paymentMode: SignupPaymentMode;
    planName: string;
    monthlyLabel: string;
    amountDueCents: number;
  } | null>(null);

  const subscription = subData?.mySubscription;
  const plans = useMemo(
    () => ((plansData?.plans ?? []) as PlanRecord[]).filter(isPartnerSelectablePlan),
    [plansData?.plans],
  );
  const summary = feesData?.coverFeeSummary;
  const periodInvoice = invoiceData?.restaurantInvoices?.items?.[0];
  const currentPlanMeta = plans.find((p) => p.key === subscription?.plan);

  const handleSubscribe = async (plan: string) => {
    if (!activeRestaurantId) return;
    await createSubscription({ variables: { restaurantId: activeRestaurantId, plan } });
    refetchSub();
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel subscription?',
      content:
        'Your restaurant will lose access to platform features at the end of the current billing period.',
      okText: 'Yes, cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!activeRestaurantId) return;
        await cancelSubscription({ variables: { restaurantId: activeRestaurantId } });
        refetchSub();
      },
    });
  };

  const handleChangePlan = async (plan: string) => {
    if (!activeRestaurantId) return;
    try {
      const { data } = await previewPlanChange({
        variables: { restaurantId: activeRestaurantId, plan },
        fetchPolicy: 'network-only',
      });
      const preview = data?.previewPlanChange;
      if (!preview) {
        message.error('Could not load plan change details');
        return;
      }
      if (!preview.allowed) {
        Modal.warning({
          title: 'This plan change is not available',
          content: preview.blockedReason ?? 'You cannot switch to this plan right now.',
        });
        return;
      }

      const target = plans.find((p) => p.key === plan);
      const title = preview.immediate
        ? `Upgrade to ${target?.name ?? plan}?`
        : `Schedule downgrade to ${target?.name ?? plan}?`;
      const effective = preview.effectiveAt
        ? dayjs(preview.effectiveAt).format('MMM D, YYYY')
        : 'the next billing date';

      Modal.confirm({
        title,
        width: 520,
        okText: preview.immediate ? 'Upgrade now' : 'Schedule downgrade',
        content: (
          <div>
            <Paragraph>
              {preview.immediate
                ? `This takes effect immediately. You will be charged a prorated amount today: ${formatCents(preview.proratedChargeCents)}.`
                : `You keep your current plan, features, and cover fees until ${effective}. Then the new price and cover fees apply.`}
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              {formatCents(preview.currentMonthlyPriceCents)}/mo → {formatCents(preview.nextMonthlyPriceCents)}/mo
              {preview.currentNetworkCoverFeeCents !== preview.nextNetworkCoverFeeCents
                ? ` · Network cover ${formatCents(preview.currentNetworkCoverFeeCents)} → ${formatCents(preview.nextNetworkCoverFeeCents)}`
                : ''}
            </Paragraph>
            {preview.featuresGained.length > 0 ? (
              <Paragraph>
                <Text strong>You will gain: </Text>
                {preview.featuresGained.join(', ')}
              </Paragraph>
            ) : null}
            {preview.featuresLost.length > 0 ? (
              <Paragraph>
                <Text strong>You will lose: </Text>
                {preview.featuresLost.join(', ')}
              </Paragraph>
            ) : null}
          </div>
        ),
        onOk: async () => {
          try {
            const { data: changeData } = await changePlan({
              variables: { restaurantId: activeRestaurantId, plan },
            });
            const payload = changeData?.changePlan;
            refetchSub();
            if (payload?.clientSecret) {
              setUpgradePayment({
                clientSecret: payload.clientSecret,
                paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
                planName: target?.name ?? plan,
                monthlyLabel: formatCents(preview.nextMonthlyPriceCents),
                amountDueCents: payload.amountDueCents || preview.proratedChargeCents,
              });
              return;
            }
            message.success(
              preview.immediate ? 'Plan upgraded' : `Downgrade scheduled for ${effective}`,
            );
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Could not change plan');
            throw err;
          }
        },
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not change plan');
    }
  };

  const handleCancelPending = () => {
    if (!activeRestaurantId) return;
    Modal.confirm({
      title: 'Keep your current plan?',
      content: 'This cancels the scheduled downgrade. Nothing changes until you pick a new plan.',
      okText: 'Keep current plan',
      onOk: async () => {
        await cancelPendingPlan({ variables: { restaurantId: activeRestaurantId } });
        message.success('Scheduled plan change cancelled');
        refetchSub();
      },
    });
  };

  const handleTogglePremiumSms = async (enabled: boolean) => {
    if (!activeRestaurantId) return;
    try {
      await setPremiumSmsAddon({ variables: { restaurantId: activeRestaurantId, enabled } });
      message.success(`Premium SMS ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update Premium SMS add-on');
    } finally {
      refetchSub();
    }
  };

  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const m = dayjs().subtract(i, 'month').format('YYYY-MM');
    return { value: m, label: dayjs(m).format('MMMM YYYY') };
  });

  const coverBreakdown = summary
    ? [
        {
          source: 'Network',
          covers: summary.networkCovers,
          feeCents: summary.networkFeeCents ?? 0,
          icon: <GlobalOutlined />,
        },
        {
          source: 'Website',
          covers: summary.websiteCovers,
          feeCents: summary.websiteFeeCents ?? 0,
          icon: <GlobalOutlined />,
        },
        {
          source: 'Widget',
          covers: summary.widgetCovers,
          feeCents: summary.widgetFeeCents ?? 0,
          icon: <CrownOutlined />,
        },
        {
          source: 'Phone',
          covers: summary.phoneCovers,
          feeCents: summary.phoneFeeCents ?? 0,
          icon: <PhoneOutlined />,
        },
        {
          source: 'Walk-in',
          covers: summary.walkinCovers,
          feeCents: summary.walkinFeeCents ?? 0,
          icon: <TeamOutlined />,
        },
      ]
    : [];

  const smsIncludedInPlan = Boolean(subscription?.features?.premiumSms);
  const smsAddonEnabled = Boolean(subscription?.features?.premiumSmsAddon);
  const canEditBilling = Boolean(user && canManageBilling(user.role));
  const amountDueNow = Number(subscription?.amountDueCents ?? 0);
  const isTrialing = subscription?.status === 'trialing' && amountDueNow <= 0;
  const isFreePlan = Boolean(subscription && subscription.monthlyPriceCents === 0 && amountDueNow <= 0);
  const upgradedThisPeriod = Boolean(
    subscription?.lastPaidPlanChangeAt &&
      subscription?.currentPeriodStart &&
      !dayjs(subscription.lastPaidPlanChangeAt).isBefore(dayjs(subscription.currentPeriodStart), 'day'),
  );
  const planDisplayName = currentPlanMeta?.name ?? String(subscription?.plan ?? '').replace(/^./, (s) => s.toUpperCase());
  const includedFeatures = enabledFeatureEntries(subscription?.features, {
    hideAddonWhenIncluded: true,
  });
  const pendingPlanName = subscription?.pendingPlan
    ? (plans.find((p) => p.key === subscription.pendingPlan)?.name ?? subscription.pendingPlan)
    : null;
  const switchablePlans = plans.filter((p) => p.key !== subscription?.plan);
  const monthlyPriceLabel = formatCents(subscription?.monthlyPriceCents ?? 0);

  let planStory: string | null = null;
  if (subscription) {
    if (isTrialing && subscription.trialEndsAt) {
      planStory = `Free trial through ${dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}. First charge is ${monthlyPriceLabel} on that date.`;
    } else if (isFreePlan) {
      planStory = 'This location is on a free plan — there is no recurring subscription charge.';
    } else if (amountDueNow > 0) {
      planStory = `${formatCents(amountDueNow)} is due now for a prorated upgrade. After that, renewals are ${monthlyPriceLabel}/mo.`;
    } else if (subscription.pendingPlan && pendingPlanName) {
      const when = subscription.pendingPlanEffectiveAt
        ? dayjs(subscription.pendingPlanEffectiveAt).format('MMM D, YYYY')
        : 'the next renewal';
      planStory = `Switching to ${pendingPlanName} on ${when}. You keep ${planDisplayName} features until then.`;
    } else if (subscription.currentPeriodEnd) {
      planStory = `Next renewal ${dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')} for ${monthlyPriceLabel}.`;
      if (upgradedThisPeriod) {
        planStory += ' Today’s prorated charge already covered the rest of this period.';
      }
    }
  }

  const openDuePayment = async () => {
    if (!activeRestaurantId || !subscription) return;
    const { data } = await loadPlanChangePayment({
      variables: { restaurantId: activeRestaurantId },
      fetchPolicy: 'network-only',
    });
    const payload = data?.planChangePayment;
    if (!payload?.clientSecret) {
      message.error('Could not start payment');
      return;
    }
    setUpgradePayment({
      clientSecret: payload.clientSecret,
      paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
      planName: planDisplayName,
      monthlyLabel: formatCents(subscription.monthlyPriceCents),
      amountDueCents: payload.amountDueCents || amountDueNow,
    });
  };

  const periodToolbar = (
    <Select
      value={period}
      onChange={setPeriod}
      options={periodOptions}
      style={{ width: 180 }}
      aria-label="Billing period"
    />
  );

  return (
    <div component="BillingPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Billing"
          subtitle={
            activeRestaurant
              ? `Plan, invoices, and cover fees for ${activeRestaurant.name}`
              : 'Plan, invoices, and cover fees for this location'
          }
          extra={
            <Select
              style={{ width: 280 }}
              placeholder="Select restaurant"
              {...restaurantSelectProps}
            />
          }
        />

        {!activeRestaurantId ? (
          <EmptyState
            icon={<DollarOutlined />}
            title="Select a restaurant"
            description="Choose a location to view its subscription, invoices, and cover fees."
          />
        ) : subLoading ? (
          <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
        ) : subscription ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label="Current plan"
                  value={planDisplayName}
                  hint={`${statusLabel(subscription.status)} · ${
                    isTrialing || isFreePlan
                      ? formatCents(0)
                      : formatCents(subscription.monthlyPriceCents)
                  }/mo`}
                  hintTone={
                    subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'positive'
                      : subscription.status === 'past_due'
                        ? 'negative'
                        : 'neutral'
                  }
                  icon={<CrownOutlined />}
                />
              </Col>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label={isTrialing ? 'Trial ends' : 'Next charge'}
                  value={
                    isFreePlan
                      ? 'None'
                      : subscription.currentPeriodEnd
                        ? dayjs(
                            isTrialing && subscription.trialEndsAt
                              ? subscription.trialEndsAt
                              : subscription.currentPeriodEnd,
                          ).format('MMM D')
                        : '—'
                  }
                  hint={
                    isFreePlan
                      ? 'Free plan — no recurring charge'
                      : isTrialing
                        ? `Then ${formatCents(subscription.monthlyPriceCents)}/mo`
                        : subscription.currentPeriodEnd
                          ? `${formatCents(subscription.monthlyPriceCents)} on ${dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}`
                          : 'No billing period on file'
                  }
                />
              </Col>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label={dayjs(period).format('MMM YYYY') + ' covers'}
                  value={summary?.totalCovers ?? '—'}
                  hint={
                    summary
                      ? `${formatCents(summary.totalFeeCents)} in cover fees`
                      : 'Loading cover fees…'
                  }
                  icon={<TeamOutlined />}
                />
              </Col>
            </Row>

            {amountDueNow > 0 ? (
              <Alert
                type="warning"
                showIcon
                message={`${formatCents(amountDueNow)} due now`}
                description="Prorated upgrade charge — pay to keep this plan for the rest of the period."
                action={
                  canEditBilling ? (
                    <Button type="primary" onClick={() => void openDuePayment()}>
                      Pay now
                    </Button>
                  ) : null
                }
              />
            ) : null}

            <Card title="Your subscription">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                  marginBottom: spacing.md,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Space size={10} wrap>
                    <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
                      {planDisplayName}
                    </Text>
                    <Tag color={STATUS_COLORS[subscription.status] ?? 'default'}>
                      {String(subscription.status).replace(/_/g, ' ').toUpperCase()}
                    </Tag>
                  </Space>
                  <div style={{ marginTop: 6 }}>
                    {isTrialing ? (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary }}>
                          $0.00
                        </Text>{' '}
                        during trial · then {monthlyPriceLabel}/mo
                      </Text>
                    ) : isFreePlan ? (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary }}>
                          $0.00
                        </Text>
                        /mo · free plan
                      </Text>
                    ) : (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary, fontSize: 16 }}>
                          {monthlyPriceLabel}
                        </Text>
                        /mo
                      </Text>
                    )}
                  </div>
                </div>
                {canEditBilling && subscription.status !== 'cancelled' ? (
                  <Space wrap>
                    {amountDueNow > 0 ? (
                      <Button type="primary" onClick={() => void openDuePayment()}>
                        Pay {formatCents(amountDueNow)} now
                      </Button>
                    ) : null}
                    {switchablePlans.length > 0 ? (
                      <Dropdown
                        menu={{
                          items: switchablePlans.map((p) => ({
                            key: p.key,
                            label: `${p.name} — ${formatCents(p.monthlyPriceCents)}/mo`,
                            onClick: () => void handleChangePlan(p.key),
                          })),
                        }}
                        trigger={['click']}
                        disabled={changing}
                      >
                        <Button icon={<SwapOutlined />} loading={changing}>
                          Change plan <DownOutlined />
                        </Button>
                      </Dropdown>
                    ) : null}
                    {subscription.pendingPlan ? (
                      <Button onClick={handleCancelPending} loading={cancellingPending}>
                        Keep current plan
                      </Button>
                    ) : null}
                    <Button danger type="text" onClick={handleCancel} loading={cancelling}>
                      Cancel subscription
                    </Button>
                  </Space>
                ) : !canEditBilling ? (
                  <Text type="secondary" style={{ maxWidth: 260 }}>
                    Only the restaurant owner can change or cancel this plan.
                  </Text>
                ) : null}
              </div>

              {planStory ? (
                <Alert
                  type={
                    amountDueNow > 0 || subscription.status === 'past_due'
                      ? 'warning'
                      : subscription.pendingPlan
                        ? 'info'
                        : 'success'
                  }
                  showIcon
                  icon={
                    isTrialing || subscription.pendingPlan ? (
                      <CalendarOutlined />
                    ) : (
                      <CheckCircleOutlined />
                    )
                  }
                  message={planStory}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <PlanPanel title="Cover fees on this plan" icon={<DollarOutlined />}>
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      <PlanFact label="Network reservations">
                        {formatCents(subscription.networkCoverFeeCents)} per cover
                      </PlanFact>
                      <PlanFact label="Website reservations">
                        {subscription.websiteCoverFeeCents === 0
                          ? 'Free'
                          : `${formatCents(subscription.websiteCoverFeeCents)} per cover`}
                      </PlanFact>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Charged when a reservation is completed, then rolled into the monthly invoice
                        below — not into Stripe renewals.
                      </Text>
                    </Space>
                  </PlanPanel>
                </Col>
                <Col xs={24} md={12}>
                  <PlanPanel title="Billing timeline" icon={<CalendarOutlined />}>
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                        <PlanFact label={isTrialing ? 'Trial window' : 'Current period'}>
                          {dayjs(subscription.currentPeriodStart).format('MMM D')} –{' '}
                          {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}
                        </PlanFact>
                      ) : null}
                      {isTrialing && subscription.trialEndsAt ? (
                        <PlanFact label="First charge">
                          {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')} · {monthlyPriceLabel}
                        </PlanFact>
                      ) : isFreePlan ? (
                        <PlanFact label="Next charge">None</PlanFact>
                      ) : subscription.currentPeriodEnd ? (
                        <PlanFact label="Next renewal">
                          {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')} ·{' '}
                          {monthlyPriceLabel}
                        </PlanFact>
                      ) : null}
                      {subscription.status !== 'trialing' && subscription.trialEndsAt ? (
                        <PlanFact label="Trial ended">
                          {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                        </PlanFact>
                      ) : null}
                      {pendingPlanName ? (
                        <PlanFact label="Scheduled change">
                          {pendingPlanName}
                          {subscription.pendingPlanEffectiveAt
                            ? ` on ${dayjs(subscription.pendingPlanEffectiveAt).format('MMM D, YYYY')}`
                            : ' at next renewal'}
                        </PlanFact>
                      ) : null}
                    </Space>
                  </PlanPanel>
                </Col>
              </Row>
            </Card>

            <Card
              title="Usage & invoice"
              extra={periodToolbar}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
                Cover fees accrue when reservations are completed. The period invoice is the bill —
                cover totals below are a breakdown, not a separate charge.
              </Text>

              {feesLoading ? (
                <Spin />
              ) : summary ? (
                <>
                  <Row gutter={[16, 16]} style={{ marginBottom: spacing.md }}>
                    <Col xs={12} md={8}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          Total covers
                        </Text>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                          {summary.totalCovers}
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          Cover fees
                        </Text>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            marginTop: 4,
                            color: summary.totalFeeCents > 0 ? colors.error : colors.success,
                          }}
                        >
                          {formatCents(summary.totalFeeCents)}
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          Avg fee / cover
                        </Text>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                          {summary.totalCovers > 0
                            ? formatCents(Math.round(summary.totalFeeCents / summary.totalCovers))
                            : '$0.00'}
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <Table
                    dataSource={coverBreakdown}
                    rowKey="source"
                    pagination={false}
                    size="small"
                    style={{ marginBottom: spacing.lg }}
                    columns={[
                      {
                        title: 'Source',
                        dataIndex: 'source',
                        render: (text: string, row: { icon: ReactNode }) => (
                          <Space>
                            {row.icon}
                            {text}
                          </Space>
                        ),
                      },
                      {
                        title: 'Covers',
                        dataIndex: 'covers',
                        align: 'right' as const,
                      },
                      {
                        title: 'Fees',
                        dataIndex: 'feeCents',
                        align: 'right' as const,
                        render: (cents: number) => formatCents(cents),
                      },
                    ]}
                  />
                </>
              ) : (
                <Text type="secondary">No cover fee data for this period.</Text>
              )}

              <div
                style={{
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: spacing.md,
                  marginTop: spacing.sm,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: spacing.md,
                  }}
                >
                  <Text strong style={{ fontSize: 15 }}>
                    Invoice · {dayjs(period).format('MMMM YYYY')}
                  </Text>
                  {periodInvoice ? (
                    <Tag color={INVOICE_STATUS_COLORS[periodInvoice.status] ?? 'default'}>
                      {String(periodInvoice.status).toUpperCase()}
                    </Tag>
                  ) : null}
                </div>

                {invoiceLoading ? (
                  <Spin />
                ) : periodInvoice ? (
                  <>
                    <Descriptions
                      column={{ xs: 1, sm: 2, md: 3 }}
                      size="small"
                      bordered
                      style={{ marginBottom: spacing.md }}
                    >
                      <Descriptions.Item label="Number">{periodInvoice.number}</Descriptions.Item>
                      <Descriptions.Item label="Due">
                        {dayjs(periodInvoice.dueDate).format('MMM D, YYYY')}
                      </Descriptions.Item>
                      <Descriptions.Item label="Total">
                        <Text strong>{formatCents(periodInvoice.totalCents)}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                    <Table
                      dataSource={periodInvoice.lines ?? []}
                      rowKey={(row: { description: string }, index?: number) =>
                        `${row.description}-${index ?? 0}`
                      }
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Item', dataIndex: 'description' },
                        {
                          title: 'Qty',
                          dataIndex: 'quantity',
                          align: 'right' as const,
                        },
                        {
                          title: 'Unit',
                          dataIndex: 'unitAmountCents',
                          align: 'right' as const,
                          render: (cents: number) => formatCents(cents),
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amountCents',
                          align: 'right' as const,
                          render: (cents: number) => formatCents(cents),
                        },
                      ]}
                      summary={() => (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={3}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong>{formatCents(periodInvoice.totalCents)}</Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    />
                    {periodInvoice.payUrl &&
                    periodInvoice.status !== 'paid' &&
                    periodInvoice.status !== 'canceled' &&
                    periodInvoice.totalCents > 0 ? (
                      <div style={{ marginTop: spacing.md }}>
                        <Button type="primary" href={periodInvoice.payUrl} target="_blank">
                          Pay {formatCents(periodInvoice.totalCents)}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Text type="secondary">
                    No invoice for this period yet. Period invoices are generated automatically and
                    include the plan plus cover fees by source.
                  </Text>
                )}
              </div>
            </Card>

            <Card title="Premium SMS">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ maxWidth: 560 }}>
                  <Text strong>Premium SMS notifications</Text>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                    Send branded SMS confirmations, reminders, and waitlist notifications to your
                    guests.
                    {subscription.plan === 'basic' ? (
                      <>
                        {' '}
                        <Text type="warning">Available on Core (add-on) or Pro (included).</Text>
                      </>
                    ) : null}
                  </Paragraph>
                </div>
                {smsIncludedInPlan ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Included in {planDisplayName}
                  </Tag>
                ) : (
                  <Switch
                    checked={smsAddonEnabled}
                    disabled={!canEditBilling || subscription.plan === 'basic'}
                    loading={togglingSms}
                    onChange={(checked) => void handleTogglePremiumSms(checked)}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                  />
                )}
              </div>
            </Card>

            <Card title="Included features">
              {includedFeatures.length === 0 ? (
                <Text type="secondary">No premium features on this plan.</Text>
              ) : (
                <Row gutter={[12, 8]}>
                  {includedFeatures.map(([key]) => (
                    <Col key={key} xs={24} sm={12} md={8} lg={6}>
                      <Badge
                        status="success"
                        text={<Text>{featureLabel(key)}</Text>}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </>
        ) : (
          <>
            <EmptyState
              icon={<ExclamationCircleOutlined />}
              title="No active subscription"
              description="Choose a plan to start accepting reservations through the Tablevera network and unlock premium features."
            />

            <Row gutter={[16, 16]}>
              {plans.map((plan) => {
                const isRecommended = plan.key === 'core';
                const blurb =
                  plan.description?.trim() ||
                  PLAN_BLURBS[plan.key] ||
                  'Built for your restaurant.';
                const planFeatures = enabledFeatureEntries(plan.features);
                return (
                  <Col key={plan.key} xs={24} md={8}>
                    <Card
                      style={{
                        height: '100%',
                        borderRadius: radii.lg,
                        borderColor: isRecommended ? colors.brand[500] : colors.border,
                        borderWidth: isRecommended ? 2 : 1,
                      }}
                      title={
                        <Space>
                          <CrownOutlined />
                          <span>{plan.name}</span>
                          {isRecommended ? <Tag color="green">Recommended</Tag> : null}
                        </Space>
                      }
                      extra={<PlanPrice plan={plan} size="small" showSecondaryNote={false} />}
                      actions={[
                        <Button
                          key="subscribe"
                          type="primary"
                          onClick={() => void handleSubscribe(plan.key)}
                          loading={creating}
                          disabled={!canEditBilling}
                          block
                        >
                          {!canEditBilling
                            ? 'Owner only'
                            : plan.trialDays > 0
                              ? `Start ${plan.trialDays}-day trial`
                              : 'Subscribe'}
                        </Button>,
                      ]}
                    >
                      <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                        {getPlanDiscountLabel(plan) ? (
                          <Tag color="gold">{getPlanDiscountLabel(plan)}</Tag>
                        ) : null}
                        <Paragraph type="secondary" style={{ marginBottom: 0, minHeight: 44 }}>
                          {blurb}
                        </Paragraph>
                        <div>
                          <Text type="secondary">Network cover: </Text>
                          <Text strong>{formatCents(plan.networkCoverFeeCents)}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Website cover: </Text>
                          <Text strong>
                            {plan.websiteCoverFeeCents === 0
                              ? 'Free'
                              : formatCents(plan.websiteCoverFeeCents)}
                          </Text>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {planFeatures.length === 0 ? (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Core booking tools
                            </Text>
                          ) : (
                            planFeatures.slice(0, 6).map(([key]) => (
                              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <CheckOutlined style={{ color: colors.success, marginTop: 3 }} />
                                <Text style={{ fontSize: 13 }}>{featureLabel(key)}</Text>
                              </div>
                            ))
                          )}
                          {planFeatures.length > 6 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              +{planFeatures.length - 6} more
                            </Text>
                          ) : null}
                        </div>
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        <Modal
          title="Complete your upgrade"
          open={Boolean(upgradePayment)}
          footer={null}
          destroyOnHidden
          onCancel={() => setUpgradePayment(null)}
        >
          {upgradePayment ? (
            <SignupPaymentForm
              clientSecret={upgradePayment.clientSecret}
              paymentMode={upgradePayment.paymentMode}
              planName={upgradePayment.planName}
              monthlyLabel={upgradePayment.monthlyLabel}
              trialDays={0}
              description={`Pay ${formatCents(upgradePayment.amountDueCents)} now (prorated for the rest of this period). Recurring ${upgradePayment.monthlyLabel}/mo starts on the next billing date.`}
              onSuccess={() => {
                if (activeRestaurantId) {
                  void confirmPlanPayment({ variables: { restaurantId: activeRestaurantId } });
                }
                setUpgradePayment(null);
                message.success('Payment received');
                refetchSub();
              }}
            />
          ) : null}
        </Modal>
      </Space>
    </div>
  );
}
