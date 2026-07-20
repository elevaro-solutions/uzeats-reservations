'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
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
import { PlusOutlined, RocketOutlined, StarOutlined, TagOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  PROMOTIONS,
  CREATE_PROMOTION,
  UPDATE_PROMOTION,
  DELETE_PROMOTION,
  BOOST_CAMPAIGNS,
  CREATE_BOOST_CAMPAIGN,
  SET_BOOST_CAMPAIGN_STATUS,
  SET_FEATURED_PLACEMENT,
  RESTAURANT_SETTINGS,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title, Text } = Typography;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dollars = (cents: number) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const BOOST_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  paused: 'orange',
  completed: 'default',
};

function PromotionsTab({ restaurantId }: { restaurantId?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
    pageParam: 'page',
  });

  const { data, loading, refetch } = useQuery(PROMOTIONS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
    onError: (err: Error) => message.error(err.message),
  });
  const [createPromotion, { loading: creating }] = useMutation(CREATE_PROMOTION);
  const [updatePromotion, { loading: updating }] = useMutation(UPDATE_PROMOTION);
  const [deletePromotion] = useMutation(DELETE_PROMOTION);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        title: values.title,
        description: values.description || undefined,
        discountPercent: values.discountPercent ?? undefined,
        code: values.code || undefined,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
        daysOfWeek: values.daysOfWeek ?? [],
        active: values.active ?? true,
      };
      if (editingId) {
        await updatePromotion({ variables: { id: editingId, input } });
        message.success('Promotion updated');
      } else {
        await createPromotion({ variables: { restaurantId, input } });
        message.success('Promotion created');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          New promotion
        </Button>
      </div>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={data?.promotions?.items ?? []}
        pagination={tablePagination(data?.promotions?.total ?? 0)}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Discount',
            dataIndex: 'discountPercent',
            render: (v: number) => (v != null ? `${v}%` : '—'),
          },
          {
            title: 'Code',
            dataIndex: 'code',
            render: (v: string) => (v ? <Tag>{v}</Tag> : '—'),
          },
          {
            title: 'Dates',
            key: 'dates',
            render: (_: any, r: any) =>
              r.startDate || r.endDate ? `${r.startDate ?? '…'} → ${r.endDate ?? '…'}` : '—',
          },
          {
            title: 'Days',
            dataIndex: 'daysOfWeek',
            render: (days: number[]) =>
              days?.length ? days.map((d) => DAYS[d]).join(', ') : 'Every day',
          },
          { title: 'Redemptions', dataIndex: 'redemptions' },
          {
            title: 'Active',
            dataIndex: 'active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingId(r.id);
                    form.setFieldsValue({
                      title: r.title,
                      description: r.description,
                      discountPercent: r.discountPercent,
                      code: r.code,
                      startDate: r.startDate ? dayjs(r.startDate) : undefined,
                      endDate: r.endDate ? dayjs(r.endDate) : undefined,
                      daysOfWeek: r.daysOfWeek ?? [],
                      active: r.active,
                    });
                    setModalOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this promotion?"
                  onConfirm={async () => {
                    try {
                      await deletePromotion({ variables: { id: r.id } });
                      message.success('Promotion deleted');
                      refetch();
                    } catch (err: any) {
                      message.error(err?.message ?? 'Failed to delete');
                    }
                  }}
                >
                  <Button size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingId ? 'Edit promotion' : 'New promotion'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Happy hour — 20% off" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="20% off all bookings before 6pm" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="discountPercent" label="Discount %">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="Promo code">
                <Input placeholder="HAPPY20" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="daysOfWeek" label="Days of week (empty = every day)">
            <Select mode="multiple" options={DAYS.map((d, i) => ({ value: i, label: d }))} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function BoostCampaignsTab({ restaurantId }: { restaurantId?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
    pageParam: 'boostPage',
    pageSizeParam: 'boostPageSize',
  });

  const { data, loading, refetch } = useQuery(BOOST_CAMPAIGNS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
    onError: (err: Error) => message.error(err.message),
  });
  const [createBoost, { loading: creating }] = useMutation(CREATE_BOOST_CAMPAIGN);
  const [setStatus] = useMutation(SET_BOOST_CAMPAIGN_STATUS);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createBoost({
        variables: {
          restaurantId,
          input: {
            name: values.name,
            costPerCoverCents: Math.round((values.costPerCover ?? 0) * 100),
            budgetCents: Math.round((values.budget ?? 0) * 100),
            startDate: values.startDate.format('YYYY-MM-DD'),
            endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
          },
        },
      });
      message.success('Boost campaign created');
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await setStatus({ variables: { id, status } });
      message.success(`Campaign ${status}`);
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to update status');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">
          Boost campaigns promote your restaurant across the network. You pay per cover
          attributed to the boost, up to your budget.
        </Text>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => {
            form.resetFields();
            setModalOpen(true);
          }}
        >
          New boost
        </Button>
      </div>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={data?.boostCampaigns?.items ?? []}
        pagination={tablePagination(data?.boostCampaigns?.total ?? 0)}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Cost / cover',
            dataIndex: 'costPerCoverCents',
            render: (v: number) => dollars(v),
          },
          {
            title: 'Budget',
            key: 'budget',
            width: 220,
            render: (_: any, r: any) => {
              const pct = r.budgetCents ? Math.round((r.spentCents / r.budgetCents) * 100) : 0;
              return (
                <div>
                  <Progress percent={Math.min(pct, 100)} size="small" />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dollars(r.spentCents)} of {dollars(r.budgetCents)} spent
                  </Text>
                </div>
              );
            },
          },
          { title: 'Covers attributed', dataIndex: 'coversAttributed' },
          {
            title: 'Dates',
            key: 'dates',
            render: (_: any, r: any) => `${r.startDate} → ${r.endDate ?? 'ongoing'}`,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag color={BOOST_STATUS_COLORS[s]}>{s}</Tag>,
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) =>
              r.status === 'completed' ? null : (
                <Space>
                  {r.status === 'active' ? (
                    <Button size="small" onClick={() => handleStatus(r.id, 'paused')}>
                      Pause
                    </Button>
                  ) : (
                    <Button size="small" type="primary" onClick={() => handleStatus(r.id, 'active')}>
                      Resume
                    </Button>
                  )}
                  <Popconfirm
                    title="Complete this campaign? This cannot be undone."
                    onConfirm={() => handleStatus(r.id, 'completed')}
                  >
                    <Button size="small" danger>
                      Complete
                    </Button>
                  </Popconfirm>
                </Space>
              ),
          },
        ]}
      />

      <Modal
        title="New boost campaign"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Summer weekend boost" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="costPerCover"
                label="Cost per cover ($)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0.01} step={0.25} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budget" label="Total budget ($)" rules={[{ required: true }]}>
                <InputNumber min={1} step={10} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End date (optional)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}

