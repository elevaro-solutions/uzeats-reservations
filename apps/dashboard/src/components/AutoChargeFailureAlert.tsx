'use client';

import Link from 'next/link';
import { Alert, Button, Space } from 'antd';
import dayjs from 'dayjs';

export type AutoChargeFailureInvoice = {
  number: string;
  status: string;
  payUrl?: string | null;
  autoChargeError?: string | null;
  autoChargePaused?: boolean | null;
  autoChargeRetriedByStripe?: boolean | null;
  nextAutoChargeAt?: string | null;
};

export function hasAutoChargeFailure(invoice: AutoChargeFailureInvoice) {
  return (
    Boolean(invoice.autoChargeError) && invoice.status !== 'paid' && invoice.status !== 'canceled'
  );
}

function retryCopy(invoice: AutoChargeFailureInvoice) {
  if (invoice.autoChargePaused) {
    return 'Retries are paused until you replace the card.';
  }
  if (invoice.autoChargeRetriedByStripe) {
    return 'Stripe will retry the renewal automatically.';
  }
  if (invoice.nextAutoChargeAt) {
    return `We will try again on ${dayjs(invoice.nextAutoChargeAt).format('MMM D, YYYY')}.`;
  }
  return '';
}

export function AutoChargeFailureAlert({
  invoice,
  extraCount = 0,
  canEditBilling,
  cardHref = '/billing?section=payment-method',
  showPay = true,
}: {
  invoice: AutoChargeFailureInvoice;
  /** Other open invoices that also failed to charge. */
  extraCount?: number;
  canEditBilling: boolean;
  cardHref?: string;
  showPay?: boolean;
}) {
  if (!hasAutoChargeFailure(invoice)) return null;
  const more = extraCount > 0 ? ` (+${extraCount} more)` : '';
  return (
    <Alert
      type="error"
      showIcon
      title={`Automatic charge failed for invoice ${invoice.number}${more}`}
      description={[
        `${invoice.autoChargeError}.`,
        retryCopy(invoice),
        canEditBilling ? 'Replacing the card retries open charges right away.' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      action={
        canEditBilling ? (
          <Space orientation="vertical" size={8}>
            <Link href={cardHref}>
              <Button type="primary" block>
                Replace card
              </Button>
            </Link>
            {showPay && invoice.payUrl ? (
              <Button block href={invoice.payUrl} target="_blank" rel="noreferrer">
                Pay now
              </Button>
            ) : null}
          </Space>
        ) : null
      }
    />
  );
}
