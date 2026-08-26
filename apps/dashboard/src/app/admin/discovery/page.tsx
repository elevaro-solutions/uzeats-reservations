'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { discoveryStockImageTerm } from '@reservations/shared';
import PhotoUpload from '@/components/PhotoUpload';
import MagnificStockPicker from '@/components/MagnificStockPicker';
import {
  ADMIN_DISCOVERY_TAXONOMIES,
  CREATE_DISCOVERY_TAXONOMY,
  DELETE_DISCOVERY_TAXONOMY,
  UPDATE_DISCOVERY_TAXONOMY,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useUrlListFilters } from '@/lib/useUrlListFilters';

const { Text, Paragraph } = Typography;

type TaxonomyKind = 'category' | 'cuisine' | 'occasion' | 'landmark';

type TaxonomyRow = {
  id: string;
  kind: TaxonomyKind;
  slug: string;
  label: string;
  description: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  sortOrder: number;
  active: boolean;
  cuisine?: string | null;
  query?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
  updatedAt?: string;
};

function defaultStockImageUrl(kind: TaxonomyKind, slug: string, label: string) {
  const term = discoveryStockImageTerm(kind, slug, label);
  // Same-origin dashboard proxy → web Magnific/fallback pipeline.
  return `/api/discovery-image?term=${encodeURIComponent(term)}`;
}

function taxonomyDisplayImage(record: Pick<TaxonomyRow, 'kind' | 'slug' | 'label' | 'imageUrl' | 'iconUrl'>) {
  if (record.imageUrl) return { src: record.imageUrl, isDefault: false };
  if (record.iconUrl) return { src: record.iconUrl, isDefault: false };
  return {
    src: defaultStockImageUrl(record.kind, record.slug, record.label),
    isDefault: true,
  };
}

const KIND_TABS: Array<{ key: TaxonomyKind; label: string; hint: string }> = [
  {
    key: 'category',
    label: 'Categories',
    hint: 'Homepage and /categories presets (cuisine match and/or text query).',
  },
  {
    key: 'cuisine',
    label: 'Cuisines',
    hint: 'Cuisine labels shown on discovery pages and restaurant profiles.',
  },
  {
    key: 'occasion',
    label: 'Occasions',
    hint: 'Occasion filters like Date Night and Birthday.',
  },
  {
    key: 'landmark',
    label: 'Landmarks',
    hint: 'Curated “restaurants near” landmarks with map coordinates.',
  },
];

