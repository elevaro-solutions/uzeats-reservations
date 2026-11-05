'use client';

import { Button, Drawer, Dropdown, Space, Tag, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  LayoutOutlined,
  LoginOutlined,
  MoreOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { formatTimeInTimeZone, formatUsDateTime } from '@reservations/shared';
import { FloorTableTile, type FloorTableCardState } from '@/components/FloorTablesCards';
import { canRefundDeposit, formatDepositStatus, formatUsd } from '@/lib/reservationFormat';
import { floorOpsStatusColor, floorOpsStatusLabel } from '@/lib/floorOpsStatus';

const { Text } = Typography;

type DrawerReservation = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  depositAmountCents?: number | null;
  depositRefundedCents?: number | null;
  depositRefundableCents?: number | null;
  depositStatus?: string | null;
  diner?: { firstName?: string; lastName?: string };
};

export type FloorDrawerTableState = Omit<FloorTableCardState, 'upcoming' | 'reservation'> & {
  seatedMinutes?: number | null;
  table: FloorTableCardState['table'] & {
    floorArea?: string | null;
    photoUrl?: string | null;
  };
  reservation?: DrawerReservation | null;
  upcoming?: FloorDrawerArrival[];
};

export type FloorDrawerArrival = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  diner?: { firstName?: string; lastName?: string };
};

function dinerName(diner?: { firstName?: string; lastName?: string }): string {
  return `${diner?.firstName ?? ''} ${diner?.lastName ?? ''}`.trim() || 'Guest';
}

function seatsLabel(table: FloorTableCardState['table']): string {
  return table.minCapacity && table.minCapacity !== table.maxCapacity
    ? `${table.minCapacity}–${table.maxCapacity} seats`
    : `${table.maxCapacity} seats`;
}

