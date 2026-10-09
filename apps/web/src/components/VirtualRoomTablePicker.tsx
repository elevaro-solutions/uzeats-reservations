'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation } from '@apollo/client/react';
import { Button, Modal, Space, Spin, Tag, Typography } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import { VIRTUAL_ROOM_OVERALL_VIEW } from '@reservations/shared';
import type { VirtualRoomSceneData } from '@reservations/ui/virtual-room';
import { RECORD_VIRTUAL_ROOM_SELECTION_ATTEMPT } from '@/lib/graphql';

const SELECTION_ATTEMPT_KEY = 'vr-selection-attempt:';

const VirtualRoomViewer = dynamic(
  () => import('@reservations/ui/virtual-room').then((m) => m.VirtualRoomViewer),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 460, display: 'grid', placeItems: 'center' }}>
        <Spin />
      </div>
    ),
  },
);

const { Text } = Typography;

type BookableTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea?: string | null;
  requiresManualApproval?: boolean | null;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function VirtualRoomTablePicker({
  restaurantId,
  scene,
  slotSelected,
  bookableTables,
  bookableLoading,
  selectedTableId,
  onSelectTable,
  block,
  /** True when list table pick is off — 3D is an optional preference (revenue path). */
  selectionOptional = false,
  /** Diner-facing fee preview before a table is picked (e.g. "$8.00" or "from $4.00"). Null when restaurant pays. */
  dinerFeePreviewLabel = null,
  /** Exact diner fee for a table id; 0 when the diner is not charged. */
  dinerFeeCentsForTable,
  /** Fee for the currently selected 3D table (diner-paid only). */
  selectedDinerFeeCents = 0,
}: {
  restaurantId: string;
  scene: VirtualRoomSceneData;
  /** Without a time slot the room is explore-only. */
  slotSelected: boolean;
  bookableTables: BookableTable[];
  bookableLoading: boolean;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  block?: boolean;
  selectionOptional?: boolean;
  dinerFeePreviewLabel?: string | null;
  dinerFeeCentsForTable?: (tableId: string) => number;
  selectedDinerFeeCents?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(selectedTableId);
  /** Off by default — floating name chips crowd multi-area rooms. */
  const [showTableLabels, setShowTableLabels] = useState(false);
  const [recordSelectionAttempt] = useMutation(RECORD_VIRTUAL_ROOM_SELECTION_ATTEMPT);
  const recordedAttempt = useRef(false);

  const recordAttemptIfSelecting = () => {
    if (!slotSelected || recordedAttempt.current || !restaurantId) return;

    const key = `${SELECTION_ATTEMPT_KEY}${restaurantId}`;
    try {
      if (sessionStorage.getItem(key)) {
        recordedAttempt.current = true;
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode / blocked storage — fall through; ref still dedupes this mount.
    }

    recordedAttempt.current = true;
    void recordSelectionAttempt({ variables: { restaurantId } }).catch(() => {
      // Best-effort analytics; ignore network errors.
    });
  };

  useEffect(() => {
    if (open) setPending(selectedTableId);
  }, [open, selectedTableId]);

  const availableIds = useMemo(() => {
    const policyOk = new Set<string>();
    for (const area of scene.areas) {
      if (area.guestSelectable === false) continue;
      for (const t of area.tables) {
        if (t.virtualRoomSelectable === false) continue;
        policyOk.add(t.id);
      }
    }
    return bookableTables.filter((t) => policyOk.has(t.id)).map((t) => t.id);
  }, [bookableTables, scene.areas]);
  const pendingTable = bookableTables.find((t) => t.id === pending) ?? null;
  const pendingDinerFeeCents =
    pendingTable && dinerFeeCentsForTable ? dinerFeeCentsForTable(pendingTable.id) : 0;

  const startArea = useMemo(() => {
    if (!selectedTableId) {
      return scene.areas.length > 1 ? VIRTUAL_ROOM_OVERALL_VIEW : null;
    }
    return (
      scene.areas.find((a) => a.tables.some((t) => t.id === selectedTableId))?.name ?? null
    );
  }, [scene, selectedTableId]);
  const [areaName, setAreaName] = useState<string | null>(startArea);
  useEffect(() => {
    if (open) setAreaName(startArea);
  }, [open, startArea]);

  const buttonLabel = !slotSelected
    ? 'Explore the dining room in 3D'
    : selectedTableId
      ? 'Change table in 3D'
      : 'Choose your table in 3D';
  const showOptionalHint =
    selectionOptional && slotSelected && !selectedTableId;
  /** List-selection mode has no selected-table row under the CTA, so surface fee here. */
  const showSelectedFeeHint =
    !selectionOptional &&
    slotSelected &&
    Boolean(selectedTableId) &&
    selectedDinerFeeCents > 0;

  return (
    <>
      <Button
        icon={<ExpandOutlined />}
        block={block}
        onClick={() => {
          setOpen(true);
          recordAttemptIfSelecting();
        }}
      >
        {buttonLabel}
      </Button>
      {showOptionalHint ? (
        <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
          Optional
          {dinerFeePreviewLabel ? ` · ${dinerFeePreviewLabel}` : ''}
          {' — '}
          skip and we&apos;ll assign a table when you book.
        </Text>
      ) : null}
      {showSelectedFeeHint ? (
        <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
          3D table selection {formatUsd(selectedDinerFeeCents)} (charged when you book)
        </Text>
      ) : null}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={980}
        centered
        destroyOnHidden
        title={
          <Space size={8}>
            {slotSelected
              ? selectionOptional
                ? 'Prefer a table in 3D'
                : 'Pick your table'
              : 'Explore the dining room'}
            <Tag color="purple">3D beta</Tag>
          </Space>
        }
        footer={
          slotSelected ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Text type={pendingTable ? undefined : 'secondary'}>
                {pendingTable ? (
                  <>
                    <strong>{pendingTable.name}</strong>
                    {pendingTable.floorArea ? ` · ${pendingTable.floorArea}` : ''} ·{' '}
                    {pendingTable.minCapacity}–{pendingTable.maxCapacity} guests
                    {pendingTable.requiresManualApproval ? ' · needs approval' : ''}
                    {pendingDinerFeeCents > 0
                      ? ` · 3D selection ${formatUsd(pendingDinerFeeCents)}`
                      : ''}
                  </>
                ) : bookableLoading ? (
                  'Checking which tables are free…'
                ) : availableIds.length === 0 ? (
                  'No tables are free at this time — try another time.'
                ) : (
                  selectionOptional
                    ? dinerFeePreviewLabel
                      ? `Tap a green table to prefer it (${dinerFeePreviewLabel}).`
                      : 'Tap a green table to prefer it for this booking.'
                    : dinerFeePreviewLabel
                      ? `Tap a green table to select it (${dinerFeePreviewLabel}).`
                      : 'Tap a green table to select it.'
                )}
              </Text>
              <Space>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  type="primary"
                  disabled={!pendingTable}
                  onClick={() => {
                    if (!pendingTable) return;
                    onSelectTable(pendingTable.id);
                    setOpen(false);
                  }}
                >
                  {pendingDinerFeeCents > 0
                    ? `Choose this table · ${formatUsd(pendingDinerFeeCents)}`
                    : 'Choose this table'}
                </Button>
              </Space>
            </div>
          ) : (
            <Text type="secondary">Pick a date and time to choose a specific table.</Text>
          )
        }
      >
        <VirtualRoomViewer
          scene={scene}
          areaName={areaName}
          onAreaChange={setAreaName}
          availableTableIds={slotSelected && !bookableLoading ? availableIds : null}
          selectedTableId={slotSelected ? pending : null}
          showTableLabels={showTableLabels}
          onShowTableLabelsChange={setShowTableLabels}
          onSelectTable={
            slotSelected && !bookableLoading
              ? (tableId) => {
                  setPending(tableId);
                  onSelectTable(tableId);
                }
              : undefined
          }
          height="min(62vh, 560px)"
        />
      </Modal>
    </>
  );
}
