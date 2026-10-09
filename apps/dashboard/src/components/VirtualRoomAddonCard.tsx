'use client';

import Link from 'next/link';
import { Alert, Button, Card, Modal, Space, Switch, Tag, Typography, message } from 'antd';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { SET_VIRTUAL_ROOM_ADDON, VIRTUAL_ROOM_ADDON } from '@/lib/graphql';

const { Paragraph, Text } = Typography;

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type AddonStatus = {
  platformEnabled: boolean;
  enabled: boolean;
  eligible: boolean;
  active: boolean;
  ineligibleReason?: string | null;
  monthlyPriceCents: number;
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
  const { data, loading } = useQuery(VIRTUAL_ROOM_ADDON, {
    variables: { restaurantId },
    skip: !restaurantId,
  });
  const [setAddon, { loading: saving }] = useMutation(SET_VIRTUAL_ROOM_ADDON);
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

  const toggle = (enabled: boolean) => {
    const run = async () => {
      try {
        await setAddon({
          variables: { restaurantId, enabled },
          refetchQueries: [{ query: VIRTUAL_ROOM_ADDON, variables: { restaurantId } }],
          awaitRefetchQueries: true,
        });
        message.success(enabled ? 'Virtual 3D room turned on' : 'Virtual 3D room turned off');
      } catch (err: any) {
        message.error(err?.message || 'Could not update the add-on');
      }
    };
    if (!enabled) {
      void run();
      return;
    }
    Modal.confirm({
      title: 'Turn on the Virtual 3D room?',
      content: (
        <Space orientation="vertical" size={4}>
          <Text>
            {monthly}/month is added to this month&apos;s invoice and every month it stays on.
          </Text>
          <Text>{feeCopy}</Text>
          <Text type="secondary">This is an experimental feature. You can turn it off anytime.</Text>
        </Space>
      ),
      okText: `Turn on · ${monthly}/mo`,
      onOk: run,
    });
  };

  return (
    <Card
      title={
        <Space size={8}>
          Virtual 3D room
          <Tag color="purple">Experimental</Tag>
        </Space>
      }
      extra={
        status.enabled ? (
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
            Turn your floor plan and photos into a 3D room diners can explore and pick their table
            from. {monthly}/month while on. {feeCopy}
          </Paragraph>
        </div>
        <Switch
          checked={status.enabled}
          disabled={!canEditBilling || (!status.enabled && !status.eligible)}
          loading={saving}
          onChange={toggle}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
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
  );
}
