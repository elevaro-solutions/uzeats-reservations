'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  MY_RESTAURANT_GROUPS,
  CREATE_RESTAURANT_GROUP,
  ADD_RESTAURANT_TO_GROUP,
  REMOVE_RESTAURANT_FROM_GROUP,
  GROUP_ANALYTICS,
} from '@/lib/graphql';

const { Title, Text } = Typography;

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: groupsData, refetch } = useQuery(MY_RESTAURANT_GROUPS, { skip: !user });
  const { data: analyticsData, loading: analyticsLoading } = useQuery(GROUP_ANALYTICS, {
    skip: !selectedGroupId,
    variables: { groupId: selectedGroupId },
  });

  const [createGroup, { loading: creating }] = useMutation(CREATE_RESTAURANT_GROUP);
  const [addToGroup] = useMutation(ADD_RESTAURANT_TO_GROUP);
  const [removeFromGroup] = useMutation(REMOVE_RESTAURANT_FROM_GROUP);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const groups = groupsData?.myRestaurantGroups ?? [];
  const restaurants = restData?.myRestaurants ?? [];

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);
  const analytics = analyticsData?.groupAnalytics;

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createGroup({ variables: values });
      message.success('Group created');
      setCreateOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  const handleAdd = async (restaurantId: string) => {
    try {
      await addToGroup({ variables: { groupId: selectedGroupId, restaurantId } });
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to add');
    }
  };

  const handleRemove = async (restaurantId: string) => {
    try {
      await removeFromGroup({ variables: { groupId: selectedGroupId, restaurantId } });
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to remove');
    }
  };

  const availableToAdd = restaurants.filter(
    (r: any) => !selectedGroup?.restaurantIds?.includes(r.id),
  );

  return (
    <div component="GroupsPage" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Restaurant groups
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          New group
        </Button>
      </div>
      <Text type="secondary">
        Group your locations to see roll-up analytics across the whole restaurant group.
      </Text>

      {groups.length === 0 ? (
        <Card>
          <Text type="secondary">No groups yet. Create one to compare locations side by side.</Text>
        </Card>
      ) : (
        <>
          <Select
            style={{ width: 280 }}
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            options={groups.map((g: any) => ({ value: g.id, label: g.name }))}
          />

          <Row gutter={16}>
            <Col xs={24} lg={8}>
              <Card title="Locations in this group">
                <List
                  dataSource={selectedGroup?.restaurants ?? []}
                  renderItem={(r: any) => (
                    <List.Item
                      actions={[
                        <Popconfirm
                          key="remove"
                          title="Remove from group?"
                          onConfirm={() => handleRemove(r.id)}
                        >
                          <Button size="small" danger type="text">
                            Remove
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      {r.name}
                    </List.Item>
                  )}
                />
                {availableToAdd.length > 0 && (
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Add a restaurant…"
                    value={null}
                    onChange={(id) => id && handleAdd(id)}
                    options={availableToAdd.map((r: any) => ({ value: r.id, label: r.name }))}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card title="Group analytics" loading={analyticsLoading}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Reservations" value={analytics?.totalReservations ?? 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Covers" value={analytics?.totalCovers ?? 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Avg rating"
                      value={analytics?.averageRating ?? 0}
                      precision={1}
                      suffix="/ 5"
                    />
                  </Col>
                </Row>
                {analytics?.topPerformingRestaurant && (
                  <Text style={{ display: 'block', marginTop: 12 }}>
                    Top performer: <Text strong>{analytics.topPerformingRestaurant.name}</Text>
                  </Text>
                )}
                <Table
                  style={{ marginTop: 16 }}
                  size="small"
                  rowKey={(row: any) => row.restaurant.id}
                  pagination={false}
                  dataSource={analytics?.reservationsByRestaurant ?? []}
                  columns={[
                    {
                      title: 'Restaurant',
                      render: (_: any, row: any) => row.restaurant.name,
                    },
                    { title: 'Reservations', dataIndex: 'reservationCount' },
                    { title: 'Covers', dataIndex: 'coverCount' },
                    {
                      title: 'Avg rating',
                      dataIndex: 'averageRating',
                      render: (v: number) => v?.toFixed(1),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Modal
        title="New restaurant group"
        open={createOpen}
        onOk={handleCreate}
        confirmLoading={creating}
        onCancel={() => setCreateOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Group name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Downtown locations" />
          </Form.Item>
          <Form.Item
            name="restaurantIds"
            label="Restaurants"
            rules={[{ required: true, message: 'Pick at least one restaurant' }]}
          >
            <Select
              mode="multiple"
              options={restaurants.map((r: any) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space></div>
  );
}
