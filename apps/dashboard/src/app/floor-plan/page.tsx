'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Grid,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, FLOOR_PLAN_TABLES, UPDATE_TABLE_POSITIONS, UPDATE_TABLE } from '@/lib/graphql';
import PhotoUpload from '@/components/PhotoUpload';
import {
  FLOOR_GRID_COLS,
  FLOOR_GRID_ROWS,
  MIN_CELL_SIZE,
  RESIZE_HANDLES,
  applyResize,
  cellSizeForWidth,
  clampMove,
  snapDelta,
  type ResizeHandle,
} from '@/lib/floorPlanCanvas';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type FloorTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea: string;
  active: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: string;
  photoUrl?: string | null;
};

type MoveInteraction = {
  kind: 'move';
  tableId: string;
  startX: number;
  startY: number;
  origPosX: number;
  origPosY: number;
  width: number;
  height: number;
};

type ResizeInteraction = {
  kind: 'resize';
  tableId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  orig: Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'>;
};

type Interaction = MoveInteraction | ResizeInteraction;

function TableDetailsPanel({
  selected,
  onUpdate,
  onSavePhoto,
}: {
  selected: FloorTable;
  onUpdate: (patch: Partial<FloorTable>) => void;
  onSavePhoto: (photoUrl: string | null) => Promise<void>;
}) {
  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div>
        <Text type="secondary">Area: </Text>
        <Tag>{selected.floorArea}</Tag>
      </div>
      <div>
        <Text type="secondary">Capacity: </Text>
        {selected.minCapacity}–{selected.maxCapacity}
      </div>
      <div>
        <Text type="secondary">Position: </Text>
        {selected.posX}, {selected.posY}
      </div>
      <div>
        <Text type="secondary">Size: </Text>
        {selected.width} × {selected.height} cells
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Drag the table to move. Drag corners or edges on the canvas to resize.
      </Text>
      <div>
        <Text strong>Width (cells)</Text>
        <InputNumber
          min={1}
          max={FLOOR_GRID_COLS}
          value={selected.width}
          onChange={(v) => v && onUpdate({ width: v })}
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>
      <div>
        <Text strong>Height (cells)</Text>
        <InputNumber
          min={1}
          max={FLOOR_GRID_ROWS}
          value={selected.height}
          onChange={(v) => v && onUpdate({ height: v })}
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>
      <div>
        <Text strong>Shape</Text>
        <Select
          value={selected.shape}
          onChange={(v) => onUpdate({ shape: v })}
          options={[
            { value: 'rect', label: 'Rectangle' },
            { value: 'round', label: 'Round' },
          ]}
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>
      <div>
        <Text strong>Table photo</Text>
        <PhotoUpload
          maxCount={1}
          value={selected.photoUrl ? [selected.photoUrl] : []}
          onChange={async (urls) => {
            const photoUrl = urls[0] ?? null;
            try {
              await onSavePhoto(photoUrl);
              onUpdate({ photoUrl });
              message.success('Photo updated');
            } catch (err: unknown) {
              message.error(err instanceof Error ? err.message : 'Failed to update photo');
            }
          }}
        />
      </div>
    </Space>
  );
}

