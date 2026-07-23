'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CopyOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import { BookingSharePanel, copyBookingText } from '@/components/BookingSharePanel';
import { EmptyState, PageHeader, StatusTag, colors, radii, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import {
  getOnboardingProgress,
  getOnboardingSteps,
  type OnboardingStep,
} from '@/lib/onboarding';

const { Text, Paragraph, Title } = Typography;

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading: dataLoading } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const restaurantIds = useMemo(
    () => restaurants.map((r: { id: string }) => r.id),
    [restaurants],
  );
  const { restaurantId } = useActiveRestaurant(restaurantIds);
  const restaurant = restaurants.find((r: { id: string }) => r.id === restaurantId);

  const steps = useMemo(
    () => (restaurant ? getOnboardingSteps(restaurant) : []),
    [restaurant],
  );
  const progress = useMemo(() => getOnboardingProgress(steps), [steps]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user?.role === 'admin') router.replace('/admin');
  }, [authLoading, user, router]);

  if (authLoading || dataLoading) {
    return (
      <div component="OnboardingPage" style={{ display: 'contents' }}>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!restaurants.length) {
    return (
      <div component="OnboardingPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
          <PageHeader
            title="Get started"
            subtitle="Set up your restaurant before taking reservations"
          />
          <EmptyState
            icon={<RocketOutlined />}
            title="No restaurants yet"
            description="Add your first venue to begin the setup guide."
            action={
              <Button type="primary" onClick={() => router.push('/')}>
                Add restaurant
              </Button>
            }
          />
        </Space>
      </div>
    );
  }

  const bookingUrl = restaurant
    ? buildRestaurantBookingUrl(WEB_URL, { slug: restaurant.slug, id: restaurant.id })
    : '';

  return (
    <div component="OnboardingPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Get started"
          subtitle={
            restaurant
              ? `Finish setting up ${restaurant.name} before you start taking reservations`
              : 'Finish setting up your restaurant'
          }
          extra={
            progress.allRequiredComplete ? (
              <Button type="primary" onClick={() => router.push('/reservations')}>
                Open reservations
              </Button>
            ) : undefined
          }
        />

        {restaurant && (
          <Card
            className="rt-surface-card"
            style={{ borderRadius: radii.lg }}
            styles={{ body: { padding: spacing.lg } }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={16}>
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Title level={4} style={{ margin: 0 }}>
                      {restaurant.name}
                    </Title>
                    <StatusTag status={restaurant.status} />
                  </div>
                  <Text type="secondary">
                    {progress.allRequiredComplete
                      ? 'You are ready to take reservations. Share your booking link or jump into the dashboard.'
                      : 'Complete the steps below. Most owners finish in under 15 minutes.'}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {progress.completedRequired} of {progress.totalRequired} required steps
                  </Text>
                  <Progress
                    percent={progress.percent}
                    strokeColor={colors.brand[600]}
                    format={(value) => `${value}%`}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        )}

        <Row gutter={[16, 16]}>
          {steps.map((step, index) => (
            <Col key={step.key} xs={24} md={12}>
              <StepCard
                step={step}
                index={index}
                bookingUrl={step.key === 'golive' ? bookingUrl : undefined}
                restaurant={step.key === 'golive' ? restaurant : undefined}
              />
            </Col>
          ))}
        </Row>

        {progress.allRequiredComplete && restaurant && (
          <Card
            style={{
              borderRadius: radii.lg,
              border: `1px solid ${colors.brand[200]}`,
              background: colors.brand[50],
            }}
            styles={{ body: { padding: spacing.lg } }}
          >
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Title level={5} style={{ margin: 0 }}>
                You are live
              </Title>
              <Paragraph style={{ margin: 0, color: colors.textSecondary }}>
                Guests can book at{' '}
                <Link href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  {bookingUrl}
                </Link>
                . Head to Reservations to manage incoming bookings.
              </Paragraph>
              <Space wrap>
                <Button type="primary" onClick={() => router.push('/reservations')}>
                  View reservations
                </Button>
                <Button onClick={() => router.push('/booking-widget')}>Copy booking script</Button>
              </Space>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
}

function StepCard({
  step,
  index,
  bookingUrl,
  restaurant,
}: {
  step: OnboardingStep;
  index: number;
  bookingUrl?: string;
  restaurant?: { id: string; slug?: string | null };
}) {
  const statusColor = step.complete
    ? colors.success
    : step.waiting
      ? colors.warning
      : colors.brand[600];

  return (
    <Card
      className="rt-surface-card"
      style={{
        borderRadius: radii.lg,
        height: '100%',
        borderColor: step.complete ? colors.brand[200] : undefined,
      }}
      styles={{ body: { padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: 12 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: step.complete ? colors.brand[50] : colors.neutral[50],
              color: statusColor,
              fontWeight: 600,
              fontSize: typography.fontSize.sm,
            }}
          >
            {step.complete ? <CheckCircleFilled /> : index + 1}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text strong>{step.title}</Text>
              {!step.required && (
                <Tag style={{ margin: 0 }}>Optional</Tag>
              )}
              {step.waiting && !step.complete && (
                <Tag icon={<ClockCircleOutlined />} color="gold" style={{ margin: 0 }}>
                  In review
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {step.description}
            </Text>
          </div>
        </div>
      </div>

      {step.key === 'golive' && restaurant && (
        <div
          style={{
            padding: 12,
            borderRadius: radii.md,
            background: colors.neutral[50],
            border: `1px solid ${colors.bordersubtle}`,
          }}
        >
          <BookingSharePanel restaurant={restaurant} showBookingLink={false} />
          {bookingUrl && (
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyBookingText(bookingUrl)}
              style={{ marginTop: 8 }}
            >
              Copy booking link only
            </Button>
          )}
        </div>
      )}

      {step.key !== 'golive' && step.key !== 'approval' && (
        <div style={{ marginTop: 'auto' }}>
          <Link href={step.href}>
            <Button
              type={step.complete ? 'default' : 'primary'}
              icon={step.complete ? undefined : <ArrowRightOutlined />}
            >
              {step.complete ? 'Review' : 'Continue'}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
