'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
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
  message,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import {
  AddressAutocomplete,
  PageHeader,
  PhoneInput,
  StatusTag,
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import {
  ADMIN_RESTAURANTS,
  ADMIN_UPDATE_RESTAURANT,
  ADMIN_USERS,
  SET_RESTAURANT_STATUS,
} from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import { priceRangeOptions } from '@/lib/restaurantFormTooltips';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

function AdminRestaurantsContent() {
  const { ready } = useRequireAdmin();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const { data, refetch, loading } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit, offset },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [updateRestaurant, { loading: saving }] = useMutation(ADMIN_UPDATE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant updated');
      setEditing(null);
      refetch();
    },
  });
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!editing) return;
    form.setFieldsValue({
      name: editing.name,
      description: editing.description ?? '',
      cuisine: editing.cuisine,
      priceRange: editing.priceRange,
      phone: editing.phone ?? '',
      website: editing.website ?? '',
      depositRequired: editing.depositRequired,
      depositAmountCents: editing.depositAmountCents
        ? editing.depositAmountCents / 100
        : 0,
      featured: Boolean(editing.featured),
      ownerId: editing.ownerId,
      line1: editing.address?.line1,
      line2: editing.address?.line2 ?? '',
      city: editing.address?.city,
      state: editing.address?.state,
      zip: editing.address?.zip,
      country: editing.address?.country ?? 'US',
      lat: editing.location?.lat,
      lng: editing.location?.lng,
    });
  }, [editing, form]);

  if (!ready) return null;

  const ownerOptions = (usersData?.adminUsers?.items ?? [])
    .filter((u: any) => u.role === 'restaurant_owner' || u.role === 'admin' || u.role === 'staff')
    .map((u: any) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
    }));

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      await updateRestaurant({
        variables: {
          id: editing.id,
          featured: values.featured,
          ownerId: values.ownerId,
          input: {
            name: values.name,
            description: values.description || undefined,
            cuisine: values.cuisine,
            priceRange: values.priceRange,
            phone: values.phone || undefined,
            website: values.website || undefined,
            depositRequired: Boolean(values.depositRequired),
            depositAmountCents: Math.round((values.depositAmountCents ?? 0) * 100),
            photos: editing.photos ?? [],
            address: {
              line1: values.line1,
              line2: values.line2 || undefined,
              city: values.city,
              state: values.state,
              zip: values.zip,
              country: values.country || 'US',
            },
            location: {
              lat: Number(values.lat),
              lng: Number(values.lng),
            },
          },
        },
      });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to update restaurant');
    }
  };

  return (
    <div component="AdminRestaurantsContent" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Restaurants"
        subtitle="Approve partners, edit listing details, and manage ownership."
      />
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.adminRestaurants?.items ?? []}
          pagination={tablePagination(data?.adminRestaurants?.total ?? 0)}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Cuisine', dataIndex: 'cuisine' },
            {
              title: 'Location',
              render: (_: unknown, r: any) => `${r.address.city}, ${r.address.state}`,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Actions',
              width: 320,
              render: (_: unknown, r: any) => (
                <Space wrap>
                  <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  {r.status !== 'approved' && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'approved' } });
                        message.success('Approved');
                        refetch();
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button
                      danger
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'rejected' } });
                        refetch();
                      }}
                    >
                      Reject
                    </Button>
                  )}
                  {r.status === 'approved' && (
                    <Button
                      size="small"
                      onClick={async () => {
                        await setStatus({ variables: { id: r.id, status: 'suspended' } });
                        refetch();
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? `Edit — ${editing.name}` : 'Edit restaurant'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={onSave}
        confirmLoading={saving}
        width={720}
        destroyOnClose
        okText="Save changes"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cuisine" label="Cuisine" rules={[{ required: true }]}>
                <Select options={CUISINES.map((c) => ({ value: c, label: c }))} showSearch />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priceRange" label="Price range" rules={[{ required: true }]}>
                <Select options={priceRangeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })}>
                <PhoneInput />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ownerId" label="Owner" rules={[{ required: true }]}>
                <Select
                  options={ownerOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select owner account"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Address search">
                <AddressAutocomplete
                  onSelect={(selection) => {
                    form.setFieldsValue(addressSelectionToFields(selection));
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="line1" label="Street" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="line2" label="Apt / suite">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="City" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State" rules={[{ required: true }]}>
                <Input maxLength={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="zip" label="ZIP" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lat" label="Latitude" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lng" label="Longitude" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.000001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="depositRequired" label="Deposit required" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="depositAmountCents" label="Deposit amount (USD)">
                <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="featured" label="Featured listing" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Form.Item name="country" hidden>
              <Input />
            </Form.Item>
          </Row>
        </Form>
      </Modal>
    </Space></div>
  );
}

export default function AdminRestaurantsPage() {
  return (
    <div component="AdminRestaurantsPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <AdminRestaurantsContent />
    </Suspense></div>
  );
}
