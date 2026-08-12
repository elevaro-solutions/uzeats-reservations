'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BOOKABLE_OCCASIONS, OCCASION_LABELS } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS } from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import PhotoUpload from '@/components/PhotoUpload';
import { gql } from '@apollo/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RESTAURANT_PACKAGES = gql`
  query RestaurantPackages($restaurantId: ID!, $activeOnly: Boolean) {
    restaurantPackages(restaurantId: $restaurantId, activeOnly: $activeOnly) {
      id
      title
      description
      priceCents
      pricePerGuest
      includes
      photoUrl
      occasions
      minPartySize
      maxPartySize
      active
    }
  }
`;

const CREATE_PACKAGE = gql`
  mutation CreateRestaurantPackage($restaurantId: ID!, $input: RestaurantPackageInput!) {
    createRestaurantPackage(restaurantId: $restaurantId, input: $input) {
      id
      title
    }
  }
`;

const UPDATE_PACKAGE = gql`
  mutation UpdateRestaurantPackage($id: ID!, $input: RestaurantPackageInput!) {
    updateRestaurantPackage(id: $id, input: $input) {
      id
      title
      active
    }
  }
`;

const DELETE_PACKAGE = gql`
  mutation DeleteRestaurantPackage($id: ID!) {
    deleteRestaurantPackage(id: $id)
  }
`;

type PackageRecord = {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  pricePerGuest: boolean;
  includes: string[];
  photoUrl?: string | null;
  occasions: string[];
  minPartySize?: number | null;
  maxPartySize?: number | null;
  active: boolean;
};

function PackagesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);

  const { data, refetch, loading } = useQuery(RESTAURANT_PACKAGES, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId, activeOnly: false },
  });
  const [createPackage, { loading: creating }] = useMutation(CREATE_PACKAGE);
  const [updatePackage, { loading: updating }] = useMutation(UPDATE_PACKAGE);
  const [deletePackage] = useMutation(DELETE_PACKAGE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const packages: PackageRecord[] = data?.restaurantPackages ?? [];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        title: values.title,
        description: values.description ?? '',
        priceCents: Math.round(Number(values.price) * 100),
        pricePerGuest: !!values.pricePerGuest,
        includes: values.includes?.split('\n').map((s: string) => s.trim()).filter(Boolean) ?? [],
        photoUrl: values.photoUrls?.[0] || values.photoUrl || undefined,
        occasions: values.occasions ?? [],
        minPartySize: values.minPartySize ?? null,
        maxPartySize: values.maxPartySize ?? null,
        active: values.active !== false,
      };

      if (editingId) {
        await updatePackage({ variables: { id: editingId, input } });
        message.success('Package updated');
      } else {
        await createPackage({ variables: { restaurantId: activeRestaurantId, input } });
        message.success('Package created');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to save package');
    }
  };

  const openEdit = (record: PackageRecord) => {
    setEditingId(record.id);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      price: record.priceCents / 100,
      pricePerGuest: record.pricePerGuest,
      includes: (record.includes ?? []).join('\n'),
      photoUrls: record.photoUrl ? [record.photoUrl] : [],
      photoUrl: record.photoUrl,
      occasions: record.occasions ?? [],
      minPartySize: record.minPartySize,
      maxPartySize: record.maxPartySize,
      active: record.active,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePackage({ variables: { id } });
      message.success('Package deleted');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete package');
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Occasion packages
          </Title>
          <Text type="secondary">
            Upsells diners can add when booking — birthday cake, tasting menu, champagne toast, and more.
          </Text>
        </div>
        <Space wrap>
          <Select {...restaurantSelectProps} style={{ minWidth: 220 }} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!activeRestaurantId}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              form.setFieldsValue({ active: true, pricePerGuest: false, occasions: [] });
              setModalOpen(true);
            }}
          >
            New package
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={packages}
          pagination={false}
          columns={[
            {
              title: 'Package',
              dataIndex: 'title',
              render: (title: string, row: PackageRecord) => (
                <Space orientation="vertical" size={0}>
                  <Text strong>{title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {row.description || 'No description'}
                  </Text>
                </Space>
              ),
            },
            {
              title: 'Price',
              render: (_: unknown, row: PackageRecord) =>
                `$${(row.priceCents / 100).toFixed(2)}${row.pricePerGuest ? ' / guest' : ''}`,
            },
            {
              title: 'Occasions',
              render: (_: unknown, row: PackageRecord) =>
                row.occasions?.length ? (
                  <Space size={[4, 4]} wrap>
                    {row.occasions.map((o) => (
                      <Tag key={o}>{OCCASION_LABELS[o as keyof typeof OCCASION_LABELS] ?? o}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">All</Text>
                ),
            },
            {
              title: 'Status',
              dataIndex: 'active',
              render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Hidden'}</Tag>
              ),
            },
            {
              title: 'Actions',
              render: (_: unknown, row: PackageRecord) => (
                <Space>
                  <Button type="link" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button type="link" danger onClick={() => void handleDelete(row.id)}>
                    Delete
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit package' : 'New package'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText={editingId ? 'Save' : 'Create'}
        confirmLoading={creating || updating}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Birthday celebration package" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="What the guest gets…" />
          </Form.Item>
          <Space wrap style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item
              name="price"
              label="Price ($)"
              rules={[{ required: true }]}
              style={{ minWidth: 140, flex: 1 }}
            >
              <InputNumber min={0} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="pricePerGuest"
              label="Per guest"
              valuePropName="checked"
              style={{ minWidth: 120 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked" style={{ minWidth: 100 }}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="occasions" label="Occasions (empty = all)">
            <Select
              mode="multiple"
              allowClear
              options={BOOKABLE_OCCASIONS.map((o) => ({
                value: o,
                label: OCCASION_LABELS[o],
              }))}
              placeholder="All occasions"
            />
          </Form.Item>
          <Space wrap style={{ width: '100%' }}>
            <Form.Item name="minPartySize" label="Min party" style={{ minWidth: 120 }}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxPartySize" label="Max party" style={{ minWidth: 120 }}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="includes" label="Includes (one per line)">
            <TextArea rows={4} placeholder={'Custom cake\nChampagne toast\nPhoto with chef'} />
          </Form.Item>
          <Form.Item name="photoUrls" label="Photo">
            <PhotoUpload maxCount={1} />
          </Form.Item>
          <Form.Item name="photoUrl" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<Card loading style={{ minHeight: 200 }} />}>
      <PackagesPageContent />
    </Suspense>
  );
}
