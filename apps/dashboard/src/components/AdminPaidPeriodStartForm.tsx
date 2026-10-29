'use client';

import { useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useMutation } from '@/lib/apollo-hooks';
import { Button, Card, DatePicker, Form, Typography, message } from 'antd';
import { spacing } from '@reservations/ui';
import type { AdminRestaurantRecord } from '@/components/AdminManageRestaurant';
import { ADMIN_SET_SUBSCRIPTION_PAID_PERIOD_START } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/roles';

const { Text } = Typography;

function paidPeriodStartFromSub(sub: NonNullable<AdminRestaurantRecord['subscription']>): Dayjs | null {
  if (sub.status === 'trialing' && sub.trialEndsAt) return dayjs(sub.trialEndsAt);
  if (sub.currentPeriodStart) return dayjs(sub.currentPeriodStart);
  return null;
}

export function AdminPaidPeriodStartForm({
  restaurant,
  onSaved,
}: {
  restaurant: AdminRestaurantRecord;
  onSaved?: (restaurant: AdminRestaurantRecord) => void;
}) {
  const { user, isImpersonating } = useAuth();
  const canEdit = Boolean(user && isSuperAdmin(user.role) && !isImpersonating);
  const sub = restaurant.subscription;
  const [paidPeriodStart, setPaidPeriodStart] = useState<Dayjs | null>(
    sub ? paidPeriodStartFromSub(sub) : null,
  );
  const [setPaidStart, { loading }] = useMutation(ADMIN_SET_SUBSCRIPTION_PAID_PERIOD_START);

  useEffect(() => {
    setPaidPeriodStart(sub ? paidPeriodStartFromSub(sub) : null);
  }, [restaurant.id, sub?.status, sub?.trialEndsAt, sub?.currentPeriodStart]);

  if (!canEdit) return null;
  if (!sub) {
    return (
      <Card title="Paid period start">
        <Text type="secondary">Assign a package before setting when paid billing starts.</Text>
      </Card>
    );
  }

  const save = async () => {
    if (!paidPeriodStart) {
      message.info('Choose a paid period start date');
      return;
    }
    try {
      const result = await setPaidStart({
        variables: {
          restaurantId: restaurant.id,
          paidPeriodStart: paidPeriodStart.startOf('day').toISOString(),
        },
      });
      const updated = result.data?.adminSetSubscriptionPaidPeriodStart;
      if (updated) {
        onSaved?.({
          ...restaurant,
          subscription: {
            id: updated.id,
            plan: updated.plan,
            status: updated.status,
            monthlyPriceCents: updated.monthlyPriceCents ?? undefined,
            currentPeriodStart: updated.currentPeriodStart,
            currentPeriodEnd: updated.currentPeriodEnd,
            trialEndsAt: updated.trialEndsAt,
          },
        });
      }
      const startsInFuture = paidPeriodStart.startOf('day').isAfter(dayjs(), 'day');
      message.success(
        startsInFuture
          ? `Trial continues until ${paidPeriodStart.format('MMM D, YYYY')} (first charge)`
          : `Paid period starts ${paidPeriodStart.format('MMM D, YYYY')}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update paid period start');
    }
  };

  return (
    <Card title="Paid period start">
      <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
        Superadmin only. A future date keeps the restaurant on trial until that day (first charge).
        Today or earlier becomes the current paid cycle start; renewal is one calendar month later.
        Ending a trial today may charge Stripe if a card is on file.
      </Text>
      <Form layout="vertical">
        <Form.Item label="Paid period start" style={{ marginBottom: spacing.md }}>
          <DatePicker
            value={paidPeriodStart}
            onChange={(value) => setPaidPeriodStart(value)}
            allowClear={false}
            style={{ width: '100%', maxWidth: 280 }}
            format="MMM D, YYYY"
          />
        </Form.Item>
        <Button type="primary" loading={loading} disabled={!paidPeriodStart} onClick={() => void save()}>
          Save paid period start
        </Button>
      </Form>
    </Card>
  );
}
