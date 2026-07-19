'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Empty,
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
import { MY_RESTAURANTS, FLOOR_PLAN_TABLES, UPDATE_TABLE_POSITIONS } from '@/lib/graphql';

const { Title, Text } = Typography;

const GRID_SIZE = 40;
const GRID_COLS = 24;
const GRID_ROWS = 16;

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
};

export default function FloorPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>();
  const [dirty, setDirty] = useState(false);

  const dragRef = useRef<{
    tableId: string;
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
  } | null>(null);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading } = useQuery(FLOOR_PLAN_TABLES, {
    skip: !restaurantId,
    variables: { id: restaurantId },
    onError: (err) => message.error(err.message),
  });
  const [updatePositions, { loading: saving }] = useMutation(UPDATE_TABLE_POSITIONS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  useEffect(() => {
    const loaded: FloorTable[] = (data?.restaurant?.tables ?? []).map((t: any) => ({
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
    }));
    setTables(loaded);
    setSelectedId(null);
    setDirty(false);
  }, [data]);

  const floorAreas = useMemo(
    () => Array.from(new Set(tables.map((t) => t.floorArea))).sort(),
    [tables],
  );
  const visibleTables = useMemo(
    () => tables.filter((t) => t.active && (!areaFilter || t.floorArea === areaFilter)),
    [tables, areaFilter],
  );
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const updateTable = (id: string, patch: Partial<FloorTable>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const table = tables.find((t) => t.id === drag.tableId);
      if (!table) return;
      const dx = Math.round((e.clientX - drag.startX) / GRID_SIZE);
      const dy = Math.round((e.clientY - drag.startY) / GRID_SIZE);
      const posX = Math.min(Math.max(drag.origPosX + dx, 0), GRID_COLS - table.width);
      const posY = Math.min(Math.max(drag.origPosY + dy, 0), GRID_ROWS - table.height);
      if (posX !== table.posX || posY !== table.posY) {
        updateTable(drag.tableId, { posX, posY });
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  const startDrag = (e: React.MouseEvent, table: FloorTable) => {
    e.preventDefault();
    setSelectedId(table.id);
    dragRef.current = {
      tableId: table.id,
      startX: e.clientX,
      startY: e.clientY,
      origPosX: table.posX,
      origPosY: table.posY,
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
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save layout');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Floor plan</Title>
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
        Drag tables to arrange your floor. Click a table to edit its size and shape, then save.
      </Text>

      <Space wrap>
        <Select
          style={{ width: 260 }}
          value={restaurantId}
          onChange={(id) => {
            setRestaurantId(id);
            localStorage.setItem('activeRestaurantId', id);
          }}
          options={(restData?.myRestaurants ?? []).map((r: any) => ({
            value: r.id,
            label: r.name,
          }))}
        />
        <Select
          placeholder="Floor area"
          allowClear
          style={{ width: 180 }}
          value={areaFilter}
          onChange={setAreaFilter}
          options={floorAreas.map((a) => ({ value: a, label: a }))}
        />
        {dirty && <Tag color="orange">Unsaved changes</Tag>}
      </Space>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Card loading={loading} bodyStyle={{ padding: 12, overflow: 'auto' }} style={{ flex: 1 }}>
          {visibleTables.length === 0 && !loading ? (
            <Empty description="No tables in this area. Add tables under Tables & shifts." />
          ) : (
            <div
              style={{
                position: 'relative',
                width: GRID_COLS * GRID_SIZE,
                height: GRID_ROWS * GRID_SIZE,
                backgroundImage:
                  'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)',
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                border: '1px solid #d9d9d9',
                borderRadius: 4,
              }}
              onMouseDown={() => setSelectedId(null)}
            >
              {visibleTables.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <div
                    key={t.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, t);
                    }}
                    style={{
                      position: 'absolute',
                      left: t.posX * GRID_SIZE,
                      top: t.posY * GRID_SIZE,
                      width: t.width * GRID_SIZE,
                      height: t.height * GRID_SIZE,
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
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: colors.textTertiary }}>
                      {t.minCapacity}–{t.maxCapacity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title={selected ? `Table ${selected.name}` : 'Table details'} style={{ width: 280 }}>
          {selected ? (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
                <Text strong>Width (cells)</Text>
                <InputNumber
                  min={1}
                  max={GRID_COLS}
                  value={selected.width}
                  onChange={(v) => v && updateTable(selected.id, { width: v })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Height (cells)</Text>
                <InputNumber
                  min={1}
                  max={GRID_ROWS}
                  value={selected.height}
                  onChange={(v) => v && updateTable(selected.id, { height: v })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Shape</Text>
                <Select
                  value={selected.shape}
                  onChange={(v) => updateTable(selected.id, { shape: v })}
                  options={[
                    { value: 'rect', label: 'Rectangle' },
                    { value: 'round', label: 'Round' },
                  ]}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            </Space>
          ) : (
            <Text type="secondary">Click a table on the canvas to edit it.</Text>
          )}
        </Card>
      </div>
    </Space>
  );
}
