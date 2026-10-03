'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
  DEFAULT_TABLE_SHAPE_LABEL_POSITION,
  MAX_TABLE_SHAPE_LABEL_FONT_SCALE,
  MIN_TABLE_SHAPE_LABEL_FONT_SCALE,
  TABLE_SHAPE_LABELS,
  TABLE_SHAPE_LABEL_POSITIONS,
  TABLE_SHAPE_LABEL_POSITION_LABELS,
  TABLE_SHAPE_RENDER_PRESETS,
} from '@reservations/shared';
import { PageHeader, spacing } from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import { TableShapeGlyph } from '@/components/TableShapeGlyph';
import { TableShapePreview } from '@/components/TableShapePreview';
import {
  ADMIN_TABLE_SHAPES,
  CREATE_TABLE_SHAPE_DEF,
  DELETE_TABLE_SHAPE_DEF,
  UPDATE_TABLE_SHAPE_DEF,
} from '@/lib/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text } = Typography;

type ShapeRow = {
  id: string;
  key: string;
  label: string;
  description: string;
  iconUrl: string | null;
  renderPreset: string;
  labelPosition: string;
  labelFontScale: number;
  active: boolean;
  sortOrder: number;
  builtin: boolean;
  updatedAt?: string;
};

type ShapeForm = {
  label: string;
  key?: string;
  description?: string;
  iconUrls: string[];
  renderPreset: string;
  labelPosition: string;
  labelFontScale: number;
  active: boolean;
  sortOrder: number;
};

const PRESET_OPTIONS = TABLE_SHAPE_RENDER_PRESETS.map((value) => ({
  value,
  label: (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <TableShapeGlyph shape={value} size={18} />
      {TABLE_SHAPE_LABELS[value]}
    </span>
  ),
}));

const POSITION_OPTIONS = TABLE_SHAPE_LABEL_POSITIONS.map((value) => ({
  value,
  label: TABLE_SHAPE_LABEL_POSITION_LABELS[value],
}));

