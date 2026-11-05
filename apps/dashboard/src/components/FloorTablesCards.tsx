'use client';

import { useState } from 'react';
import { Card, Typography } from 'antd';
import { colors } from '@reservations/ui';
import { formatTimeInTimeZone } from '@reservations/shared';
import {
  floorOpsStatusLabel,
  floorOpsStatusTint,
  floorTableChairCount,
  floorTableChairDistribution,
  isBanquetTable,
  type FloorOpsTint,
} from '@/lib/floorOpsStatus';

const { Text } = Typography;

export type FloorTableCardState = {
  status: string;
  turnMinutesRemaining?: number | null;
  table: {
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
  };
  reservation?: {
    partySize: number;
    slotStart: string;
    diner?: { firstName?: string; lastName?: string };
  } | null;
  upcoming?: { partySize: number; slotStart: string }[];
};

function guestLabel(state: FloorTableCardState): string | null {
  const diner = state.reservation?.diner;
  if (!state.reservation) return null;
  const name = `${diner?.firstName ?? ''} ${diner?.lastName ?? ''}`.trim();
  return name || 'Guest';
}

function ChairLine({
  count,
  startIndex,
  occupied,
  axis,
  tint,
  busy,
}: {
  count: number;
  startIndex: number;
  occupied: number;
  axis: 'horizontal' | 'vertical';
  tint: FloorOpsTint;
  busy: boolean;
}) {
  if (count <= 0) return null;
  return (
    <div className={`rt-floor-tile__chairs rt-floor-tile__chairs--${axis}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const filled = !busy || startIndex + i < occupied;
        return (
          <span
            key={i}
            className="rt-floor-tile__chair"
            style={{ background: filled ? tint.line : tint.emptyChair }}
          />
        );
      })}
    </div>
  );
}

/** Without `onSelect` the tile is a read-only preview (e.g. the table drawer). */
export function FloorTableTile({
  state,
  timeZone,
  selected = false,
  dragPartySize = null,
  onSelect,
  onDropOnTable,
}: {
  state: FloorTableCardState;
  timeZone: string;
  selected?: boolean;
  dragPartySize?: number | null;
  onSelect?: () => void;
  onDropOnTable?: () => void;
}) {
  const [dropHover, setDropHover] = useState(false);
  const interactive = Boolean(onSelect);
  const { table, status, reservation } = state;
  const tint = floorOpsStatusTint(status);
  const chairs = floorTableChairDistribution(table.maxCapacity);
  const banquet = isBanquetTable(table.maxCapacity);
  const busy = status !== 'free' && !!reservation;
  const occupied = busy ? Math.min(reservation.partySize, floorTableChairCount(table.maxCapacity)) : 0;
  const guest = guestLabel(state);
  const statusLabel = floorOpsStatusLabel(status);

  const dragging = dragPartySize != null;
  const fitsDrag = dragging && status === 'free' && table.maxCapacity >= dragPartySize;

  const meta =
    reservation && status !== 'free'
      ? [
          `Party ${reservation.partySize}`,
          status === 'reserved' && reservation.slotStart
            ? formatTimeInTimeZone(reservation.slotStart, timeZone)
            : null,
          (status === 'seated' || status === 'turning') && state.turnMinutesRemaining != null
            ? `${state.turnMinutesRemaining} min left`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : state.upcoming?.[0]
        ? `Next ${formatTimeInTimeZone(state.upcoming[0].slotStart, timeZone)} · Party ${state.upcoming[0].partySize}`
        : table.minCapacity && table.minCapacity !== table.maxCapacity
          ? `${table.minCapacity}–${table.maxCapacity} seats`
          : `${table.maxCapacity} seats`;

  const top = chairs.top;
  const right = chairs.right;
  const bottom = chairs.bottom;

  const className = [
    'rt-floor-tile',
    interactive ? '' : 'rt-floor-tile--static',
    banquet ? 'rt-floor-tile--banquet' : '',
    selected ? 'rt-floor-tile--selected' : '',
    status === 'turning' ? 'rt-floor-tile--turning' : '',
    dragging && !fitsDrag ? 'rt-floor-tile--dimmed' : '',
    fitsDrag ? 'rt-floor-tile--target' : '',
    dropHover ? 'rt-floor-tile--drop' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      className={className}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`Table ${table.name}, ${statusLabel}${guest ? `, ${guest}` : ''}, ${table.maxCapacity} seats`}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      onDragOver={
        onDropOnTable
          ? (e) => {
              e.preventDefault();
              if (!dropHover) setDropHover(true);
            }
          : undefined
      }
      onDragLeave={onDropOnTable ? () => setDropHover(false) : undefined}
      onDrop={
        onDropOnTable
          ? (e) => {
              e.preventDefault();
              setDropHover(false);
              onDropOnTable();
            }
          : undefined
      }
      style={{ background: tint.wash }}
    >
      <div className="rt-floor-tile__furniture">
        <ChairLine
          count={top}
          startIndex={0}
          occupied={occupied}
          axis="horizontal"
          tint={tint}
          busy={busy}
        />
        <div className="rt-floor-tile__mid">
          <ChairLine
            count={chairs.left}
            startIndex={top + right + bottom}
            occupied={occupied}
            axis="vertical"
            tint={tint}
            busy={busy}
          />
          <div
            className="rt-floor-tile__body"
            style={{
              background: tint.body,
              borderColor: selected ? colors.brand[700] : tint.line,
              color: tint.accent,
            }}
          >
            <span className="rt-floor-tile__name">{table.name}</span>
            <span className="rt-floor-tile__sub">{guest ?? statusLabel}</span>
          </div>
          <ChairLine
            count={right}
            startIndex={top}
            occupied={occupied}
            axis="vertical"
            tint={tint}
            busy={busy}
          />
        </div>
        <ChairLine
          count={bottom}
          startIndex={top + right}
          occupied={occupied}
          axis="horizontal"
          tint={tint}
          busy={busy}
        />
      </div>
      <span className="rt-floor-tile__meta" style={{ color: tint.accent }}>
        {meta}
      </span>
    </div>
  );
}

export function FloorTablesCards<T extends FloorTableCardState>({
  areaPlans,
  selectedTableId,
  timeZone,
  dragPartySize,
  onSelect,
  onDropOnTable,
}: {
  areaPlans: [string, T[]][];
  selectedTableId?: string | null;
  timeZone: string;
  /** Party size of the arriving guest being dragged; highlights free tables that fit. */
  dragPartySize: number | null;
  onSelect: (state: T) => void;
  onDropOnTable: (tableId: string) => void;
}) {
  return (
    <>
      {areaPlans.map(([area, states]) => {
        const busy = states.filter((s) => s.status !== 'free').length;
        const sorted = [...states].sort((a, b) =>
          a.table.name.localeCompare(b.table.name, undefined, { numeric: true }),
        );
        return (
          <Card
            key={area}
            title={area}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {busy} busy · {states.length} {states.length === 1 ? 'table' : 'tables'}
              </Text>
            }
            styles={{ body: { padding: 12 } }}
          >
            <div className="rt-floor-tiles">
              {sorted.map((state) => (
                <FloorTableTile
                  key={state.table.id}
                  state={state}
                  timeZone={timeZone}
                  selected={state.table.id === selectedTableId}
                  dragPartySize={dragPartySize}
                  onSelect={() => onSelect(state)}
                  onDropOnTable={() => onDropOnTable(state.table.id)}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </>
  );
}
