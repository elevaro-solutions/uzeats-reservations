'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Modal, Space, Switch, Tag, Typography, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  CONFIRM_VIRTUAL_ROOM_ADDON_PAYMENT,
  SET_VIRTUAL_ROOM_ADDON,
  START_VIRTUAL_ROOM_ADDON_PAYMENT,
  VIRTUAL_ROOM_ADDON,
} from '@/lib/graphql';
import { SignupPaymentForm, type SignupPaymentMode } from '@/components/SignupPaymentForm';

const { Paragraph, Text } = Typography;

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type AddonStatus = {
  platformEnabled: boolean;
  enabled: boolean;
  included?: boolean;
  requiresPayment?: boolean;
  eligible: boolean;
  active: boolean;
  ineligibleReason?: string | null;
  monthlyPriceCents: number;
  effectiveMonthlyPriceCents?: number;
  perGuestFeeCents: number;
  selectionFeeMode?: 'per_guest' | 'per_table';
  selectionFeePayer?: 'restaurant' | 'diner' | 'combined' | 'diner_share';
};

export function VirtualRoomAddonCard({
  restaurantId,
  canEditBilling,
  showWhenUnavailable = false,
}: {
  restaurantId: string;
  canEditBilling: boolean;
  /** When true, render a short notice if the platform kill switch is off (used on Live floor 3D). */
  showWhenUnavailable?: boolean;
}) {
  const { data, loading, refetch } = useQuery(VIRTUAL_ROOM_ADDON, {
    variables: { restaurantId },
    skip: !restaurantId,
  });
  const [setAddon, { loading: saving }] = useMutation(SET_VIRTUAL_ROOM_ADDON);
  const [startPayment, { loading: startingPay }] = useMutation(START_VIRTUAL_ROOM_ADDON_PAYMENT);
  const [confirmPayment] = useMutation(CONFIRM_VIRTUAL_ROOM_ADDON_PAYMENT);
  const [checkout, setCheckout] = useState<{
    clientSecret: string;
    paymentMode: SignupPaymentMode;
    amountDueCents: number;
    paymentIntentId?: string | null;
  } | null>(null);
  const status = data?.virtualRoomAddon as AddonStatus | undefined;

  if (loading) return showWhenUnavailable ? <Card loading /> : null;
  if (!status?.platformEnabled) {
    if (!showWhenUnavailable) return null;
    return (
      <Card
        title={
          <Space size={8}>
            Virtual 3D room
            <Tag color="purple">Experimental</Tag>
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Virtual 3D room is not available on this platform yet. When it is turned on, you can enable
          it here so guests can explore the dining room and pick their table before booking.
        </Paragraph>
      </Card>
    );
  }

  const monthly = formatCents(status.monthlyPriceCents);
  const perGuest = formatCents(status.perGuestFeeCents);
  const feeUnit =
    (status.selectionFeeMode ?? 'per_guest') === 'per_table' ? 'per table pick' : 'per guest';
  const feeCopy = (() => {
    switch (status.selectionFeePayer) {
      case 'diner':
        return `${perGuest} ${feeUnit} is charged to the diner at booking when they pick in 3D.`;
      case 'combined':
        return `Diners pay the platform fee (${perGuest} ${feeUnit}) plus any restaurant fee you set, at booking.`;
      case 'diner_share':
        return `Diners pay your restaurant fee at booking; ${perGuest} ${feeUnit} is billed on your invoice as the platform cut when the visit completes.`;
      default:
        return `${perGuest} ${feeUnit} is billed on your invoice when a visit completes after a 3D table pick.`;
    }
  })();

  const enablePaid = async () => {
    try {
      const { data: payData } = await startPayment({ variables: { restaurantId } });
      const payload = payData?.startVirtualRoomAddonPayment;
      if (!payload) {
        message.error('Could not start payment');
        return;
      }
      if (payload.paid) {
        message.success('Virtual 3D room turned on');
        await refetch();
        return;
      }
      if (payload.clientSecret) {
        setCheckout({
          clientSecret: payload.clientSecret,
          paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
          amountDueCents: payload.amountDueCents ?? status.monthlyPriceCents,
          paymentIntentId: payload.paymentIntentId,
        });
        return;
      }
      message.error('Could not start payment');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start payment');
    }
  };

  const toggle = (enabled: boolean) => {
    if (status.included) return;
    if (!enabled) {
      void (async () => {
        try {
          await setAddon({
            variables: { restaurantId, enabled: false },
            refetchQueries: [{ query: VIRTUAL_ROOM_ADDON, variables: { restaurantId } }],
            awaitRefetchQueries: true,
          });
          message.success('Virtual 3D room turned off');
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Could not update the add-on');
        }
      })();
      return;
    }

    if (status.requiresPayment || status.monthlyPriceCents > 0) {
      Modal.confirm({
        title: 'Turn on the Virtual 3D room?',
        content: (
          <Space orientation="vertical" size={4}>
            <Text>
              {monthly}/month is charged upfront before access. Later months while it stays on are
              billed on your period invoice (due the 1st of the next month, UTC).
            </Text>
            <Text>{feeCopy}</Text>
            <Text type="secondary">
              Paid add-on for Core (and any plan with floor plans that does not include 3D). Pro
              includes Virtual 3D free. Experimental — turn off anytime.
            </Text>
          </Space>
        ),
        okText: `Pay ${monthly} & turn on`,
        onOk: () => enablePaid(),
      });
      return;
    }

    void (async () => {
      try {
        await setAddon({
          variables: { restaurantId, enabled: true },
          refetchQueries: [{ query: VIRTUAL_ROOM_ADDON, variables: { restaurantId } }],
          awaitRefetchQueries: true,
        });
        message.success('Virtual 3D room turned on');
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Could not update the add-on');
      }
    })();
  };

  return (
    <>
      <Card
        title={
          <Space size={8}>
            Virtual 3D room
            <Tag color="purple">Experimental</Tag>
          </Space>
        }
        extra={
          status.enabled || status.included ? (
            <Link href="/virtual-room">
              <Button size="small">Open 3D room editor</Button>
            </Link>
          ) : null
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <Text strong>3D dining room &amp; table selection</Text>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              {status.included
                ? `Included in your plan at no extra monthly charge. ${feeCopy}`
                : `Turn your floor plan and photos into a 3D room diners can explore and pick their table from. ${monthly}/mo charged upfront when you turn it on. ${feeCopy}`}
            </Paragraph>
          </div>
          {status.included ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Included in plan
            </Tag>
          ) : (
            <Switch
              checked={status.enabled}
              disabled={!canEditBilling || (!status.enabled && !status.eligible)}
              loading={saving || startingPay}
              onChange={toggle}
              checkedChildren="On"
              unCheckedChildren="Off"
            />
          )}
        </div>
        {!status.eligible && status.ineligibleReason ? (
          <Alert
            style={{ marginTop: 12 }}
            type={status.enabled ? 'warning' : 'info'}
            showIcon
            message={status.ineligibleReason}
            description={
              status.enabled
                ? 'The add-on is paused and not billed until your plan qualifies again.'
                : undefined
            }
          />
        ) : null}
        {!canEditBilling ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            Only the restaurant owner can change billing add-ons.
          </Text>
        ) : null}
      </Card>

      {checkout ? (
        <Modal
          open
          title="Pay for Virtual 3D room"
          footer={null}
          onCancel={() => setCheckout(null)}
          destroyOnHidden
        >
          <SignupPaymentForm
            clientSecret={checkout.clientSecret}
            paymentMode={checkout.paymentMode}
            planName="Virtual 3D room"
            monthlyLabel={formatCents(checkout.amountDueCents)}
            trialDays={0}
            description={`Pay ${formatCents(checkout.amountDueCents)} now to enable Virtual 3D for this month. Access starts after payment succeeds.`}
            onSuccess={() => {
              void (async () => {
                try {
                  if (checkout.paymentIntentId) {
                    await confirmPayment({
                      variables: {
                        restaurantId,
                        paymentIntentId: checkout.paymentIntentId,
                      },
                    });
                  }
                  setCheckout(null);
                  message.success('Virtual 3D room turned on');
                  await refetch();
                } catch (err: unknown) {
                  message.error(err instanceof Error ? err.message : 'Payment confirmation failed');
                }
              })();
            }}
          />
        </Modal>
      ) : null}
    </>
  );
}
