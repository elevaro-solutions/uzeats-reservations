'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Form, Row, Select, Space, Typography, message } from 'antd';
import { StatCard, StatusTag, spacing } from '@reservations/ui';
import {
  formatPlanPriceSuffix,
} from '@reservations/shared';
import {
  PlanSelector,
  RESTAURANT_ACTIVITY_OPTIONS,
  RESTAURANT_STATUS_OPTIONS,
  RESTAURANT_VISIBILITY_OPTIONS,
  restaurantActivity,
  restaurantVisibility,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import { AdminPaidPeriodStartForm } from '@/components/AdminPaidPeriodStartForm';
import {
  ADMIN_ASSIGN_RESTAURANT_PACKAGE,
  PLANS,
  SET_RESTAURANT_LISTING,
  SET_RESTAURANT_STATUS,
} from '@/lib/graphql';

const { Text } = Typography;

type PlanInfo = {
  key: string;
  name: string;
  monthlyPriceCents?: number;
  trialDays?: number;
  annualFreeMonths?: number;
  durationUnit?: string | null;
  durationCount?: number | null;
  visibleOnPricing?: boolean | null;
};

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}

function subscriptionFromPaidPeriodResult(
  assigned: {
    id: string;
    plan: string;
    status: string;
    monthlyPriceCents?: number | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    trialEndsAt?: string | null;
  },
): NonNullable<AdminRestaurantRecord['subscription']> {
  return {
    id: assigned.id,
    plan: assigned.plan,
    status: assigned.status,
    monthlyPriceCents: assigned.monthlyPriceCents ?? undefined,
    currentPeriodStart: assigned.currentPeriodStart,
    currentPeriodEnd: assigned.currentPeriodEnd,
    trialEndsAt: assigned.trialEndsAt,
  };
}

