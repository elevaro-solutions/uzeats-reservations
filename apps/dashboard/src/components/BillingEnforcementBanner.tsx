'use client';

import Link from 'next/link';
import { Alert, Button } from 'antd';
import { isFailToPayPubliclyListed, type FailToPayStage } from '@reservations/shared';
import { radii, spacing } from '@reservations/ui';

export type BillingEnforcementInfo = {
  stage: FailToPayStage;
  daysPastDue?: number | null;
  outstandingCents?: number;
  paused?: boolean;
  publiclyListed?: boolean;
};

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function billingEnforcementMessage(info: BillingEnforcementInfo) {
  const days = info.daysPastDue ?? 0;
  const amount =
    info.outstandingCents && info.outstandingCents > 0
      ? ` Outstanding: ${money(info.outstandingCents)}.`
      : '';
  if (info.paused && info.stage !== 'terminated') {
    return {
      type: 'warning' as const,
      message: 'Billing enforcement is paused',
      description: `An admin paused the fail-to-pay ladder for this location.${amount}`,
    };
  }
  if (info.stage === 'grace' || info.stage === 'overdue') {
    return {
      type: 'warning' as const,
      message: info.stage === 'overdue' ? 'Invoice overdue' : 'Invoice due',
      description: `Pay within the next few days to keep your diner listing.${amount} ${
        info.stage === 'overdue' ? 'Finance charges now apply.' : ''
      }`.trim(),
    };
  }
  if (info.stage === 'unlisted') {
    return {
      type: 'error' as const,
      message: 'Diner listing is hidden',
      description: `Guests cannot find this restaurant or make new online bookings (${days} days past due). Pay to restore search.${amount} Existing reservations stay on the books.`,
    };
  }
  if (info.stage === 'restricted') {
    return {
      type: 'error' as const,
      message: 'Partner Hub is limited to billing and existing reservations',
      description: `New in-product reservations are paused (${days} days past due). Pay within 30 days of this restriction or the subscription will end.${amount}`,
    };
  }
  if (info.stage === 'terminated') {
    return {
      type: 'error' as const,
      message: 'Subscription ended for unpaid invoices',
      description: `Pay the balance, then choose a plan to list again.${amount}`,
    };
  }
  return null;
}

export function BillingEnforcementBanner({
  info,
  restaurantParam,
}: {
  info: BillingEnforcementInfo | null | undefined;
  restaurantParam?: string;
}) {
  if (!info) return null;
  if (info.stage === 'current' && !info.paused) return null;
  const copy = billingEnforcementMessage(info);
  if (!copy) return null;
  const href = restaurantParam ? `/billing?restaurant=${restaurantParam}` : '/billing';
  return (
    <Alert
      type={copy.type}
      showIcon
      className="rt-billing-enforcement-alert"
      style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}
      message={copy.message}
      description={
        <span>
          {copy.description}{' '}
          {!isFailToPayPubliclyListed(info.stage) ? 'Pay now on Billing.' : ''}
        </span>
      }
      action={
        <Link href={href}>
          <Button size="small" type="primary" danger={copy.type === 'error'}>
            Open Billing
          </Button>
        </Link>
      }
    />
  );
}
