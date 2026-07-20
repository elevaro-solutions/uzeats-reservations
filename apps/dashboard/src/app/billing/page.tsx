'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
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
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
  PLANS,
  COVER_FEE_SUMMARY,
  CREATE_SUBSCRIPTION,
  CANCEL_SUBSCRIPTION,
  CHANGE_PLAN,
  SET_PREMIUM_SMS_ADDON,
} from '@/lib/graphql';

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
  const [restaurantId, setRestaurantId] = useState<string>();
  const [period, setPeriod] = useState(() => dayjs().format('YYYY-MM'));

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    setRestaurantId(saved ?? restData?.myRestaurants?.[0]?.id);
  }, [restData]);

  const { data: subData, loading: subLoading, refetch: refetchSub } = useQuery(
    MY_SUBSCRIPTION,
    { variables: { restaurantId }, skip: !restaurantId },
  );
  const { data: plansData } = useQuery(PLANS);
  const { data: feesData, loading: feesLoading } = useQuery(COVER_FEE_SUMMARY, {
    variables: { restaurantId, period },
    skip: !restaurantId,
  });

  const [createSubscription, { loading: creating }] = useMutation(CREATE_SUBSCRIPTION);
  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION);
  const [changePlan, { loading: changing }] = useMutation(CHANGE_PLAN);
  const [setPremiumSmsAddon, { loading: togglingSms }] = useMutation(SET_PREMIUM_SMS_ADDON);

  const subscription = subData?.mySubscription;
  const plans = plansData?.plans ?? [];
  const summary = feesData?.coverFeeSummary;

  const handleSubscribe = async (plan: string) => {
    if (!restaurantId) return;
    await createSubscription({ variables: { restaurantId, plan } });
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
        if (!restaurantId) return;
        await cancelSubscription({ variables: { restaurantId } });
        refetchSub();
      },
    });
  };

  const handleChangePlan = async (plan: string) => {
    if (!restaurantId) return;
    await changePlan({ variables: { restaurantId, plan } });
    refetchSub();
  };

  const handleTogglePremiumSms = async (enabled: boolean) => {
    if (!restaurantId) return;
    try {
      await setPremiumSmsAddon({ variables: { restaurantId, enabled } });
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

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Billing
        </Title>
        <Select
          style={{ width: 280 }}
          value={restaurantId}
          onChange={(id) => {
            setRestaurantId(id);
            localStorage.setItem('activeRestaurantId', id);
          }}
          options={(restData?.myRestaurants ?? []).map((r: any) => ({
            value: r.id,
            label: r.name,
          }))}
        />
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
              <Descriptions.Item label="Monthly Price">
                <Text strong>{formatCents(subscription.monthlyPriceCents)}</Text>/mo
              </Descriptions.Item>
              <Descriptions.Item label="Network Cover Fee">
                {formatCents(subscription.networkCoverFeeCents)} per cover
              </Descriptions.Item>
              <Descriptions.Item label="Website Cover Fee">
                {subscription.websiteCoverFeeCents === 0
                  ? 'Free'
                  : `${formatCents(subscription.websiteCoverFeeCents)} per cover`}
              </Descriptions.Item>
              {subscription.currentPeriodEnd && (
                <Descriptions.Item label="Current Period">
                  {dayjs(subscription.currentPeriodStart).format('MMM D')} &ndash;{' '}
                  {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}
                </Descriptions.Item>
              )}
              {subscription.trialEndsAt && (
                <Descriptions.Item label="Trial Ends">
                  {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {subscription.status !== 'cancelled' &&
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
              {subscription.status !== 'cancelled' && (
                <Button danger onClick={handleCancel} loading={cancelling}>
                  Cancel Subscription
                </Button>
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
              <Switch
                checked={Boolean(subscription.features?.premiumSms)}
                loading={togglingSms}
                onChange={handleTogglePremiumSms}
                checkedChildren="On"
                unCheckedChildren="Off"
              />
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
            <Space direction="vertical" align="center" style={{ width: '100%', padding: '24px 0' }}>
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
                  extra={
                    <Text strong style={{ fontSize: 18 }}>
                      {formatCents(plan.monthlyPriceCents)}
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        /mo
                      </Text>
                    </Text>
                  }
                  actions={[
                    <Button
                      key="subscribe"
                      type="primary"
                      onClick={() => handleSubscribe(plan.key)}
                      loading={creating}
                      block
                    >
                      {plan.trialDays > 0
                        ? `Start ${plan.trialDays}-day trial`
                        : 'Subscribe'}
                    </Button>,
                  ]}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
    </Space>
  );
}
