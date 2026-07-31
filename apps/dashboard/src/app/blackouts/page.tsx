'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  CREATE_BLACKOUT,
  RESTAURANT_BLACKOUTS,
  DELETE_BLACKOUT,
} from '@/lib/graphql';
import { buildRestaurantSelectOptions, validatedRestaurantId } from '@/lib/restaurants';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Title, Text } = Typography;

export default function BlackoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const { data } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const restaurantIds = restaurants.map((r: { id: string }) => r.id);
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const activeRestaurantId = validatedRestaurantId(restaurantId, restaurantIds);

  const { data: blackoutsData, refetch } = useQuery(RESTAURANT_BLACKOUTS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId! },
  });
  const [createBlackout, { loading: creating }] = useMutation(CREATE_BLACKOUT);
  const [deleteBlackout] = useMutation(DELETE_BLACKOUT);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleFinish = async (values: {
    date: dayjs.Dayjs;
    reason?: string;
    allDay?: boolean;
  }) => {
    if (!activeRestaurantId) return;
    try {
      await createBlackout({
        variables: {
          restaurantId: activeRestaurantId,
          date: values.date.format('YYYY-MM-DD'),
          reason: values.reason || null,
          allDay: values.allDay ?? true,
        },
      });
      message.success('Blackout created');
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to create blackout');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlackout({ variables: { id } });
      message.success('Blackout removed');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete blackout');
    }
  };

  const blackouts = blackoutsData?.blackouts ?? [];

  return (
    <div component="BlackoutsPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Title level={2}>Blackout dates</Title>
        <Select
          style={{ width: 320 }}
          value={activeRestaurantId}
          onChange={setRestaurantId}
          options={buildRestaurantSelectOptions(restaurants)}
        />

        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title="Create blackout">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{ allDay: true }}
              >
                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: 'Select a date' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                  />
                </Form.Item>
                <Form.Item name="reason" label="Reason">
                  <Input placeholder="e.g. Private event, holiday closure" />
                </Form.Item>
                <Form.Item name="allDay" label="All day" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={creating}>
                  Create blackout
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Blackout dates">
              {blackouts.length === 0 ? (
                <Text type="secondary">No blackout dates for this location.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={blackouts}
                  renderItem={(item: {
                    id: string;
                    date: string;
                    reason?: string;
                    allDay?: boolean;
                  }) => (
                    <List.Item
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Remove this blackout?"
                          onConfirm={() => handleDelete(item.id)}
                        >
                          <Button size="small" danger type="text">
                            Delete
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text strong>{item.date}</Text>
                        {item.reason && <Text type="secondary">— {item.reason}</Text>}
                        {item.allDay && <Tag>All day</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
