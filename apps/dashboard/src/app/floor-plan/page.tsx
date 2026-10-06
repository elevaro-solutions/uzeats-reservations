'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RotateRightOutlined,
  SettingOutlined,
  TableOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  CloudUploadOutlined,
  PrinterOutlined,
  DownloadOutlined,
  UploadOutlined,
  BorderOuterOutlined,
  AppstoreOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { colors } from '@reservations/ui';
import {
  DEFAULT_TABLE_HEIGHT,
  DEFAULT_TABLE_WIDTH,
  findFreeFloorSpot,
  FLOOR_FIXTURE_KINDS,
  FLOOR_FIXTURE_LABELS,
  FLOOR_LAYOUT_TEMPLATES,
  FLOOR_PLAN_GRID_COLS,
  HistoryStack,
  applyFloorLayoutTemplate,
  exportFloorTablesCsv,
  findOverlappingIds,
  formatCellLength,
  idsInMarquee,
  newCombineGroupId,
  newFixtureId,
  newRoomId,
  normalizeTableShape,
  parseFloorTablesCsv,
  resolveFloorAreaAppearance,
  snapWithAlignmentGuides,
  type AlignmentGuide,
  type FloorFixtureKind,
  type FloorLayoutTemplateId,
  type FloorRoom,
} from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  FLOOR_PLAN_TABLES,
  CREATE_TABLE,
  UPDATE_TABLE,
  DELETE_TABLE,
  SAVE_FLOOR_PLAN_DRAFT,
  PUBLISH_FLOOR_PLAN,
} from '@/lib/graphql';
import PhotoUpload from '@/components/PhotoUpload';
import {
  findAreaName,
  TableFormFields,
  tableDepositInput,
  type TableDepositFormValues,
} from '@/components/TableFormFields';
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
  floorGridLineColor,
  resolveFloorBackgroundColor,
  shapeAccent,
  shapeBorderRadius,
  shapeCanvasExtras,
  snapDelta,
  tableCenterPx,
  type ResizeHandle,
} from '@/lib/floorPlanCanvas';
import { buildTableShapeSelectOptions } from '@/components/TableShapeGlyph';
import {
  tableShapeLabelChipStyle,
  tableShapeLabelFontSizes,
} from '@/lib/tableShapeLabel';
import { useTableShapes } from '@/lib/useTableShapes';
import {
  FIXTURE_DEFAULTS,
  applyDraftPositions,
  cloneSnapshot,
  duplicateTableLayout,
  emptySnapshot,
  mapLoadedRooms,
  mapLoadedAreaAppearances,
  mapLoadedScale,
  mapLoadedTables,
  nextTableName,
  roomPathD,
  toSaveInput,
  type FloorFixture,
  type FloorPlanSnapshot,
  type FloorTable,
} from '@/lib/floorPlanEditor';
import { printFloorPlanLayout } from '@/lib/floorPlanPrint';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const FLOOR_AREA_PRESETS = ['Main', 'Patio', 'Private', 'Bar', 'Rooftop', 'Window'];

type MoveInteraction = {
  kind: 'move';
  target: 'table' | 'fixture';
  ids: string[];
  startX: number;
  startY: number;
  origins: Record<string, { posX: number; posY: number; width: number; height: number }>;
};

type ResizeInteraction = {
  kind: 'resize';
  target: 'table' | 'fixture';
  id: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  rotation: number;
  orig: { posX: number; posY: number; width: number; height: number };
};

type RotateInteraction = {
  kind: 'rotate';
  target: 'table' | 'fixture';
  id: string;
  origRotation: number;
  startAngle: number;
  centerX: number;
  centerY: number;
};

type MarqueeInteraction = {
  kind: 'marquee';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type Interaction = MoveInteraction | ResizeInteraction | RotateInteraction | MarqueeInteraction;

function tableInputFrom(t: FloorTable, overrides: Partial<FloorTable> = {}) {
  const next = { ...t, ...overrides };
  const minCapacity = Math.min(next.minCapacity, next.maxCapacity);
  const maxCapacity = Math.max(next.minCapacity, next.maxCapacity);
  return {
    name: next.name,
    minCapacity,
    maxCapacity,
    floorArea: next.floorArea,
    combinable: next.combinable,
    active: next.active,
    requiresManualApproval: next.requiresManualApproval ?? false,
    depositRequired: next.depositRequired ?? false,
    depositAmountCents: next.depositAmountCents ?? 0,
    photoUrl: next.photoUrl ?? null,
    shape: next.shape,
    rotation: next.rotation ?? 0,
    combineGroupId: next.combineGroupId ?? null,
    posX: next.posX,
    posY: next.posY,
    width: next.width,
    height: next.height,
  };
}

function FieldLabel({ children, tip }: { children: ReactNode; tip?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
        minHeight: 18,
      }}
    >
      <Text type="secondary" style={{ fontSize: 12, lineHeight: '18px' }}>
        {children}
      </Text>
      {tip ? (
        <Tooltip title={tip}>
          <QuestionCircleOutlined
            style={{ fontSize: 12, color: colors.textTertiary, cursor: 'help' }}
          />
        </Tooltip>
      ) : null}
    </div>
  );
}

function SwitchRow({
  label,
  tip,
  checked,
  onChange,
}: {
  label: string;
  tip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '6px 0',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <Text style={{ fontSize: 13 }}>{label}</Text>
        <Tooltip title={tip}>
          <QuestionCircleOutlined
            style={{ fontSize: 12, color: colors.textTertiary, cursor: 'help', flexShrink: 0 }}
          />
        </Tooltip>
      </span>
      <Switch size="small" checked={checked} onChange={onChange} />
    </div>
  );
}