export function AdminRestaurantPackagePanel({
  restaurant,
  onSaved,
  wrapInCard = true,
}: {
  restaurant: AdminRestaurantRecord;
  onSaved?: (restaurant: AdminRestaurantRecord) => void;
  wrapInCard?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [selectedRestaurantStatus, setSelectedRestaurantStatus] = useState<string>();
  const [selectedVisibility, setSelectedVisibility] = useState('visible');
  const [selectedActivity, setSelectedActivity] = useState('active');
  const { data: plansData } = useQuery(PLANS);
  const [assignPackage, { loading: assigningPlan }] = useMutation(ADMIN_ASSIGN_RESTAURANT_PACKAGE);
  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [setListing] = useMutation(SET_RESTAURANT_LISTING);

  const plans = (plansData?.plans ?? []) as PlanInfo[];
  const sub = restaurant.subscription;
  const currentPlan = plans.find((p) => p.key === sub?.plan);
  const priceSuffix = formatPlanPriceSuffix(currentPlan?.durationUnit, currentPlan?.durationCount).replace(
    ' / ',
    '/',
  );

  useEffect(() => {
    setSelectedPlan(restaurant.subscription?.plan);
    setSelectedRestaurantStatus(restaurant.status);
    setSelectedVisibility(restaurantVisibility(restaurant.visibility));
    setSelectedActivity(restaurantActivity(restaurant.activity));
  }, [
    restaurant.id,
    restaurant.status,
    restaurant.visibility,
    restaurant.activity,
    restaurant.subscription?.plan,
  ]);

  const applyPackageAndStatus = async () => {
    try {
      let hasChanges = false;
      let next: AdminRestaurantRecord = { ...restaurant };

      const planChanged = Boolean(selectedPlan && selectedPlan !== restaurant.subscription?.plan);
      const statusChanged = Boolean(
        selectedRestaurantStatus && selectedRestaurantStatus !== restaurant.status,
      );
      const visibilityChanged = selectedVisibility !== restaurantVisibility(restaurant.visibility);
      const activityChanged = selectedActivity !== restaurantActivity(restaurant.activity);

      if (!planChanged && !statusChanged && !visibilityChanged && !activityChanged) {
        message.info('No changes to save');
        return;
      }

      if (planChanged && selectedPlan) {
        const previousEnd = restaurant.subscription?.currentPeriodEnd;
        const result = await assignPackage({
          variables: { restaurantId: restaurant.id, plan: selectedPlan },
        });
        const assigned = result.data?.adminAssignRestaurantPackage;
        if (assigned) {
          next = {
            ...next,
            subscription: subscriptionFromPaidPeriodResult(assigned),
          };
          const extended =
            previousEnd &&
            assigned.currentPeriodEnd &&
            dayjs(assigned.currentPeriodEnd).isAfter(dayjs(previousEnd));
          message.success(
            restaurant.subscription
              ? extended
                ? 'Package updated and billing period extended'
                : 'Package updated'
              : 'Package assigned',
          );
        } else {
          message.success('Package updated');
        }
        hasChanges = true;
      }

      if (statusChanged && selectedRestaurantStatus) {
        await setStatus({ variables: { id: restaurant.id, status: selectedRestaurantStatus } });
        message.success('Status updated');
        next = { ...next, status: selectedRestaurantStatus };
        hasChanges = true;
      }

      if (visibilityChanged || activityChanged) {
        await setListing({
          variables: {
            id: restaurant.id,
            visibility: selectedVisibility,
            activity: selectedActivity,
          },
        });
        message.success('Listing updated');
        next = { ...next, visibility: selectedVisibility, activity: selectedActivity };
        hasChanges = true;
      }

      if (!hasChanges) {
        message.info('Select a package or status to update');
        return;
      }

      onSaved?.(next);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update package or status');
    }
  };

  const renewalHint = sub?.currentPeriodEnd
    ? `${sub.status === 'trialing' ? 'Trial / period ends' : 'Renews'} ${dayjs(sub.currentPeriodEnd).format('MMM D, YYYY')}`
    : 'No billing period on file';

  const body = (
    <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <StatCard
            label="Current plan"
            value={sub?.plan ? String(sub.plan).toUpperCase() : 'None'}
            hint={
              sub
                ? `${statusLabel(sub.status)} · ${money(sub.monthlyPriceCents)}${priceSuffix}`
                : 'No package assigned'
            }
            hintTone={sub?.status === 'active' || sub?.status === 'trialing' ? 'positive' : 'neutral'}
          />
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <Card styles={{ body: { padding: 20, height: '100%' } }} style={{ width: '100%' }}>
            <Text
              type="secondary"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Restaurant status
            </Text>
            <div style={{ marginTop: 8 }}>
              <Space size={6} wrap>
                <StatusTag status={restaurant.status} />
                <StatusTag status={restaurantVisibility(restaurant.visibility)} />
                <StatusTag status={restaurantActivity(restaurant.activity)} />
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <StatCard
            label="Next billing"
            value={
              sub?.currentPeriodEnd ? dayjs(sub.currentPeriodEnd).format('MMM D') : '—'
            }
            hint={
              sub?.status === 'trialing' && sub.trialEndsAt
                ? `Trial ends ${dayjs(sub.trialEndsAt).format('MMM D, YYYY')}`
                : renewalHint
            }
          />
        </Col>
      </Row>

      <AdminPaidPeriodStartForm restaurant={restaurant} onSaved={onSaved} />

      <Card title="Change package">
        <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
          Changing the package extends the billing period by that package’s duration from the later
          of today or the current end date.
        </Text>
        <Form layout="vertical">
          <Form.Item label="Package" required style={{ marginBottom: spacing.md }}>
            <PlanSelector plans={plans} value={selectedPlan} onChange={setSelectedPlan} />
          </Form.Item>
          <Form.Item label="Restaurant status" required style={{ marginBottom: spacing.md }}>
            <Select
              value={selectedRestaurantStatus}
              onChange={setSelectedRestaurantStatus}
              options={RESTAURANT_STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            label="Visibility"
            extra="Not visible hides this restaurant from diner search and its public page."
            style={{ marginBottom: spacing.md }}
          >
            <Select
              value={selectedVisibility}
              onChange={setSelectedVisibility}
              options={RESTAURANT_VISIBILITY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            label="Activity"
            extra="Inactive also hides it from diner search and the public page. Approval and trial are unchanged."
            style={{ marginBottom: spacing.md }}
          >
            <Select
              value={selectedActivity}
              onChange={setSelectedActivity}
              options={RESTAURANT_ACTIVITY_OPTIONS}
            />
          </Form.Item>
          <Button
            type="primary"
            loading={assigningPlan}
            disabled={!selectedRestaurantStatus || !selectedVisibility || !selectedActivity}
            onClick={() => void applyPackageAndStatus()}
          >
            Update package & status
          </Button>
        </Form>
      </Card>
    </Space>
  );

  if (!wrapInCard) return <div component="AdminRestaurantPackagePanel">{body}</div>;

  return <div component="AdminRestaurantPackagePanel">{body}</div>;
}
