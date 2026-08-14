'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CrownOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  PhoneOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPlanDiscountLabel } from '@reservations/shared';
import { PlanPrice } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageBilling } from '@/lib/roles';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
  PLANS,
  COVER_FEE_SUMMARY,
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

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  trialing: 'blue',
  active: 'green',
  past_due: 'orange',
  cancelled: 'red',
  paused: 'default',
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState(() => dayjs().format('YYYY-MM'));

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);

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
  const plans = plansData?.plans ?? [];
  const summary = feesData?.coverFeeSummary;

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

      const target = plans.find((p: { key: string; name: string }) => p.key === plan);
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
    } catch (err: any) {
      message.error(err.message ?? 'Failed to update Premium SMS add-on');
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
        { source: 'Network', covers: summary.networkCovers, icon: <GlobalOutlined /> },
        { source: 'Website', covers: summary.websiteCovers, icon: <GlobalOutlined /> },
        { source: 'Widget', covers: summary.widgetCovers, icon: <CrownOutlined /> },
        { source: 'Phone', covers: summary.phoneCovers, icon: <PhoneOutlined /> },
        { source: 'Walk-in', covers: summary.walkinCovers, icon: <TeamOutlined /> },
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
      planName: String(subscription.plan),
      monthlyLabel: formatCents(subscription.monthlyPriceCents),
      amountDueCents: payload.amountDueCents || amountDueNow,
    });
  };

  return (
    <div component="BillingPage" style={{ display: 'contents' }}><Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Billing
        </Title>
        <Select style={{ width: 280 }} {...restaurantSelectProps} />
      </div>

      {subLoading ? (
        <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
      ) : subscription ? (
        <>
          {/* Current Plan */}
          <Card title="Current Plan">
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              <Descriptions.Item label="Plan">
                <Text strong style={{ textTransform: 'capitalize', fontSize: 16 }}>
                  {subscription.plan}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[subscription.status] ?? 'default'}>
                  {subscription.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              {isTrialing ? (
                <Descriptions.Item label="Amount due this period">
                  <Text strong>$0.00</Text>
                  <Text type="secondary"> (free trial)</Text>
                </Descriptions.Item>
              ) : isFreePlan ? (
                <Descriptions.Item label="Monthly price">
                  <Text strong>$0.00</Text>
                  <Text type="secondary"> /mo · free plan</Text>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Monthly price">
                  <Text strong>{formatCents(subscription.monthlyPriceCents)}</Text>/mo
                </Descriptions.Item>
              )}
              {amountDueNow > 0 && (
                <Descriptions.Item label="Amount due now">
                  <Text strong style={{ color: '#cf1322' }}>
                    {formatCents(amountDueNow)}
                  </Text>
                  <Text type="secondary"> (prorated upgrade — pay to keep this plan)</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Network Cover Fee">
                {formatCents(subscription.networkCoverFeeCents)} per cover
              </Descriptions.Item>
              <Descriptions.Item label="Website Cover Fee">
                {subscription.websiteCoverFeeCents === 0
                  ? 'Free'
                  : `${formatCents(subscription.websiteCoverFeeCents)} per cover`}
              </Descriptions.Item>
              {subscription.currentPeriodEnd && (
                <Descriptions.Item
                  label={isTrialing ? 'Trial period' : 'Current billing period'}
                >
                  {dayjs(subscription.currentPeriodStart).format('MMM D')} &ndash;{' '}
                  {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}
                </Descriptions.Item>
              )}
              {isTrialing && subscription.trialEndsAt ? (
                <>
                  <Descriptions.Item label="Price after trial">
                    <Text strong>{formatCents(subscription.monthlyPriceCents)}</Text>/mo
                    <Text type="secondary">
                      {' '}
                      starting {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="First charge">
                    {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')} ·{' '}
                    {formatCents(subscription.monthlyPriceCents)}
                  </Descriptions.Item>
                </>
              ) : isFreePlan ? (
                <Descriptions.Item label="Next charge">None — free plan</Descriptions.Item>
              ) : subscription.currentPeriodEnd ? (
                <Descriptions.Item label="Next recurring charge">
                  {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')} ·{' '}
                  {formatCents(subscription.monthlyPriceCents)}
                  {upgradedThisPeriod || amountDueNow > 0 ? (
                    <Text type="secondary"> (full monthly rate after today&apos;s proration)</Text>
                  ) : null}
                </Descriptions.Item>
              ) : null}
              {subscription.status !== 'trialing' && subscription.trialEndsAt && (
                <Descriptions.Item label="Trial ended">
                  {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                </Descriptions.Item>
              )}
              {subscription.pendingPlan && (
                <Descriptions.Item label="Scheduled change">
                  {subscription.pendingPlan} on{' '}
                  {subscription.pendingPlanEffectiveAt
                    ? dayjs(subscription.pendingPlanEffectiveAt).format('MMM D, YYYY')
                    : 'next renewal'}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canEditBilling && amountDueNow > 0 && (
                <Button type="primary" onClick={() => void openDuePayment()}>
                  Pay {formatCents(amountDueNow)} now
                </Button>
              )}
              {canEditBilling && subscription.status !== 'cancelled' &&
                plans
                  .filter((p: any) => p.key !== subscription.plan)
                  .map((p: any) => (
                    <Button
                      key={p.key}
                      onClick={() => handleChangePlan(p.key)}
                      loading={changing}
                    >
                      Switch to {p.name} ({formatCents(p.monthlyPriceCents)}/mo)
                    </Button>
                  ))}
              {canEditBilling && subscription.pendingPlan && (
                <Button onClick={handleCancelPending} loading={cancellingPending}>
                  Cancel scheduled change
                </Button>
              )}
              {canEditBilling && subscription.status !== 'cancelled' && (
                <Button danger onClick={handleCancel} loading={cancelling}>
                  Cancel Subscription
                </Button>
              )}
              {!canEditBilling && (
                <Text type="secondary">Only the restaurant owner can change or cancel this plan.</Text>
              )}
            </div>
          </Card>

          {/* Cover Fee Summary */}
          <Card
            title="Cover Fee Summary"
            extra={
              <Select
                value={period}
                onChange={setPeriod}
                options={periodOptions}
                style={{ width: 180 }}
              />
            }
          >
            {feesLoading ? (
              <Spin />
            ) : summary ? (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={8}>
                    <Statistic
                      title="Total Covers"
                      value={summary.totalCovers}
                      prefix={<TeamOutlined />}
                    />
                  </Col>
                  <Col xs={12} md={8}>
                    <Statistic
                      title="Total Fees"
                      value={formatCents(summary.totalFeeCents)}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: summary.totalFeeCents > 0 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Statistic
                      title="Avg Fee per Cover"
                      value={
                        summary.totalCovers > 0
                          ? formatCents(Math.round(summary.totalFeeCents / summary.totalCovers))
                          : '$0.00'
                      }
                    />
                  </Col>
                </Row>

                <Table
                  style={{ marginTop: 24 }}
                  dataSource={coverBreakdown}
                  rowKey="source"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Source',
                      dataIndex: 'source',
                      render: (text: string, row: any) => (
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
                  ]}
                />
              </>
            ) : (
              <Text type="secondary">No data for this period</Text>
            )}
          </Card>

          {/* Premium SMS add-on */}
          <Card title="Premium SMS Add-on">
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
                  Send branded SMS confirmations, reminders and waitlist notifications to your
                  guests.{' '}
                  {subscription.plan !== 'pro' && (
                    <Text type="warning">Requires the Pro plan.</Text>
                  )}
                </Paragraph>
              </div>
              {smsIncludedInPlan ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Included in Pro
                </Tag>
              ) : (
                <Switch
                  checked={smsAddonEnabled}
                  disabled={!canEditBilling || subscription.plan === 'basic'}
                  loading={togglingSms}
                  onChange={handleTogglePremiumSms}
                  checkedChildren="On"
                  unCheckedChildren="Off"
                />
              )}
            </div>
          </Card>

          {/* Features */}
          <Card title="Plan Features">
            <Row gutter={[12, 8]}>
              {Object.entries(subscription.features ?? {}).map(([key, enabled]) => {
                if (key === '__typename') return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                return (
                  <Col key={key} xs={12} md={8} lg={6}>
                    <Badge
                      status={enabled ? 'success' : 'default'}
                      text={
                        <Text type={enabled ? undefined : 'secondary'}>
                          {label}
                        </Text>
                      }
                    />
                  </Col>
                );
              })}
            </Row>
          </Card>
        </>
      ) : (
        /* No subscription — show plan picker */
        <>
          <Card>
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: '24px 0' }}>
              <ExclamationCircleOutlined style={{ fontSize: 40, color: '#faad14' }} />
              <Title level={4} style={{ margin: 0 }}>
                No active subscription
              </Title>
              <Paragraph type="secondary" style={{ textAlign: 'center', maxWidth: 480 }}>
                Choose a plan to start accepting reservations through the Tablevera network and
                unlock premium features.
              </Paragraph>
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            {plans.map((plan: any) => (
              <Col key={plan.key} xs={24} md={8}>
                <Card
                  title={
                    <Space>
                      <CrownOutlined />
                      <span>{plan.name}</span>
                    </Space>
                  }
                  extra={<PlanPrice plan={plan} size="small" showSecondaryNote={false} />}
                  actions={[
                    <Button
                      key="subscribe"
                      type="primary"
                      onClick={() => handleSubscribe(plan.key)}
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
                  <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    {getPlanDiscountLabel(plan) ? (
                      <Tag color="gold">{getPlanDiscountLabel(plan)}</Tag>
                    ) : null}
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

                    <div style={{ marginTop: 12 }}>
                      {Object.entries(plan.features).map(([key, enabled]) => {
                        if (key === '__typename') return null;
                        const label = key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (s) => s.toUpperCase());
                        return (
                          <div key={key}>
                            <Badge
                              status={enabled ? 'success' : 'default'}
                              text={
                                <Text type={enabled ? undefined : 'secondary'} style={{ fontSize: 13 }}>
                                  {label}
                                </Text>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
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
    </Space></div>
  );
}
