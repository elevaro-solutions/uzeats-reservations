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
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';

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
                <Form.Item
                  name="name"
                  label="Name"
                  tooltip={tips.name}
                  rules={[
                    { required: true, message: 'Name is required' },
                    { max: 120, message: 'Max 120 characters' },
                  ]}
                >
                  <Input maxLength={120} showCount />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="cuisine"
                  label="Cuisine"
                  tooltip={tips.cuisine}
                  rules={[{ required: true, message: 'Cuisine is required' }]}
                >
                  <Select options={CUISINES.map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description"
                  tooltip={tips.description}
                  rules={[{ max: 2000, message: 'Max 2000 characters' }]}
                >
                  <Input.TextArea rows={2} maxLength={2000} showCount />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="line1"
                  label="Address"
                  tooltip={tips.line1}
                  rules={[{ required: true, message: 'Address is required' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item
                  name="city"
                  label="City"
                  tooltip={tips.city}
                  rules={[{ required: true, message: 'City is required' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item
                  name="state"
                  label="State"
                  tooltip={tips.state}
                  rules={[
                    { required: true, message: 'State is required' },
                    { len: 2, message: 'Use 2-letter state code' },
                  ]}
                >
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  name="zip"
                  label="ZIP"
                  tooltip={tips.zip}
                  rules={[
                    { required: true, message: 'ZIP is required' },
                    { min: 5, max: 10, message: 'ZIP must be 5–10 characters' },
                  ]}
                >
                  <Input maxLength={10} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  name="priceRange"
                  label="Price"
                  tooltip={tips.priceRange}
                  initialValue={2}
                  rules={[{ required: true, message: 'Price range is required' }]}
                >
                  <Select options={priceRangeOptions} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="lat"
                  label="Lat"
                  tooltip={tips.lat}
                  initialValue={40.7128}
                  rules={[
                    { required: true, message: 'Latitude is required' },
                    { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' },
                  ]}
                >
                  <InputNumber min={-90} max={90} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="lng"
                  label="Lng"
                  tooltip={tips.lng}
                  initialValue={-74.006}
                  rules={[
                    { required: true, message: 'Longitude is required' },
                    { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' },
                  ]}
                >
                  <InputNumber min={-180} max={180} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="depositRequired"
                  label="Require deposit"
                  tooltip={tips.depositRequired}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="depositAmountCents"
                  label="Deposit cents/guest"
                  tooltip={tips.depositAmountCents}
                  initialValue={0}
                  rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
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
