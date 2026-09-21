'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Form, Row, Select, Space, Typography, message } from 'antd';
import { StatCard, StatusTag, spacing } from '@reservations/ui';
import {
  PlanSelector,
  RESTAURANT_STATUS_OPTIONS,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import { ADMIN_ASSIGN_RESTAURANT_PACKAGE, PLANS, SET_RESTAURANT_STATUS } from '@/lib/graphql';

const { Text } = Typography;

type PlanInfo = {
  key: string;
  name: string;
  monthlyPriceCents?: number;
  trialDays?: number;
  annualFreeMonths?: number;
};

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
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
  const { data: plansData } = useQuery(PLANS);
  const [assignPackage, { loading: assigningPlan }] = useMutation(ADMIN_ASSIGN_RESTAURANT_PACKAGE);
  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);

  const plans = (plansData?.plans ?? []) as PlanInfo[];
  const sub = restaurant.subscription;

  useEffect(() => {
    setSelectedPlan(restaurant.subscription?.plan);
    setSelectedRestaurantStatus(restaurant.status);
  }, [restaurant.id, restaurant.status, restaurant.subscription?.plan]);

  const applyPackageAndStatus = async () => {
    try {
      let hasChanges = false;
      let next: AdminRestaurantRecord = { ...restaurant };

      if (selectedPlan) {
        const previousEnd = restaurant.subscription?.currentPeriodEnd;
        const result = await assignPackage({
          variables: { restaurantId: restaurant.id, plan: selectedPlan },
        });
        const assigned = result.data?.adminAssignRestaurantPackage;
        if (assigned) {
          next = {
            ...next,
            subscription: {
              id: assigned.id,
              plan: assigned.plan,
              status: assigned.status,
              monthlyPriceCents: assigned.monthlyPriceCents,
              currentPeriodStart: assigned.currentPeriodStart,
              currentPeriodEnd: assigned.currentPeriodEnd,
              trialEndsAt: assigned.trialEndsAt,
            },
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

      if (selectedRestaurantStatus && selectedRestaurantStatus !== restaurant.status) {
        await setStatus({ variables: { id: restaurant.id, status: selectedRestaurantStatus } });
        message.success('Status updated');
        next = { ...next, status: selectedRestaurantStatus };
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
            hint={sub ? `${statusLabel(sub.status)} · ${money(sub.monthlyPriceCents)}/mo` : 'No package assigned'}
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
              <StatusTag status={restaurant.status} />
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

      <Card title="Change package">
        <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
          Changing the package extends the billing period by one cycle from the later of today or
          the current end date.
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
          <Button
            type="primary"
            loading={assigningPlan}
            disabled={!selectedPlan || !selectedRestaurantStatus}
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
