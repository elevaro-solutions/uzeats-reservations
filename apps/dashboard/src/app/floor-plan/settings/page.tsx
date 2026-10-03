'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  ColorPicker,
  Form,
  InputNumber,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  LayoutOutlined,
  PictureOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_FLOOR_PLAN_BACKGROUND_COLOR,
  DEFAULT_FLOOR_PLAN_SCALE,
  FLOOR_PLAN_BACKGROUND_COLOR_PRESETS,
  resolveFloorAreaAppearance,
  upsertFloorAreaAppearance,
  type FloorFixtureKind,
  type FloorPlanAreaAppearance,
  type FloorPlanScale,
} from '@reservations/shared';
import { PageHeader, colors, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  FLOOR_PLAN_TABLES,
  MY_RESTAURANTS,
  PUBLISH_FLOOR_PLAN,
  SAVE_FLOOR_PLAN_DRAFT,
} from '@/lib/graphql';
import {
  applyDraftPositions,
  mapLoadedAreaAppearances,
  mapLoadedRooms,
  mapLoadedScale,
  mapLoadedTables,
  toSaveInput,
  type FloorFixture,
  type FloorPlanSnapshot,
} from '@/lib/floorPlanEditor';
import { resolveFloorBackgroundColor } from '@/lib/floorPlanCanvas';
import { uploadFile } from '@/lib/upload';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';

const { Text } = Typography;

const FLOOR_AREA_PRESETS = ['Main', 'Patio', 'Private', 'Bar', 'Rooftop', 'Window'];

type SettingsState = {
  areaAppearances: FloorPlanAreaAppearance[];
  /** Restaurant-level fallback (legacy). */
  backgroundUrl: string | null;
  backgroundColor: string | null;
  scale: FloorPlanScale;
};