export default function FloorPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  const isCompact = !screens.md;

  const [restaurantId, setRestaurantId] = useState<string>();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [cellSize, setCellSize] = useState(40);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const tablesRef = useRef(tables);
  const interactionRef = useRef<Interaction | null>(null);
  const cellSizeRef = useRef(cellSize);

  tablesRef.current = tables;
  cellSizeRef.current = cellSize;

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading } = useQuery(FLOOR_PLAN_TABLES, {
    skip: !restaurantId,
    variables: { id: restaurantId },
    onError: (err: Error) => message.error(err.message),
  });
  const [updatePositions, { loading: saving }] = useMutation(UPDATE_TABLE_POSITIONS);
  const [saveTableMutation] = useMutation(UPDATE_TABLE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  useEffect(() => {
    const loaded: FloorTable[] = (data?.restaurant?.tables ?? []).map((t: FloorTable) => ({
      id: t.id,
      name: t.name,
      minCapacity: t.minCapacity,
      maxCapacity: t.maxCapacity,
      floorArea: t.floorArea,
      active: t.active,
      posX: t.posX ?? 0,
      posY: t.posY ?? 0,
      width: t.width || 2,
      height: t.height || 2,
      shape: t.shape || 'rect',
      photoUrl: t.photoUrl ?? null,
    }));
    setTables(loaded);
    setSelectedId(null);
    setDirty(false);
    setDetailsOpen(false);
  }, [data]);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const update = () => setCellSize(cellSizeForWidth(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, areaFilter, restaurantId]);

  const floorAreas = useMemo(
    () => Array.from(new Set(tables.map((t) => t.floorArea))).sort(),
    [tables],
  );
  const visibleTables = useMemo(
    () => tables.filter((t) => t.active && (!areaFilter || t.floorArea === areaFilter)),
    [tables, areaFilter],
  );
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const canvasHeight = FLOOR_GRID_ROWS * cellSize;

  const updateTable = useCallback((id: string, patch: Partial<FloorTable>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  }, []);

  const applyInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const size = cellSizeRef.current;
      const dx = snapDelta(clientX - interaction.startX, size);
      const dy = snapDelta(clientY - interaction.startY, size);
      if (dx === 0 && dy === 0) return;

      if (interaction.kind === 'move') {
        const next = clampMove(
          {
            posX: interaction.origPosX,
            posY: interaction.origPosY,
            width: interaction.width,
            height: interaction.height,
          },
          dx,
          dy,
        );
        updateTable(interaction.tableId, next);
        interactionRef.current = {
          ...interaction,
          startX: clientX,
          startY: clientY,
          origPosX: next.posX,
          origPosY: next.posY,
        };
        return;
      }

      const next = applyResize(interaction.orig, interaction.handle, dx, dy);
      updateTable(interaction.tableId, next);
      interactionRef.current = {
        ...interaction,
        startX: clientX,
        startY: clientY,
        orig: next,
      };
    },
    [updateTable],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => applyInteraction(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!interactionRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) applyInteraction(touch.clientX, touch.clientY);
    };
    const end = () => {
      interactionRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [applyInteraction]);

  const selectTable = (tableId: string) => {
    setSelectedId(tableId);
    if (isCompact) setDetailsOpen(true);
  };

  const startMove = (clientX: number, clientY: number, table: FloorTable) => {
    selectTable(table.id);
    interactionRef.current = {
      kind: 'move',
      tableId: table.id,
      startX: clientX,
      startY: clientY,
      origPosX: table.posX,
      origPosY: table.posY,
      width: table.width,
      height: table.height,
    };
  };

  const startResize = (
    clientX: number,
    clientY: number,
    table: FloorTable,
    handle: ResizeHandle,
  ) => {
    selectTable(table.id);
    interactionRef.current = {
      kind: 'resize',
      tableId: table.id,
      handle,
      startX: clientX,
      startY: clientY,
      orig: {
        posX: table.posX,
        posY: table.posY,
        width: table.width,
        height: table.height,
      },
    };
  };

  const handleSave = async () => {
    try {
      await updatePositions({
        variables: {
          restaurantId,
          positions: tables.map((t) => ({
            id: t.id,
            posX: t.posX,
            posY: t.posY,
            width: t.width,
            height: t.height,
            shape: t.shape,
          })),
        },
      });
      message.success('Layout saved');
      setDirty(false);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to save layout');
    }
  };

  const savePhoto = async (photoUrl: string | null) => {
    if (!selected) return;
    await saveTableMutation({
      variables: {
        id: selected.id,
        input: {
          name: selected.name,
          minCapacity: selected.minCapacity,
          maxCapacity: selected.maxCapacity,
          floorArea: selected.floorArea,
          combinable: false,
          active: selected.active,
          photoUrl,
        },
      },
    });
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Floor plan
        </Title>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
        >
          Save layout
        </Button>
      </div>
      <Text type="secondary">
        Drag tables to move. Select a table and pull its edges or corners to resize. Pinch-friendly on
        tablets — save when you are done.
      </Text>

      <Space wrap style={{ width: '100%' }}>
        <Select
          style={{ width: '100%', maxWidth: 280 }}
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
        <Select
          placeholder="Floor area"
          allowClear
          style={{ width: '100%', maxWidth: 200 }}
          value={areaFilter}
          onChange={setAreaFilter}
          options={floorAreas.map((a) => ({ value: a, label: a }))}
        />
        {dirty && <Tag color="orange">Unsaved changes</Tag>}
        {selected && isCompact && (
          <Button size="small" onClick={() => setDetailsOpen(true)}>
            Edit {selected.name}
          </Button>
        )}
      </Space>

      <div
        style={{
          display: 'flex',
          flexDirection: isCompact ? 'column' : 'row',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        <Card
          loading={loading}
          style={{ flex: '1 1 320px', minWidth: 0 }}
          styles={{ body: { padding: isCompact ? 8 : 12 } }}
        >
          {visibleTables.length === 0 && !loading ? (
            <Empty description="No tables in this area. Add tables under Tables & shifts." />
          ) : (
            <div ref={canvasWrapRef} style={{ width: '100%', overflowX: 'auto' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minWidth: FLOOR_GRID_COLS * MIN_CELL_SIZE,
                  height: canvasHeight,
                  backgroundImage:
                    'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)',
                  backgroundSize: `${cellSize}px ${cellSize}px`,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  touchAction: 'none',
                }}
                onMouseDown={() => {
                  setSelectedId(null);
                  if (isCompact) setDetailsOpen(false);
                }}
              >
                {visibleTables.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <div
                      key={t.id}
                      style={{
                        position: 'absolute',
                        left: t.posX * cellSize,
                        top: t.posY * cellSize,
                        width: t.width * cellSize,
                        height: t.height * cellSize,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          startMove(e.clientX, e.clientY, t);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          const touch = e.touches[0];
                          if (touch) startMove(touch.clientX, touch.clientY, t);
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: t.shape === 'round' ? '50%' : 6,
                          background: isSelected ? colors.brand[50] : colors.neutral[25],
                          border: isSelected
                            ? `2px solid ${colors.brand[600]}`
                            : `1px solid ${colors.neutral[300]}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          userSelect: 'none',
                          overflow: 'hidden',
                          padding: 4,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: Math.max(10, cellSize * 0.28) }}>
                          {t.name}
                        </span>
                        <span
                          style={{
                            fontSize: Math.max(9, cellSize * 0.24),
                            color: colors.textTertiary,
                          }}
                        >
                          {t.minCapacity}–{t.maxCapacity}
                        </span>
                      </div>
                      {isSelected &&
                        RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              startResize(e.clientX, e.clientY, t, h.id);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const touch = e.touches[0];
                              if (touch) startResize(touch.clientX, touch.clientY, t, h.id);
                            }}
                            style={{
                              position: 'absolute',
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background: colors.brand[600],
                              border: '2px solid #fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              zIndex: 2,
                              cursor: h.cursor,
                              ...h.style,
                            }}
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {!isCompact && (
          <Card
            title={selected ? `Table ${selected.name}` : 'Table details'}
            style={{ flex: '0 0 300px', maxWidth: 360 }}
          >
            {selected ? (
              <TableDetailsPanel
                selected={selected}
                onUpdate={(patch) => updateTable(selected.id, patch)}
                onSavePhoto={savePhoto}
              />
            ) : (
              <Text type="secondary">Click a table on the canvas to edit it.</Text>
            )}
          </Card>
        )}
      </div>

      <Drawer
        title={selected ? `Table ${selected.name}` : 'Table details'}
        open={isCompact && detailsOpen && !!selected}
        onClose={() => setDetailsOpen(false)}
        size="large"
        styles={{ body: { paddingBottom: 24 } }}
      >
        {selected && (
          <TableDetailsPanel
            selected={selected}
            onUpdate={(patch) => updateTable(selected.id, patch)}
            onSavePhoto={savePhoto}
          />
        )}
      </Drawer>
    </Space>
  );
}
