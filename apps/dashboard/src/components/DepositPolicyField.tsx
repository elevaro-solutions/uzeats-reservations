'use client';

import { Form, Select } from 'antd';
import {
  DEFAULT_DEPOSIT_POLICY,
  DEPOSIT_POLICIES,
  DEPOSIT_POLICY_LABELS,
} from '@reservations/shared';
import { restaurantFieldTooltips } from '@/lib/restaurantFormTooltips';

const depositPolicyOptions = DEPOSIT_POLICIES.map((value) => ({
  value,
  label: DEPOSIT_POLICY_LABELS[value],
}));

/** Restaurant-level choice between saving a card (no-show fee) and charging at booking. */
export function DepositPolicyField() {
  return (
    <Form.Item
      name="depositPolicy"
      label="Deposit policy"
      tooltip={restaurantFieldTooltips.depositPolicy}
      initialValue={DEFAULT_DEPOSIT_POLICY}
    >
      <Select options={depositPolicyOptions} />
    </Form.Item>
  );
}