function FeaturedTab({ restaurantId }: { restaurantId?: string }) {
  const [days, setDays] = useState<number | null>(30);
  const { data, loading, refetch } = useQuery(RESTAURANT_SETTINGS, {
    skip: !restaurantId,
    variables: { id: restaurantId },
    onError: (err: Error) => message.error(err.message),
  });
  const [setFeatured, { loading: saving }] = useMutation(SET_FEATURED_PLACEMENT);

  const restaurant = data?.restaurant;

  const handleToggle = async (featured: boolean) => {
    try {
      await setFeatured({
        variables: { restaurantId, featured, days: featured ? days ?? undefined : undefined },
      });
      message.success(featured ? 'Featured placement enabled' : 'Featured placement disabled');
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to update featured placement');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ maxWidth: 560 }}>
      <Alert
        type="info"
        showIcon
        message="Featured placement"
        description="Featured restaurants rank higher in diner search results and get a highlighted badge, driving more visibility and bookings."
      />
      <Card loading={loading}>
        <Space direction="vertical" size={12}>
          <Space size={16}>
            <Text strong>Featured</Text>
            <Switch
              checked={!!restaurant?.featured}
              loading={saving}
              onChange={handleToggle}
            />
            {restaurant?.featured && restaurant?.featuredUntil && (
              <Tag color="gold" icon={<StarOutlined />}>
                Featured until {new Date(restaurant.featuredUntil).toLocaleDateString()}
              </Tag>
            )}
          </Space>
          {!restaurant?.featured && (
            <Space>
              <Text type="secondary">Duration (days, optional):</Text>
              <InputNumber min={1} max={365} value={days} onChange={setDays} />
            </Space>
          )}
        </Space>
      </Card>
    </Space>
  );
}

function MarketingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Marketing</Title>
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

      <Card>
        <Tabs
          defaultActiveKey="promotions"
          items={[
            {
              key: 'promotions',
              label: (
                <span>
                  <TagOutlined /> Promotions
                </span>
              ),
              children: <PromotionsTab restaurantId={restaurantId} />,
            },
            {
              key: 'boost',
              label: (
                <span>
                  <RocketOutlined /> Boost campaigns
                </span>
              ),
              children: <BoostCampaignsTab restaurantId={restaurantId} />,
            },
            {
              key: 'featured',
              label: (
                <span>
                  <StarOutlined /> Featured placement
                </span>
              ),
              children: <FeaturedTab restaurantId={restaurantId} />,
            },
          ]}
        />
      </Card>
    </Space>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingPageContent />
    </Suspense>
  );
}
