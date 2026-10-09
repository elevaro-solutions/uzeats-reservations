'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  ColorPicker,
  Empty,
  InputNumber,
  Popconfirm,
  Progress,
  Row,
  Select,
  Skeleton,
  Slider,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import {
  CameraOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  PictureOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM,
  VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M,
  VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS,
  VIRTUAL_ROOM_MAX_WALL_HEIGHT_M,
  VIRTUAL_ROOM_MEDIA_ROLE_LABELS,
  VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS,
  VIRTUAL_ROOM_MIN_WALL_HEIGHT_M,
  VIRTUAL_ROOM_OVERALL_VIEW,
  VIRTUAL_ROOM_VIDEO_MAX_BYTES,
  browserMediaUrl,
} from '@reservations/shared';
import { EmptyState, PageHeader, spacing } from '@reservations/ui';
import type { VirtualRoomSceneData } from '@reservations/ui/virtual-room';
import { useApolloClient, useMutation, useQuery } from '@/lib/apollo-hooks';
import { useAuth } from '@/lib/auth';
import {
  ADD_VIRTUAL_ROOM_MEDIA,
  GENERATE_VIRTUAL_ROOM_MODEL,
  MY_RESTAURANTS,
  PUBLISH_VIRTUAL_ROOM,
  REMOVE_VIRTUAL_ROOM_MEDIA,
  UPDATE_RESTAURANT_SETTINGS,
  UPDATE_VIRTUAL_ROOM,
  VIRTUAL_ROOM_EDITOR,
} from '@/lib/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { uploadFile, uploadVideo } from '@/lib/upload';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';

const VirtualRoomViewer = dynamic(
  () => import('@reservations/ui/virtual-room').then((m) => m.VirtualRoomViewer),
  { ssr: false, loading: () => <Skeleton.Node active style={{ width: '100%', height: 480 }} /> },
);

const { Paragraph, Text } = Typography;

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

type MediaRole = 'panorama' | 'wall' | 'capture';
type Media = {
  id: string;
  kind: 'photo' | 'video';
  role: MediaRole;
  url: string;
  floorArea?: string | null;
  caption?: string | null;
};
type AreaSettings = {
  floorArea: string;
  wallHeightM?: number | null;
  panoramaMediaId?: string | null;
  wallColor?: string | null;
  floorColor?: string | null;
  offsetXM?: number | null;
  offsetYM?: number | null;
  offsetZM?: number | null;
  guestSelectable?: boolean | null;
  selectionFeeCharged?: boolean | null;
  selectionFeeCents?: number | null;
};
type Transform = typeof DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM;
type SelectionFee = {
  enabled: boolean;
  mode: 'per_guest' | 'per_table' | null;
  feeCents: number | null;
  applyTo: 'all' | 'selected';
};
type Editor = {
  restaurantId: string;
  published: boolean;
  useReconstructedModel: boolean;
  areaLayoutMode: 'stack' | 'adjacent' | 'custom';
  providerConfigured: boolean;
  selectionAttemptCount?: number;
  modelTransform: Transform;
  addon: {
    platformEnabled: boolean;
    enabled: boolean;
    active: boolean;
    ineligibleReason?: string | null;
    perGuestFeeCents: number;
    selectionFeeMode: 'per_guest' | 'per_table';
    selectionFeePayer?: 'restaurant' | 'diner' | 'combined' | 'diner_share';
    selectionAttemptCount?: number;
  };
  selectionFee: SelectionFee;
  media: Media[];
  areaSettings: AreaSettings[];
  reconstruction: {
    status: 'idle' | 'queued' | 'processing' | 'ready' | 'failed';
    sourceKind?: string | null;
    sourceCount?: number | null;
    modelUrl?: string | null;
    error?: string | null;
    requestedAt?: string | null;
    completedAt?: string | null;
  };
  scene: VirtualRoomSceneData & { areas: Array<VirtualRoomSceneData['areas'][number]> };
};

const RECONSTRUCTION_TAG: Record<Editor['reconstruction']['status'], { color: string; label: string }> = {
  idle: { color: 'default', label: 'Not started' },
  queued: { color: 'blue', label: 'Queued' },
  processing: { color: 'processing', label: 'Processing' },
  ready: { color: 'success', label: 'Ready' },
  failed: { color: 'error', label: 'Failed' },
};

function sameArea(a: string | null | undefined, b: string) {
  return (a || 'Main').trim().toLowerCase() === b.trim().toLowerCase();
}

