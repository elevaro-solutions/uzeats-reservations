'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Segmented,
  Select,
  Skeleton,
  Slider,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  EditOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  RollbackOutlined,
  RotateRightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { colors } from '@reservations/ui';
import type { VirtualRoomSceneData } from '@reservations/ui/virtual-room';
import {
  formatTimeInTimeZone,
  formatUsDateTime,
  resolveFloorAreaAppearance,
  restaurantTimeZone,
  type FloorPlanAreaAppearance,
} from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { canManageBilling, isHostRole } from '@/lib/roles';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  FLOOR_PLAN_OPS,
  REFUND_RESERVATION_DEPOSIT,
  SEAT_RESERVATION_AT_TABLE,
  PENDING_BADGE_REFETCH,
  UPDATE_RESERVATION_STATUS,
  UPDATE_TABLE_POSITIONS,
  VIRTUAL_ROOM_OPS_SCENE,
} from '@/lib/graphql';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { RefundDepositModal } from '@/components/RefundDepositModal';
import { VirtualRoomAddonCard } from '@/components/VirtualRoomAddonCard';
import {
  canRefundDeposit,
  formatDepositStatus,
  formatUsd,
  guestName as formatGuestName,
} from '@/lib/reservationFormat';
import {
  DEFAULT_CELL_SIZE,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  applyFreeRotation,
  areaGridBounds,
  cellSizeForWidth,
  floorGridLineColor,
  normalizeRotation,
  pointerAngleDeg,
  resolveFloorBackgroundColor,
  shapeAccent,
  shapeBorderRadius,
  shapeCanvasExtras,
  tableCenterPx,
} from '@/lib/floorPlanCanvas';
import {
  tableShapeLabelChipStyle,
  tableShapeLabelFontSizes,
} from '@/lib/tableShapeLabel';
import { useTableShapes } from '@/lib/useTableShapes';
import { skipPollWhenHidden } from '@/lib/pollVisibility';

const VirtualRoomViewer = dynamic(
  () => import('@reservations/ui/virtual-room').then((m) => m.VirtualRoomViewer),
  { ssr: false, loading: () => <Skeleton.Node active style={{ width: '100%', height: 560 }} /> },
);

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  free: '#2e9e5b',
  reserved: '#faad14',
  seated: '#cf1322',
  turning: '#fa8c16',
};

const OPS_3D_STATUS_LEGEND = Object.entries(STATUS_COLORS).map(([status, color]) => ({
  color,
  label: status.charAt(0).toUpperCase() + status.slice(1),
}));

type FloorOpsViewMode = 'list' | 'plan' | '3d';

const FLOOR_OPS_VIEW_STORAGE_KEY = 'rt-floor-ops-view';

function readFloorOpsViewMode(): FloorOpsViewMode {
  if (typeof window === 'undefined') return 'plan';
  const stored = localStorage.getItem(FLOOR_OPS_VIEW_STORAGE_KEY);
  if (stored === 'list' || stored === 'plan' || stored === '3d') return stored;
  return 'plan';
}

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
    depositAmountCents?: number | null;
    depositRefundedCents?: number | null;
    depositRefundableCents?: number | null;
    depositStatus?: string | null;
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
  backgroundUrl: string | null;
  backgroundColor: string | null;
  areaAppearances: FloorPlanAreaAppearance[];
  floorFixtures: FloorFixtureView[];
};

function snapshotFloorOps(ops: FloorOpsData | null | undefined) {
  if (!ops) return '';
  return JSON.stringify({
    tables: ops.tables,
    unassigned: ops.unassigned,
    backgroundUrl: ops.backgroundUrl,
    backgroundColor: ops.backgroundColor,
    areaAppearances: ops.areaAppearances,
    floorFixtures: ops.floorFixtures,
  });
}

type FloorFixtureView = {
  id: string;
  name: string;
  kind: string;
  floorArea: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
};

