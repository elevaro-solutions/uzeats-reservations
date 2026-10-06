'use client';

import { Input, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import { DollarOutlined, RollbackOutlined } from '@ant-design/icons';
import { useMutation } from '@/lib/apollo-hooks';
import {
  CHARGE_RESERVATION_NO_SHOW_FEE,
  REFUND_RESERVATION_NO_SHOW_FEE,
} from '@/lib/graphql';
import {
  canChargeNoShowFee,
  canRefundNoShowFee,
  formatUsd,
  type NoShowFeeFields,
} from '@/lib/reservationFormat';

type MenuItems = NonNullable<MenuProps['items']>;

type FeeActionReservation = NoShowFeeFields & { id: string };

type FeeMutations = {
  chargeFee: (opts: { variables: { id: string } }) => Promise<unknown>;
  refundFee: (opts: {
    variables: { id: string; reason?: string };
  }) => Promise<unknown>;
  charging: boolean;
  refunding: boolean;
};

/** Menu items for charge / retry / refund of a reservation's card-guarantee fee. */
export function buildNoShowFeeActionItems(
  reservation: FeeActionReservation | null | undefined,
  mutations: FeeMutations,
  onDone: () => void,
): MenuItems {
  if (!reservation) return [];
  const amount = formatUsd(reservation.noShowFeeCents) ?? '';

  const confirmCharge = () =>
    Modal.confirm({
      title: `Charge ${amount} no-show fee?`,
      content: 'The guest’s saved card is charged now and they are notified.',
      okText: 'Charge fee',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await mutations.chargeFee({ variables: { id: reservation.id } });
          message.success('No-show fee charged');
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Charge failed');
        }
        onDone();
      },
    });

  const confirmRefund = () => {
    let reason = '';
    Modal.confirm({
      title: `Refund ${amount} fee?`,
      content: (
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder="Optional note for the guest"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: 'Refund fee',
      onOk: async () => {
        try {
          await mutations.refundFee({
            variables: { id: reservation.id, reason: reason || undefined },
          });
          message.success('Fee refunded');
          onDone();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Refund failed');
        }
      },
    });
  };

  const items: MenuItems = [];
  if (canChargeNoShowFee(reservation)) {
    items.push({
      key: 'charge_no_show_fee',
      icon: <DollarOutlined />,
      label: reservation.cardGuaranteeStatus === 'failed' ? 'Retry no-show fee' : 'Charge no-show fee',
      danger: true,
      disabled: mutations.charging,
      onClick: confirmCharge,
    });
  }
  if (canRefundNoShowFee(reservation)) {
    items.push({
      key: 'refund_no_show_fee',
      icon: <RollbackOutlined />,
      label: 'Refund fee',
      disabled: mutations.refunding,
      onClick: confirmRefund,
    });
  }
  return items;
}

/** "Charge no-show fee" / "Refund fee" menu items for a reservation's card guarantee. */
export function useNoShowFeeActions(
  reservation: FeeActionReservation | null,
  onDone: () => void,
) {
  const [chargeFee, { loading: charging }] = useMutation(CHARGE_RESERVATION_NO_SHOW_FEE);
  const [refundFee, { loading: refunding }] = useMutation(REFUND_RESERVATION_NO_SHOW_FEE);

  return buildNoShowFeeActionItems(
    reservation,
    { chargeFee, refundFee, charging, refunding },
    onDone,
  );
}

/** Shared mutations for fee action menus across many table rows. */
export function useNoShowFeeMutations() {
  const [chargeFee, { loading: charging }] = useMutation(CHARGE_RESERVATION_NO_SHOW_FEE);
  const [refundFee, { loading: refunding }] = useMutation(REFUND_RESERVATION_NO_SHOW_FEE);
  return { chargeFee, refundFee, charging, refunding };
}
