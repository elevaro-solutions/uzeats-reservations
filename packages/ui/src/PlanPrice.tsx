'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Typography } from 'antd';
import {
  formatPlanDollars,
  getPlanPriceDisplay,
  type PlanPricingFields,
} from '@reservations/shared';

const { Text } = Typography;

export type PlanPriceProps = {
  plan: PlanPricingFields;
  size?: 'large' | 'medium' | 'small';
  showSecondaryNote?: boolean;
  style?: CSSProperties;
};

const SIZE_MAP = {
  large: { price: 36, strike: 18 },
  medium: { price: 24, strike: 14 },
  small: { price: 16, strike: 12 },
} as const;

export function PlanPrice({
  plan,
  size = 'large',
  showSecondaryNote = true,
  style,
}: PlanPriceProps) {
  const display = getPlanPriceDisplay(plan);
  const sizes = SIZE_MAP[size];

  let strikeContent: ReactNode = null;
  if (display.showStrikethrough && display.originalCents != null) {
    const strikeLabel =
      display.primarySuffix === ' / first month'
        ? `${formatPlanDollars(display.originalCents)}/mo`
        : display.discountTag?.includes('annual')
          ? `${formatPlanDollars(display.originalCents)}/yr`
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
