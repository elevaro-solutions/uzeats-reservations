'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Form, Select, Space, Typography, message } from 'antd';
import { spacing } from '@reservations/ui';
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
        const sub = result.data?.adminAssignRestaurantPackage;
        if (sub) {
          next = {
            ...next,
            subscription: {
              id: sub.id,
              plan: sub.plan,
              status: sub.status,
              monthlyPriceCents: sub.monthlyPriceCents,
              currentPeriodStart: sub.currentPeriodStart,
              currentPeriodEnd: sub.currentPeriodEnd,
              trialEndsAt: sub.trialEndsAt,
            },
          };
          const extended =
            previousEnd &&
            sub.currentPeriodEnd &&
            dayjs(sub.currentPeriodEnd).isAfter(dayjs(previousEnd));
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

  const body = (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {restaurant.subscription ? (
        <div
          style={{
            border: '1px solid #ece7df',
            borderRadius: 10,
            background: '#f8f6f3',
            padding: '12px 14px',
          }}
        >
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>
              Current package dates
            </Text>
            {restaurant.subscription.status === 'trialing' && restaurant.subscription.trialEndsAt ? (
              <Text>
                Trial ends{' '}
                <Text strong>
                  {dayjs(restaurant.subscription.trialEndsAt).format('MMM D, YYYY')}
                </Text>
              </Text>
            ) : null}
            {restaurant.subscription.currentPeriodEnd ? (
              <Text>
                {restaurant.subscription.status === 'trialing'
                  ? 'Billing period ends'
                  : 'Next pay / renews'}{' '}
                <Text strong>
                  {dayjs(restaurant.subscription.currentPeriodEnd).format('MMM D, YYYY')}
                </Text>
                {restaurant.subscription.currentPeriodStart ? (
                  <Text type="secondary">
                    {' '}
                    (started {dayjs(restaurant.subscription.currentPeriodStart).format('MMM D, YYYY')}
                    )
                  </Text>
                ) : null}
              </Text>
            ) : (
              <Text type="secondary">No billing period on file yet.</Text>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Updating the package extends the period by one billing cycle from the later of today
              or the current end date.
            </Text>
          </Space>
        </div>
      ) : (
        <Text type="secondary">No package assigned yet. Choose a plan below to assign one.</Text>
      )}
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
    </Space>
  );

  if (!wrapInCard) return <div component="AdminRestaurantPackagePanel">{body}</div>;

  return (
    <div component="AdminRestaurantPackagePanel">
      <Card title="Package & status">{body}</Card>
    </div>
  );
}