export default function VirtualRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const client = useApolloClient();
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [uploadArea, setUploadArea] = useState<string>('');
  const [uploading, setUploading] = useState<{ label: string; percent: number } | null>(null);
  const [areaDraft, setAreaDraft] = useState<AreaSettings | null>(null);
  const [transformDraft, setTransformDraft] = useState<Transform | null>(null);
  const [placementDraft, setPlacementDraft] = useState<Array<{
    floorArea: string;
    offsetXM: number;
    offsetYM: number;
    offsetZM: number;
  }> | null>(null);
  const [layoutEditing, setLayoutEditing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [authLoading, user, router]);

  const variables = { restaurantId: activeRestaurantId };
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(
    VIRTUAL_ROOM_EDITOR,
    { variables, skip: !activeRestaurantId, fetchPolicy: 'cache-and-network' },
  );
  const editor = data?.virtualRoomEditor as Editor | undefined;

  const [updateRoom, { loading: savingRoom }] = useMutation(UPDATE_VIRTUAL_ROOM);
  const [updateSettings, { loading: savingFee }] = useMutation(UPDATE_RESTAURANT_SETTINGS);
  const [addMedia] = useMutation(ADD_VIRTUAL_ROOM_MEDIA);
  const [removeMedia] = useMutation(REMOVE_VIRTUAL_ROOM_MEDIA);
  const [publishRoom, { loading: publishing }] = useMutation(PUBLISH_VIRTUAL_ROOM);
  const [generateModel, { loading: generating }] = useMutation(GENERATE_VIRTUAL_ROOM_MODEL);

  const scanRunning =
    editor?.reconstruction.status === 'queued' || editor?.reconstruction.status === 'processing';
  useEffect(() => {
    if (scanRunning) startPolling?.(15_000);
    else stopPolling?.();
    return () => stopPolling?.();
  }, [scanRunning, startPolling, stopPolling]);

  const areaNames = useMemo(() => editor?.scene.areas.map((a) => a.name) ?? [], [editor]);
  const activeArea = selectedArea && areaNames.includes(selectedArea) ? selectedArea : areaNames[0];

  useEffect(() => {
    setSelectedArea(null);
    setAreaDraft(null);
    setTransformDraft(null);
    setPlacementDraft(null);
    setLayoutEditing(false);
  }, [activeRestaurantId]);

  const savedAreaSettings = useMemo<AreaSettings | null>(() => {
    if (!editor || !activeArea) return null;
    const saved = editor.areaSettings.find((s) => sameArea(s.floorArea, activeArea));
    const sceneArea = editor.scene.areas.find((a) => sameArea(a.name, activeArea));
    return {
      floorArea: activeArea,
      wallHeightM: saved?.wallHeightM ?? VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M,
      panoramaMediaId: saved?.panoramaMediaId ?? null,
      wallColor: saved?.wallColor ?? null,
      floorColor: saved?.floorColor ?? null,
      offsetXM: saved?.offsetXM ?? sceneArea?.offsetXM ?? 0,
      offsetYM: saved?.offsetYM ?? sceneArea?.offsetYM ?? 0,
      offsetZM: saved?.offsetZM ?? sceneArea?.offsetZM ?? 0,
      guestSelectable: saved?.guestSelectable ?? sceneArea?.guestSelectable ?? true,
      selectionFeeCharged: saved?.selectionFeeCharged ?? sceneArea?.selectionFeeCharged ?? true,
      selectionFeeCents: saved?.selectionFeeCents ?? sceneArea?.selectionFeeCents ?? null,
    };
  }, [editor, activeArea]);
  const areaForm = areaDraft && activeArea && sameArea(areaDraft.floorArea, activeArea)
    ? areaDraft
    : savedAreaSettings;

  const transform = transformDraft ?? editor?.modelTransform ?? DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM;
  const readyModelUrl =
    editor?.reconstruction.status === 'ready' ? (editor.reconstruction.modelUrl ?? null) : null;

  const previewScene = useMemo<VirtualRoomSceneData | null>(() => {
    if (!editor) return null;
    const areas = placementDraft
      ? editor.scene.areas.map((area) => {
          const draft = placementDraft.find((p) => sameArea(p.floorArea, area.name));
          if (!draft) return area;
          return {
            ...area,
            offsetXM: draft.offsetXM,
            offsetYM: draft.offsetYM,
            offsetZM: draft.offsetZM,
          };
        })
      : editor.scene.areas;
    return {
      ...editor.scene,
      areas,
      areaLayoutMode: placementDraft ? 'custom' : editor.scene.areaLayoutMode,
      modelUrl: readyModelUrl,
      modelTransform: transform,
    };
  }, [editor, readyModelUrl, transform, placementDraft]);

  const placementDirty = Boolean(placementDraft);
  const canEditLayout = Boolean(editor?.addon.active && areaNames.length > 1);

  const exitLayoutEditing = () => {
    if (placementDirty) {
      message.warning('Save or discard layout changes first');
      return;
    }
    setLayoutEditing(false);
  };

  const writeEditor = (next: Editor | undefined) => {
    if (!next) return;
    client.writeQuery({ query: VIRTUAL_ROOM_EDITOR, variables, data: { virtualRoomEditor: next } });
  };

  const run = async <T,>(fn: () => Promise<T>, success?: string) => {
    try {
      const result = await fn();
      if (success) message.success(success);
      return result;
    } catch (err: any) {
      message.error(err?.message || 'Something went wrong');
      return undefined;
    }
  };

  const uploadMedia = async (files: RcFile[], kind: 'photo' | 'video', role: MediaRole) => {
    if (!activeRestaurantId || !files.length) return;
    const tooBig = files.find((f) =>
      kind === 'video' ? f.size > VIRTUAL_ROOM_VIDEO_MAX_BYTES : f.size > PHOTO_MAX_BYTES,
    );
    if (tooBig) {
      message.error(
        kind === 'video'
          ? `${tooBig.name} is larger than 250 MB`
          : `${tooBig.name} is larger than 10 MB`,
      );
      return;
    }
    let latest: Editor | undefined;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      const label = files.length > 1 ? `Uploading ${i + 1} of ${files.length}` : `Uploading ${file.name}`;
      setUploading({ label, percent: 0 });
      const ok = await run(async () => {
        const send = kind === 'video' ? uploadVideo : uploadFile;
        const { publicUrl } = await send(file, file.name, {
          onProgress: (percent) => setUploading({ label, percent }),
        });
        const res = await addMedia({
          variables: {
            restaurantId: activeRestaurantId,
            input: {
              kind,
              role,
              url: publicUrl,
              floorArea: role === 'capture' ? null : uploadArea || activeArea || null,
            },
          },
        });
        latest = res.data?.addVirtualRoomMedia;
        return true;
      });
      if (!ok) break;
    }
    setUploading(null);
    writeEditor(latest);
    if (latest) message.success(files.length > 1 ? `${files.length} files added` : 'Added');
  };

  const pickFiles = (kind: 'photo' | 'video', role: MediaRole, multiple: boolean) => ({
    accept: kind === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp',
    multiple,
    showUploadList: false,
    disabled: Boolean(uploading) || !editor?.addon.active,
    beforeUpload: (file: RcFile, fileList: RcFile[]) => {
      if (fileList[0] === file) void uploadMedia(multiple ? fileList : [file], kind, role);
      return Upload.LIST_IGNORE;
    },
  });

  if (!user) return null;

  const header = (
    <PageHeader
      title={
        <Space size={8}>
          Virtual 3D room
          <Tag color="purple" icon={<ExperimentOutlined />}>
            Experimental
          </Tag>
        </Space>
      }
      subtitle="Build a 3D version of your dining room so guests can look around and pick their table."
    />
  );

  if (!editor) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        {header}
        <Select style={{ width: '100%', maxWidth: 280 }} {...restaurantSelectProps} />
        {error ? (
          <Alert type="error" showIcon message={error.message} />
        ) : loading || !activeRestaurantId ? (
          <Skeleton active />
        ) : null}
      </Space>
    );
  }

  if (!editor.addon.platformEnabled) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        {header}
        <EmptyState
          icon={<ExperimentOutlined />}
          title="Not available yet"
          description="The Virtual 3D room is an experimental feature that isn't available on your account right now."
        />
      </Space>
    );
  }

  const captureMedia = editor.media.filter((m) => m.role === 'capture');
  const capturePhotos = captureMedia.filter((m) => m.kind === 'photo').length;
  const captureVideos = captureMedia.filter((m) => m.kind === 'video').length;
  const panoramas = editor.media.filter((m) => m.role === 'panorama');
  // Owners only get video→3D capture when KIRI is set; superadmins always see it.
  // Keep the scan tab if a prior scan exists so alignment / use-model stays reachable.
  const showScanCapture =
    editor.providerConfigured || isSuperAdmin(user?.role ?? '');
  const showScanTab =
    showScanCapture ||
    editor.reconstruction.status !== 'idle' ||
    Boolean(editor.reconstruction.modelUrl);
  const canScan =
    editor.addon.active &&
    editor.providerConfigured &&
    !scanRunning &&
    (captureVideos > 0 || capturePhotos >= VIRTUAL_ROOM_MIN_CAPTURE_PHOTOS);
  const recon = RECONSTRUCTION_TAG[editor.reconstruction.status] ?? RECONSTRUCTION_TAG.idle;
  const areaDirty =
    Boolean(areaForm && savedAreaSettings) &&
    JSON.stringify(areaForm) !== JSON.stringify(savedAreaSettings);
  const transformDirty =
    Boolean(transformDraft) &&
    JSON.stringify(transformDraft) !== JSON.stringify(editor.modelTransform);

  const saveArea = () =>
    areaForm &&
    run(async () => {
      const res = await updateRoom({
        variables: { restaurantId: activeRestaurantId, input: { areaSettings: [areaForm] } },
      });
      writeEditor(res.data?.updateVirtualRoom);
      setAreaDraft(null);
    }, 'Area saved');

  const saveTransform = () =>
    transformDraft &&
    run(async () => {
      const res = await updateRoom({
        variables: { restaurantId: activeRestaurantId, input: { modelTransform: transformDraft } },
      });
      writeEditor(res.data?.updateVirtualRoom);
      setTransformDraft(null);
    }, 'Alignment saved');

  const setUseModel = (useReconstructedModel: boolean) =>
    run(async () => {
      const res = await updateRoom({
        variables: { restaurantId: activeRestaurantId, input: { useReconstructedModel } },
      });
      writeEditor(res.data?.updateVirtualRoom);
    });

  const setLayoutMode = (areaLayoutMode: 'stack' | 'adjacent' | 'custom') =>
    run(async () => {
      const res = await updateRoom({
        variables: { restaurantId: activeRestaurantId, input: { areaLayoutMode } },
      });
      writeEditor(res.data?.updateVirtualRoom);
      setPlacementDraft(null);
      setSelectedArea(VIRTUAL_ROOM_OVERALL_VIEW);
    }, areaLayoutMode === 'stack' ? 'Floors stacked' : areaLayoutMode === 'adjacent' ? 'Areas placed side by side' : 'Custom placement');

  const onPlacementDrag = (
    placements: Array<{ floorArea: string; offsetXM: number; offsetYM: number; offsetZM: number }>,
  ) => {
    setPlacementDraft(placements);
    setSelectedArea(VIRTUAL_ROOM_OVERALL_VIEW);
  };

  const savePlacements = () => {
    if (!placementDraft?.length) return;
    void run(async () => {
      const res = await updateRoom({
        variables: {
          restaurantId: activeRestaurantId,
          input: {
            areaLayoutMode: 'custom',
            areaSettings: placementDraft.map((p) => ({
              floorArea: p.floorArea,
              offsetXM: p.offsetXM,
              offsetYM: p.offsetYM,
              offsetZM: p.offsetZM,
            })),
          },
        },
      });
      writeEditor(res.data?.updateVirtualRoom);
      setPlacementDraft(null);
      setAreaDraft(null);
      setSelectedArea(VIRTUAL_ROOM_OVERALL_VIEW);
    }, 'Placement saved');
  };

  const saveFeeSettings = (patch: Partial<SelectionFee>) => {
    if (!editor) return;
    const current = editor.selectionFee ?? {
      enabled: true,
      mode: null,
      feeCents: null,
      applyTo: 'all' as const,
    };
    const next = { ...current, ...patch };
    void run(async () => {
      await updateSettings({
        variables: {
          restaurantId: activeRestaurantId,
          virtualRoomSelectionFeeEnabled: next.enabled,
          virtualRoomSelectionFeeMode: next.mode,
          virtualRoomSelectionFeeCents: next.feeCents,
          virtualRoomSelectionFeeApplyTo: next.applyTo,
        },
      });
      writeEditor({ ...editor, selectionFee: next });
    }, 'Selection fee saved');
  };

  const selectionFee: SelectionFee = editor.selectionFee ?? {
    enabled: true,
    mode: null,
    feeCents: null,
    applyTo: 'all',
  };
  const feeUnit = selectionFee.feeCents ?? editor.addon.perGuestFeeCents;
  const feeMode = selectionFee.mode ?? editor.addon.selectionFeeMode ?? 'per_guest';
  const feeLabel =
    feeMode === 'per_table'
      ? `$${(feeUnit / 100).toFixed(2)} per table pick`
      : `$${(feeUnit / 100).toFixed(2)} per guest`;
  const feePayer = editor.addon.selectionFeePayer ?? 'restaurant';
  const feePayerHint = (() => {
    switch (feePayer) {
      case 'diner':
        return `${feeLabel} charged to guests at booking`;
      case 'combined':
        return `Guests pay platform fee + your fee at booking`;
      case 'diner_share':
        return `Guests pay your fee at booking; platform cut on invoice`;
      default:
        return `${feeLabel} on your invoice after completed visits`;
    }
  })();
  const platformFeeLabel =
    (editor.addon.selectionFeeMode ?? 'per_guest') === 'per_table'
      ? `$${(editor.addon.perGuestFeeCents / 100).toFixed(2)} per table`
      : `$${(editor.addon.perGuestFeeCents / 100).toFixed(2)} per guest`;

  return (
    <div component="VirtualRoomPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        {header}
        <Select style={{ width: '100%', maxWidth: 280 }} {...restaurantSelectProps} />

        {!editor.addon.active ? (
          <Alert
            type="info"
            showIcon
            message={editor.addon.ineligibleReason ?? 'Turn on the Virtual 3D room add-on to start building.'}
            action={
              <Link href="/billing">
                <Button size="small" type="primary">
                  Go to Billing
                </Button>
              </Link>
            }
          />
        ) : null}

        <Card size="small" styles={{ body: { padding: '10px 16px' } }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }} size={[12, 8]}>
            <Space size={10} wrap>
              <Switch
                checked={editor.published}
                loading={publishing}
                disabled={!editor.addon.active && !editor.published}
                onChange={(published) =>
                  run(async () => {
                    const res = await publishRoom({
                      variables: { restaurantId: activeRestaurantId, published },
                    });
                    writeEditor(res.data?.publishVirtualRoom);
                  }, published ? 'Your 3D room is live' : '3D room hidden from guests')
                }
              />
              <Text strong>{editor.published ? 'Live on booking page' : 'Hidden from guests'}</Text>
              <Text type="secondary">·</Text>
              <Text type="secondary">{feePayerHint}</Text>
              <Text type="secondary">·</Text>
              <Text type="secondary">
                {(editor.selectionAttemptCount ?? editor.addon.selectionAttemptCount ?? 0).toLocaleString()}{' '}
                guests tried 3D table pick
              </Text>
            </Space>
            <Space size={8}>
              {canEditLayout ? (
                layoutEditing ? (
                  <>
                    {placementDirty ? (
                      <>
                        <Button
                          size="small"
                          onClick={() => setPlacementDraft(null)}
                          disabled={savingRoom}
                        >
                          Discard
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          loading={savingRoom}
                          onClick={() => savePlacements()}
                        >
                          Save layout
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => exitLayoutEditing()}
                      >
                        Done editing
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    size="small"
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setLayoutEditing(true)}
                  >
                    Edit layout
                  </Button>
                )
              ) : null}
              <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
            </Space>
          </Space>
        </Card>

        <Card
          size="small"
          title="Preview"
          extra={
            canEditLayout ? (
              layoutEditing ? (
                <Tag color="processing">Editing layout</Tag>
              ) : (
                <Button
                  size="small"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => setLayoutEditing(true)}
                >
                  Edit layout
                </Button>
              )
            ) : null
          }
          styles={{ body: { padding: 12 } }}
        >
          {previewScene ? (
            <VirtualRoomViewer
              scene={previewScene}
              areaName={selectedArea}
              onAreaChange={setSelectedArea}
              showModel={editor.useReconstructedModel}
              placementEditable={layoutEditing && canEditLayout}
              onAreaPlacementChange={onPlacementDrag}
              height={560}
            />
          ) : null}
          {placementDirty ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
              message="Unsaved layout — guests won't see placement until you save."
              action={
                <Button type="primary" size="small" loading={savingRoom} onClick={() => savePlacements()}>
                  Save layout
                </Button>
              }
            />
          ) : null}
          <Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
            Built from your published <Link href="/floor-plan">table layout</Link>. Drag to orbit ·
            scroll zoom · right-drag pan.
            {canEditLayout
              ? layoutEditing
                ? ' Overall: drag floors to place (Shift+drag = up/down).'
                : ' Click Edit layout to move floors.'
              : null}
          </Paragraph>
        </Card>

        <Card size="small" styles={{ body: { paddingTop: 8 } }}>
          <Tabs
            size="small"
            items={[
              {
                key: 'layout',
                label: 'Layout',
                children: (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    {areaNames.length > 1 ? (
                      <>
                        <Text type="secondary">
                          Stack floors, put wings side-by-side, or drag freely in Overall. Click Edit
                          layout first so orbiting the preview does not move floors by accident.
                          Shift+drag raises/lowers a floor.
                        </Text>
                        {!layoutEditing ? (
                          <Button
                            type="primary"
                            icon={<EditOutlined />}
                            disabled={!editor.addon.active}
                            onClick={() => setLayoutEditing(true)}
                          >
                            Edit layout
                          </Button>
                        ) : null}
                        <Select
                          style={{ width: '100%', maxWidth: 360 }}
                          value={placementDirty ? 'custom' : (editor.areaLayoutMode ?? 'adjacent')}
                          disabled={!editor.addon.active || !layoutEditing || placementDirty}
                          loading={savingRoom}
                          onChange={(v) => void setLayoutMode(v)}
                          options={[
                            { value: 'stack', label: 'Stack floors (vertical)' },
                            { value: 'adjacent', label: 'Side by side (horizontal)' },
                            { value: 'custom', label: 'Custom (drag & drop)' },
                          ]}
                        />
                        {layoutEditing &&
                        (placementDirty || (editor.areaLayoutMode ?? 'adjacent') === 'custom') &&
                        areaForm ? (
                          <Row gutter={[16, 8]}>
                            <Col xs={24} md={8}>
                              <Text type="secondary">Sideways (X) · {activeArea}</Text>
                              <Slider
                                min={-80}
                                max={80}
                                step={0.5}
                                value={
                                  placementDraft?.find((p) => sameArea(p.floorArea, activeArea!))
                                    ?.offsetXM ??
                                  areaForm.offsetXM ??
                                  0
                                }
                                onChange={(offsetXM) => {
                                  const base =
                                    placementDraft ??
                                    editor.scene.areas.map((a) => ({
                                      floorArea: a.name,
                                      offsetXM: a.offsetXM ?? 0,
                                      offsetYM: a.offsetYM ?? 0,
                                      offsetZM: a.offsetZM ?? 0,
                                    }));
                                  setPlacementDraft(
                                    base.map((p) =>
                                      sameArea(p.floorArea, activeArea!) ? { ...p, offsetXM } : p,
                                    ),
                                  );
                                }}
                              />
                            </Col>
                            <Col xs={24} md={8}>
                              <Text type="secondary">Up / floor level (Y)</Text>
                              <Slider
                                min={0}
                                max={40}
                                step={0.5}
                                value={
                                  placementDraft?.find((p) => sameArea(p.floorArea, activeArea!))
                                    ?.offsetYM ??
                                  areaForm.offsetYM ??
                                  0
                                }
                                onChange={(offsetYM) => {
                                  const base =
                                    placementDraft ??
                                    editor.scene.areas.map((a) => ({
                                      floorArea: a.name,
                                      offsetXM: a.offsetXM ?? 0,
                                      offsetYM: a.offsetYM ?? 0,
                                      offsetZM: a.offsetZM ?? 0,
                                    }));
                                  setPlacementDraft(
                                    base.map((p) =>
                                      sameArea(p.floorArea, activeArea!) ? { ...p, offsetYM } : p,
                                    ),
                                  );
                                }}
                              />
                            </Col>
                            <Col xs={24} md={8}>
                              <Text type="secondary">Depth (Z)</Text>
                              <Slider
                                min={-80}
                                max={80}
                                step={0.5}
                                value={
                                  placementDraft?.find((p) => sameArea(p.floorArea, activeArea!))
                                    ?.offsetZM ??
                                  areaForm.offsetZM ??
                                  0
                                }
                                onChange={(offsetZM) => {
                                  const base =
                                    placementDraft ??
                                    editor.scene.areas.map((a) => ({
                                      floorArea: a.name,
                                      offsetXM: a.offsetXM ?? 0,
                                      offsetYM: a.offsetYM ?? 0,
                                      offsetZM: a.offsetZM ?? 0,
                                    }));
                                  setPlacementDraft(
                                    base.map((p) =>
                                      sameArea(p.floorArea, activeArea!) ? { ...p, offsetZM } : p,
                                    ),
                                  );
                                }}
                              />
                            </Col>
                            <Col span={24}>
                              <Space wrap>
                                <Button
                                  type="primary"
                                  disabled={!placementDirty || !editor.addon.active}
                                  loading={savingRoom}
                                  onClick={() => savePlacements()}
                                >
                                  Save layout
                                </Button>
                                <Button
                                  icon={<CheckOutlined />}
                                  disabled={placementDirty}
                                  onClick={() => exitLayoutEditing()}
                                >
                                  Done editing
                                </Button>
                              </Space>
                            </Col>
                          </Row>
                        ) : layoutEditing ? (
                          <Button
                            icon={<CheckOutlined />}
                            onClick={() => exitLayoutEditing()}
                          >
                            Done editing
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Text type="secondary">
                        Add more floor areas on the <Link href="/floor-plan">table layout</Link> to
                        arrange multi-area placement here.
                      </Text>
                    )}
                  </Space>
                ),
              },
              {
                key: 'area',
                label: `Area look${activeArea ? ` · ${activeArea}` : ''}`,
                children: areaForm ? (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    {areaNames.length > 1 ? (
                      <Select
                        style={{ width: '100%', maxWidth: 240 }}
                        value={activeArea}
                        onChange={(v) => {
                          setSelectedArea(v);
                          setAreaDraft(null);
                        }}
                        options={areaNames.map((a) => ({ value: a, label: a }))}
                      />
                    ) : null}
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={12} md={8}>
                        <Text type="secondary">Ceiling height (m)</Text>
                        <InputNumber
                          style={{ width: '100%' }}
                          min={VIRTUAL_ROOM_MIN_WALL_HEIGHT_M}
                          max={VIRTUAL_ROOM_MAX_WALL_HEIGHT_M}
                          step={0.1}
                          value={areaForm.wallHeightM ?? VIRTUAL_ROOM_DEFAULT_WALL_HEIGHT_M}
                          onChange={(v) => setAreaDraft({ ...areaForm, wallHeightM: v ?? null })}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Text type="secondary">360° background</Text>
                        <Select
                          style={{ width: '100%' }}
                          allowClear
                          placeholder={
                            panoramas.length
                              ? 'First 360° photo for this area'
                              : 'Add a 360° photo first'
                          }
                          value={areaForm.panoramaMediaId ?? undefined}
                          onChange={(v) =>
                            setAreaDraft({ ...areaForm, panoramaMediaId: v ?? null })
                          }
                          options={panoramas.map((p, i) => ({
                            value: p.id,
                            label: `360° photo ${i + 1}${p.floorArea ? ` · ${p.floorArea}` : ''}`,
                          }))}
                        />
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Text type="secondary" style={{ display: 'block' }}>
                          Wall
                        </Text>
                        <ColorPicker
                          disabledAlpha
                          allowClear
                          value={areaForm.wallColor ?? undefined}
                          onChange={(c) =>
                            setAreaDraft({ ...areaForm, wallColor: c.toHexString() })
                          }
                          onClear={() => setAreaDraft({ ...areaForm, wallColor: null })}
                        />
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Text type="secondary" style={{ display: 'block' }}>
                          Floor
                        </Text>
                        <ColorPicker
                          disabledAlpha
                          allowClear
                          value={areaForm.floorColor ?? undefined}
                          onChange={(c) =>
                            setAreaDraft({ ...areaForm, floorColor: c.toHexString() })
                          }
                          onClear={() => setAreaDraft({ ...areaForm, floorColor: null })}
                        />
                      </Col>
                    </Row>
                    <Space wrap size={[16, 8]}>
                      <Space>
                        <Switch
                          checked={areaForm.guestSelectable !== false}
                          onChange={(guestSelectable) =>
                            setAreaDraft({ ...areaForm, guestSelectable })
                          }
                        />
                        <Text>Guests can pick tables here</Text>
                      </Space>
                      <Space>
                        <Switch
                          checked={areaForm.selectionFeeCharged !== false}
                          onChange={(selectionFeeCharged) =>
                            setAreaDraft({ ...areaForm, selectionFeeCharged })
                          }
                        />
                        <Text>Charge 3D fee for this area</Text>
                      </Space>
                    </Space>
                    <div style={{ maxWidth: 280 }}>
                      <Text type="secondary">Area fee override (USD)</Text>
                      <InputNumber
                        style={{ width: '100%' }}
                        prefix="$"
                        min={0}
                        max={10_000}
                        step={0.5}
                        precision={2}
                        placeholder="Inherit restaurant / platform"
                        value={
                          areaForm.selectionFeeCents != null
                            ? areaForm.selectionFeeCents / 100
                            : null
                        }
                        onChange={(v) =>
                          setAreaDraft({
                            ...areaForm,
                            selectionFeeCents: v == null ? null : Math.round(Number(v) * 100),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="primary"
                      disabled={!areaDirty || !editor.addon.active}
                      loading={savingRoom}
                      onClick={() => void saveArea()}
                    >
                      Save area
                    </Button>
                  </Space>
                ) : (
                  <Text type="secondary">No floor areas yet — publish a table layout first.</Text>
                ),
              },
              {
                key: 'fee',
                label: 'Selection fee',
                children: (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <Space>
                      <Switch
                        checked={selectionFee.enabled}
                        loading={savingFee}
                        disabled={!editor.addon.active}
                        onChange={(enabled) => saveFeeSettings({ enabled })}
                      />
                      <Text strong>{selectionFee.enabled ? 'Charging on' : 'Charging off'}</Text>
                      <Text type="secondary">Platform default {platformFeeLabel}</Text>
                    </Space>
                    {feePayer === 'combined' || feePayer === 'diner_share' ? (
                      <Alert
                        type="info"
                        showIcon
                        message={
                          feePayer === 'combined'
                            ? `Combined pricing: guests pay the platform fee (${platformFeeLabel}) plus your unit fee below.`
                            : `Guests pay your unit fee below. The platform fee (${platformFeeLabel}) is billed on your invoice as the platform cut.`
                        }
                      />
                    ) : null}
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Bill as</Text>
                        <Select
                          style={{ width: '100%' }}
                          allowClear
                          placeholder={`Default (${(editor.addon.selectionFeeMode ?? 'per_guest') === 'per_table' ? 'per table' : 'per guest'})`}
                          value={selectionFee.mode ?? undefined}
                          disabled={!editor.addon.active || !selectionFee.enabled}
                          onChange={(mode) => saveFeeSettings({ mode: mode ?? null })}
                          options={[
                            { value: 'per_guest', label: 'Per guest' },
                            { value: 'per_table', label: 'Per table pick' },
                          ]}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Unit fee (USD)</Text>
                        <InputNumber
                          style={{ width: '100%' }}
                          prefix="$"
                          min={0}
                          max={10_000}
                          step={0.5}
                          precision={2}
                          placeholder={`${(editor.addon.perGuestFeeCents / 100).toFixed(2)} (platform)`}
                          value={selectionFee.feeCents != null ? selectionFee.feeCents / 100 : null}
                          disabled={!editor.addon.active || !selectionFee.enabled}
                          onChange={(v) =>
                            saveFeeSettings({
                              feeCents: v == null ? null : Math.round(Number(v) * 100),
                            })
                          }
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Apply to</Text>
                        <Select
                          style={{ width: '100%' }}
                          value={selectionFee.applyTo}
                          disabled={!editor.addon.active || !selectionFee.enabled}
                          onChange={(applyTo) => saveFeeSettings({ applyTo })}
                          options={[
                            { value: 'all', label: 'All tables picked in 3D' },
                            { value: 'selected', label: 'Only marked tables' },
                          ]}
                        />
                      </Col>
                    </Row>
                  </Space>
                ),
              },
              {
                key: 'media',
                label: showScanCapture ? 'Photos & video' : 'Photos',
                children: (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap align="center">
                      <Text type="secondary">Upload to</Text>
                      <Select
                        size="small"
                        style={{ minWidth: 140 }}
                        value={uploadArea || activeArea}
                        onChange={setUploadArea}
                        options={areaNames.map((a) => ({ value: a, label: a }))}
                      />
                      <Upload {...pickFiles('photo', 'panorama', false)}>
                        <Button size="small" icon={<GlobalOutlined />}>
                          360°
                        </Button>
                      </Upload>
                      <Upload {...pickFiles('photo', 'wall', true)}>
                        <Button size="small" icon={<PictureOutlined />}>
                          Wall
                        </Button>
                      </Upload>
                      {showScanCapture ? (
                        <>
                          <Upload {...pickFiles('photo', 'capture', true)}>
                            <Button size="small" icon={<CameraOutlined />}>
                              Scan photos
                            </Button>
                          </Upload>
                          <Upload {...pickFiles('video', 'capture', false)}>
                            <Button size="small" icon={<VideoCameraOutlined />}>
                              Video
                            </Button>
                          </Upload>
                        </>
                      ) : null}
                    </Space>
                    {uploading ? (
                      <div>
                        <Text type="secondary">{uploading.label}</Text>
                        <Progress percent={uploading.percent} size="small" />
                      </div>
                    ) : null}
                    {editor.media.length === 0 ? (
                      <Empty description="No photos or videos yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Row gutter={[8, 8]}>
                        {editor.media.map((m) => (
                          <Col key={m.id} xs={12} sm={8} md={6} lg={4}>
                            <div
                              style={{
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid rgba(0,0,0,0.08)',
                              }}
                            >
                              {m.kind === 'video' ? (
                                <video
                                  src={browserMediaUrl(m.url)}
                                  preload="metadata"
                                  muted
                                  controls
                                  style={{
                                    width: '100%',
                                    height: 96,
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={browserMediaUrl(m.url)}
                                  alt={VIRTUAL_ROOM_MEDIA_ROLE_LABELS[m.role]}
                                  style={{
                                    width: '100%',
                                    height: 96,
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              )}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '2px 6px',
                                  gap: 4,
                                }}
                              >
                                <Space size={2} wrap>
                                  <Tag style={{ marginInlineEnd: 0 }}>
                                    {VIRTUAL_ROOM_MEDIA_ROLE_LABELS[m.role]}
                                  </Tag>
                                  {m.floorArea ? <Tag>{m.floorArea}</Tag> : null}
                                </Space>
                                <Popconfirm
                                  title="Remove this file?"
                                  onConfirm={() =>
                                    run(async () => {
                                      const res = await removeMedia({
                                        variables: {
                                          restaurantId: activeRestaurantId,
                                          mediaId: m.id,
                                        },
                                      });
                                      writeEditor(res.data?.removeVirtualRoomMedia);
                                    }, 'Removed')
                                  }
                                >
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                  />
                                </Popconfirm>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Space>
                ),
              },
              ...(showScanTab
                ? [
                    {
                      key: 'scan',
                      label: (
                        <Space size={6}>
                          3D scan
                          <Tag color={recon.color}>{recon.label}</Tag>
                        </Space>
                      ),
                      children: (
                        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                          <Text type="secondary">
                            {captureVideos} video{captureVideos === 1 ? '' : 's'}, {capturePhotos}{' '}
                            photo{capturePhotos === 1 ? '' : 's'}
                            {captureVideos > 0
                              ? ' — latest video used'
                              : capturePhotos > VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS
                                ? ` — first ${VIRTUAL_ROOM_MAX_CAPTURE_PHOTOS} used`
                                : ''}
                            . Scans take 15–60 min.
                          </Text>
                          {!editor.providerConfigured ? (
                            <Alert
                              type="warning"
                              showIcon
                              message="3D scanning isn't set up on this server yet"
                              description="Partners won't see this tab until KIRI_ENGINE_API_KEY is set. Rooms still build from the floor plan and photos."
                            />
                          ) : null}
                          {editor.reconstruction.status === 'failed' &&
                          editor.reconstruction.error ? (
                            <Alert type="error" showIcon message={editor.reconstruction.error} />
                          ) : null}
                          <Button
                            type="primary"
                            icon={<ExperimentOutlined />}
                            disabled={!canScan}
                            loading={generating || scanRunning}
                            onClick={() =>
                              run(async () => {
                                const res = await generateModel({
                                  variables: { restaurantId: activeRestaurantId },
                                });
                                writeEditor(res.data?.generateVirtualRoomModel);
                              }, 'Scan started')
                            }
                          >
                            {editor.reconstruction.status === 'ready'
                              ? 'Rescan'
                              : 'Generate 3D scan'}
                          </Button>
                          {readyModelUrl ? (
                            <>
                              <Space>
                                <Switch
                                  checked={editor.useReconstructedModel}
                                  loading={savingRoom}
                                  onChange={(v) => void setUseModel(v)}
                                />
                                <Text>Use the scan in the {areaNames[0] ?? 'first'} area</Text>
                              </Space>
                              <Text strong>Line up the scan with your tables</Text>
                              <Row gutter={[16, 8]}>
                                <Col xs={24} sm={12} md={6}>
                                  <Text type="secondary">Size</Text>
                                  <Slider
                                    min={0.05}
                                    max={5}
                                    step={0.01}
                                    value={transform.scale}
                                    onChange={(scale) =>
                                      setTransformDraft({ ...transform, scale })
                                    }
                                  />
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                  <Text type="secondary">Rotation</Text>
                                  <Slider
                                    min={-180}
                                    max={180}
                                    value={transform.rotationDeg}
                                    onChange={(rotationDeg) =>
                                      setTransformDraft({ ...transform, rotationDeg })
                                    }
                                  />
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                  <Text type="secondary">Shift left / right (m)</Text>
                                  <Slider
                                    min={-20}
                                    max={20}
                                    step={0.05}
                                    value={transform.offsetXM}
                                    onChange={(offsetXM) =>
                                      setTransformDraft({ ...transform, offsetXM })
                                    }
                                  />
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                  <Text type="secondary">Shift forward / back (m)</Text>
                                  <Slider
                                    min={-20}
                                    max={20}
                                    step={0.05}
                                    value={transform.offsetZM}
                                    onChange={(offsetZM) =>
                                      setTransformDraft({ ...transform, offsetZM })
                                    }
                                  />
                                </Col>
                              </Row>
                              <Space>
                                <Button
                                  type="primary"
                                  disabled={!transformDirty}
                                  loading={savingRoom}
                                  onClick={() => void saveTransform()}
                                >
                                  Save alignment
                                </Button>
                                <Button
                                  onClick={() =>
                                    setTransformDraft({
                                      ...DEFAULT_VIRTUAL_ROOM_MODEL_TRANSFORM,
                                    })
                                  }
                                >
                                  Reset
                                </Button>
                              </Space>
                            </>
                          ) : null}
                        </Space>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}
