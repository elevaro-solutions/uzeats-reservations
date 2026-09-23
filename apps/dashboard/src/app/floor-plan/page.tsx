'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, RotateRightOutlined, SaveOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  FLOOR_PLAN_TABLES,
  CREATE_TABLE,
  UPDATE_TABLE_POSITIONS,
  UPDATE_TABLE,
} from '@/lib/graphql';
import PhotoUpload from '@/components/PhotoUpload';
import {
  DEFAULT_CELL_SIZE,
  FLOOR_GRID_COLS,
  FLOOR_GRID_ROWS,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  RESIZE_HANDLES,
  applyFreeRotation,
  applyResize,
  cellSizeForWidth,
  clampLayout,
  clampMove,
  normalizeRotation,
  pointerAngleDeg,
  screenDeltaToLocal,
  snapDelta,
  tableCenterPx,
  type ResizeHandle,
} from '@/lib/floorPlanCanvas';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const FLOOR_AREA_PRESETS = ['Main', 'Patio', 'Private', 'Bar', 'Rooftop', 'Window'];

function normalizeAreaName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function findAreaName(name: string, areas: string[]) {
  const lower = name.toLowerCase();
  return areas.find((area) => area.toLowerCase() === lower);
}

type FloorAreaSelectProps = {
  value?: string;
  onChange?: (value?: string) => void;
  areas: string[];
  onAddArea?: (value: string) => void;
};

function FloorAreaSelect({ value, onChange, areas, onAddArea }: FloorAreaSelectProps) {
  const [draft, setDraft] = useState('');

  const options = useMemo(() => {
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const area of areas) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      items.push({ value: area, label: area });
    }
    if (value && !seen.has(value.toLowerCase())) {
      items.unshift({ value, label: value });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, value]);

  const addArea = () => {
    const next = normalizeAreaName(draft);
    if (!next) return;
    const existing = findAreaName(next, options.map((item) => item.value));
    const selected = existing ?? next;
    if (!existing) onAddArea?.(selected);
    onChange?.(selected);
    setDraft('');
  };

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={(next) => onChange?.(next)}
      options={options}
      placeholder="Select or add an area"
      optionFilterProp="label"
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space
            style={{ padding: '0 8px 8px', width: '100%' }}
            orientation="vertical"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Input
              placeholder="New area name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArea();
                }
              }}
              maxLength={40}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={addArea}
              disabled={!normalizeAreaName(draft)}
              block
            >
              Add “{normalizeAreaName(draft) || '…'}”
            </Button>
          </Space>
        </>
      )}
    />
  );
}

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
  rotation: number;
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
  rotation: number;
  orig: Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'>;
};

type RotateInteraction = {
  kind: 'rotate';
  tableId: string;
  origRotation: number;
  startAngle: number;
  centerX: number;
  centerY: number;
};

type Interaction = MoveInteraction | ResizeInteraction | RotateInteraction;

function TableDetailsPanel({
  selected,
  onUpdate,
  onSavePhoto,
  onSaveLayout,
  dirty,
  saving,
  cols,
  rows,
}: {
  selected: FloorTable;
  onUpdate: (patch: Partial<FloorTable>) => void;
  onSavePhoto: (photoUrl: string | null) => Promise<void>;
  onSaveLayout: () => Promise<void>;
  dirty: boolean;
  saving: boolean;
  cols: number;
  rows: number;
}) {
  const applyLayoutPatch = (patch: Partial<Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'>>) => {
    const next = clampLayout({
      posX: patch.posX ?? selected.posX,
      posY: patch.posY ?? selected.posY,
      width: patch.width ?? selected.width,
      height: patch.height ?? selected.height,
    }, cols, rows);
    onUpdate(next);
  };

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
        Drag the table to move. Drag a corner or edge to resize. Drag the rotate icon on the table to
        turn it (hold Shift to snap).
      </Text>
      {(selected.rotation ?? 0) !== 0 && (
        <Text type="secondary">Rotated {Math.round(selected.rotation)}°</Text>
      )}
      <div>
        <Text strong>Width (cells)</Text>
        <InputNumber
          min={1}
          max={cols - selected.posX}
          value={selected.width}
          onChange={(v) => v && applyLayoutPatch({ width: v })}
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>
      <div>
        <Text strong>Height (cells)</Text>
        <InputNumber
          min={1}
          max={rows - selected.posY}
          value={selected.height}
          onChange={(v) => v && applyLayoutPatch({ height: v })}
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
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        disabled={!dirty}
        onClick={() => void onSaveLayout()}
        block
      >
        Save layout
      </Button>
    </Space>
  );
}