function AdminTableShapesContent() {
  const { ready, user } = useRequireAdmin();
  const router = useRouter();
  const isSuper = user ? isSuperAdmin(user.role) : false;
  const [form] = Form.useForm<ShapeForm>();
  const [editing, setEditing] = useState<ShapeRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 50 });

  const watchedRenderPreset = Form.useWatch('renderPreset', form);
  const watchedIconUrls = Form.useWatch('iconUrls', form);
  const watchedLabelPosition = Form.useWatch('labelPosition', form);
  const watchedLabelFontScale = Form.useWatch('labelFontScale', form);

  useEffect(() => {
    if (ready && user && !isSuper) router.replace('/admin');
  }, [ready, user, isSuper, router]);

  const { data, loading, refetch } = useQuery(ADMIN_TABLE_SHAPES, {
    skip: !ready || !isSuper,
    variables: { limit, offset },
  });
  const [createShape, { loading: creating }] = useMutation(CREATE_TABLE_SHAPE_DEF);
  const [updateShape, { loading: updating }] = useMutation(UPDATE_TABLE_SHAPE_DEF);
  const [deleteShape, { loading: deleting }] = useMutation(DELETE_TABLE_SHAPE_DEF);

  if (!ready || !isSuper) return null;

  const items: ShapeRow[] = data?.adminTableShapes?.items ?? [];
  const saving = creating || updating;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      sortOrder: items.length,
      renderPreset: 'rect',
      iconUrls: [],
      labelPosition: DEFAULT_TABLE_SHAPE_LABEL_POSITION,
      labelFontScale: DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
    });
    setModalOpen(true);
  };

  const openEdit = (row: ShapeRow) => {
    setEditing(row);
    form.setFieldsValue({
      label: row.label,
      key: row.key,
      description: row.description,
      iconUrls: row.iconUrl ? [row.iconUrl] : [],
      renderPreset: row.renderPreset || 'rect',
      labelPosition: row.labelPosition || DEFAULT_TABLE_SHAPE_LABEL_POSITION,
      labelFontScale: row.labelFontScale ?? DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
      active: row.active,
      sortOrder: row.sortOrder,
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        label: values.label.trim(),
        key: values.key?.trim() || undefined,
        description: values.description?.trim() || '',
        iconUrl: values.iconUrls?.[0] || null,
        renderPreset: values.renderPreset || 'rect',
        labelPosition: values.labelPosition || DEFAULT_TABLE_SHAPE_LABEL_POSITION,
        labelFontScale: values.labelFontScale ?? DEFAULT_TABLE_SHAPE_LABEL_FONT_SCALE,
        active: Boolean(values.active),
        sortOrder: values.sortOrder ?? 0,
      };
      if (editing) {
        await updateShape({ variables: { id: editing.id, input } });
        message.success('Shape updated');
      } else {
        await createShape({ variables: { input } });
        message.success('Shape created');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save shape');
    }
  };

  const onDelete = (row: ShapeRow) => {
    if (row.key === 'rect') {
      message.warning('The default Rectangle shape cannot be deleted');
      return;
    }
    Modal.confirm({
      title: `Delete “${row.label}”?`,
      content:
        'Tables using this shape will be reassigned to Rectangle. Built-in shapes can be recreated by restarting the API seed.',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteShape({ variables: { id: row.id } });
          message.success('Shape deleted');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Failed to delete');
        }
      },
    });
  };

  return (
    <div component="AdminTableShapesContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Table shapes"
          subtitle="Catalog of floor-plan silhouettes. Upload an icon and set where table text appears."
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New shape
            </Button>
          }
        />
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          pagination={tablePagination(data?.adminTableShapes?.total ?? 0)}
          columns={[
            {
              title: 'Preview',
              width: 100,
              render: (_: unknown, row: ShapeRow) => (
                <TableShapePreview
                  renderPreset={row.renderPreset || row.key}
                  iconUrl={row.iconUrl}
                  labelPosition={row.labelPosition}
                  labelFontScale={row.labelFontScale}
                  width={88}
                  height={64}
                  sampleName="T12"
                  sampleMeta="2–4"
                />
              ),
            },
            { title: 'Label', dataIndex: 'label' },
            {
              title: 'Key',
              dataIndex: 'key',
              width: 140,
              render: (v: string, row: ShapeRow) => (
                <Space size={4}>
                  <code>{v}</code>
                  {row.builtin ? <Tag>Built-in</Tag> : null}
                </Space>
              ),
            },
            {
              title: 'Text',
              width: 120,
              render: (_: unknown, row: ShapeRow) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {TABLE_SHAPE_LABEL_POSITION_LABELS[
                    row.labelPosition as keyof typeof TABLE_SHAPE_LABEL_POSITION_LABELS
                  ] ?? 'Center'}{' '}
                  · {Math.round((row.labelFontScale ?? 1) * 100)}%
                </Text>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'active',
              width: 100,
              render: (v: boolean) => (
                <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
              ),
            },
            { title: 'Sort', dataIndex: 'sortOrder', width: 80 },
            {
              title: 'Actions',
              width: 140,
              render: (_: unknown, row: ShapeRow) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={row.key === 'rect'}
                    loading={deleting}
                    onClick={() => onDelete(row)}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title={editing ? 'Edit shape' : 'New shape'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnHidden
        width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 180px',
              gap: 16,
              alignItems: 'start',
              marginBottom: 8,
            }}
          >
            <div>
              <Form.Item name="label" label="Label" rules={[{ required: true }]}>
                <Input placeholder="e.g. Oval" />
              </Form.Item>
              <Form.Item
                name="key"
                label="Key"
                extra={
                  editing?.builtin
                    ? 'Built-in keys cannot be changed'
                    : 'Lowercase slug stored on tables (auto from label if empty)'
                }
              >
                <Input
                  placeholder="auto from label"
                  disabled={Boolean(editing?.builtin)}
                />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Live preview
              </Text>
              <TableShapePreview
                renderPreset={watchedRenderPreset || 'rect'}
                iconUrl={watchedIconUrls?.[0] || null}
                labelPosition={watchedLabelPosition}
                labelFontScale={watchedLabelFontScale}
              />
            </div>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional help text for partners" />
          </Form.Item>
          <Form.Item
            name="renderPreset"
            label="Canvas look"
            rules={[{ required: true }]}
            extra="How tables with this shape are drawn on the floor plan"
          >
            <Select options={PRESET_OPTIONS} optionLabelProp="label" />
          </Form.Item>
          <Form.Item
            name="iconUrls"
            label="Icon"
            extra="SVG preferred. Drawn inside tables on the floor plan."
          >
            <PhotoUpload
              maxCount={1}
              layout="compact"
              alt="Shape icon"
              accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp,image/gif"
              hint="SVG/PNG · max 5 MB"
            />
          </Form.Item>
          <Form.Item
            name="labelPosition"
            label="Text position"
            rules={[{ required: true }]}
            extra="Inside or outside the shape — outside keeps the icon clear"
          >
            <Select options={POSITION_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="labelFontScale"
            label="Text size"
            extra="Relative to the default floor-plan label size"
          >
            <Slider
              min={MIN_TABLE_SHAPE_LABEL_FONT_SCALE}
              max={MAX_TABLE_SHAPE_LABEL_FONT_SCALE}
              step={0.05}
              marks={{
                [MIN_TABLE_SHAPE_LABEL_FONT_SCALE]: 'S',
                1: 'M',
                [MAX_TABLE_SHAPE_LABEL_FONT_SCALE]: 'L',
              }}
              tooltip={{ formatter: (v) => `${Math.round((v ?? 1) * 100)}%` }}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort order">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch disabled={editing?.key === 'rect'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function AdminTableShapesPage() {
  return (
    <div component="AdminTableShapesPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminTableShapesContent />
      </Suspense>
    </div>
  );
}
