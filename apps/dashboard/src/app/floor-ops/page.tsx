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
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  FLOOR_PLAN_OPS,
  SEAT_RESERVATION_AT_TABLE,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';

import {
  FLOOR_GRID_COLS,
  MIN_CELL_SIZE,
  cellSizeForWidth,
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

export default function FloorOpsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [areaFilter, setAreaFilter] = useState<string>();
  const [selectedState, setSelectedState] = useState<TableState | null>(null);
  const [dragReservationId, setDragReservationId] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(40);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(FLOOR_PLAN_OPS, {
    skip: !restaurantId,
    variables: { restaurantId },
    pollInterval: 10_000,
    onError: (err: Error) => message.error(err.message),
  });
  const [seatAtTable, { loading: seating }] = useMutation(SEAT_RESERVATION_AT_TABLE);
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const update = () => setCellSize(cellSizeForWidth(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, areaFilter, restaurantId]);

  const tableStates: TableState[] = data?.floorPlanOps?.tables ?? [];
  const unassigned = data?.floorPlanOps?.unassigned ?? [];

  const floorAreas = useMemo(
    () => Array.from(new Set(tableStates.map((s) => s.table.floorArea))).sort(),
    [tableStates],
  );

  const visibleStates = useMemo(
    () =>
      tableStates.filter((s) => !areaFilter || s.table.floorArea === areaFilter),
    [tableStates, areaFilter],
  );

  const canvasHeight = useMemo(() => {
    const maxRow = visibleStates.reduce(
      (max, s) => Math.max(max, s.table.posY + s.table.height),
      4,
    );
    return maxRow * cellSize + cellSize;
  }, [visibleStates, cellSize]);

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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const onDropOnTable = async (tableId: string) => {
    if (!dragReservationId) return;
    await handleSeatAtTable(dragReservationId, tableId);
    setDragReservationId(null);
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          Floor ops
        </Title>
        <Space wrap>
          <Select
            style={{ width: '100%', maxWidth: 220 }}
            value={restaurantId}
            onChange={(id) => {
              setRestaurantId(id);
              localStorage.setItem('activeRestaurantId', id);
            }}
            options={(restData?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
              value: r.id,
              label: r.name,
            }))}
          />
          {floorAreas.length > 1 && (
            <Select
              allowClear
              placeholder="All areas"
              style={{ width: 140 }}
              value={areaFilter}
              onChange={setAreaFilter}
              options={floorAreas.map((a) => ({ value: a, label: a }))}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading}>
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
        <Card
          loading={loading}
          style={{ flex: '1 1 520px', minWidth: 320 }}
          styles={{ body: { padding: 16, overflow: 'auto' } }}
        >
          {visibleStates.length === 0 ? (
            <Empty description="No tables configured. Add tables in Tables & shifts." />
          ) : (
            <div ref={canvasWrapRef} style={{ width: '100%', overflowX: 'auto' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minWidth: FLOOR_GRID_COLS * MIN_CELL_SIZE,
                  height: canvasHeight,
                  background: `repeating-linear-gradient(
                  0deg, transparent, transparent ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize}px
                ),
                repeating-linear-gradient(
                  90deg, transparent, transparent ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize - 1}px, ${colors.neutral[100]} ${cellSize}px
                )`,
                  borderRadius: 8,
                }}
              >
              {visibleStates.map((state) => {
                const t = state.table;
                const bg = STATUS_COLORS[state.status] ?? STATUS_COLORS.free;
                const isTurning = state.status === 'turning';
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedState(state)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedState(state)}
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
                      position: 'absolute',
                      left: t.posX * cellSize,
                      top: t.posY * cellSize,
                      width: t.width * cellSize - 4,
                      height: t.height * cellSize - 4,
                      background: bg,
                      borderRadius: t.shape === 'round' ? 999 : 6,
                      border: '2px solid rgba(255,255,255,0.5)',
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
                    <span style={{ opacity: 0.85 }}>{t.minCapacity}-{t.maxCapacity}</span>
                    {state.turnMinutesRemaining != null && state.status !== 'free' && (
                      <span style={{ fontSize: 10, marginTop: 2 }}>
                        {formatTimer(state.turnMinutesRemaining)}
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </Card>

        <Card
          title={`Arriving (${unassigned.length})`}
          style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%' }}
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
                      Party {r.partySize} · {new Date(r.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    {new Date(selectedState.reservation.slotStart).toLocaleString()}
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
                        handleStatusChange(
                          selectedState.reservation!.id,
                          'cancelled',
                          'Cancelled by restaurant',
                        )
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
    </Space>
  );
}
