'use client';

import { useEffect, useState } from 'react';
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
import { MY_RESTAURANTS, CREATE_BLACKOUT } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function BlackoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [createBlackout, { loading: creating }] = useMutation(CREATE_BLACKOUT);
  const [createdBlackouts, setCreatedBlackouts] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    setRestaurantId(saved ?? data?.myRestaurants?.[0]?.id);
  }, [data]);

  const handleFinish = async (values: any) => {
    if (!restaurantId) return;
    try {
      const { data: result } = await createBlackout({
        variables: {
          restaurantId,
          date: values.date.format('YYYY-MM-DD'),
          reason: values.reason || null,
          allDay: values.allDay ?? true,
        },
      });
      message.success('Blackout created');
      setCreatedBlackouts((prev) => [result.createBlackout, ...prev]);
      form.resetFields();
    } catch (err: any) {
      message.error(err.message ?? 'Failed to create blackout');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Blackout dates</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(data?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Create blackout">
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ allDay: true }}>
              <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select a date' }]}>
                <DatePicker style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
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
          <Card title="Recently created">
            {createdBlackouts.length === 0 ? (
              <Text type="secondary">No blackouts created this session.</Text>
            ) : (
              <List
                size="small"
                dataSource={createdBlackouts}
                renderItem={(item: any) => (
                  <List.Item>
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
  );
}
