'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_PLATFORM_SERVICES,
  CREATE_PLATFORM_SERVICE,
  DELETE_PLATFORM_SERVICE,
  UPDATE_PLATFORM_SERVICE,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  updatedAt?: string;
};

type ServiceForm = {
  name: string;
  slug?: string;
  description?: string;
  priceDollars: number;
  active: boolean;
  sortOrder: number;
};

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function AdminServicesContent() {
  const { ready } = useRequireAdmin();
  const [form] = Form.useForm<ServiceForm>();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });

  const { data, loading, refetch } = useQuery(ADMIN_PLATFORM_SERVICES, {
    skip: !ready,
    variables: { limit, offset },
  });
  const [createService, { loading: creating }] = useMutation(CREATE_PLATFORM_SERVICE);
  const [updateService, { loading: updating }] = useMutation(UPDATE_PLATFORM_SERVICE);
  const [deleteService, { loading: deleting }] = useMutation(DELETE_PLATFORM_SERVICE);

  if (!ready) return null;

  const items: ServiceRow[] = data?.adminPlatformServices?.items ?? [];
  const saving = creating || updating;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      active: true,
      sortOrder: 0,
      priceDollars: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (row: ServiceRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceDollars: row.priceCents / 100,
      active: row.active,
      sortOrder: row.sortOrder,
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || '',
        priceCents: Math.round(Number(values.priceDollars) * 100),
        active: Boolean(values.active),
        sortOrder: values.sortOrder ?? 0,
      };
      if (editing) {
        await updateService({ variables: { id: editing.id, input } });
        message.success('Service updated');
      } else {
        await createService({ variables: { input } });
        message.success('Service created');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save service');
    }
  };

  const onDelete = (row: ServiceRow) => {
    Modal.confirm({
      title: `Delete “${row.name}”?`,
      content: 'This removes the service from the catalog. Existing invoices keep their line items.',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteService({ variables: { id: row.id } });
          message.success('Service deleted');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Failed to delete');
        }
      },
    });
  };

  return (
    <div component="AdminServicesContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Services"
          subtitle="Paid or free add-on services that can be attached to manual invoices."
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New service
            </Button>
          }
        />
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          pagination={tablePagination(data?.adminPlatformServices?.total ?? 0)}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Slug', dataIndex: 'slug', width: 160 },
            {
              title: 'Price',
              dataIndex: 'priceCents',
              width: 120,
              render: (v: number) => (v === 0 ? <Tag>Free</Tag> : money(v)),
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
              render: (_: unknown, row: ServiceRow) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
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
        title={editing ? 'Edit service' : 'New service'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Onboarding setup" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (optional)">
            <Input placeholder="auto from name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="priceDollars"
            label="Price (0 = free)"
            rules={[{ required: true, message: 'Enter a price' }]}
          >
            <InputNumber min={0} step={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort order">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function AdminServicesPage() {
  return (
    <div component="AdminServicesPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminServicesContent />
      </Suspense>
    </div>
  );
}