export default function FloorPlanAreaSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const [bgUploading, setBgUploading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('Main');
  const [settings, setSettings] = useState<SettingsState>({
    areaAppearances: [],
    backgroundUrl: null,
    backgroundColor: null,
    scale: { ...DEFAULT_FLOOR_PLAN_SCALE },
  });
  const [baseline, setBaseline] = useState<SettingsState | null>(null);
  const [snapshotBase, setSnapshotBase] = useState<FloorPlanSnapshot | null>(null);
  const areaFromUrl = searchParams.get('area') || undefined;

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [authLoading, user, router]);

  const { data, loading, refetch } = useQuery(FLOOR_PLAN_TABLES, {
    variables: { id: activeRestaurantId },
    skip: !activeRestaurantId,
    fetchPolicy: 'cache-and-network',
  });

  const [saveDraftMutation, { loading: savingDraft }] = useMutation(SAVE_FLOOR_PLAN_DRAFT);
  const [publishMutation, { loading: publishing }] = useMutation(PUBLISH_FLOOR_PLAN);

  useEffect(() => {
    const restaurant = data?.restaurant;
    if (!restaurant) return;
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
    const rooms = mapLoadedRooms(draft?.rooms?.length ? draft.rooms : restaurant.floorRooms);
    const scale = mapLoadedScale(draft?.scale ?? restaurant.floorPlanScale);
    const nextSettings: SettingsState = {
      areaAppearances,
      backgroundUrl,
      backgroundColor,
      scale,
    };
    setSettings(nextSettings);
    setBaseline(nextSettings);
    setSnapshotBase({
      tables,
      fixtures,
      rooms,
      backgroundUrl,
      backgroundColor,
      areaAppearances,
      scale,
    });

    const areas = Array.from(
      new Set([
        ...tables.map((t) => t.floorArea).filter(Boolean),
        ...fixtures.map((f) => f.floorArea).filter(Boolean),
        ...rooms.map((r) => r.floorArea).filter(Boolean),
        ...areaAppearances.map((a) => a.floorArea),
      ]),
    );
    const preferred = areaFromUrl && areas.includes(areaFromUrl) ? areaFromUrl : areas[0] || 'Main';
    setSelectedArea(preferred);
  }, [data, areaFromUrl]);

  const floorAreaOptions = useMemo(() => {
    const tables = snapshotBase?.tables ?? [];
    const fixtures = snapshotBase?.fixtures ?? [];
    const rooms = snapshotBase?.rooms ?? [];
    const seen = new Set<string>();
    const names: string[] = [];
    for (const area of [
      ...FLOOR_AREA_PRESETS,
      ...tables.map((t) => t.floorArea),
      ...fixtures.map((f) => f.floorArea),
      ...rooms.map((r) => r.floorArea),
      ...settings.areaAppearances.map((a) => a.floorArea),
      selectedArea,
    ]) {
      const key = (area || '').toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      names.push(area);
    }
    return names;
  }, [selectedArea, settings.areaAppearances, snapshotBase]);

  const selectedAppearance = useMemo(
    () =>
      resolveFloorAreaAppearance(selectedArea, settings.areaAppearances, {
        backgroundColor: settings.backgroundColor,
        backgroundUrl: settings.backgroundUrl,
      }),
    [selectedArea, settings],
  );

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return (
      JSON.stringify(settings.areaAppearances) !== JSON.stringify(baseline.areaAppearances) ||
      settings.backgroundUrl !== baseline.backgroundUrl ||
      settings.backgroundColor !== baseline.backgroundColor ||
      settings.scale.unit !== baseline.scale.unit ||
      settings.scale.unitsPerCell !== baseline.scale.unitsPerCell
    );
  }, [baseline, settings]);

  const patchSelectedAppearance = (patch: {
    backgroundColor?: string | null;
    backgroundUrl?: string | null;
  }) => {
    setSettings((prev) => {
      const key = selectedArea.trim().toLowerCase();
      const existing = prev.areaAppearances.find(
        (a) => (a.floorArea || 'Main').trim().toLowerCase() === key,
      );
      const resolved = resolveFloorAreaAppearance(selectedArea, prev.areaAppearances, {
        backgroundColor: prev.backgroundColor,
        backgroundUrl: prev.backgroundUrl,
      });
      return {
        ...prev,
        areaAppearances: upsertFloorAreaAppearance(prev.areaAppearances, {
          floorArea: selectedArea,
          backgroundColor:
            patch.backgroundColor !== undefined
              ? patch.backgroundColor
              : (existing?.backgroundColor ?? resolved.backgroundColor),
          // Don't copy restaurant-wide image into a new area entry unless set explicitly.
          backgroundUrl:
            patch.backgroundUrl !== undefined
              ? patch.backgroundUrl
              : (existing?.backgroundUrl ?? null),
        }),
      };
    });
  };

  const buildSaveInput = () => {
    if (!snapshotBase) return null;
    return toSaveInput({
      ...snapshotBase,
      backgroundUrl: settings.backgroundUrl,
      backgroundColor: settings.backgroundColor,
      areaAppearances: settings.areaAppearances,
      scale: settings.scale,
    });
  };

  const handleSaveDraft = async () => {
    if (!activeRestaurantId) return;
    const input = buildSaveInput();
    if (!input) return;
    try {
      await saveDraftMutation({
        variables: { restaurantId: activeRestaurantId, input },
      });
      setBaseline(settings);
      message.success(`Saved draft for ${selectedArea}`);
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!activeRestaurantId) return;
    const input = buildSaveInput();
    if (!input) return;
    try {
      await publishMutation({
        variables: { restaurantId: activeRestaurantId, input },
      });
      setBaseline(settings);
      message.success('Area settings published');
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const restaurantName =
    restaurants.find((r: { id: string; name: string }) => r.id === activeRestaurantId)?.name ||
    'Restaurant';

  const layoutHref = activeRestaurantId
    ? `/floor-plan?restaurant=${encodeURIComponent(activeRestaurantId)}${
        selectedArea ? `&area=${encodeURIComponent(selectedArea)}` : ''
      }`
    : '/floor-plan';

  if (authLoading || !user) return null;

  return (
    <div component="FloorPlanAreaSettingsPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Area settings"
          subtitle={`Canvas color, underlay image, and real-world scale for ${restaurantName}`}
          extra={
            <Space wrap>
              <Link href={layoutHref}>
                <Button icon={<LayoutOutlined />}>Table layout</Button>
              </Link>
              <Button loading={savingDraft} disabled={!dirty} onClick={() => void handleSaveDraft()}>
                Save draft
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={publishing}
                disabled={!dirty}
                onClick={() => void handlePublish()}
              >
                Publish
              </Button>
            </Space>
          }
        />

        <Space wrap>
          <Link href={layoutHref}>
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back to table layout
            </Button>
          </Link>
          <Select style={{ width: '100%', maxWidth: 280 }} {...restaurantSelectProps} />
          {dirty ? <Text style={{ color: colors.warning }}>Unsaved changes</Text> : null}
        </Space>

        <Card loading={loading} title="Canvas appearance">
          <Form layout="vertical" style={{ maxWidth: 520 }}>
            <Form.Item
              label="Floor area"
              extra="Background color and image apply only to the selected area."
            >
              <Select
                value={selectedArea}
                style={{ width: '100%', maxWidth: 280 }}
                options={floorAreaOptions.map((area) => ({ value: area, label: area }))}
                onChange={(area: string) => setSelectedArea(area)}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label={`Background color — ${selectedArea}`}
              extra="Solid fill behind the floor grid for this area. Grid lines adapt for dark colors."
            >
              <Space wrap>
                <ColorPicker
                  value={resolveFloorBackgroundColor(selectedAppearance.backgroundColor)}
                  presets={[
                    {
                      label: 'Floor',
                      colors: FLOOR_PLAN_BACKGROUND_COLOR_PRESETS.map((p) => p.color),
                    },
                  ]}
                  onChangeComplete={(color) => {
                    const hex = color.toHexString().toLowerCase();
                    patchSelectedAppearance({
                      backgroundColor:
                        hex === DEFAULT_FLOOR_PLAN_BACKGROUND_COLOR ? null : hex,
                    });
                  }}
                  showText={(c) => c.toHexString().toUpperCase()}
                />
                {selectedAppearance.backgroundColor ? (
                  <Button
                    type="text"
                    onClick={() => patchSelectedAppearance({ backgroundColor: null })}
                  >
                    Reset
                  </Button>
                ) : null}
              </Space>
            </Form.Item>

            <Form.Item
              label={`Background image — ${selectedArea}`}
              extra="Optional underlay photo or sketch behind tables in this area (max 5 MB)."
            >
              <Space wrap align="start">
                {selectedAppearance.backgroundUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedAppearance.backgroundUrl}
                    alt={`${selectedArea} floor background`}
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: `1px solid ${colors.neutral[200]}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 8,
                      border: `1px dashed ${colors.neutral[300]}`,
                      background: resolveFloorBackgroundColor(selectedAppearance.backgroundColor),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PictureOutlined style={{ color: colors.textTertiary, fontSize: 22 }} />
                  </div>
                )}
                <Space orientation="vertical">
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    disabled={bgUploading}
                    beforeUpload={async (file: RcFile) => {
                      if (file.size > 5 * 1024 * 1024) {
                        message.error('Background image must be under 5 MB');
                        return false;
                      }
                      setBgUploading(true);
                      try {
                        const { publicUrl } = await uploadFile(file, file.name);
                        patchSelectedAppearance({ backgroundUrl: publicUrl });
                        message.success(`Background updated for ${selectedArea}`);
                      } catch (err: unknown) {
                        message.error(err instanceof Error ? err.message : 'Upload failed');
                      } finally {
                        setBgUploading(false);
                      }
                      return false;
                    }}
                  >
                    <Button icon={<PictureOutlined />} loading={bgUploading}>
                      {selectedAppearance.backgroundUrl ? 'Replace image' : 'Upload image'}
                    </Button>
                  </Upload>
                  {selectedAppearance.backgroundUrl ? (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => patchSelectedAppearance({ backgroundUrl: null })}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </Space>
              </Space>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingDraft}
                  disabled={!dirty}
                  onClick={() => void handleSaveDraft()}
                >
                  Save {selectedArea}
                </Button>
                <Button
                  icon={<CloudUploadOutlined />}
                  loading={publishing}
                  disabled={!dirty}
                  onClick={() => void handlePublish()}
                >
                  Publish
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Real-world scale">
          <Form layout="vertical" style={{ maxWidth: 420 }}>
            <Form.Item
              label="Length of one grid cell"
              extra="Used on table size labels and when printing the layout (all areas)."
            >
              <Space wrap>
                <InputNumber
                  min={0.25}
                  max={50}
                  step={0.25}
                  value={settings.scale.unitsPerCell}
                  onChange={(v) => {
                    if (v == null) return;
                    setSettings((prev) => ({
                      ...prev,
                      scale: { ...prev.scale, unitsPerCell: v },
                    }));
                  }}
                  style={{ width: 120 }}
                />
                <Select
                  value={settings.scale.unit}
                  style={{ width: 88 }}
                  options={[
                    { value: 'ft', label: 'ft' },
                    { value: 'm', label: 'm' },
                  ]}
                  onChange={(unit: 'ft' | 'm') => {
                    setSettings((prev) => ({
                      ...prev,
                      scale: { ...prev.scale, unit },
                    }));
                  }}
                />
                <Text type="secondary">per cell</Text>
              </Space>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingDraft}
                disabled={!dirty}
                onClick={() => void handleSaveDraft()}
              >
                Save scale
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