function slugifyPreview(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function KindPanel({ kind, hint }: { kind: TaxonomyKind; hint: string }) {
  const { ready } = useRequireAdmin();
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 50,
  });
  const { search, searchQuery, setSearch } = useUrlListFilters({ search: 'q' });
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, loading, refetch } = useQuery(ADMIN_DISCOVERY_TAXONOMIES, {
    skip: !ready,
    variables: {
      kind,
      search: searchQuery || undefined,
      active: activeOnly,
      limit,
      offset,
    },
  });

  const [createItem, { loading: creating }] = useMutation(CREATE_DISCOVERY_TAXONOMY);
  const [updateItem, { loading: updating }] = useMutation(UPDATE_DISCOVERY_TAXONOMY);
  const [deleteItem, { loading: deleting }] = useMutation(DELETE_DISCOVERY_TAXONOMY);

  if (!ready) return null;

  const items: TaxonomyRow[] = data?.adminDiscoveryTaxonomies?.items ?? [];
  const total = data?.adminDiscoveryTaxonomies?.total ?? 0;
  const saving = creating || updating;
  const labelWatch = Form.useWatch('label', form);
  const slugWatch = Form.useWatch('slug', form);
  const imagePhotosWatch = Form.useWatch('imagePhotos', form) as string[] | undefined;
  const defaultPreviewSlug =
    slugWatch || editing?.slug || (labelWatch ? slugifyPreview(labelWatch) : '');
  const defaultPreviewLabel = labelWatch || editing?.label || '';
  const defaultPreviewSrc =
    defaultPreviewLabel && defaultPreviewSlug
      ? defaultStockImageUrl(kind, defaultPreviewSlug, defaultPreviewLabel)
      : null;
  const magnificSearchTerm =
    defaultPreviewLabel && defaultPreviewSlug
      ? discoveryStockImageTerm(kind, defaultPreviewSlug, defaultPreviewLabel)
      : '';
  const magnificFilenameHint = defaultPreviewSlug
    ? `discovery-${kind}-${defaultPreviewSlug}.jpg`
    : 'discovery-taxonomy.jpg';

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      sortOrder: total,
      imagePhotos: [],
      iconPhotos: [],
    });
    setModalOpen(true);
  };

  const openEdit = (record: TaxonomyRow) => {
    setEditing(record);
    form.setFieldsValue({
      label: record.label,
      slug: record.slug,
      description: record.description,
      sortOrder: record.sortOrder,
      active: record.active,
      cuisine: record.cuisine || undefined,
      query: record.query || undefined,
      city: record.city || undefined,
      state: record.state || undefined,
      lat: record.lat ?? undefined,
      lng: record.lng ?? undefined,
      imagePhotos: record.imageUrl ? [record.imageUrl] : [],
      iconPhotos: record.iconUrl ? [record.iconUrl] : [],
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        kind,
        label: values.label,
        slug: values.slug || undefined,
        description: values.description || '',
        imageUrl: values.imagePhotos?.[0] || '',
        iconUrl: values.iconPhotos?.[0] || '',
        sortOrder: values.sortOrder ?? 0,
        active: values.active ?? true,
        cuisine: values.cuisine || '',
        query: values.query || '',
        city: values.city || '',
        state: values.state ? String(values.state).toUpperCase() : '',
        lat: values.lat ?? null,
        lng: values.lng ?? null,
      };

      if (editing) {
        await updateItem({ variables: { id: editing.id, input } });
        message.success('Item updated');
      } else {
        await createItem({ variables: { input } });
        message.success('Item created');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Save failed');
    }
  };

  const onDelete = (record: TaxonomyRow) => {
    Modal.confirm({
      title: 'Delete item?',
      content: `“${record.label}” will be permanently removed from discovery.`,
      okText: 'Delete',
      okButtonProps: { danger: true, loading: deleting },
      onOk: async () => {
        try {
          await deleteItem({ variables: { id: record.id } });
          message.success('Item deleted');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Delete failed');
        }
      },
    });
  };

  return (
    <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <Paragraph type="secondary" style={{ margin: 0 }}>
        {hint}
      </Paragraph>

      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search label or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Active"
            value={activeOnly}
            onChange={(v) => setActiveOnly(v)}
            options={[
              { value: true, label: 'Active' },
              { value: false, label: 'Inactive' },
            ]}
            style={{ width: 140 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add {kind}
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={{
          ...tablePagination,
          total,
          onChange: (page, pageSize) => setPagination(page, pageSize),
        }}
        columns={[
          {
            title: 'Media',
            key: 'media',
            width: 120,
            render: (_: unknown, record: TaxonomyRow) => {
              const { src, isDefault } = taxonomyDisplayImage(record);
              return (
                <Space orientation="vertical" size={2} align="center">
                  <img
                    src={src}
                    alt={record.label}
                    width={56}
                    height={56}
                    style={{
                      objectFit: 'cover',
                      borderRadius: 8,
                      display: 'block',
                      background: '#f5f5f5',
                    }}
                  />
                  {isDefault ? (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Default
                    </Text>
                  ) : null}
                </Space>
              );
            },
          },
          {
            title: 'Label',
            dataIndex: 'label',
            render: (label: string, record: TaxonomyRow) => (
              <Space orientation="vertical" size={0}>
                <Text strong>{label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.slug}
                </Text>
              </Space>
            ),
          },
          ...(kind === 'category'
            ? [
                {
                  title: 'Match',
                  key: 'match',
                  render: (_: unknown, record: TaxonomyRow) => (
                    <Space size={[4, 4]} wrap>
                      {record.cuisine ? <Tag>{record.cuisine}</Tag> : null}
                      {record.query ? <Tag color="blue">{record.query}</Tag> : null}
                    </Space>
                  ),
                },
              ]
            : []),
          ...(kind === 'landmark'
            ? [
                {
                  title: 'Location',
                  key: 'location',
                  render: (_: unknown, record: TaxonomyRow) => (
                    <Text type="secondary">
                      {[record.city, record.state].filter(Boolean).join(', ') || '—'}
                    </Text>
                  ),
                },
              ]
            : []),
          {
            title: 'Order',
            dataIndex: 'sortOrder',
            width: 80,
          },
          {
            title: 'Status',
            dataIndex: 'active',
            width: 100,
            render: (active: boolean) => (
              <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
            ),
          },
          {
            title: '',
            key: 'actions',
            width: 140,
            render: (_: unknown, record: TaxonomyRow) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(record)}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `Edit ${kind}` : `New ${kind}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        width={720}
        destroyOnClose
        okText={editing ? 'Save changes' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="label"
                label="Label"
                rules={[{ required: true, message: 'Label is required' }, { max: 120 }]}
              >
                <Input
                  maxLength={120}
                  onBlur={() => {
                    const slug = form.getFieldValue('slug');
                    if (!slug && labelWatch) {
                      form.setFieldValue('slug', slugifyPreview(labelWatch));
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="sortOrder" label="Sort order" rules={[{ required: true }]}>
                <InputNumber min={0} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="slug"
            label="URL slug"
            extra="Lowercase letters, numbers, and hyphens. Leave blank to auto-generate."
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) return;
                  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
                    throw new Error('Use lowercase letters, numbers, and hyphens only');
                  }
                },
              },
            ]}
          >
            <Input placeholder={slugifyPreview(labelWatch || 'my-item')} />
          </Form.Item>

          <Form.Item name="description" label="Description" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>

          {kind === 'category' ? (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="cuisine" label="Cuisine match" extra="Exact Restaurant.cuisine value">
                  <Input placeholder="e.g. Italian" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="query" label="Text query" extra="Matches name, cuisine, or description">
                  <Input placeholder="e.g. romantic" />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

          {kind === 'landmark' ? (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="city"
                    label="City"
                    rules={[{ required: true, message: 'City is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="state"
                    label="State"
                    rules={[
                      { required: true, message: 'State is required' },
                      { len: 2, message: 'Use a 2-letter code' },
                    ]}
                  >
                    <Input maxLength={2} style={{ textTransform: 'uppercase' }} placeholder="NY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="lat"
                    label="Latitude"
                    rules={[{ required: true, message: 'Latitude is required' }]}
                  >
                    <InputNumber style={{ width: '100%' }} step={0.0001} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="lng"
                    label="Longitude"
                    rules={[{ required: true, message: 'Longitude is required' }]}
                  >
                    <InputNumber style={{ width: '100%' }} step={0.0001} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : null}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="imagePhotos"
                label="Image"
                extra="Discovery pages use this photo. Stock default shows below until you upload."
                valuePropName="value"
              >
                <PhotoUpload
                  maxCount={1}
                  alt={defaultPreviewLabel || 'Taxonomy'}
                  placeholderSrc={!(imagePhotosWatch?.length) ? defaultPreviewSrc : null}
                />
              </Form.Item>
              {magnificSearchTerm ? (
                <div style={{ marginTop: 12 }}>
                  <MagnificStockPicker
                    searchTerm={magnificSearchTerm}
                    filenameHint={magnificFilenameHint}
                    disabled={saving}
                    onAccept={(publicUrl) => form.setFieldValue('imagePhotos', [publicUrl])}
                  />
                </div>
              ) : null}
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="iconPhotos"
                label="Icon"
                extra="Optional smaller mark for chips or compact UI."
                valuePropName="value"
              >
                <PhotoUpload maxCount={1} alt={`${defaultPreviewLabel || 'Taxonomy'} icon`} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function AdminDiscoveryPageContent() {
  const { ready } = useRequireAdmin();
  const [kind, setKind] = useState<TaxonomyKind>('category');

  if (!ready) return null;

  return (
    <div component="AdminDiscoveryPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Discovery taxonomies"
          subtitle="Manage categories, cuisines, occasions, and landmarks — including images and icons used on tablevera.online discovery pages."
        />

        <Tabs
          activeKey={kind}
          destroyOnHidden
          onChange={(key) => setKind(key as TaxonomyKind)}
          items={KIND_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            children: <KindPanel kind={t.key} hint={t.hint} />,
          }))}
        />
      </Space>
    </div>
  );
}

export default function AdminDiscoveryPage() {
  return (
    <Suspense fallback={null}>
      <AdminDiscoveryPageContent />
    </Suspense>
  );
}