function FloorAreaCanvas({
  title,
  states,
  fixtures,
  backgroundUrl,
  backgroundColor,
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
  fixtures: FloorFixtureView[];
  backgroundUrl: string | null;
  backgroundColor: string | null;
  cellSize: number | null;
  selectedTableId?: string | null;
  dragReservationId: string | null;
  onSelect: (state: TableState) => void;
  onDropOnTable: (tableId: string) => void;
  onRotateChange: (tableId: string, rotation: number) => void;
  onRotateCommit: (tableId: string, rotation: number) => void;
  onEdit: () => void;
}) {
  const { labelFor, renderPresetFor, iconUrlFor, labelLayoutFor } = useTableShapes();
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
  const areaFixtures = useMemo(
    () => fixtures.filter((f) => (f.floorArea || 'Main') === title),
    [fixtures, title],
  );
  const bounds = useMemo(
    () =>
      areaGridBounds([
        ...states.map((s) => s.table),
        ...areaFixtures.map((f) => ({
          posX: f.posX,
          posY: f.posY,
          width: f.width,
          height: f.height,
        })),
      ]),
    [states, areaFixtures],
  );
  const cellSize = forcedCellSize ?? fittedSize;
  cellSizeRef.current = cellSize;
  const busy = states.filter((s) => s.status !== 'free').length;
  const canvasBg = resolveFloorBackgroundColor(backgroundColor);
  const gridLine = floorGridLineColor(backgroundColor);

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
            overflow: 'visible',
            backgroundColor: canvasBg,
            backgroundImage: (() => {
              const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
              return backgroundUrl ? `${grid}, url(${backgroundUrl})` : grid;
            })(),
            backgroundSize: backgroundUrl
              ? `${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px, cover`
              : `${cellSize}px ${cellSize}px`,
            backgroundPosition: '0 0, 0 0, center',
            backgroundRepeat: 'repeat, repeat, no-repeat',
          }}
        >
          {areaFixtures.map((f) => (
            <div
              key={f.id}
              style={{
                position: 'absolute',
                left: (f.posX - bounds.minX) * cellSize,
                top: (f.posY - bounds.minY) * cellSize,
                width: f.width * cellSize - 4,
                height: f.height * cellSize - 4,
                transform: `rotate(${f.rotation ?? 0}deg)`,
                transformOrigin: 'center center',
                border: '1px dashed #78716c',
                background: 'rgba(120,113,108,0.18)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: colors.textSecondary,
                pointerEvents: 'none',
                zIndex: 1,
                boxSizing: 'border-box',
              }}
            >
              {f.name}
            </div>
          ))}
          {states.map((state) => {
            const t = state.table;
            const bg = STATUS_COLORS[state.status] ?? STATUS_COLORS.free;
            const isTurning = state.status === 'turning';
            const isSelected = t.id === selectedTableId;
            const renderPreset = renderPresetFor(t.shape);
            const shapeLabel = labelFor(t.shape);
            const shapeIconUrl = iconUrlFor(t.shape);
            const labelLayout = labelLayoutFor(t.shape);
            const labelFonts = tableShapeLabelFontSizes(cellSize, labelLayout.fontScale);
            const shapeExtras = shapeCanvasExtras(renderPreset, cellSize);
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
                  zIndex: isSelected ? 5 : 2,
                  overflow: 'visible',
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
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    background: bg,
                    borderRadius: shapeBorderRadius(renderPreset),
                    border: isSelected
                      ? `2px solid ${colors.brand[700]}`
                      : '2px solid rgba(255,255,255,0.5)',
                    boxShadow: shapeAccent(renderPreset),
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: 4,
                    overflow: 'hidden',
                    animation: isTurning ? 'floorOpsPulse 1.5s ease-in-out infinite' : undefined,
                    ...shapeExtras.style,
                  }}
                >
                  {shapeExtras.overlay?.map((style, i) => (
                    <div key={`ops-shape-${t.id}-${i}`} style={style} />
                  ))}
                  {shapeIconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shapeIconUrl}
                      alt=""
                      draggable={false}
                      style={{
                        position: 'absolute',
                        inset: '12%',
                        width: '76%',
                        height: '76%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        zIndex: 0,
                        opacity: 0.85,
                        filter: 'brightness(1.15)',
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    ...tableShapeLabelChipStyle(labelLayout.position),
                    background:
                      labelLayout.position.startsWith('outside_') || shapeIconUrl
                        ? 'rgba(255,255,255,0.94)'
                        : 'rgba(0,0,0,0.28)',
                    color:
                      labelLayout.position.startsWith('outside_') || shapeIconUrl
                        ? colors.textPrimary
                        : '#fff',
                    boxShadow:
                      labelLayout.position.startsWith('outside_') || shapeIconUrl
                        ? '0 0 0 1px rgba(255,255,255,0.7)'
                        : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: labelFonts.name }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: labelFonts.meta, opacity: 0.9 }}>
                    {t.minCapacity}-{t.maxCapacity}
                    {!shapeIconUrl && renderPreset !== 'rect' && renderPreset !== 'round'
                      ? ` · ${shapeLabel}`
                      : ''}
                  </span>
                  {state.turnMinutesRemaining != null && state.status !== 'free' && (
                    <span style={{ fontSize: Math.max(8, labelFonts.meta - 1) }}>
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
                      zIndex: 6,
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

function FloorTablesList({
  areaPlans,
  selectedTableId,
  timeZone,
  onSelect,
  onDropOnTable,
}: {
  areaPlans: [string, TableState[]][];
  selectedTableId?: string | null;
  timeZone: string;
  onSelect: (state: TableState) => void;
  onDropOnTable: (tableId: string) => void;
}) {
  const columns: ColumnsType<TableState> = [
    {
      title: 'Table',
      key: 'name',
      render: (_, state) => <Text strong>{state.table.name}</Text>,
    },
    {
      title: 'Seats',
      key: 'capacity',
      width: 90,
      render: (_, state) => `${state.table.minCapacity}–${state.table.maxCapacity}`,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, state) => (
        <Tag color={STATUS_COLORS[state.status]} style={{ textTransform: 'capitalize', margin: 0 }}>
          {state.status}
        </Tag>
      ),
    },
    {
      title: 'Guest',
      key: 'guest',
      ellipsis: true,
      render: (_, state) =>
        state.reservation ? (
          <span>
            {guestName(state.reservation)}
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              Party {state.reservation.partySize}
              {state.reservation.slotStart
                ? ` · ${formatTimeInTimeZone(state.reservation.slotStart, timeZone)}`
                : ''}
            </Text>
          </span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Turn',
      key: 'turn',
      width: 80,
      render: (_, state) =>
        state.turnMinutesRemaining != null && state.status !== 'free' ? (
          formatTimer(state.turnMinutesRemaining)
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {areaPlans.map(([area, states]) => {
        const busy = states.filter((s) => s.status !== 'free').length;
        return (
          <Card
            key={area}
            title={area}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {busy} busy · {states.length} tables
              </Text>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table<TableState>
              size="small"
              rowKey={(row) => row.table.id}
              pagination={false}
              columns={columns}
              dataSource={states}
              onRow={(state) => ({
                onClick: () => onSelect(state),
                onDragOver: (e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = colors.brand[50];
                },
                onDragLeave: (e) => {
                  e.currentTarget.style.background = '';
                },
                onDrop: (e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = '';
                  onDropOnTable(state.table.id);
                },
                style: {
                  cursor: 'pointer',
                  background:
                    state.table.id === selectedTableId ? colors.brand[50] : undefined,
                },
              })}
            />
          </Card>
        );
      })}
    </Space>
  );
}

export default function FloorOpsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<FloorOpsViewMode>(() => readFloorOpsViewMode());
  const [selectedState, setSelectedState] = useState<TableState | null>(null);
  const [dragReservationId, setDragReservationId] = useState<string | null>(null);
  const [gridCellSize, setGridCellSize] = useState<number | null>(DEFAULT_CELL_SIZE);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [ops, setOps] = useState<FloorOpsData>({
    tables: [],
    unassigned: [],
    backgroundUrl: null,
    backgroundColor: null,
    areaAppearances: [],
    floorFixtures: [],
  });
  const opsSnapshotRef = useRef('');

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const activeRestaurant = useMemo(
    () => restaurants.find((r: { id: string }) => r.id === activeRestaurantId),
    [restaurants, activeRestaurantId],
  );
  const timeZone = useMemo(
    () => restaurantTimeZone(activeRestaurant ?? {}),
    [activeRestaurant],
  );
  const { data, loading, refetch } = useQuery(FLOOR_PLAN_OPS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    // Ops status (incl. 3D colors) — 10s like merchant mobile; own actions also optimistically update.
    pollInterval: 10_000,
    notifyOnNetworkStatusChange: false,
    skipPollAttempt: skipPollWhenHidden,
    onError: (err: Error) => message.error(err.message),
  });
  const {
    data: sceneData,
    loading: sceneLoading,
    refetch: refetchScene,
  } = useQuery(VIRTUAL_ROOM_OPS_SCENE, {
    skip: !activeRestaurantId || viewMode !== '3d',
    variables: { restaurantId: activeRestaurantId },
    fetchPolicy: 'cache-and-network',
    onError: (err: Error) => message.error(err.message),
  });
  const opsScene = sceneData?.virtualRoomOpsScene as VirtualRoomSceneData | undefined;
  const initialLoading = loading && !data;
  const [seatAtTable, { loading: seating }] = useMutation(SEAT_RESERVATION_AT_TABLE);
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS, PENDING_BADGE_REFETCH);
  const [refundDeposit, { loading: refunding }] = useMutation(REFUND_RESERVATION_DEPOSIT);
  const [updatePositions] = useMutation(UPDATE_TABLE_POSITIONS);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    guestName: string;
  } | null>(null);
  const [refundTarget, setRefundTarget] = useState<{
    id: string;
    guestName: string;
    depositAmountCents?: number | null;
    depositRefundedCents?: number | null;
    depositRefundableCents?: number | null;
    depositStatus?: string | null;
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
    // Clone rows so status changes always get a new `tables` reference (Apollo can
    // reuse the array identity after refetch, which would skip color memos).
    const normalized: FloorOpsData = {
      tables: (next.tables ?? []).map((row) => ({
        ...row,
        table: { ...row.table },
        reservation: row.reservation ? { ...row.reservation } : null,
      })),
      unassigned: [...(next.unassigned ?? [])],
      backgroundUrl: next.backgroundUrl ?? null,
      backgroundColor: next.backgroundColor ?? null,
      areaAppearances: Array.isArray(next.areaAppearances) ? next.areaAppearances : [],
      floorFixtures: next.floorFixtures ?? [],
    };
    const snapshot = snapshotFloorOps(normalized);
    if (snapshot === opsSnapshotRef.current) return;
    opsSnapshotRef.current = snapshot;
    setOps(normalized);
  }, [data]);

  const tableStates = ops.tables;
  const unassigned = ops.unassigned;
  const tableStatusKey = tableStates.map((s) => `${s.table.id}:${s.status}`).join('|');
  const tableStateById = useMemo(() => {
    const map = new Map<string, TableState>();
    for (const state of tableStates) map.set(state.table.id, state);
    return map;
  }, [tableStates]);
  const opsTableColors = useMemo(() => {
    const colorsById: Record<string, string> = {};
    for (const state of tableStates) {
      colorsById[state.table.id] = STATUS_COLORS[state.status] ?? STATUS_COLORS.free;
    }
    return colorsById;
  }, [tableStatusKey, tableStates]);
  const opsTableHoverDetails = useMemo(() => {
    const details: Record<string, string> = {};
    for (const state of tableStates) {
      const statusLabel = state.status.charAt(0).toUpperCase() + state.status.slice(1);
      if (state.reservation) {
        const turn =
          state.turnMinutesRemaining != null && state.status !== 'free'
            ? ` · ${formatTimer(state.turnMinutesRemaining)} left`
            : '';
        details[state.table.id] = `${statusLabel} · ${guestName(state.reservation)}${turn}`;
      } else {
        details[state.table.id] = statusLabel;
      }
    }
    return details;
  }, [tableStatusKey, tableStates]);

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

  const applyLocalTableStatus = useCallback(
    (tableId: string, status: string, reservation: TableState['reservation'] = null) => {
      setOps((prev) => {
        const tables = prev.tables.map((row) =>
          row.table.id === tableId
            ? {
                ...row,
                status,
                reservation,
                seatedMinutes: status === 'seated' || status === 'turning' ? 0 : null,
                turnMinutesRemaining:
                  status === 'seated' || status === 'turning'
                    ? (row.turnMinutesRemaining ?? 90)
                    : null,
              }
            : row,
        );
        const next = { ...prev, tables };
        opsSnapshotRef.current = '';
        return next;
      });
    },
    [],
  );

  const handleSeatAtTable = useCallback(
    async (reservationId: string, tableId: string) => {
      try {
        const seated =
          tableStateById.get(tableId)?.reservation?.id === reservationId
            ? tableStateById.get(tableId)?.reservation
            : unassigned.find((r) => r.id === reservationId) ??
              tableStateById.get(tableId)?.reservation ??
              null;
        const optimisticReservation = seated
          ? { ...seated, status: 'seated' }
          : ({
              id: reservationId,
              partySize: 0,
              slotStart: new Date().toISOString(),
              slotEnd: new Date().toISOString(),
              status: 'seated',
            } as NonNullable<TableState['reservation']>);
        applyLocalTableStatus(tableId, 'seated', optimisticReservation);
        await seatAtTable({ variables: { reservationId, tableId } });
        message.success('Guest seated');
        opsSnapshotRef.current = '';
        await refetch();
        setSelectedState(null);
      } catch (err: unknown) {
        opsSnapshotRef.current = '';
        await refetch();
        message.error(err instanceof Error ? err.message : 'Failed to seat guest');
      }
    },
    [applyLocalTableStatus, refetch, seatAtTable, tableStateById, unassigned],
  );

  const handleStatusChange = async (id: string, status: string, reason?: string) => {
    try {
      if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
        const tableId = tableStates.find((s) => s.reservation?.id === id)?.table.id;
        if (tableId) applyLocalTableStatus(tableId, 'free', null);
      } else if (status === 'seated') {
        const row = tableStates.find((s) => s.reservation?.id === id);
        if (row) {
          applyLocalTableStatus(row.table.id, 'seated', {
            ...row.reservation!,
            status: 'seated',
          });
        }
      }
      await updateStatus({ variables: { id, status, reason } });
      message.success(`Reservation ${status}`);
      opsSnapshotRef.current = '';
      await refetch();
      setSelectedState(null);
      return true;
    } catch (err: unknown) {
      opsSnapshotRef.current = '';
      await refetch();
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

  const canEditBilling = Boolean(user && canManageBilling(user.role));
  const showAddonRail = Boolean(user && !isHostRole(user.role));

  const setFloorOpsViewMode = (next: FloorOpsViewMode) => {
    setViewMode(next);
    localStorage.setItem(FLOOR_OPS_VIEW_STORAGE_KEY, next);
  };

  const arrivingPanel = (
    <Card
      title={`Arriving (${unassigned.length})`}
      style={{ width: '100%', position: 'sticky', top: 16 }}
      styles={{ body: { maxHeight: 480, overflow: 'auto' } }}
    >
      {unassigned.length === 0 ? (
        <Text type="secondary">No unassigned arrivals</Text>
      ) : (
        <Space orientation="vertical" style={{ width: '100%' }} size={8}>
          {unassigned.map((r: any) => (
            <div
              key={r.id}
              draggable={viewMode !== '3d'}
              onDragStart={() => setDragReservationId(r.id)}
              onDragEnd={() => setDragReservationId(null)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.neutral[200]}`,
                background: dragReservationId === r.id ? colors.brand[50] : '#fff',
                cursor: viewMode === '3d' ? 'default' : 'grab',
              }}
            >
              <Text strong>
                {`${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim() || 'Guest'}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Party {r.partySize} · {formatTimeInTimeZone(r.slotStart, timeZone)}
                </Text>
              </div>
              <Tag style={{ marginTop: 4 }}>{r.status}</Tag>
            </div>
          ))}
        </Space>
      )}
      <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
        {viewMode === '3d'
          ? 'Open a table in 3D, then seat an arriving guest from the table drawer'
          : 'Drag a guest onto a table to seat them'}
      </Text>
    </Card>
  );

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Live floor
        </Title>
        <Space wrap>
          <Select style={{ width: '100%', maxWidth: 220 }} {...restaurantSelectProps} />
          <Segmented<FloorOpsViewMode>
            value={viewMode}
            onChange={setFloorOpsViewMode}
            options={[
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Floor plan', value: 'plan', icon: <AppstoreOutlined /> },
              { label: '3D', value: '3d', icon: <ExperimentOutlined /> },
            ]}
          />
          {viewMode === 'plan' ? (
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
          ) : null}
          <Button
            icon={<ReloadOutlined />}
            loading={initialLoading || manualRefreshing || (viewMode === '3d' && sceneLoading)}
            onClick={async () => {
              setManualRefreshing(true);
              try {
                await Promise.all([
                  refetch(),
                  viewMode === '3d' ? refetchScene() : Promise.resolve(),
                ]);
              } finally {
                setManualRefreshing(false);
              }
            }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {viewMode !== '3d' ? (
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
      ) : null}

      {viewMode === '3d' ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Card
            title="Live 3D"
            style={{ flex: '1 1 560px', minWidth: 0 }}
            extra={
              showAddonRail ? (
                <Link href="/virtual-room">
                  <Button size="small" icon={<EditOutlined />}>
                    Edit layout
                  </Button>
                </Link>
              ) : null
            }
            styles={{ body: { padding: 12 } }}
          >
            {sceneLoading && !opsScene ? (
              <Skeleton.Node active style={{ width: '100%', height: 560 }} />
            ) : !opsScene || opsScene.areas.length === 0 ? (
              <Empty
                description={
                  <span>
                    No 3D room yet. Publish a{' '}
                    <Link href="/floor-plan">table layout</Link> first
                    {showAddonRail ? (
                      <>
                        , then open the <Link href="/virtual-room">Virtual 3D room</Link> editor
                      </>
                    ) : null}
                    .
                  </span>
                }
              />
            ) : (
              <VirtualRoomViewer
                scene={opsScene}
                tableColors={opsTableColors}
                tableHoverDetails={opsTableHoverDetails}
                statusLegend={OPS_3D_STATUS_LEGEND}
                opsSelectMode
                selectedTableId={selectedState?.table.id}
                onSelectTable={(tableId) => {
                  const state = tableStateById.get(tableId);
                  if (state) setSelectedState(state);
                }}
                height="min(70vh, 720px)"
              />
            )}
            <Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
              Tables are colored by live status. Click a table to seat, complete, or cancel.
              Drag to orbit · scroll zoom · right-drag pan.
            </Paragraph>
          </Card>

          <div
            style={{
              flex: '0 1 340px',
              minWidth: 280,
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {showAddonRail ? (
              <>
                <Card size="small">
                  <Text strong>Let guests pick their table in 3D</Text>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                    Diners explore your dining room and choose the exact table they want before
                    they book — a clearer choice that helps convert browsers into reservations.
                  </Paragraph>
                </Card>
                {activeRestaurantId ? (
                  <VirtualRoomAddonCard
                    restaurantId={activeRestaurantId}
                    canEditBilling={canEditBilling}
                    showWhenUnavailable
                  />
                ) : null}
              </>
            ) : null}
            {arrivingPanel}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {initialLoading ? (
              <Card loading />
            ) : areaPlans.length === 0 ? (
              <Card>
                <Empty description="No tables configured. Add tables in Tables & shifts." />
              </Card>
            ) : viewMode === 'list' ? (
              <FloorTablesList
                areaPlans={areaPlans}
                selectedTableId={selectedState?.table.id}
                timeZone={timeZone}
                onSelect={setSelectedState}
                onDropOnTable={onDropOnTable}
              />
            ) : (
              areaPlans.map(([area, states]) => {
                const appearance = resolveFloorAreaAppearance(area, ops.areaAppearances, {
                  backgroundColor: ops.backgroundColor,
                  backgroundUrl: ops.backgroundUrl,
                });
                return (
                  <FloorAreaCanvas
                    key={area}
                    title={area}
                    states={states}
                    fixtures={ops.floorFixtures}
                    backgroundUrl={appearance.backgroundUrl}
                    backgroundColor={appearance.backgroundColor}
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
                );
              })
            )}
          </div>

          <div style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%' }}>{arrivingPanel}</div>
        </div>
      )}

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
                    {formatUsDateTime(selectedState.reservation.slotStart, {
                      timeZone,
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  {(selectedState.reservation.depositAmountCents ?? 0) > 0 ? (
                    <>
                      <br />
                      <Text type="secondary">
                        Deposit {formatUsd(selectedState.reservation.depositAmountCents)} ·{' '}
                        {formatDepositStatus(selectedState.reservation.depositStatus, {
                          depositAmountCents: selectedState.reservation.depositAmountCents,
                          depositRefundedCents: selectedState.reservation.depositRefundedCents,
                        })}
                      </Text>
                    </>
                  ) : null}
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
                  {canRefundDeposit(selectedState.reservation) && (
                    <Button
                      danger
                      icon={<RollbackOutlined />}
                      loading={refunding}
                      onClick={() =>
                        setRefundTarget({
                          id: selectedState.reservation!.id,
                          guestName: formatGuestName(selectedState.reservation!.diner),
                          depositAmountCents: selectedState.reservation!.depositAmountCents,
                          depositRefundedCents: selectedState.reservation!.depositRefundedCents,
                          depositRefundableCents: selectedState.reservation!.depositRefundableCents,
                          depositStatus: selectedState.reservation!.depositStatus,
                        })
                      }
                    >
                      {selectedState.reservation.depositStatus === 'authorized'
                        ? 'Release deposit'
                        : 'Refund deposit'}
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

      <RefundDepositModal
        open={!!refundTarget}
        isHold={refundTarget?.depositStatus === 'authorized'}
        guestName={refundTarget?.guestName}
        amountLabel={refundTarget ? formatUsd(refundTarget.depositAmountCents) : null}
        maxRefundableCents={
          refundTarget
            ? refundTarget.depositRefundableCents ??
              Math.max(
                0,
                (refundTarget.depositAmountCents ?? 0) -
                  (refundTarget.depositRefundedCents ?? 0),
              )
            : null
        }
        loading={refunding}
        onClose={() => setRefundTarget(null)}
        onConfirm={async (reason, amountCents) => {
          if (!refundTarget) return;
          const isHold = refundTarget.depositStatus === 'authorized';
          const remaining =
            refundTarget.depositRefundableCents ??
            Math.max(
              0,
              (refundTarget.depositAmountCents ?? 0) - (refundTarget.depositRefundedCents ?? 0),
            );
          try {
            await refundDeposit({
              variables: { id: refundTarget.id, reason, amountCents },
            });
            message.success(
              isHold
                ? 'Deposit hold released'
                : amountCents != null && amountCents < remaining
                  ? 'Partial deposit refunded'
                  : 'Deposit refunded',
            );
            setRefundTarget(null);
            refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Refund failed');
            throw err;
          }
        }}
      />
    </Space>
  );
}
