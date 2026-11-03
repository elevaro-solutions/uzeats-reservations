'use client';

import Link from 'next/link';
import { Alert, Button } from 'antd';
import { usePathname, useSearchParams } from 'next/navigation';
import { isFailToPayPubliclyListed, type FailToPayStage } from '@reservations/shared';
import { radii, spacing } from '@reservations/ui';
import { partnerPageLabel } from '@/lib/dashboardNav';

export type BillingEnforcementInfo = {
  stage: FailToPayStage;
  daysPastDue?: number | null;
  outstandingCents?: number;
  paused?: boolean;
  publiclyListed?: boolean;
};

/** Query flag set when DashShell bounces a locked Partner Hub route to Billing. */
export const BILLING_ACCESS_LOCKED_PARAM = 'access';
export const BILLING_ACCESS_LOCKED_VALUE = 'locked';
export const BILLING_ACCESS_FROM_PARAM = 'from';

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function safeFromPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/billing')) {
    return null;
  }
  return raw;
}

export function billingEnforcementMessage(
  info: BillingEnforcementInfo,
  options?: { redirectedFrom?: string | null },
) {
  const days = info.daysPastDue ?? 0;
  const amount =
    info.outstandingCents && info.outstandingCents > 0
      ? ` Outstanding: ${money(info.outstandingCents)}.`
      : '';
  const fromLabel = options?.redirectedFrom
    ? partnerPageLabel(options.redirectedFrom)
    : null;
  const redirectNote = fromLabel
    ? ` You were redirected from ${fromLabel} because unpaid invoices limit Partner Hub access.`
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
      message: fromLabel
        ? `${fromLabel} is locked until you pay`
        : 'Partner Hub is limited to Billing and day-of tools',
      description: `${redirectNote || ' Settings, floor plan, marketing, and other pages send you here until invoices are paid.'} New in-product reservations are paused (${days} days past due). Pay within 30 days of this restriction or the subscription will end.${amount}`.trim(),
    };
  }
  if (info.stage === 'terminated') {
    return {
      type: 'error' as const,
      message: fromLabel
        ? `${fromLabel} is locked — subscription ended`
        : 'Subscription ended for unpaid invoices',
      description: `${redirectNote || ' Only Billing and support stay open until you settle the balance.'} Pay the balance, then choose a plan to list again.${amount}`.trim(),
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onBilling = pathname === '/billing' || pathname.startsWith('/billing/');
  const lockedRedirect =
    searchParams.get(BILLING_ACCESS_LOCKED_PARAM) === BILLING_ACCESS_LOCKED_VALUE;
  const redirectedFrom = lockedRedirect ? safeFromPath(searchParams.get(BILLING_ACCESS_FROM_PARAM)) : null;

  if (!info) return null;
  if (info.stage === 'current' && !info.paused) return null;
  const copy = billingEnforcementMessage(info, { redirectedFrom });
  if (!copy) return null;
  const href = restaurantParam ? `/billing?restaurant=${restaurantParam}` : '/billing';
  return (
    <Alert
      type={copy.type}
      showIcon
      className="rt-billing-enforcement-alert"
      style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}
      title={copy.message}
      description={
        <span>
          {copy.description}{' '}
          {!onBilling && !isFailToPayPubliclyListed(info.stage) ? 'Pay now on Billing.' : ''}
          {onBilling && (info.stage === 'restricted' || info.stage === 'terminated')
            ? ' Pay the open invoices below to unlock the rest of Partner Hub.'
            : ''}
        </span>
      }
      action={
        onBilling ? undefined : (
          <Link href={href}>
            <Button size="small" type="primary" danger={copy.type === 'error'}>
              Open Billing
            </Button>
          </Link>
        )
      }
    />
  );
}