export default function FloorPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isCompact = !screens.md;

  const [tables, setTables] = useState<FloorTable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const areaFilter = searchParams.get('area') || undefined;
  const [dirty, setDirty] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [gridCellSize, setGridCellSize] = useState<number | null>(DEFAULT_CELL_SIZE);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [customFloorAreas, setCustomFloorAreas] = useState<string[]>([]);
  const [tableForm] = Form.useForm();

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tablesRef = useRef(tables);
  const interactionRef = useRef<Interaction | null>(null);
  const cellSizeRef = useRef(DEFAULT_CELL_SIZE);

  tablesRef.current = tables;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const { data, loading } = useQuery(FLOOR_PLAN_TABLES, {
    skip: !activeRestaurantId,
    variables: { id: activeRestaurantId },
    onError: (err: Error) => message.error(err.message),
  });
  const [createTable, { loading: creatingTable }] = useMutation(CREATE_TABLE);
  const [updatePositions, { loading: saving }] = useMutation(UPDATE_TABLE_POSITIONS);
  const [saveTableMutation] = useMutation(UPDATE_TABLE);

  useEffect(() => {
    setCustomFloorAreas([]);
  }, [activeRestaurantId]);

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
      rotation: t.rotation ?? 0,
      photoUrl: t.photoUrl ?? null,
    }));
    setTables(loaded);
    setSelectedId(null);
    setDirty(false);
    setDetailsOpen(false);
  }, [data]);

  const floorAreas = useMemo(
    () => Array.from(new Set(tables.map((t) => t.floorArea).filter(Boolean))).sort(),
    [tables],
  );
  const floorAreaOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const area of [...FLOOR_AREA_PRESETS, ...floorAreas, ...customFloorAreas]) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      names.push(area);
    }
    return names;
  }, [customFloorAreas, floorAreas]);
  const setAreaFilter = useCallback(
    (area: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (area) params.set('area', area);
      else params.delete('area');
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const visibleTables = useMemo(
    () => tables.filter((t) => t.active && (!areaFilter || t.floorArea === areaFilter)),
    [tables, areaFilter],
  );
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!areaFilter || tables.length === 0) return;
    if (!floorAreas.includes(areaFilter)) setAreaFilter(undefined);
  }, [areaFilter, floorAreas, setAreaFilter, tables.length]);

  useLayoutEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const update = (width: number, height: number) => {
      const w = Math.round(width);
      const h = Math.round(height);
      if (w < 8 || h < 8) return;
      setBox((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };
    const measure = () => update(el.clientWidth, el.clientHeight);
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [loading, areaFilter, activeRestaurantId, visibleTables.length]);
  const fittedSize = Math.min(
    cellSizeForWidth(box.width || 1),
    cellSizeForWidth(box.height || 1, FLOOR_GRID_ROWS),
  );
  const cellSize = gridCellSize ?? (box.width ? fittedSize : DEFAULT_CELL_SIZE);
  cellSizeRef.current = cellSize;
  const canvasCols =
    box.width > 0 && cellSize > 0
      ? Math.max(8, Math.floor(box.width / cellSize))
      : FLOOR_GRID_COLS;
  const canvasRows =
    box.height > 0 && cellSize > 0
      ? Math.max(6, Math.floor(box.height / cellSize))
      : FLOOR_GRID_ROWS;

  const updateTable = useCallback((id: string, patch: Partial<FloorTable>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  }, []);

  const clientToGrid = useCallback((clientX: number, clientY: number) => {
    const el = gridRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const applyInteraction = useCallback(
    (clientX: number, clientY: number, shiftKey = false) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const size = cellSizeRef.current;

      if (interaction.kind === 'rotate') {
        const point = clientToGrid(clientX, clientY);
        const angle = pointerAngleDeg(interaction.centerX, interaction.centerY, point.x, point.y);
        updateTable(interaction.tableId, {
          rotation: applyFreeRotation(
            interaction.origRotation,
            interaction.startAngle,
            angle,
            shiftKey ? 15 : undefined,
          ),
        });
        return;
      }

      if (interaction.kind === 'move') {
        const dx = snapDelta(clientX - interaction.startX, size);
        const dy = snapDelta(clientY - interaction.startY, size);
        const next = clampMove(
          {
            posX: interaction.origPosX,
            posY: interaction.origPosY,
            width: interaction.width,
            height: interaction.height,
          },
          dx,
          dy,
          canvasCols,
          canvasRows,
        );
        updateTable(interaction.tableId, next);
        return;
      }

      const local = screenDeltaToLocal(
        clientX - interaction.startX,
        clientY - interaction.startY,
        interaction.rotation,
      );
      const next = applyResize(
        interaction.orig,
        interaction.handle,
        snapDelta(local.dx, size),
        snapDelta(local.dy, size),
        canvasCols,
        canvasRows,
      );
      updateTable(interaction.tableId, next);
    },
    [clientToGrid, updateTable, canvasCols, canvasRows],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => applyInteraction(e.clientX, e.clientY, e.shiftKey);
    const onTouchMove = (e: TouchEvent) => {
      if (!interactionRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) applyInteraction(touch.clientX, touch.clientY, e.shiftKey);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!selectedId) return;
      const table = tablesRef.current.find((t) => t.id === selectedId);
      if (!table) return;
      e.preventDefault();
      updateTable(table.id, {
        rotation: normalizeRotation((table.rotation ?? 0) + (e.shiftKey ? 90 : 15)),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, updateTable]);

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

  const startRotate = (clientX: number, clientY: number, table: FloorTable) => {
    selectTable(table.id);
    const size = cellSizeRef.current;
    const center = tableCenterPx(table, size);
    const point = clientToGrid(clientX, clientY);
    interactionRef.current = {
      kind: 'rotate',
      tableId: table.id,
      origRotation: table.rotation ?? 0,
      startAngle: pointerAngleDeg(center.x, center.y, point.x, point.y),
      centerX: center.x,
      centerY: center.y,
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
      rotation: table.rotation ?? 0,
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
          restaurantId: activeRestaurantId,
          positions: tables.map((t) => ({
            id: t.id,
            posX: t.posX,
            posY: t.posY,
            width: t.width,
            height: t.height,
            shape: t.shape,
            rotation: t.rotation ?? 0,
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

  const openAddTable = () => {
    tableForm.resetFields();
    tableForm.setFieldsValue({
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: areaFilter || floorAreas[0] || 'Main',
      combinable: false,
      active: true,
      requiresManualApproval: false,
      photoUrl: [],
    });
    setTableModalOpen(true);
  };

  const closeTableModal = () => {
    setTableModalOpen(false);
  };

  const handleCreateTable = async (values: {
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string;
    combinable?: boolean;
    active?: boolean;
    requiresManualApproval?: boolean;
    photoUrl?: string[];
  }) => {
    if (!activeRestaurantId) return;
    const floorArea = values.floorArea?.trim() || 'Main';
    const input = {
      name: values.name.trim(),
      minCapacity: values.minCapacity,
      maxCapacity: values.maxCapacity,
      floorArea,
      combinable: values.combinable ?? false,
      active: values.active ?? true,
      requiresManualApproval: values.requiresManualApproval ?? false,
      photoUrl: values.photoUrl?.[0] ?? null,
    };

    try {
      const result = await createTable({
        variables: { restaurantId: activeRestaurantId, input },
      });
      const created = result.data?.createTable as { id: string; name: string } | undefined;
      if (!created?.id) throw new Error('Failed to add table');

      const nextTable: FloorTable = {
        id: created.id,
        name: input.name,
        minCapacity: input.minCapacity,
        maxCapacity: input.maxCapacity,
        floorArea,
        active: input.active,
        posX: 0,
        posY: 0,
        width: 2,
        height: 2,
        shape: 'rect',
        rotation: 0,
        photoUrl: input.photoUrl,
      };
      // Append locally so unsaved layout edits are not wiped by a refetch.
      setTables((prev) => [...prev, nextTable]);
      setSelectedId(created.id);
      if (isCompact) setDetailsOpen(true);
      if (areaFilter && areaFilter.toLowerCase() !== floorArea.toLowerCase()) {
        setAreaFilter(floorArea);
      }
      message.success('Table added');
      closeTableModal();
      tableForm.resetFields();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to add table');
    }
  };

  const canAddTable = Boolean(activeRestaurantId);

  return (
    <div className="rt-floor-plan-page">
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
          Table layout
        </Title>
        <Space wrap>
          <Button
            icon={<PlusOutlined />}
            onClick={openAddTable}
            disabled={!canAddTable}
          >
            Table
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!dirty}
            onClick={handleSave}
          >
            Save layout
          </Button>
        </Space>
      </div>
      <Text type="secondary">
        Drag tables to move. Select a table, then drag the rotate icon on the table to turn it
        freely. Hold Shift while rotating to snap to 15°. Save when you are done.
      </Text>

      <Space wrap style={{ width: '100%' }}>
        <Select
          style={{ width: '100%', maxWidth: 280 }}
          {...restaurantSelectProps}
        />
        <Select
          placeholder="Floor area"
          allowClear
          style={{ width: '100%', maxWidth: 200 }}
          value={areaFilter}
          onChange={setAreaFilter}
          options={floorAreas.map((a) => ({ value: a, label: a }))}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            Grid size
          </Text>
          <Slider
            min={MIN_CELL_SIZE}
            max={MAX_CELL_SIZE}
            value={gridCellSize ?? fittedSize}
            onChange={(value) => setGridCellSize(value)}
            style={{ width: 120, margin: 0 }}
            tooltip={{ formatter: (value) => `${value}px` }}
          />
          <Button size="small" disabled={gridCellSize == null} onClick={() => setGridCellSize(null)}>
            Fit
          </Button>
        </div>
        {dirty && <Tag color="orange">Unsaved changes</Tag>}
        {selected && isCompact && (
          <Button size="small" onClick={() => setDetailsOpen(true)}>
            Edit {selected.name}
          </Button>
        )}
      </Space>

      <div
        className="rt-floor-plan-canvas-row"
        style={{ flexDirection: isCompact ? 'column' : 'row' }}
      >
        <Card
          className="rt-floor-plan-card"
          loading={loading}
          styles={{ body: { padding: isCompact ? 8 : 12 } }}
        >
          {visibleTables.length === 0 && !loading ? (
            <Empty
              description={
                areaFilter
                  ? `No tables in ${areaFilter}. Add one here or clear the area filter.`
                  : 'No tables yet. Add a table to start arranging the floor plan.'
              }
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddTable} disabled={!canAddTable}>
                Table
              </Button>
            </Empty>
          ) : (
            <div
              ref={canvasWrapRef}
              className="rt-floor-plan-canvas"
              style={{
                border: `1px dashed ${colors.neutral[200]}`,
              }}
            >
              <div
                ref={gridRef}
                style={{
                  position: 'relative',
                  width: canvasCols * cellSize,
                  height: canvasRows * cellSize,
                  minWidth: '100%',
                  minHeight: '100%',
                  backgroundImage:
                    'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)',
                  backgroundSize: `${cellSize}px ${cellSize}px`,
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
                        transform: `rotate(${t.rotation ?? 0}deg)`,
                        transformOrigin: 'center center',
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
                      {isSelected && (
                        <button
                          type="button"
                          aria-label={`Rotate table ${t.name}`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            startRotate(e.clientX, e.clientY, t);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            if (touch) startRotate(touch.clientX, touch.clientY, t);
                          }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            border: '2px solid #fff',
                            background: colors.brand[600],
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                            zIndex: 3,
                            padding: 0,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        >
                          <RotateRightOutlined style={{ fontSize: 12 }} />
                        </button>
                      )}
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
          {visibleTables.length > 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 11, flexShrink: 0 }}>
              Drag the corner to resize this grid
            </Text>
          )}
        </Card>

        {!isCompact && (
          <Card
            title={selected ? `Table ${selected.name}` : 'Table details'}
            className="rt-floor-plan-details"
          >
            {selected ? (
              <TableDetailsPanel
                selected={selected}
                onUpdate={(patch) => updateTable(selected.id, patch)}
                onSavePhoto={savePhoto}
                onSaveLayout={handleSave}
                dirty={dirty}
                saving={saving}
                cols={canvasCols}
                rows={canvasRows}
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
            onSaveLayout={handleSave}
            dirty={dirty}
            saving={saving}
            cols={canvasCols}
            rows={canvasRows}
          />
        )}
      </Drawer>

      <Modal
        title="Add table"
        open={tableModalOpen}
        onCancel={closeTableModal}
        onOk={() => tableForm.submit()}
        confirmLoading={creatingTable}
        okText="Add table"
        centered
        width={520}
        focusable={{ trap: false }}
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto' } }}
      >
        <Form
          form={tableForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void handleCreateTable(values)}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="name"
            label="Table name"
            rules={[{ required: true, message: 'Enter a table name' }]}
          >
            <Input placeholder="e.g. T1, Window 4, Banquette" maxLength={40} />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="minCapacity"
                label="Min guests"
                rules={[{ required: true, message: 'Enter min guests' }]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxCapacity"
                label="Max guests"
                dependencies={['minCapacity']}
                rules={[
                  { required: true, message: 'Enter max guests' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const min = getFieldValue('minCapacity');
                      if (value != null && min != null && value < min) {
                        return Promise.reject(new Error('Max must be at least min'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="floorArea"
            label="Floor area"
            extra="Used to group tables on the floor plan and in diner booking."
          >
            <FloorAreaSelect
              areas={floorAreaOptions}
              onAddArea={(area) => {
                setCustomFloorAreas((prev) =>
                  findAreaName(area, prev) ? prev : [...prev, area],
                );
              }}
            />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="combinable"
                label="Combinable"
                valuePropName="checked"
                extra="Join with nearby tables for larger parties"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="requiresManualApproval"
            label="Require manual approval"
            valuePropName="checked"
            extra="Bookings assigned to this table stay pending until staff confirms"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="photoUrl" label="Photo" extra="Optional. Shown on the diner restaurant page.">
            <PhotoUpload maxCount={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
