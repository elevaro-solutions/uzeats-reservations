'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Select,
  Slider,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { EditOutlined, ReloadOutlined, RotateRightOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  FLOOR_PLAN_OPS,
  SEAT_RESERVATION_AT_TABLE,
  UPDATE_RESERVATION_STATUS,
  UPDATE_TABLE_POSITIONS,
} from '@/lib/graphql';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { guestName as formatGuestName } from '@/lib/reservationFormat';

import {
  DEFAULT_CELL_SIZE,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  applyFreeRotation,
  areaGridBounds,
  cellSizeForWidth,
  normalizeRotation,
  pointerAngleDeg,
  tableCenterPx,
} from '@/lib/floorPlanCanvas';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  free: '#2e9e5b',
  reserved: '#faad14',
  seated: '#cf1322',
  turning: '#fa8c16',
};

type TableState = {
  status: string;
  seatedMinutes?: number | null;
  turnMinutesRemaining?: number | null;
  table: {
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea: string;
    posX: number;
    posY: number;
    width: number;
    height: number;
    shape: string;
    rotation: number;
    photoUrl?: string | null;
  };
  reservation?: {
    id: string;
    partySize: number;
    slotStart: string;
    slotEnd: string;
    status: string;
    seatedAt?: string | null;
    guestNotes?: string;
    diner?: { firstName?: string; lastName?: string };
    tables?: { id: string; name: string }[];
  } | null;
};