function formatTimer(minutes: number): string {
  const m = Math.max(0, minutes);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function FloorTableDrawer<T extends FloorDrawerTableState>({
  state,
  timeZone,
  arrivals,
  showRotateHint,
  editTableHref,
  layoutHref,
  seating,
  updatingStatus,
  refunding,
  onClose,
  onSeat,
  onStatusChange,
  onRefund,
  onCancel,
  onNavigate,
}: {
  state: T | null;
  timeZone: string;
  /** Unassigned arriving guests; offered as "Seat here" on free tables. */
  arrivals: FloorDrawerArrival[];
  showRotateHint: boolean;
  /** Omit to hide the edit entries (e.g. hosts can't open table settings). */
  editTableHref?: string;
  layoutHref?: string;
  seating: boolean;
  updatingStatus: boolean;
  refunding: boolean;
  onClose: () => void;
  onSeat: (reservationId: string, tableId: string) => void;
  onStatusChange: (reservationId: string, status: string) => void;
  onRefund: (state: T) => void;
  onCancel: (state: T) => void;
  onNavigate: (href: string) => void;
}) {
  const reservation = state?.reservation ?? null;

  const moreItems: MenuProps['items'] = [
    ...(editTableHref
      ? [{ key: 'edit', icon: <EditOutlined />, label: 'Edit table', onClick: () => onNavigate(editTableHref) }]
      : []),
    ...(layoutHref
      ? [
          {
            key: 'layout',
            icon: <LayoutOutlined />,
            label: 'Open in table layout',
            onClick: () => onNavigate(layoutHref),
          },
        ]
      : []),
  ];

  const sortedArrivals = state
    ? [...arrivals].sort((a, b) => {
        const fitA = a.partySize <= state.table.maxCapacity ? 0 : 1;
        const fitB = b.partySize <= state.table.maxCapacity ? 0 : 1;
        return fitA - fitB || a.slotStart.localeCompare(b.slotStart);
      })
    : [];

  return (
    <Drawer
      title={
        state ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Table {state.table.name}</span>
            <Tag color={floorOpsStatusColor(state.status)} style={{ margin: 0, fontWeight: 400 }}>
              {floorOpsStatusLabel(state.status)}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {state.table.floorArea || 'Main'}
            </Text>
          </div>
        ) : (
          'Table'
        )
      }
      open={!!state}
      onClose={onClose}
      size={380}
      extra={
        moreItems.length > 0 ? (
          <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} aria-label="More table actions" />
          </Dropdown>
        ) : null
      }
    >
      {state && (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <FloorTableTile state={state} timeZone={timeZone} />

          {reservation ? (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${colors.neutral[200]}`,
                background: colors.neutral[25],
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                {dinerName(reservation.diner)}
              </Text>
              <div>
                <Text type="secondary">
                  Party of {reservation.partySize} ·{' '}
                  {formatUsDateTime(reservation.slotStart, {
                    timeZone,
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
              {(reservation.depositAmountCents ?? 0) > 0 ? (
                <div>
                  <Text type="secondary">
                    Deposit {formatUsd(reservation.depositAmountCents)} ·{' '}
                    {formatDepositStatus(reservation.depositStatus, {
                      depositAmountCents: reservation.depositAmountCents,
                      depositRefundedCents: reservation.depositRefundedCents,
                    })}
                  </Text>
                </div>
              ) : null}
              {state.seatedMinutes != null || (state.turnMinutesRemaining != null && state.status !== 'free') ? (
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {state.seatedMinutes != null ? (
                    <Text>Seated {state.seatedMinutes} min</Text>
                  ) : null}
                  {state.turnMinutesRemaining != null && state.status !== 'free' ? (
                    <Text>Turn left {formatTimer(state.turnMinutesRemaining)}</Text>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {reservation ? (
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {reservation.status === 'confirmed' ? (
                <Button
                  type="primary"
                  block
                  icon={<LoginOutlined />}
                  loading={seating}
                  onClick={() => onSeat(reservation.id, state.table.id)}
                >
                  Seat here
                </Button>
              ) : null}
              {reservation.status === 'seated' ? (
                <Button
                  type="primary"
                  block
                  icon={<CheckOutlined />}
                  loading={updatingStatus}
                  onClick={() => onStatusChange(reservation.id, 'completed')}
                >
                  Complete
                </Button>
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {reservation.status === 'confirmed' ? (
                  <Button
                    style={{ flex: '1 1 0' }}
                    icon={<ExclamationCircleOutlined />}
                    loading={updatingStatus}
                    onClick={() => onStatusChange(reservation.id, 'no_show')}
                  >
                    No-show
                  </Button>
                ) : null}
                {canRefundDeposit(reservation) ? (
                  <Button
                    style={{ flex: '1 1 0' }}
                    icon={<RollbackOutlined />}
                    loading={refunding}
                    onClick={() => onRefund(state)}
                  >
                    {reservation.depositStatus === 'authorized' ? 'Release deposit' : 'Refund deposit'}
                  </Button>
                ) : null}
                {['pending', 'confirmed'].includes(reservation.status) ? (
                  <Button
                    danger
                    style={{ flex: '1 1 0' }}
                    icon={<CloseCircleOutlined />}
                    loading={updatingStatus}
                    onClick={() => onCancel(state)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </Space>
          ) : (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Seat an arriving guest
              </Text>
              {sortedArrivals.length === 0 ? (
                <Text type="secondary">No arriving guests waiting for a table</Text>
              ) : (
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  {sortedArrivals.map((r) => {
                    const tooBig = r.partySize > state.table.maxCapacity;
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: `1px solid ${colors.neutral[200]}`,
                          opacity: tooBig ? 0.6 : 1,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis style={{ display: 'block' }}>
                            {dinerName(r.diner)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Party {r.partySize} · {formatTimeInTimeZone(r.slotStart, timeZone)}
                          </Text>
                        </div>
                        <Tooltip title={tooBig ? `Party is larger than ${seatsLabel(state.table)}` : undefined}>
                          <Button
                            size="small"
                            type={tooBig ? 'default' : 'primary'}
                            disabled={tooBig}
                            loading={seating}
                            onClick={() => onSeat(r.id, state.table.id)}
                          >
                            Seat here
                          </Button>
                        </Tooltip>
                      </div>
                    );
                  })}
                </Space>
              )}
            </div>
          )}

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Upcoming today{state.upcoming?.length ? ` (${state.upcoming.length})` : ''}
            </Text>
            {!state.upcoming?.length ? (
              <Text type="secondary">No more reservations on this table today</Text>
            ) : (
              <div className="rt-floor-upcoming">
                {state.upcoming.map((r) => (
                  <div key={r.id} className="rt-floor-upcoming__row">
                    <span className="rt-floor-upcoming__time">
                      {formatTimeInTimeZone(r.slotStart, timeZone)}
                    </span>
                    <button
                      type="button"
                      className="rt-floor-upcoming__guest"
                      onClick={() => onNavigate(`/reservations/${r.id}`)}
                    >
                      <Text strong ellipsis style={{ display: 'block' }}>
                        {dinerName(r.diner)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Party {r.partySize}
                        {r.status === 'pending' ? ' · Pending approval' : ''}
                      </Text>
                    </button>
                    {!reservation && r.status === 'confirmed' ? (
                      <Tooltip title="Guest arrived early">
                        <Button size="small" loading={seating} onClick={() => onSeat(r.id, state.table.id)}>
                          Seat now
                        </Button>
                      </Tooltip>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.table.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.table.photoUrl}
              alt={state.table.name}
              style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 160 }}
            />
          ) : null}

          {showRotateHint ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Drag the rotate icon on the table to turn it. Hold Shift to snap, or press R.
            </Text>
          ) : null}
        </Space>
      )}
    </Drawer>
  );
}
