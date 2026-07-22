'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Typography } from 'antd';
import {
  formatPlanDollars,
  getPlanPriceDisplay,
  planForBillingPeriod,
  type AnnualBillingSettings,
  type BillingPeriod,
  type PlanPricingFields,
} from '@reservations/shared';

const { Text } = Typography;

export type { BillingPeriod, AnnualBillingSettings };

export type PlanPriceProps = {
  plan: PlanPricingFields;
  planKey?: string;
  size?: 'large' | 'medium' | 'small';
  showSecondaryNote?: boolean;
  billingPeriod?: BillingPeriod;
  annualBilling?: AnnualBillingSettings | null;
  style?: CSSProperties;
};

const SIZE_MAP = {
  large: { price: 36, strike: 18 },
  medium: { price: 24, strike: 14 },
  small: { price: 16, strike: 12 },
} as const;

export function PlanPrice({
  plan,
  planKey,
  size = 'large',
  showSecondaryNote = true,
  billingPeriod = 'monthly',
  annualBilling,
  style,
}: PlanPriceProps) {
  const display = getPlanPriceDisplay(
    planForBillingPeriod(plan, billingPeriod, {
      annualBilling,
      planKey,
    }),
  );
  const sizes = SIZE_MAP[size];

  let strikeContent: ReactNode = null;
  if (display.showStrikethrough && display.originalCents != null) {
    const strikeLabel =
      display.primarySuffix === ' / first month'
        ? `${formatPlanDollars(display.originalCents)}/mo`
        : display.discountTag?.includes('annual') || display.discountTag?.includes('free on annual')
          ? `${formatPlanDollars(display.originalCents)}/mo`
          : formatPlanDollars(display.originalCents);
    strikeContent = (
      <Text
        delete
        type="secondary"
        style={{ fontSize: sizes.strike, marginRight: 8, fontWeight: 500 }}
      >
        {strikeLabel}
      </Text>
    );
  }

  return (
    <div component="PlanPrice" style={style}>
      <div>
        {strikeContent}
        <Text style={{ fontSize: sizes.price, fontWeight: 700 }}>
          {formatPlanDollars(display.primaryCents)}
        </Text>
        <Text type="secondary">{display.primarySuffix}</Text>
      </div>
      {showSecondaryNote && display.secondaryNote ? (
        <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
          {display.secondaryNote}
        </Text>
      ) : null}
      {display.savingsNote ? (
        <Text
          style={{
            display: 'block',
            fontSize: 13,
            marginTop: 4,
            color: '#389e0d',
            fontWeight: 600,
          }}
        >
          {display.savingsNote}
        </Text>
      ) : null}
    </div>
  );
}