function TableDetailsPanel({
  selected,
  selectedCount,
  floorAreaOptions,
  onAddArea,
  onUpdate,
  onSaveMeta,
  onDuplicate,
  onDelete,
  onLinkCombine,
  onUnlinkCombine,
  cols,
  rows,
  overlap,
  sizeLabel,
}: {
  selected: FloorTable;
  selectedCount: number;
  floorAreaOptions: string[];
  onAddArea: (area: string) => void;
  onUpdate: (patch: Partial<FloorTable>) => void;
  onSaveMeta: (patch: Partial<FloorTable>) => Promise<void>;
  onDuplicate: () => void;
  onDelete: () => void;
  onLinkCombine: () => void;
  onUnlinkCombine: () => void;
  cols: number;
  rows: number;
  overlap: boolean;
  sizeLabel: string;
}) {
  const [areaDraft, setAreaDraft] = useState('');
  const { shapes } = useTableShapes();
  const shapeOptions = useMemo(() => buildTableShapeSelectOptions(shapes), [shapes]);

  const applyLayoutPatch = (patch: Partial<Pick<FloorTable, 'posX' | 'posY' | 'width' | 'height'>>) => {
    const next = clampLayout(
      {
        posX: patch.posX ?? selected.posX,
        posY: patch.posY ?? selected.posY,
        width: patch.width ?? selected.width,
        height: patch.height ?? selected.height,
      },
      cols,
      rows,
    );
    onUpdate(next);
  };

  const addAreaFromDraft = () => {
    const next = areaDraft.trim().replace(/\s+/g, ' ');
    if (!next) return;
    const existing = findAreaName(next, floorAreaOptions);
    const area = existing ?? next;
    if (!existing) onAddArea(area);
    onUpdate({ floorArea: area });
    void onSaveMeta({ floorArea: area });
    setAreaDraft('');
  };

  return (
    <div className="rt-floor-plan-details-body">
      {(overlap || selectedCount > 1) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {overlap && (
            <Alert
              type="warning"
              showIcon
              banner
              message="Overlaps another table in this area"
            />
          )}
          {selectedCount > 1 && (
            <Tag color="blue" style={{ margin: 0, width: 'fit-content' }}>
              {selectedCount} selected — drag together
            </Tag>
          )}
        </div>
      )}

      <section className="rt-floor-plan-details-section">
        <FieldLabel tip="Label on the floor plan and when diners pick a table">Name</FieldLabel>
        <Input
          size="small"
          value={selected.name}
          maxLength={40}
          onChange={(e) => onUpdate({ name: e.target.value })}
          onBlur={() => void onSaveMeta({ name: selected.name.trim() || selected.name })}
        />

        <div className="rt-floor-plan-details-row" style={{ marginTop: 10 }}>
          <div>
            <FieldLabel tip="Smallest party size this table can seat">
              Min guests
            </FieldLabel>
            <InputNumber
              size="small"
              min={1}
              max={selected.maxCapacity}
              value={selected.minCapacity}
              style={{ width: '100%' }}
              onChange={(v) => {
                if (v == null) return;
                const minCapacity = Math.min(Math.max(1, v), selected.maxCapacity);
                onUpdate({ minCapacity });
              }}
              onBlur={() =>
                void onSaveMeta({
                  minCapacity: selected.minCapacity,
                  maxCapacity: selected.maxCapacity,
                })
              }
            />
          </div>
          <div>
            <FieldLabel tip="Largest party size this table can seat">
              Max guests
            </FieldLabel>
            <InputNumber
              size="small"
              min={selected.minCapacity}
              max={50}
              value={selected.maxCapacity}
              style={{ width: '100%' }}
              onChange={(v) => {
                if (v == null) return;
                const maxCapacity = Math.max(Math.min(50, v), selected.minCapacity);
                onUpdate({ maxCapacity });
              }}
              onBlur={() =>
                void onSaveMeta({
                  minCapacity: selected.minCapacity,
                  maxCapacity: selected.maxCapacity,
                })
              }
            />
          </div>
        </div>

        <div className="rt-floor-plan-details-row" style={{ marginTop: 10 }}>
          <div>
            <FieldLabel tip="Floor area / room grouping (Main, Patio, …)">Area</FieldLabel>
            <Select
              size="small"
              showSearch
              value={selected.floorArea}
              style={{ width: '100%' }}
              options={floorAreaOptions.map((a) => ({ value: a, label: a }))}
              onChange={(floorArea) => {
                onUpdate({ floorArea });
                void onSaveMeta({ floorArea });
              }}
              popupRender={(menu) => (
                <>
                  {menu}
                  <div
                    style={{ padding: 8, borderTop: `1px solid ${colors.neutral[100]}` }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        size="small"
                        placeholder="New area"
                        value={areaDraft}
                        maxLength={40}
                        onChange={(e) => setAreaDraft(e.target.value)}
                        onPressEnter={addAreaFromDraft}
                      />
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={!areaDraft.trim()}
                        onClick={addAreaFromDraft}
                      />
                    </Space.Compact>
                  </div>
                </>
              )}
            />
          </div>
          <div>
            <FieldLabel tip="Visual silhouette on the floor plan (booth backrest, bar rail, etc.)">
              Shape
            </FieldLabel>
            <Select
              size="small"
              value={selected.shape}
              onChange={(shape) => onUpdate({ shape: normalizeTableShape(shape) })}
              options={shapeOptions}
              optionLabelProp="label"
              popupMatchSelectWidth={220}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </section>

      <section className="rt-floor-plan-details-section">
        <div className="rt-floor-plan-details-row">
          <div>
            <FieldLabel tip="How many grid cells wide the table is on the floor plan">
              Width (cells)
            </FieldLabel>
            <InputNumber
              size="small"
              min={1}
              max={cols - selected.posX}
              value={selected.width}
              onChange={(v) => v && applyLayoutPatch({ width: v })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <FieldLabel tip="How many grid cells tall the table is on the floor plan">
              Height (cells)
            </FieldLabel>
            <InputNumber
              size="small"
              min={1}
              max={rows - selected.posY}
              value={selected.height}
              onChange={(v) => v && applyLayoutPatch({ height: v })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
          Real size ≈ {sizeLabel}
          {(selected.rotation ?? 0) !== 0 ? ` · rotated ${Math.round(selected.rotation)}°` : ''}
        </Text>
      </section>

      <section className="rt-floor-plan-details-section">
        <SwitchRow
          label="Combinable"
          tip="Allow joining this table with nearby combinable tables for larger parties"
          checked={selected.combinable}
          onChange={(combinable) => {
            onUpdate({ combinable });
            void onSaveMeta({ combinable });
          }}
        />
        <SwitchRow
          label="Available for booking"
          tip="When off, the table is hidden from diner booking and the live floor plan"
          checked={selected.active}
          onChange={(active) => {
            onUpdate({ active });
            void onSaveMeta({ active });
          }}
        />
        <SwitchRow
          label="Needs staff approval"
          tip="Bookings assigned to this table stay pending until staff confirms"
          checked={Boolean(selected.requiresManualApproval)}
          onChange={(requiresManualApproval) => {
            onUpdate({ requiresManualApproval });
            void onSaveMeta({ requiresManualApproval });
          }}
        />
        <SwitchRow
          label="Require deposit"
          tip="Charge a per-guest deposit for this table instead of the restaurant default. When off, the restaurant deposit setting applies."
          checked={Boolean(selected.depositRequired)}
          onChange={(depositRequired) => {
            onUpdate({ depositRequired });
            void onSaveMeta({ depositRequired });
          }}
        />
        {selected.depositRequired ? (
          <div style={{ padding: '2px 0 6px' }}>
            <FieldLabel tip="Deposit charged per guest when this table is booked, in USD">
              Deposit per guest (USD)
            </FieldLabel>
            <InputNumber
              size="small"
              min={0}
              max={10_000}
              precision={2}
              prefix="$"
              value={selected.depositAmountCents ? selected.depositAmountCents / 100 : null}
              placeholder="0.00"
              style={{ width: '100%' }}
              onChange={(v) =>
                onUpdate({ depositAmountCents: Math.round((Number(v) || 0) * 100) })
              }
              onBlur={() =>
                void onSaveMeta({ depositAmountCents: selected.depositAmountCents ?? 0 })
              }
            />
            {!(selected.depositAmountCents && selected.depositAmountCents > 0) ? (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                Uses the restaurant default until a price is set.
              </Text>
            ) : null}
          </div>
        ) : null}
        {selected.combineGroupId && (
          <Tag color="purple" style={{ marginTop: 4 }}>
            Linked group · {selected.combineGroupId.slice(0, 8)}
          </Tag>
        )}
      </section>

      <section className="rt-floor-plan-details-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tooltip title="Duplicate this table next to it (⌘D)">
            <Button size="small" icon={<CopyOutlined />} onClick={onDuplicate}>
              Duplicate
            </Button>
          </Tooltip>
          {selectedCount >= 2 ? (
            <Tooltip title="Link selected tables as a combine group">
              <Button size="small" icon={<LinkOutlined />} onClick={onLinkCombine}>
                Link
              </Button>
            </Tooltip>
          ) : null}
          {selected.combineGroupId ? (
            <Tooltip title="Remove this table from its combine group">
              <Button size="small" icon={<DisconnectOutlined />} onClick={onUnlinkCombine}>
                Unlink
              </Button>
            </Tooltip>
          ) : null}
          <Popconfirm
            title="Delete this table?"
            description="Removed from the floor plan and booking options."
            onConfirm={onDelete}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </div>

        <div style={{ marginTop: 12 }}>
          <FieldLabel tip="Optional photo shown to diners on the restaurant page">
            Table photo
          </FieldLabel>
          <PhotoUpload
            maxCount={1}
            layout="compact"
            value={selected.photoUrl ? [selected.photoUrl] : []}
            onChange={async (urls) => {
              const photoUrl = urls[0] ?? null;
              onUpdate({ photoUrl });
              try {
                await onSaveMeta({ photoUrl });
                message.success('Photo updated');
              } catch (err: unknown) {
                message.error(err instanceof Error ? err.message : 'Failed to update photo');
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function FloorPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isCompact = !screens.md;
  const { labelFor, renderPresetFor, iconUrlFor, labelLayoutFor } = useTableShapes();

  const [snapshot, setSnapshot] = useState<FloorPlanSnapshot>(() => emptySnapshot());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [drawRoomMode, setDrawRoomMode] = useState(false);
  const [roomDraftPoints, setRoomDraftPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const areaFilter = searchParams.get('area') || undefined;
  const [dirty, setDirty] = useState(false);
  const [hasServerDraft, setHasServerDraft] = useState(false);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [gridCellSize, setGridCellSize] = useState<number | null>(DEFAULT_CELL_SIZE);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [customFloorAreas, setCustomFloorAreas] = useState<string[]>([]);
  const [tableForm] = Form.useForm();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef(new HistoryStack<FloorPlanSnapshot>(cloneSnapshot(snapshot)));
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef(snapshot);
  const interactionRef = useRef<Interaction | null>(null);
  const cellSizeRef = useRef(DEFAULT_CELL_SIZE);
  const dragCommittedRef = useRef(false);
  /** Restaurant id whose snapshot is currently loaded into the editor. */
  const loadedRestaurantIdRef = useRef<string | null>(null);
  /** When true, the next FLOOR_PLAN_TABLES `data` update fully rehydrates the editor. */
  const forceHydrateRef = useRef(false);

  snapshotRef.current = snapshot;
  const areaFilterRef = useRef(areaFilter);
  areaFilterRef.current = areaFilter;
  const isCompactRef = useRef(isCompact);
  isCompactRef.current = isCompact;

  const syncHistoryFlags = () => {
    setCanUndo(historyRef.current.canUndo);
    setCanRedo(historyRef.current.canRedo);
  };

  const commitSnapshot = useCallback((next: FloorPlanSnapshot, opts?: { history?: boolean }) => {
    const cloned = cloneSnapshot(next);
    if (opts?.history !== false) {
      historyRef.current.push(cloned);
    } else {
      historyRef.current.replace(cloned);
    }
    setSnapshot(cloned);
    setDirty(true);
    syncHistoryFlags();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const { data, loading, refetch } = useQuery(FLOOR_PLAN_TABLES, {
    skip: !activeRestaurantId,
    variables: { id: activeRestaurantId },
    onError: (err: Error) => message.error(err.message),
  });
  const [createTable, { loading: creatingTable }] = useMutation(CREATE_TABLE);
  const [saveTableMutation] = useMutation(UPDATE_TABLE);
  const [deleteTableMutation] = useMutation(DELETE_TABLE);
  const [saveDraftMutation, { loading: savingDraft }] = useMutation(SAVE_FLOOR_PLAN_DRAFT);
  const [publishMutation, { loading: publishing }] = useMutation(PUBLISH_FLOOR_PLAN);

  useEffect(() => {
    setCustomFloorAreas([]);
    loadedRestaurantIdRef.current = null;
    forceHydrateRef.current = false;
  }, [activeRestaurantId]);

  useEffect(() => {
    const restaurant = data?.restaurant;
    if (!restaurant) return;

    // updateTable / createTable / deleteTable rewrite the Apollo cache for this query.
    // Rehydrating on every cache write clears selection and wipes unsaved layout edits
    // (blur after changing min/max looked like "click outside deselected the table").
    if (
      loadedRestaurantIdRef.current === restaurant.id &&
      !forceHydrateRef.current
    ) {
      return;
    }
    forceHydrateRef.current = false;

    const liveTables = mapLoadedTables(restaurant.tables ?? []);
    const draft = restaurant.floorPlanDraft;
    const tables = draft?.positions?.length
      ? applyDraftPositions(liveTables, draft.positions)
      : liveTables;
    const fixtures = (draft?.fixtures?.length ? draft.fixtures : restaurant.floorFixtures ?? []).map(
      (f: FloorFixture) => ({
        id: f.id,
        name: f.name,
        kind: f.kind as FloorFixtureKind,
        floorArea: f.floorArea || 'Main',
        posX: f.posX ?? 0,
        posY: f.posY ?? 0,
        width: f.width ?? 2,
        height: f.height ?? 1,
        rotation: f.rotation ?? 0,
      }),
    );
    const hasDraft = Boolean(draft?.updatedAt);
    const backgroundUrl = hasDraft
      ? (draft.backgroundUrl ?? null)
      : (restaurant.floorPlanBackgroundUrl ?? null);
    const backgroundColor = hasDraft
      ? (draft.backgroundColor ?? null)
      : (restaurant.floorPlanBackgroundColor ?? null);
    const areaAppearances = mapLoadedAreaAppearances(
      hasDraft
        ? (draft.areaAppearances ?? restaurant.floorPlanAreaAppearances)
        : restaurant.floorPlanAreaAppearances,
    );
    const rooms = mapLoadedRooms(
      draft?.rooms?.length ? draft.rooms : restaurant.floorRooms,
    );
    const scale = mapLoadedScale(
      draft?.scale ?? restaurant.floorPlanScale,
    );
    const next: FloorPlanSnapshot = {
      tables,
      fixtures,
      rooms,
      backgroundUrl,
      backgroundColor,
      areaAppearances,
      scale,
    };
    loadedRestaurantIdRef.current = restaurant.id;
    historyRef.current.reset(cloneSnapshot(next));
    setSnapshot(next);
    setSelectedIds([]);
    setSelectedFixtureId(null);
    setSelectedRoomId(null);
    setRoomDraftPoints([]);
    setDrawRoomMode(false);
    setDirty(Boolean(draft?.updatedAt));
    setHasServerDraft(Boolean(draft?.updatedAt));
    setDetailsOpen(false);
    setGuides([]);
    syncHistoryFlags();
  }, [data]);

  const tables = snapshot.tables;
  const fixtures = snapshot.fixtures;
  const rooms = snapshot.rooms;

  const floorAreas = useMemo(
    () =>
      Array.from(
        new Set([
          ...tables.map((t) => t.floorArea).filter(Boolean),
          ...fixtures.map((f) => f.floorArea).filter(Boolean),
          ...rooms.map((r) => r.floorArea).filter(Boolean),
        ]),
      ).sort(),
    [tables, fixtures, rooms],
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
  const visibleFixtures = useMemo(
    () => fixtures.filter((f) => !areaFilter || f.floorArea === areaFilter),
    [fixtures, areaFilter],
  );
  const visibleRooms = useMemo(
    () => rooms.filter((r) => !areaFilter || r.floorArea === areaFilter),
    [rooms, areaFilter],
  );
  const canvasAppearance = useMemo(() => {
    if (!areaFilter) {
      return {
        backgroundColor: snapshot.backgroundColor,
        backgroundUrl: snapshot.backgroundUrl,
      };
    }
    return resolveFloorAreaAppearance(areaFilter, snapshot.areaAppearances, {
      backgroundColor: snapshot.backgroundColor,
      backgroundUrl: snapshot.backgroundUrl,
    });
  }, [
    areaFilter,
    snapshot.areaAppearances,
    snapshot.backgroundColor,
    snapshot.backgroundUrl,
  ]);

  const overlappingIds = useMemo(() => {
    const byArea = new Map<string, FloorTable[]>();
    for (const t of visibleTables) {
      const key = (t.floorArea || 'Main').toLowerCase();
      const list = byArea.get(key) ?? [];
      list.push(t);
      byArea.set(key, list);
    }
    const ids = new Set<string>();
    for (const list of byArea.values()) {
      for (const id of findOverlappingIds(list)) ids.add(id);
    }
    return ids;
  }, [visibleTables]);

  const selectedId = selectedIds.length === 1 ? selectedIds[0]! : null;
  const selected = tables.find((t) => t.id === selectedId) ?? null;
  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId) ?? null;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

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
  }, [loading, areaFilter, activeRestaurantId, visibleTables.length, visibleFixtures.length]);

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

  const patchTables = useCallback(
    (updater: (tables: FloorTable[]) => FloorTable[], history = true) => {
      const next = {
        ...snapshotRef.current,
        tables: updater(snapshotRef.current.tables),
      };
      commitSnapshot(next, { history });
    },
    [commitSnapshot],
  );

  const patchFixtures = useCallback(
    (updater: (fixtures: FloorFixture[]) => FloorFixture[], history = true) => {
      const next = {
        ...snapshotRef.current,
        fixtures: updater(snapshotRef.current.fixtures),
      };
      commitSnapshot(next, { history });
    },
    [commitSnapshot],
  );

  const updateTable = useCallback(
    (id: string, patch: Partial<FloorTable>, history = true) => {
      patchTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)), history);
    },
    [patchTables],
  );

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
      const snap = snapshotRef.current;

      if (interaction.kind === 'marquee') {
        interaction.currentX = clientX;
        interaction.currentY = clientY;
        const start = clientToGrid(interaction.startX, interaction.startY);
        const cur = clientToGrid(clientX, clientY);
        const left = Math.min(start.x, cur.x);
        const top = Math.min(start.y, cur.y);
        const width = Math.abs(cur.x - start.x);
        const height = Math.abs(cur.y - start.y);
        setMarqueeBox({ left, top, width, height });
        return;
      }

      if (interaction.kind === 'rotate') {
        const point = clientToGrid(clientX, clientY);
        const angle = pointerAngleDeg(interaction.centerX, interaction.centerY, point.x, point.y);
        const rotation = applyFreeRotation(
          interaction.origRotation,
          interaction.startAngle,
          angle,
          shiftKey ? 15 : undefined,
        );
        if (interaction.target === 'table') {
          updateTable(interaction.id, { rotation }, !dragCommittedRef.current);
        } else {
          patchFixtures(
            (prev) => prev.map((f) => (f.id === interaction.id ? { ...f, rotation } : f)),
            !dragCommittedRef.current,
          );
        }
        dragCommittedRef.current = true;
        return;
      }

      if (interaction.kind === 'move') {
        const dx = snapDelta(clientX - interaction.startX, size);
        const dy = snapDelta(clientY - interaction.startY, size);
        if (interaction.target === 'table') {
          const primaryId = interaction.ids[0]!;
          const primaryOrig = interaction.origins[primaryId]!;
          let nextPrimary = clampMove(
            {
              posX: primaryOrig.posX,
              posY: primaryOrig.posY,
              width: primaryOrig.width,
              height: primaryOrig.height,
            },
            dx,
            dy,
            canvasCols,
            canvasRows,
          );
          const others = snap.tables
            .filter(
              (t) =>
                !interaction.ids.includes(t.id) &&
                t.active &&
                (!areaFilter || t.floorArea === areaFilter),
            )
            .map((t) => ({
              posX: t.posX,
              posY: t.posY,
              width: t.width,
              height: t.height,
            }));
          const aligned = snapWithAlignmentGuides(nextPrimary, others);
          nextPrimary = clampMove(
            { ...aligned.layout, width: primaryOrig.width, height: primaryOrig.height },
            0,
            0,
            canvasCols,
            canvasRows,
          );
          setGuides(aligned.guides);
          const appliedDx = nextPrimary.posX - primaryOrig.posX;
          const appliedDy = nextPrimary.posY - primaryOrig.posY;
          patchTables((prev) =>
            prev.map((t) => {
              if (!interaction.ids.includes(t.id)) return t;
              const orig = interaction.origins[t.id]!;
              const moved = clampMove(
                {
                  posX: orig.posX,
                  posY: orig.posY,
                  width: orig.width,
                  height: orig.height,
                },
                appliedDx,
                appliedDy,
                canvasCols,
                canvasRows,
              );
              return { ...t, ...moved };
            }),
            !dragCommittedRef.current,
          );
        } else {
          const id = interaction.ids[0]!;
          const orig = interaction.origins[id]!;
          const next = clampMove(
            {
              posX: orig.posX,
              posY: orig.posY,
              width: orig.width,
              height: orig.height,
            },
            dx,
            dy,
            canvasCols,
            canvasRows,
          );
          setGuides([]);
          patchFixtures(
            (prev) => prev.map((f) => (f.id === id ? { ...f, ...next } : f)),
            !dragCommittedRef.current,
          );
        }
        dragCommittedRef.current = true;
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
      if (interaction.target === 'table') {
        updateTable(interaction.id, next, !dragCommittedRef.current);
      } else {
        patchFixtures(
          (prev) => prev.map((f) => (f.id === interaction.id ? { ...f, ...next } : f)),
          !dragCommittedRef.current,
        );
      }
      dragCommittedRef.current = true;
    },
    [
      areaFilter,
      canvasCols,
      canvasRows,
      clientToGrid,
      patchFixtures,
      patchTables,
      updateTable,
    ],
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
      const interaction = interactionRef.current;
      if (interaction?.kind === 'marquee') {
        const start = clientToGrid(interaction.startX, interaction.startY);
        const cur = clientToGrid(interaction.currentX, interaction.currentY);
        const size = cellSizeRef.current || 1;
        const filter = areaFilterRef.current;
        const ids = idsInMarquee(
          snapshotRef.current.tables
            .filter((t) => t.active && (!filter || t.floorArea === filter))
            .map((t) => ({
              id: t.id,
              posX: t.posX,
              posY: t.posY,
              width: t.width,
              height: t.height,
            })),
          {
            posX: Math.min(start.x, cur.x) / size,
            posY: Math.min(start.y, cur.y) / size,
            width: Math.abs(cur.x - start.x) / size,
            height: Math.abs(cur.y - start.y) / size,
          },
        );
        if (ids.length) {
          setSelectedIds(ids);
          setSelectedFixtureId(null);
          setSelectedRoomId(null);
          if (isCompactRef.current) setDetailsOpen(true);
        } else {
          setSelectedIds([]);
          setSelectedFixtureId(null);
          setSelectedRoomId(null);
        }
        setMarqueeBox(null);
      }
      interactionRef.current = null;
      dragCommittedRef.current = false;
      setGuides([]);
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
  }, [applyInteraction, clientToGrid]);

  const undo = useCallback(() => {
    const prev = historyRef.current.undo();
    if (!prev) return;
    setSnapshot(cloneSnapshot(prev));
    setDirty(true);
    syncHistoryFlags();
  }, []);

  const redo = useCallback(() => {
    const next = historyRef.current.redo();
    if (!next) return;
    setSnapshot(cloneSnapshot(next));
    setDirty(true);
    syncHistoryFlags();
  }, []);

  const selectTable = (tableId: string, additive: boolean) => {
    setSelectedFixtureId(null);
    setSelectedIds((prev) => {
      if (additive) {
        return prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId];
      }
      return [tableId];
    });
    if (isCompact) setDetailsOpen(true);
  };

  const startMoveTables = (clientX: number, clientY: number, table: FloorTable, additive: boolean) => {
    const ids =
      selectedIds.includes(table.id) && selectedIds.length > 1
        ? selectedIds
        : additive && selectedIds.length
          ? Array.from(new Set([...selectedIds, table.id]))
          : [table.id];
    if (!selectedIds.includes(table.id) || selectedIds.length <= 1) {
      selectTable(table.id, additive);
    }
    const origins: MoveInteraction['origins'] = {};
    for (const id of ids) {
      const t = snapshotRef.current.tables.find((row) => row.id === id);
      if (!t) continue;
      origins[id] = { posX: t.posX, posY: t.posY, width: t.width, height: t.height };
    }
    interactionRef.current = {
      kind: 'move',
      target: 'table',
      ids,
      startX: clientX,
      startY: clientY,
      origins,
    };
  };

  const startRotate = (
    clientX: number,
    clientY: number,
    item: { id: string; posX: number; posY: number; width: number; height: number; rotation: number },
    target: 'table' | 'fixture',
  ) => {
    if (target === 'table') selectTable(item.id, false);
    else {
      setSelectedIds([]);
      setSelectedFixtureId(item.id);
    }
    const size = cellSizeRef.current;
    const center = tableCenterPx(item, size);
    const point = clientToGrid(clientX, clientY);
    interactionRef.current = {
      kind: 'rotate',
      target,
      id: item.id,
      origRotation: item.rotation ?? 0,
      startAngle: pointerAngleDeg(center.x, center.y, point.x, point.y),
      centerX: center.x,
      centerY: center.y,
    };
  };

  const startResize = (
    clientX: number,
    clientY: number,
    item: { id: string; posX: number; posY: number; width: number; height: number; rotation: number },
    handle: ResizeHandle,
    target: 'table' | 'fixture',
  ) => {
    if (target === 'table') selectTable(item.id, false);
    else {
      setSelectedIds([]);
      setSelectedFixtureId(item.id);
    }
    interactionRef.current = {
      kind: 'resize',
      target,
      id: item.id,
      handle,
      startX: clientX,
      startY: clientY,
      rotation: item.rotation ?? 0,
      orig: {
        posX: item.posX,
        posY: item.posY,
        width: item.width,
        height: item.height,
      },
    };
  };

  const saveMeta = async (patch: Partial<FloorTable>) => {
    if (!selected) return;
    const input = tableInputFrom(selected, patch);
    if (!input.name.trim()) return;
    await saveTableMutation({
      variables: { id: selected.id, input },
    });
  };

  const buildSaveInput = () => toSaveInput(snapshotRef.current);

  const handleSaveDraft = async () => {
    if (!activeRestaurantId) return;
    try {
      await saveDraftMutation({
        variables: { restaurantId: activeRestaurantId, input: buildSaveInput() },
      });
      setHasServerDraft(true);
      setDirty(true);
      message.success('Draft saved');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!activeRestaurantId) return;
    if (overlappingIds.size > 0) {
      message.warning('Resolve overlapping tables before publishing');
      return;
    }
    try {
      await publishMutation({
        variables: { restaurantId: activeRestaurantId, input: buildSaveInput() },
      });
      setDirty(false);
      setHasServerDraft(false);
      historyRef.current.reset(cloneSnapshot(snapshotRef.current));
      syncHistoryFlags();
      message.success('Layout published');
      forceHydrateRef.current = true;
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to publish layout');
    }
  };

  const handleDuplicate = async () => {
    if (!selected || !activeRestaurantId) return;
    const layout = duplicateTableLayout(selected, tables);
    const name = nextTableName(tables);
    try {
      const result = await createTable({
        variables: {
          restaurantId: activeRestaurantId,
          input: {
            ...tableInputFrom(selected, {
              name,
              combineGroupId: null,
              ...layout,
            }),
          },
        },
      });
      const created = result.data?.createTable as FloorTable | undefined;
      if (!created?.id) throw new Error('Failed to duplicate');
      const nextTable: FloorTable = {
        ...selected,
        id: created.id,
        name,
        combineGroupId: null,
        posX: created.posX ?? layout.posX,
        posY: created.posY ?? layout.posY,
        width: created.width ?? layout.width,
        height: created.height ?? layout.height,
      };
      commitSnapshot({
        ...snapshotRef.current,
        tables: [...snapshotRef.current.tables, nextTable],
      });
      setSelectedIds([created.id]);
      message.success('Table duplicated');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to duplicate');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteTableMutation({ variables: { id: selected.id } });
      commitSnapshot({
        ...snapshotRef.current,
        tables: snapshotRef.current.tables.filter((t) => t.id !== selected.id),
      });
      setSelectedIds([]);
      message.success('Table deleted');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete table');
    }
  };

  const handleLinkCombine = () => {
    if (selectedIds.length < 2) return;
    const groupId = newCombineGroupId();
    patchTables((prev) =>
      prev.map((t) =>
        selectedIds.includes(t.id) ? { ...t, combinable: true, combineGroupId: groupId } : t,
      ),
    );
    message.success('Tables linked for combine seating');
  };

  const handleUnlinkCombine = () => {
    if (!selected?.combineGroupId) return;
    const groupId = selected.combineGroupId;
    patchTables((prev) =>
      prev.map((t) => (t.combineGroupId === groupId ? { ...t, combineGroupId: null } : t)),
    );
  };

  const addFixture = (kind: FloorFixtureKind) => {
    const defaults = FIXTURE_DEFAULTS[kind];
    const area = areaFilter || floorAreas[0] || 'Main';
    const occupied = [
      ...visibleTables.map((t) => ({
        posX: t.posX,
        posY: t.posY,
        width: t.width,
        height: t.height,
      })),
      ...visibleFixtures.map((f) => ({
        posX: f.posX,
        posY: f.posY,
        width: f.width,
        height: f.height,
      })),
    ];
    const spot = findFreeFloorSpot(occupied, Math.ceil(defaults.width), Math.ceil(defaults.height));
    const fixture: FloorFixture = {
      id: newFixtureId(),
      name: defaults.name,
      kind,
      floorArea: area,
      posX: spot.posX,
      posY: spot.posY,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
    };
    patchFixtures((prev) => [...prev, fixture]);
    setSelectedIds([]);
    setSelectedFixtureId(fixture.id);
    setSelectedRoomId(null);
  };

  const applyTemplate = (templateId: FloorLayoutTemplateId) => {
    const targets = snapshotRef.current.tables.filter(
      (t) => t.active && (!areaFilter || t.floorArea === areaFilter),
    );
    if (!targets.length) {
      message.info('Add tables in this area first');
      return;
    }
    const patches = applyFloorLayoutTemplate(
      targets.map((t) => ({
        id: t.id,
        posX: t.posX,
        posY: t.posY,
        width: t.width,
        height: t.height,
        floorArea: t.floorArea,
      })),
      templateId,
    );
    const byId = new Map(patches.map((p) => [p.id, p]));
    patchTables((prev) =>
      prev.map((t) => {
        const p = byId.get(t.id);
        return p ? { ...t, posX: p.posX, posY: p.posY, rotation: p.rotation } : t;
      }),
    );
    message.success('Template applied — publish when ready');
  };

  const finishRoomDraft = () => {
    if (roomDraftPoints.length < 3) {
      message.warning('Add at least 3 points for a room');
      return;
    }
    const area = areaFilter || floorAreas[0] || 'Main';
    const room: FloorRoom = {
      id: newRoomId(),
      name: `Room ${snapshotRef.current.rooms.length + 1}`,
      floorArea: area,
      points: roomDraftPoints.map((p) => ({ ...p })),
    };
    commitSnapshot({
      ...snapshotRef.current,
      rooms: [...snapshotRef.current.rooms, room],
    });
    setRoomDraftPoints([]);
    setDrawRoomMode(false);
    setSelectedRoomId(room.id);
    message.success('Room added');
  };

  const handleExportCsv = () => {
    const csv = exportFloorTablesCsv(
      snapshotRef.current.tables.map((t) => ({
        name: t.name,
        minCapacity: t.minCapacity,
        maxCapacity: t.maxCapacity,
        floorArea: t.floorArea,
        shape: t.shape,
        posX: t.posX,
        posY: t.posY,
        width: t.width,
        height: t.height,
        rotation: t.rotation ?? 0,
        combinable: t.combinable,
        active: t.active,
        combineGroupId: t.combineGroupId ?? null,
      })),
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-${activeRestaurantId || 'tables'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (file: File) => {
    if (!activeRestaurantId) return;
    try {
      const text = await file.text();
      const rows = parseFloorTablesCsv(text);
      if (!rows.length) {
        message.warning('No table rows found in CSV');
        return;
      }
      const byName = new Map(
        snapshotRef.current.tables.map((t) => [t.name.toLowerCase(), t]),
      );
      let created = 0;
      let updated = 0;
      const nextTables = [...snapshotRef.current.tables];
      for (const row of rows) {
        const existing = byName.get(row.name.toLowerCase());
        if (existing) {
          await saveTableMutation({
            variables: {
              id: existing.id,
              input: {
                name: row.name,
                minCapacity: row.minCapacity,
                maxCapacity: row.maxCapacity,
                floorArea: row.floorArea,
                combinable: row.combinable,
                active: row.active,
                shape: row.shape,
                rotation: row.rotation,
                combineGroupId: row.combineGroupId,
                posX: row.posX,
                posY: row.posY,
                width: row.width,
                height: row.height,
                photoUrl: existing.photoUrl ?? null,
                requiresManualApproval: existing.requiresManualApproval ?? false,
              },
            },
          });
          const idx = nextTables.findIndex((t) => t.id === existing.id);
          if (idx >= 0) {
            nextTables[idx] = {
              ...existing,
              ...row,
              id: existing.id,
              photoUrl: existing.photoUrl,
              requiresManualApproval: existing.requiresManualApproval,
            };
          }
          updated += 1;
        } else {
          const result = await createTable({
            variables: {
              restaurantId: activeRestaurantId,
              input: {
                name: row.name,
                minCapacity: row.minCapacity,
                maxCapacity: row.maxCapacity,
                floorArea: row.floorArea,
                combinable: row.combinable,
                active: row.active,
                shape: row.shape,
                rotation: row.rotation,
                combineGroupId: row.combineGroupId,
                posX: row.posX,
                posY: row.posY,
                width: row.width,
                height: row.height,
                requiresManualApproval: false,
                photoUrl: null,
              },
            },
          });
          const createdRow = result.data?.createTable as FloorTable | undefined;
          if (createdRow?.id) {
            nextTables.push({
              ...row,
              id: createdRow.id,
              photoUrl: null,
              requiresManualApproval: false,
            });
            created += 1;
          }
        }
      }
      commitSnapshot({
        ...snapshotRef.current,
        tables: nextTables,
      });
      message.success(`CSV imported (${created} created, ${updated} updated)`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to import CSV');
    }
  };

  const handlePrint = () => {
    try {
      const restaurantName =
        restaurants.find((r: { id: string; name: string }) => r.id === activeRestaurantId)
          ?.name || 'Restaurant';
      const printArea = areaFilter || floorAreas[0] || 'Main';
      const printAppearance = resolveFloorAreaAppearance(
        printArea,
        snapshotRef.current.areaAppearances,
        {
          backgroundColor: snapshotRef.current.backgroundColor,
          backgroundUrl: snapshotRef.current.backgroundUrl,
        },
      );
      printFloorPlanLayout({
        restaurantName,
        areaFilter,
        tables: snapshotRef.current.tables,
        fixtures: snapshotRef.current.fixtures,
        rooms: snapshotRef.current.rooms,
        backgroundUrl: printAppearance.backgroundUrl,
        backgroundColor: printAppearance.backgroundColor,
        scale: snapshotRef.current.scale,
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to print');
    }
  };

  const openAddTable = () => {
    tableForm.resetFields();
    tableForm.setFieldsValue({
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: areaFilter || floorAreas[0] || 'Main',
      shape: 'rect',
      combinable: false,
      active: true,
      requiresManualApproval: false,
      depositRequired: false,
      depositAmount: null,
      photoUrl: [],
    });
    setTableModalOpen(true);
  };

  const handleCreateTable = async (values: {
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string;
    shape?: string;
    combinable?: boolean;
    active?: boolean;
    requiresManualApproval?: boolean;
    photoUrl?: string[];
  } & TableDepositFormValues) => {
    if (!activeRestaurantId) return;
    const floorArea = values.floorArea?.trim() || 'Main';
    const shape = normalizeTableShape(values.shape);
    const areaKey = floorArea.toLowerCase();
    const preferred = findFreeFloorSpot(
      tables.filter((t) => (t.floorArea || 'Main').toLowerCase() === areaKey),
      DEFAULT_TABLE_WIDTH,
      DEFAULT_TABLE_HEIGHT,
      FLOOR_PLAN_GRID_COLS,
    );
    const input = {
      name: values.name.trim(),
      minCapacity: values.minCapacity,
      maxCapacity: values.maxCapacity,
      floorArea,
      shape,
      combinable: values.combinable ?? false,
      active: values.active ?? true,
      requiresManualApproval: values.requiresManualApproval ?? false,
      ...tableDepositInput(values),
      photoUrl: values.photoUrl?.[0] ?? null,
      posX: preferred.posX,
      posY: preferred.posY,
      width: DEFAULT_TABLE_WIDTH,
      height: DEFAULT_TABLE_HEIGHT,
    };

    try {
      const result = await createTable({
        variables: { restaurantId: activeRestaurantId, input },
      });
      const created = result.data?.createTable as FloorTable | undefined;
      if (!created?.id) throw new Error('Failed to add table');

      const nextTable: FloorTable = {
        id: created.id,
        name: input.name,
        minCapacity: input.minCapacity,
        maxCapacity: input.maxCapacity,
        floorArea,
        combinable: input.combinable,
        active: input.active,
        posX: created.posX ?? input.posX,
        posY: created.posY ?? input.posY,
        width: created.width ?? input.width,
        height: created.height ?? input.height,
        shape: normalizeTableShape(created.shape ?? shape),
        rotation: created.rotation ?? 0,
        combineGroupId: created.combineGroupId ?? null,
        photoUrl: input.photoUrl,
        requiresManualApproval: input.requiresManualApproval,
        depositRequired: input.depositRequired,
        depositAmountCents: input.depositAmountCents,
      };
      commitSnapshot({
        ...snapshotRef.current,
        tables: [...snapshotRef.current.tables, nextTable],
      });
      setSelectedIds([created.id]);
      if (isCompact) setDetailsOpen(true);
      if (areaFilter && areaFilter.toLowerCase() !== floorArea.toLowerCase()) {
        setAreaFilter(floorArea);
      }
      message.success('Table added');
      setTableModalOpen(false);
      tableForm.resetFields();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to add table');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd' && selected) {
        e.preventDefault();
        void handleDuplicate();
        return;
      }
      if (e.key === 'Escape') {
        if (drawRoomMode) {
          setDrawRoomMode(false);
          setRoomDraftPoints([]);
          return;
        }
        setSelectedIds([]);
        setSelectedFixtureId(null);
        setSelectedRoomId(null);
        return;
      }
      if (e.key === 'Enter' && drawRoomMode) {
        e.preventDefault();
        finishRoomDraft();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        void handleDelete();
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && selected) {
        e.preventDefault();
        updateTable(selected.id, {
          rotation: normalizeRotation((selected.rotation ?? 0) + (e.shiftKey ? 90 : 15)),
        });
        return;
      }
      if (selectedIds.length && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        patchTables((prev) =>
          prev.map((t) => {
            if (!selectedIds.includes(t.id)) return t;
            return {
              ...t,
              ...clampMove(t, dx, dy, canvasCols, canvasRows),
            };
          }),
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use latest refs/state via closure on intentional deps
  }, [
    canvasCols,
    canvasRows,
    patchTables,
    redo,
    selected,
    selectedIds,
    undo,
    updateTable,
  ]);

  const canAddTable = Boolean(activeRestaurantId);
  const saving = savingDraft || publishing;

  const tipLabel = (label: string, tip: string) => (
    <Tooltip title={tip} placement="left">
      <span style={{ display: 'inline-block', width: '100%' }}>{label}</span>
    </Tooltip>
  );

  const moreActions: MenuProps['items'] = [
    {
      key: 'fixture',
      icon: <BuildOutlined />,
      label: tipLabel(
        'Add fixture',
        'Place a non-bookable object (bar, wall, host stand, etc.) to orient the floor',
      ),
      disabled: !activeRestaurantId,
      children: FLOOR_FIXTURE_KINDS.map((kind) => ({
        key: `fixture-${kind}`,
        label: tipLabel(
          FLOOR_FIXTURE_LABELS[kind],
          `Add a ${FLOOR_FIXTURE_LABELS[kind].toLowerCase()} fixture to the canvas`,
        ),
        onClick: () => addFixture(kind),
      })),
    },
    {
      key: 'template',
      icon: <AppstoreOutlined />,
      label: tipLabel(
        'Apply template',
        'Rearrange tables in the current area into a preset seating pattern',
      ),
      disabled: !activeRestaurantId || !visibleTables.length,
      children: FLOOR_LAYOUT_TEMPLATES.map((t) => ({
        key: `template-${t.id}`,
        label: tipLabel(t.label, t.description),
        onClick: () => applyTemplate(t.id),
      })),
    },
    { type: 'divider' },
    {
      key: 'draw-room',
      icon: <BorderOuterOutlined />,
      label: tipLabel(
        drawRoomMode ? 'Cancel room drawing' : 'Draw room',
        drawRoomMode
          ? 'Stop drawing and discard unfinished room points'
          : 'Click the canvas to place room corners (at least 3), then Finish room',
      ),
      onClick: () => {
        setDrawRoomMode((v) => !v);
        setRoomDraftPoints([]);
        setSelectedIds([]);
        setSelectedFixtureId(null);
      },
    },
    { type: 'divider' },
    {
      key: 'export-csv',
      icon: <DownloadOutlined />,
      label: tipLabel(
        'Export CSV',
        'Download a spreadsheet of all tables (name, capacity, position, shape)',
      ),
      disabled: !tables.length,
      onClick: handleExportCsv,
    },
    {
      key: 'import-csv',
      icon: <UploadOutlined />,
      label: tipLabel(
        'Import CSV',
        'Upload a CSV to create or update tables by name and apply their layout',
      ),
      disabled: !activeRestaurantId,
      onClick: () => csvInputRef.current?.click(),
    },
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: tipLabel(
        'Print layout',
        'Open a print-ready view of the current floor plan',
      ),
      disabled: !visibleTables.length && !visibleFixtures.length && !visibleRooms.length,
      onClick: handlePrint,
    },
  ];

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
          <Tooltip title="Undo the last layout change (⌘Z / Ctrl+Z)">
            <span>
              <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
            </span>
          </Tooltip>
          <Tooltip title="Redo the last undone change (⌘⇧Z / Ctrl+Y)">
            <span>
              <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
            </span>
          </Tooltip>
          <Tooltip title="Create a new table and place it on the canvas">
            <span>
              <Button icon={<PlusOutlined />} onClick={openAddTable} disabled={!canAddTable}>
                Table
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Fixtures, room drawing, templates, CSV, and print">
            <Dropdown menu={{ items: moreActions }} trigger={['click']} placement="bottomRight">
              <Button>
                Actions <DownOutlined />
              </Button>
            </Dropdown>
          </Tooltip>
          {drawRoomMode && (
            <Tooltip title="Close the room polygon from the points you clicked (needs at least 3)">
              <span>
                <Button
                  type="primary"
                  disabled={roomDraftPoints.length < 3}
                  onClick={finishRoomDraft}
                >
                  Finish room
                </Button>
              </span>
            </Tooltip>
          )}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleImportCsv(file);
            }}
          />
          <Tooltip title="Save an unpublished draft of positions, fixtures, rooms, and scale">
            <span>
              <Button loading={savingDraft} disabled={!dirty} onClick={() => void handleSaveDraft()}>
                Save draft
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Apply the layout to live floor ops and booking (clears the draft)">
            <span>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={publishing}
                disabled={!dirty && !hasServerDraft}
                onClick={() => void handlePublish()}
              >
                Publish
              </Button>
            </span>
          </Tooltip>
        </Space>
      </div>
      <Text type="secondary">
        Drag to move · marquee or Shift-click to multi-select · use Actions for fixtures, rooms,
        templates, CSV, and print. Canvas color, image, and scale live under Area settings.
      </Text>

      <Space wrap style={{ width: '100%' }}>
        <Tooltip title="Which restaurant’s floor plan you are editing">
          <Select style={{ width: '100%', maxWidth: 280 }} {...restaurantSelectProps} />
        </Tooltip>
        <Tooltip title="Show only tables and fixtures in one area (Main, Patio, …)">
          <Select
            placeholder="Floor area"
            allowClear
            style={{ width: '100%', maxWidth: 200 }}
            value={areaFilter}
            onChange={setAreaFilter}
            options={floorAreas.map((a) => ({ value: a, label: a }))}
          />
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
          <Tooltip title="Zoom the grid: larger cells make tables easier to drag">
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              Grid size
            </Text>
          </Tooltip>
          <Slider
            min={MIN_CELL_SIZE}
            max={MAX_CELL_SIZE}
            value={gridCellSize ?? fittedSize}
            onChange={(value) => setGridCellSize(value)}
            style={{ width: 120, margin: 0 }}
            tooltip={{ formatter: (value) => `${value}px` }}
          />
          <Tooltip title="Auto-fit cell size to the canvas width">
            <span>
              <Button
                size="small"
                disabled={gridCellSize == null}
                onClick={() => setGridCellSize(null)}
              >
                Fit
              </Button>
            </span>
          </Tooltip>
        </div>
        <Tooltip title="Canvas color, background image, and real-world scale (ft/m)">
          <Link
            href={
              activeRestaurantId
                ? `/floor-plan/settings?restaurant=${encodeURIComponent(activeRestaurantId)}`
                : '/floor-plan/settings'
            }
          >
            <Button size="small" icon={<SettingOutlined />}>
              Area settings
            </Button>
          </Link>
        </Tooltip>
        {dirty && (
          <Tooltip title="Local edits not yet saved as a draft or published">
            <Tag color="orange">Unsaved changes</Tag>
          </Tooltip>
        )}
        {hasServerDraft && (
          <Tooltip title="A draft is stored on the server; Publish to make it live">
            <Tag color="blue">Draft on server</Tag>
          </Tooltip>
        )}
        {overlappingIds.size > 0 && (
          <Tooltip title="Tables that overlap in the same area — resolve before publishing">
            <Tag color="error">{overlappingIds.size} overlapping</Tag>
          </Tooltip>
        )}
        {selected && isCompact && (
          <Tooltip title="Open details for the selected table">
            <Button size="small" onClick={() => setDetailsOpen(true)}>
              Edit {selected.name}
            </Button>
          </Tooltip>
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
          {visibleTables.length === 0 && visibleFixtures.length === 0 && !loading ? (
            <Empty
              description={
                areaFilter
                  ? `No tables in ${areaFilter}. Add one here or clear the area filter.`
                  : 'No tables yet. Add a table to start arranging the floor plan.'
              }
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddTable}
                disabled={!canAddTable}
              >
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
                  backgroundColor: resolveFloorBackgroundColor(canvasAppearance.backgroundColor),
                  backgroundImage: (() => {
                    const line = floorGridLineColor(canvasAppearance.backgroundColor);
                    const grid = `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`;
                    return canvasAppearance.backgroundUrl
                      ? `${grid}, url(${canvasAppearance.backgroundUrl})`
                      : grid;
                  })(),
                  backgroundSize: canvasAppearance.backgroundUrl
                    ? `${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px, cover`
                    : `${cellSize}px ${cellSize}px`,
                  backgroundPosition: '0 0, 0 0, center',
                  backgroundRepeat: 'repeat, repeat, no-repeat',
                  touchAction: 'none',
                }}
                onMouseDown={(e) => {
                  if (drawRoomMode) {
                    e.stopPropagation();
                    const point = clientToGrid(e.clientX, e.clientY);
                    const size = cellSizeRef.current || 1;
                    setRoomDraftPoints((prev) => [
                      ...prev,
                      {
                        x: Math.round((point.x / size) * 2) / 2,
                        y: Math.round((point.y / size) * 2) / 2,
                      },
                    ]);
                    return;
                  }
                  setSelectedIds([]);
                  setSelectedFixtureId(null);
                  setSelectedRoomId(null);
                  if (isCompact) setDetailsOpen(false);
                  interactionRef.current = {
                    kind: 'marquee',
                    startX: e.clientX,
                    startY: e.clientY,
                    currentX: e.clientX,
                    currentY: e.clientY,
                  };
                }}
              >
                <svg
                  width={canvasCols * cellSize}
                  height={canvasRows * cellSize}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
                >
                  {visibleRooms.map((room) => (
                    <g key={room.id}>
                      <path
                        d={roomPathD(room.points, cellSize)}
                        fill={
                          selectedRoomId === room.id
                            ? 'rgba(11, 61, 46, 0.16)'
                            : 'rgba(11, 61, 46, 0.07)'
                        }
                        stroke={colors.brand[600]}
                        strokeWidth={selectedRoomId === room.id ? 2.5 : 1.5}
                        strokeDasharray="6 4"
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        onMouseDown={(ev) => {
                          ev.stopPropagation();
                          setSelectedRoomId(room.id);
                          setSelectedIds([]);
                          setSelectedFixtureId(null);
                        }}
                      />
                      {room.points[0] && (
                        <text
                          x={room.points[0].x * cellSize + 6}
                          y={room.points[0].y * cellSize + 16}
                          fill={colors.brand[700]}
                          fontSize={Math.max(10, cellSize * 0.28)}
                          style={{ pointerEvents: 'none' }}
                        >
                          {room.name}
                        </text>
                      )}
                    </g>
                  ))}
                  {roomDraftPoints.length > 0 && (
                    <polyline
                      points={roomDraftPoints
                        .map((p) => `${p.x * cellSize},${p.y * cellSize}`)
                        .join(' ')}
                      fill="none"
                      stroke={colors.brand[500]}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}
                  {roomDraftPoints.map((p, i) => (
                    <circle
                      key={`draft-${i}`}
                      cx={p.x * cellSize}
                      cy={p.y * cellSize}
                      r={4}
                      fill={colors.brand[600]}
                    />
                  ))}
                </svg>
                {marqueeBox && (
                  <div
                    style={{
                      position: 'absolute',
                      left: marqueeBox.left,
                      top: marqueeBox.top,
                      width: marqueeBox.width,
                      height: marqueeBox.height,
                      border: `1px solid ${colors.brand[600]}`,
                      background: 'rgba(11, 61, 46, 0.08)',
                      zIndex: 6,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {guides.map((g, i) => (
                  <div
                    key={`${g.orientation}-${g.at}-${i}`}
                    style={
                      g.orientation === 'vertical'
                        ? {
                            position: 'absolute',
                            left: g.at * cellSize,
                            top: 0,
                            width: 1,
                            height: '100%',
                            background: colors.brand[500],
                            zIndex: 5,
                            pointerEvents: 'none',
                          }
                        : {
                            position: 'absolute',
                            top: g.at * cellSize,
                            left: 0,
                            height: 1,
                            width: '100%',
                            background: colors.brand[500],
                            zIndex: 5,
                            pointerEvents: 'none',
                          }
                    }
                  />
                ))}

                {visibleFixtures.map((f) => {
                  const isSelected = f.id === selectedFixtureId;
                  return (
                    <div
                      key={f.id}
                      style={{
                        position: 'absolute',
                        left: f.posX * cellSize,
                        top: f.posY * cellSize,
                        width: f.width * cellSize,
                        height: f.height * cellSize,
                        boxSizing: 'border-box',
                        transform: `rotate(${f.rotation ?? 0}deg)`,
                        transformOrigin: 'center center',
                        zIndex: 1,
                      }}
                    >
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedIds([]);
                          setSelectedFixtureId(f.id);
                          interactionRef.current = {
                            kind: 'move',
                            target: 'fixture',
                            ids: [f.id],
                            startX: e.clientX,
                            startY: e.clientY,
                            origins: {
                              [f.id]: {
                                posX: f.posX,
                                posY: f.posY,
                                width: f.width,
                                height: f.height,
                              },
                            },
                          };
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: f.kind === 'plant' ? '50%' : 4,
                          background:
                            f.kind === 'wall'
                              ? colors.neutral[400]
                              : f.kind === 'door'
                                ? colors.neutral[200]
                                : 'rgba(120, 113, 108, 0.35)',
                          border: isSelected
                            ? `2px solid ${colors.brand[600]}`
                            : `1px dashed ${colors.neutral[500]}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          userSelect: 'none',
                          fontSize: Math.max(9, cellSize * 0.22),
                          color: colors.textSecondary,
                          padding: 2,
                          textAlign: 'center',
                        }}
                      >
                        {f.name || FLOOR_FIXTURE_LABELS[f.kind]}
                      </div>
                      {isSelected &&
                        RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              startResize(e.clientX, e.clientY, f, h.id, 'fixture');
                            }}
                            style={{
                              position: 'absolute',
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background: colors.neutral[600],
                              border: '2px solid #fff',
                              zIndex: 2,
                              cursor: h.cursor,
                              ...h.style,
                            }}
                          />
                        ))}
                    </div>
                  );
                })}

                {visibleTables.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  const isOverlap = overlappingIds.has(t.id);
                  const groupTint = t.combineGroupId
                    ? `2px solid ${colors.brand[400]}`
                    : undefined;
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
                        left: t.posX * cellSize,
                        top: t.posY * cellSize,
                        width: t.width * cellSize,
                        height: t.height * cellSize,
                        boxSizing: 'border-box',
                        transform: `rotate(${t.rotation ?? 0}deg)`,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 5 : 2,
                        overflow: 'visible',
                      }}
                    >
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          startMoveTables(e.clientX, e.clientY, t, e.shiftKey);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          const touch = e.touches[0];
                          if (touch) startMoveTables(touch.clientX, touch.clientY, t, false);
                        }}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          borderRadius: shapeBorderRadius(renderPreset),
                          background: isOverlap
                            ? '#fff1f0'
                            : isSelected
                              ? colors.brand[50]
                              : colors.neutral[25],
                          border: isOverlap
                            ? '2px solid #ff4d4f'
                            : isSelected
                              ? `2px solid ${colors.brand[600]}`
                              : groupTint || `1px solid ${colors.neutral[300]}`,
                          boxShadow: shapeAccent(renderPreset),
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          userSelect: 'none',
                          overflow: 'hidden',
                          padding: 4,
                          ...shapeExtras.style,
                        }}
                      >
                        {shapeExtras.overlay?.map((style, i) => (
                          <div key={`shape-extra-${i}`} style={style} />
                        ))}
                        {shapeIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={shapeIconUrl}
                            alt=""
                            draggable={false}
                            style={{
                              position: 'absolute',
                              inset: '10%',
                              width: '80%',
                              height: '80%',
                              objectFit: 'contain',
                              pointerEvents: 'none',
                              zIndex: 0,
                              opacity: 0.92,
                            }}
                          />
                        ) : null}
                      </div>
                      <div
                        style={{
                          ...tableShapeLabelChipStyle(labelLayout.position),
                          background: shapeIconUrl
                            ? 'rgba(255, 255, 255, 0.92)'
                            : 'rgba(255, 255, 255, 0.95)',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: labelFonts.name,
                            color: colors.textPrimary,
                          }}
                        >
                          {t.name}
                        </span>
                        <span
                          style={{
                            fontSize: labelFonts.meta,
                            color: colors.textSecondary,
                          }}
                        >
                          {t.minCapacity}–{t.maxCapacity}
                          {!shapeIconUrl &&
                          renderPreset !== 'rect' &&
                          renderPreset !== 'round'
                            ? ` · ${shapeLabel}`
                            : ''}
                        </span>
                      </div>
                      {isSelected && selectedIds.length === 1 && (
                        <button
                          type="button"
                          aria-label={`Rotate table ${t.name}`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            startRotate(e.clientX, e.clientY, t, 'table');
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            if (touch) startRotate(touch.clientX, touch.clientY, t, 'table');
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
                        selectedIds.length === 1 &&
                        RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              startResize(e.clientX, e.clientY, t, h.id, 'table');
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const touch = e.touches[0];
                              if (touch) startResize(touch.clientX, touch.clientY, t, h.id, 'table');
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
            title={
              selected
                ? selected.name
                : selectedFixture
                  ? selectedFixture.name
                  : selectedRoom
                    ? selectedRoom.name
                    : 'Details'
            }
            className="rt-floor-plan-details"
            extra={
              selectedFixture ? (
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    patchFixtures((prev) => prev.filter((f) => f.id !== selectedFixture.id));
                    setSelectedFixtureId(null);
                  }}
                >
                  Remove
                </Button>
              ) : selectedRoom ? (
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    commitSnapshot({
                      ...snapshotRef.current,
                      rooms: snapshotRef.current.rooms.filter((r) => r.id !== selectedRoom.id),
                    });
                    setSelectedRoomId(null);
                  }}
                >
                  Remove
                </Button>
              ) : null
            }
          >
            {selected ? (
              <TableDetailsPanel
                selected={selected}
                selectedCount={selectedIds.length}
                floorAreaOptions={floorAreaOptions}
                onAddArea={(area) => {
                  setCustomFloorAreas((prev) =>
                    findAreaName(area, prev) ? prev : [...prev, area],
                  );
                }}
                onUpdate={(patch) => updateTable(selected.id, patch)}
                onSaveMeta={saveMeta}
                onDuplicate={() => void handleDuplicate()}
                onDelete={() => void handleDelete()}
                onLinkCombine={handleLinkCombine}
                onUnlinkCombine={handleUnlinkCombine}
                cols={canvasCols}
                rows={canvasRows}
                overlap={overlappingIds.has(selected.id)}
                sizeLabel={`${formatCellLength(snapshot.scale, selected.width)} × ${formatCellLength(snapshot.scale, selected.height)}`}
              />
            ) : selectedFixture ? (
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text strong>Name</Text>
                  <Input
                    value={selectedFixture.name}
                    style={{ marginTop: 4 }}
                    onChange={(e) =>
                      patchFixtures((prev) =>
                        prev.map((f) =>
                          f.id === selectedFixture.id ? { ...f, name: e.target.value } : f,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Text strong>Kind</Text>
                  <Select
                    value={selectedFixture.kind}
                    style={{ width: '100%', marginTop: 4 }}
                    options={FLOOR_FIXTURE_KINDS.map((kind) => ({
                      value: kind,
                      label: FLOOR_FIXTURE_LABELS[kind],
                    }))}
                    onChange={(kind: FloorFixtureKind) =>
                      patchFixtures((prev) =>
                        prev.map((f) => (f.id === selectedFixture.id ? { ...f, kind } : f)),
                      )
                    }
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Fixtures are not bookable — they help staff orient on the floor.
                </Text>
              </Space>
            ) : selectedRoom ? (
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text strong>Name</Text>
                  <Input
                    value={selectedRoom.name}
                    style={{ marginTop: 4 }}
                    onChange={(e) => {
                      const name = e.target.value;
                      commitSnapshot({
                        ...snapshotRef.current,
                        rooms: snapshotRef.current.rooms.map((r) =>
                          r.id === selectedRoom.id ? { ...r, name } : r,
                        ),
                      });
                    }}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedRoom.points.length} points · area {selectedRoom.floorArea}
                </Text>
              </Space>
            ) : (
              <Text type="secondary">
                Click a table to edit. Drag empty space to marquee-select. Shift-click for multi-select.
                Draw room for polygons.
              </Text>
            )}
          </Card>
        )}
      </div>

      <Drawer
        title={selected ? selected.name : 'Table details'}
        open={isCompact && detailsOpen && !!selected}
        onClose={() => setDetailsOpen(false)}
        size="large"
        styles={{ body: { paddingBottom: 24 } }}
      >
        {selected && (
          <TableDetailsPanel
            selected={selected}
            selectedCount={selectedIds.length}
            floorAreaOptions={floorAreaOptions}
            onAddArea={(area) => {
              setCustomFloorAreas((prev) =>
                findAreaName(area, prev) ? prev : [...prev, area],
              );
            }}
            onUpdate={(patch) => updateTable(selected.id, patch)}
            onSaveMeta={saveMeta}
            onDuplicate={() => void handleDuplicate()}
            onDelete={() => void handleDelete()}
            onLinkCombine={handleLinkCombine}
            onUnlinkCombine={handleUnlinkCombine}
            cols={canvasCols}
            rows={canvasRows}
            overlap={overlappingIds.has(selected.id)}
            sizeLabel={`${formatCellLength(snapshot.scale, selected.width)} × ${formatCellLength(snapshot.scale, selected.height)}`}
          />
        )}
      </Drawer>

      <Modal
        title={
          <span className="rt-table-modal__title">
            <TableOutlined className="rt-table-modal__title-icon" aria-hidden />
            <span>Add table</span>
          </span>
        }
        open={tableModalOpen}
        onCancel={() => setTableModalOpen(false)}
        confirmLoading={creatingTable}
        centered
        width={520}
        wrapClassName="rt-mobile-modal rt-table-modal"
        destroyOnHidden
        focusable={{ trap: false }}
        footer={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            <Button onClick={() => setTableModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={creatingTable}
              onClick={() => tableForm.submit()}
            >
              Add table
            </Button>
          </div>
        }
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        <Form
          form={tableForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void handleCreateTable(values)}
          style={{ marginBottom: 0 }}
        >
          <TableFormFields
            floorAreas={floorAreaOptions}
            onAddArea={(area) => {
              setCustomFloorAreas((prev) =>
                findAreaName(area, prev) ? prev : [...prev, area],
              );
            }}
          />
        </Form>
      </Modal>
    </div>
  );
}