function guestName(r?: TableState['reservation']) {
  if (!r) return 'Guest';
  const name = `${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim();
  return name || 'Guest';
}

function formatTimer(minutes: number | null | undefined) {
  if (minutes == null) return '';
  const m = Math.max(0, minutes);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

type FloorOpsData = {
  tables: TableState[];
  unassigned: NonNullable<TableState['reservation']>[];
};

function snapshotFloorOps(ops: FloorOpsData | null | undefined) {
  if (!ops) return '';
  return JSON.stringify({ tables: ops.tables, unassigned: ops.unassigned });
}

function FloorAreaCanvas({
  title,
  states,
  cellSize: forcedCellSize,
  selectedTableId,
  dragReservationId,
  onSelect,
  onDropOnTable,
  onRotateChange,
  onRotateCommit,
  onEdit,
}: {
  title: string;
  states: TableState[];
  cellSize: number | null;
  selectedTableId?: string | null;
  dragReservationId: string | null;
  onSelect: (state: TableState) => void;
  onDropOnTable: (tableId: string) => void;
  onRotateChange: (tableId: string, rotation: number) => void;
  onRotateCommit: (tableId: string, rotation: number) => void;
  onEdit: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const rotateRef = useRef<{
    tableId: string;
    origRotation: number;
    startAngle: number;
    centerX: number;
    centerY: number;
    lastRotation: number;
  } | null>(null);
  const cellSizeRef = useRef(DEFAULT_CELL_SIZE);
  const [fittedSize, setFittedSize] = useState(DEFAULT_CELL_SIZE);
  const bounds = useMemo(
    () => areaGridBounds(states.map((s) => s.table)),
    [states],
  );
  const cellSize = forcedCellSize ?? fittedSize;
  cellSizeRef.current = cellSize;
  const busy = states.filter((s) => s.status !== 'free').length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = (width: number, height: number) => {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      setFittedSize(
        Math.min(cellSizeForWidth(w, bounds.cols), cellSizeForWidth(h, bounds.rows)),
      );
    };
    update(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [bounds.cols, bounds.rows]);

  useEffect(() => {
    const apply = (clientX: number, clientY: number, shiftKey: boolean) => {
      const drag = rotateRef.current;
      const grid = gridRef.current;
      if (!drag || !grid) return;
      const rect = grid.getBoundingClientRect();
      const angle = pointerAngleDeg(
        drag.centerX,
        drag.centerY,
        clientX - rect.left,
        clientY - rect.top,
      );
      const next = applyFreeRotation(
        drag.origRotation,
        drag.startAngle,
        angle,
        shiftKey ? 15 : undefined,
      );
      drag.lastRotation = next;
      onRotateChange(drag.tableId, next);
    };
    const onMove = (e: MouseEvent) => apply(e.clientX, e.clientY, e.shiftKey);
    const onTouchMove = (e: TouchEvent) => {
      if (!rotateRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) apply(touch.clientX, touch.clientY, e.shiftKey);
    };
    const end = () => {
      const drag = rotateRef.current;
      if (!drag) return;
      rotateRef.current = null;
      onRotateCommit(drag.tableId, drag.lastRotation);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [onRotateChange, onRotateCommit]);

  return (
    <Card
      className="rt-floor-ops-card"
      title={title}
      extra={
        <Space size={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {busy} busy · {states.length} tables
          </Text>
          <Tooltip title="Edit this area in Table layout">
            <Button
              size="small"
              icon={<EditOutlined />}
              aria-label={`Edit ${title} table layout`}
              onClick={onEdit}
            >
              Edit
            </Button>
          </Tooltip>
        </Space>
      }
      styles={{ body: { padding: 12 } }}
    >
      <div
        ref={wrapRef}
        className="rt-floor-ops-canvas"
        style={{
          border: `1px dashed ${colors.neutral[200]}`,
        }}
      >
        <div
          ref={gridRef}
          style={{
            position: 'relative',
            width: '100%',
            height: bounds.rows * cellSize,
            minHeight: '100%',
            background: `repeating-linear-gradient(
              0deg, transparent, transparent ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize}px
            ),
            repeating-linear-gradient(
              90deg, transparent, transparent ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize}px
            )`,
          }}
        >
          {states.map((state) => {
            const t = state.table;
            const bg = STATUS_COLORS[state.status] ?? STATUS_COLORS.free;
            const isTurning = state.status === 'turning';
            const isSelected = t.id === selectedTableId;
            return (
              <div
                key={t.id}
                style={{
                  position: 'absolute',
                  left: (t.posX - bounds.minX) * cellSize,
                  top: (t.posY - bounds.minY) * cellSize,
                  width: t.width * cellSize - 4,
                  height: t.height * cellSize - 4,
                  transform: `rotate(${t.rotation ?? 0}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(state)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(state)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = `2px solid ${colors.brand[600]}`;
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.outline = 'none';
                    onDropOnTable(t.id);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: bg,
                    borderRadius: t.shape === 'round' ? 999 : 6,
                    border: isSelected
                      ? `2px solid ${colors.brand[700]}`
                      : '2px solid rgba(255,255,255,0.5)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: 4,
                    animation: isTurning ? 'floorOpsPulse 1.5s ease-in-out infinite' : undefined,
                  }}
                >
                  <span>{t.name}</span>
                  <span style={{ opacity: 0.85 }}>
                    {t.minCapacity}-{t.maxCapacity}
                  </span>
                  {state.turnMinutesRemaining != null && state.status !== 'free' && (
                    <span style={{ fontSize: 10, marginTop: 2 }}>
                      {formatTimer(state.turnMinutesRemaining)}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <button
                    type="button"
                    aria-label={`Rotate table ${t.name}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const grid = gridRef.current;
                      if (!grid) return;
                      const gridRect = grid.getBoundingClientRect();
                      const layout = {
                        posX: t.posX - bounds.minX,
                        posY: t.posY - bounds.minY,
                        width: t.width,
                        height: t.height,
                      };
                      const center = tableCenterPx(layout, cellSizeRef.current);
                      rotateRef.current = {
                        tableId: t.id,
                        origRotation: t.rotation ?? 0,
                        startAngle: pointerAngleDeg(
                          center.x,
                          center.y,
                          e.clientX - gridRect.left,
                          e.clientY - gridRect.top,
                        ),
                        centerX: center.x,
                        centerY: center.y,
                        lastRotation: t.rotation ?? 0,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      border: 'none',
                      background: 'rgba(0,0,0,0.4)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      padding: 0,
                      zIndex: 3,
                    }}
                  >
                    <RotateRightOutlined style={{ fontSize: 11 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 11, flexShrink: 0 }}>
        Drag the corner to resize this grid
      </Text>
    </Card>
  );
}

export default function FloorOpsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedState, setSelectedState] = useState<TableState | null>(null);
  const [dragReservationId, setDragReservationId] = useState<string | null>(null);
  const [gridCellSize, setGridCellSize] = useState<number | null>(DEFAULT_CELL_SIZE);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [ops, setOps] = useState<FloorOpsData>({ tables: [], unassigned: [] });
  const opsSnapshotRef = useRef('');

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const { data, loading, refetch } = useQuery(FLOOR_PLAN_OPS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    pollInterval: 30_000,
    notifyOnNetworkStatusChange: false,
    skipPollAttempt: () => typeof document !== 'undefined' && document.hidden,
    onError: (err: Error) => message.error(err.message),
  });
  const initialLoading = loading && !data;
  const [seatAtTable, { loading: seating }] = useMutation(SEAT_RESERVATION_AT_TABLE);
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [updatePositions] = useMutation(UPDATE_TABLE_POSITIONS);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    guestName: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    opsSnapshotRef.current = '';
  }, [activeRestaurantId]);

  useEffect(() => {
    const next = data?.floorPlanOps as FloorOpsData | undefined;
    if (!next) return;
    const snapshot = snapshotFloorOps(next);
    if (snapshot === opsSnapshotRef.current) return;
    opsSnapshotRef.current = snapshot;
    setOps({
      tables: next.tables ?? [],
      unassigned: next.unassigned ?? [],
    });
  }, [data]);

  const tableStates = ops.tables;
  const unassigned = ops.unassigned;

  const areaPlans = useMemo(() => {
    const grouped = new Map<string, TableState[]>();
    for (const state of tableStates) {
      const area = state.table.floorArea?.trim() || 'Main';
      const list = grouped.get(area);
      if (list) list.push(state);
      else grouped.set(area, [state]);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tableStates]);

  useEffect(() => {
    setSelectedState((current) => {
      if (!current) return current;
      return tableStates.find((state) => state.table.id === current.table.id) ?? null;
    });
  }, [tableStates]);

  const handleSeatAtTable = useCallback(
    async (reservationId: string, tableId: string) => {
      try {
        await seatAtTable({ variables: { reservationId, tableId } });
        message.success('Guest seated');
        refetch();
        setSelectedState(null);
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to seat guest');
      }
    },
    [seatAtTable, refetch],
  );

  const handleStatusChange = async (id: string, status: string, reason?: string) => {
    try {
      await updateStatus({ variables: { id, status, reason } });
      message.success(`Reservation ${status}`);
      refetch();
      setSelectedState(null);
      return true;
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update');
      return false;
    }
  };

  const onDropOnTable = async (tableId: string) => {
    if (!dragReservationId) return;
    await handleSeatAtTable(dragReservationId, tableId);
    setDragReservationId(null);
  };

  const applyTableRotation = useCallback((tableId: string, rotation: number) => {
    setOps((prev) => ({
      ...prev,
      tables: prev.tables.map((s) =>
        s.table.id === tableId ? { ...s, table: { ...s.table, rotation } } : s,
      ),
    }));
    setSelectedState((current) =>
      current?.table.id === tableId ? { ...current, table: { ...current.table, rotation } } : current,
    );
  }, []);

  const handleRotateTable = useCallback(
    async (tableId: string, rotation?: number) => {
      if (!activeRestaurantId) return;
      const state = ops.tables.find((s) => s.table.id === tableId);
      if (!state) return;
      const nextRotation = normalizeRotation(rotation ?? state.table.rotation ?? 0);
      applyTableRotation(tableId, nextRotation);
      try {
        await updatePositions({
          variables: {
            restaurantId: activeRestaurantId,
            positions: [
              {
                id: state.table.id,
                posX: state.table.posX,
                posY: state.table.posY,
                width: state.table.width,
                height: state.table.height,
                shape: state.table.shape,
                rotation: nextRotation,
              },
            ],
          },
        });
        opsSnapshotRef.current = '';
        await refetch();
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to rotate table');
        opsSnapshotRef.current = '';
        await refetch();
      }
    },
    [activeRestaurantId, applyTableRotation, ops.tables, refetch, updatePositions],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!selectedState) return;
      e.preventDefault();
      void handleRotateTable(
        selectedState.table.id,
        (selectedState.table.rotation ?? 0) + (e.shiftKey ? 90 : 15),
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRotateTable, selectedState]);

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Live floor
        </Title>
        <Space wrap>
          <Select style={{ width: '100%', maxWidth: 220 }} {...restaurantSelectProps} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              Grid size
            </Text>
            <Slider
              min={MIN_CELL_SIZE}
              max={MAX_CELL_SIZE}
              value={gridCellSize ?? DEFAULT_CELL_SIZE}
              onChange={(value) => setGridCellSize(value)}
              style={{ width: 120, margin: 0 }}
              tooltip={{ formatter: (value) => `${value}px` }}
            />
            <Button size="small" disabled={gridCellSize == null} onClick={() => setGridCellSize(null)}>
              Fit
            </Button>
          </div>
          <Button
            icon={<ReloadOutlined />}
            loading={initialLoading || manualRefreshing}
            onClick={async () => {
              setManualRefreshing(true);
              try {
                await refetch();
              } finally {
                setManualRefreshing(false);
              }
            }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Space key={status} size={4}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: color, display: 'inline-block' }} />
            <Text type="secondary" style={{ textTransform: 'capitalize' }}>
              {status}
            </Text>
          </Space>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {initialLoading ? (
            <Card loading />
          ) : areaPlans.length === 0 ? (
            <Card>
              <Empty description="No tables configured. Add tables in Tables & shifts." />
            </Card>
          ) : (
            areaPlans.map(([area, states]) => (
              <FloorAreaCanvas
                key={area}
                title={area}
                states={states}
                cellSize={gridCellSize}
                selectedTableId={selectedState?.table.id}
                dragReservationId={dragReservationId}
                onSelect={setSelectedState}
                onDropOnTable={onDropOnTable}
                onRotateChange={applyTableRotation}
                onRotateCommit={(tableId, rotation) => void handleRotateTable(tableId, rotation)}
                onEdit={() => {
                  const params = new URLSearchParams();
                  if (activeRestaurantId) params.set('restaurant', activeRestaurantId);
                  params.set('area', area);
                  router.push(`/floor-plan?${params.toString()}`);
                }}
              />
            ))
          )}
        </div>

        <Card
          title={`Arriving (${unassigned.length})`}
          style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%', position: 'sticky', top: 16 }}
          styles={{ body: { maxHeight: 480, overflow: 'auto' } }}
        >
          {unassigned.length === 0 ? (
            <Text type="secondary">No unassigned arrivals</Text>
          ) : (
            <Space orientation="vertical" style={{ width: '100%' }} size={8}>
              {unassigned.map((r: any) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => setDragReservationId(r.id)}
                  onDragEnd={() => setDragReservationId(null)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.neutral[200]}`,
                    background: dragReservationId === r.id ? colors.brand[50] : '#fff',
                    cursor: 'grab',
                  }}
                >
                  <Text strong>
                    {`${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim() || 'Guest'}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Party {r.partySize} · {new Date(r.slotStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                  <Tag style={{ marginTop: 4 }}>{r.status}</Tag>
                </div>
              ))}
            </Space>
          )}
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
            Drag a guest onto a table to seat them
          </Text>
        </Card>
      </div>

      <Drawer
        title={selectedState ? `Table ${selectedState.table.name}` : 'Table'}
        open={!!selectedState}
        onClose={() => setSelectedState(null)}
        size={360}
      >
        {selectedState && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Tag color={STATUS_COLORS[selectedState.status]} style={{ textTransform: 'capitalize' }}>
              {selectedState.status}
            </Tag>
            <Text type="secondary">{selectedState.table.floorArea}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Drag the rotate icon on the table to turn it. Hold Shift to snap, or press R.
            </Text>
            {selectedState.table.photoUrl && (
              <img
                src={selectedState.table.photoUrl}
                alt={selectedState.table.name}
                style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 160 }}
              />
            )}
            {selectedState.reservation ? (
              <>
                <div>
                  <Text strong>{guestName(selectedState.reservation)}</Text>
                  <br />
                  <Text type="secondary">
                    Party of {selectedState.reservation.partySize} ·{' '}
                    {new Date(selectedState.reservation.slotStart).toLocaleString('en-US')}
                  </Text>
                </div>
                {selectedState.seatedMinutes != null && (
                  <Text>Seated for {selectedState.seatedMinutes} min</Text>
                )}
                {selectedState.turnMinutesRemaining != null && selectedState.status !== 'free' && (
                  <Text>Turn remaining: {formatTimer(selectedState.turnMinutesRemaining)}</Text>
                )}
                <Space wrap>
                  {selectedState.reservation.status === 'confirmed' && (
                    <Button
                      type="primary"
                      loading={seating}
                      onClick={() =>
                        handleSeatAtTable(selectedState.reservation!.id, selectedState.table.id)
                      }
                    >
                      Seat here
                    </Button>
                  )}
                  {selectedState.reservation.status === 'confirmed' && (
                    <Button
                      loading={updatingStatus}
                      onClick={() => handleStatusChange(selectedState.reservation!.id, 'no_show')}
                    >
                      No-show
                    </Button>
                  )}
                  {selectedState.reservation.status === 'seated' && (
                    <Button
                      type="primary"
                      loading={updatingStatus}
                      onClick={() => handleStatusChange(selectedState.reservation!.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                  {['pending', 'confirmed'].includes(selectedState.reservation.status) && (
                    <Button
                      danger
                      loading={updatingStatus}
                      onClick={() =>
                        setCancelTarget({
                          id: selectedState.reservation!.id,
                          guestName: formatGuestName(selectedState.reservation!.diner),
                        })
                      }
                    >
                      Cancel
                    </Button>
                  )}
                </Space>
              </>
            ) : (
              <Text type="secondary">No active reservation on this table</Text>
            )}
          </Space>
        )}
      </Drawer>

      <CancelReservationModal
        open={!!cancelTarget}
        guestName={cancelTarget?.guestName}
        loading={updatingStatus}
        onClose={() => setCancelTarget(null)}
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          const ok = await handleStatusChange(cancelTarget.id, 'cancelled', reason);
          if (ok) setCancelTarget(null);
        }}
      />
    </Space>
  );
}
