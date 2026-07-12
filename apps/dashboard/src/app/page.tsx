'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Typography,
  message,
} from 'antd';
import { CUISINES } from '@reservations/shared';
import { StatusTag } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, CREATE_RESTAURANT } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [createRestaurant] = useMutation(CREATE_RESTAURANT);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const restaurants = data?.myRestaurants ?? [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Your restaurants
        </Title>
        <Button type="primary" onClick={() => setShowCreate((v) => !v)}>
          Add restaurant
        </Button>
      </div>

      {showCreate && (
        <Card title="New restaurant listing">
          <Form
            layout="vertical"
            onFinish={async (values) => {
              await createRestaurant({
                variables: {
                  input: {
                    name: values.name,
                    description: values.description,
                    cuisine: values.cuisine,
                    priceRange: values.priceRange,
                    address: {
                      line1: values.line1,
                      city: values.city,
                      state: values.state,
                      zip: values.zip,
                      country: 'US',
                    },
                    location: { lng: values.lng, lat: values.lat },
                    depositRequired: values.depositRequired ?? false,
                    depositAmountCents: values.depositAmountCents ?? 0,
                  },
                },
              });
              message.success('Submitted for approval');
              setShowCreate(false);
              refetch();
            }}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cuisine" label="Cuisine" rules={[{ required: true }]}>
                  <Select options={CUISINES.map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Description">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="line1" label="Address" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="city" label="City" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item name="state" label="State" rules={[{ required: true }]}>
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="zip" label="ZIP" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="priceRange" label="Price $" initialValue={2} rules={[{ required: true }]}>
                  <InputNumber min={1} max={4} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="lat" label="Lat" initialValue={40.7128} rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="lng" label="Lng" initialValue={-74.006} rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="depositRequired" label="Require deposit" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="depositAmountCents" label="Deposit cents/guest" initialValue={0}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {restaurants.map((r: any) => (
          <Col key={r.id} xs={24} md={12} lg={8}>
            <Card
              title={r.name}
              extra={<StatusTag status={r.status} />}
              actions={[
                <Button key="res" type="link" onClick={() => {
                  localStorage.setItem('activeRestaurantId', r.id);
                  router.push('/reservations');
                }}>
                  Reservations
                </Button>,
                <Button key="floor" type="link" onClick={() => {
                  localStorage.setItem('activeRestaurantId', r.id);
                  router.push('/floor');
                }}>
                  Floor
                </Button>,
                <Button key="edit" type="link" onClick={() => {
                  localStorage.setItem('activeRestaurantId', r.id);
                  router.push('/edit');
                }}>
                  Edit
                </Button>,
              ]}
            >
              <Text type="secondary">
                {r.cuisine} · {r.address.city}, {r.address.state}
              </Text>
              <Row gutter={12} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Statistic title="Tables" value={r.tables?.length ?? 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="Shifts" value={r.shifts?.length ?? 0} />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
      {restaurants.length === 0 && (
        <Card>
          <Text type="secondary">No restaurants yet. Add one to get started.</Text>
        </Card>
      )}
    </Space>
  );
}
