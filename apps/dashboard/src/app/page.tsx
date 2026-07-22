'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Divider,
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
import {
  AddressAutocomplete,
  EmptyState,
  PageHeader,
  StatusTag,
  colors,
  radii,
  spacing,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, CREATE_RESTAURANT } from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';

const { Text } = Typography;

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [createRestaurant, { loading: creating }] = useMutation(CREATE_RESTAURANT);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm] = Form.useForm();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user?.role === 'admin') router.replace('/admin');
  }, [authLoading, user, router]);

  const restaurants = data?.myRestaurants ?? [];

  return (
    <div component="OverviewPage" style={{ display: 'contents' }}><Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Overview"
        subtitle="Your venues at a glance — jump into service or add a new listing"
        extra={
          <Button type="primary" size="large" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : 'Add restaurant'}
          </Button>
        }
      />

      {showCreate && (
        <Card
          className="rt-surface-card"
          styles={{ body: { padding: spacing.lg } }}
          style={{ borderRadius: radii.lg }}
        >
          <h3 className="rt-form-section-title">New restaurant listing</h3>
          <p className="rt-form-section-desc">
            Submit for approval. You can refine photos, menu, and booking rules in Settings after.
          </p>
          <Form
            form={createForm}
            layout="vertical"
            requiredMark="optional"
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
            <Row gutter={[24, 8]}>
              <Col xs={24} md={12}>
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
              <Col xs={24} md={12}>
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
                  <Input.TextArea rows={3} maxLength={2000} showCount />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
            <h3 className="rt-form-section-title">Location</h3>
            <p className="rt-form-section-desc">Where diners will find you.</p>

            <Row gutter={[24, 8]}>
              <Col xs={24} md={10}>
                <Form.Item
                  name="line1"
                  label="Street address"
                  tooltip={tips.line1}
                  rules={[{ required: true, message: 'Address is required' }]}
                >
                  <AddressAutocomplete
                    placeholder="Start typing an address"
                    inputProps={{ size: 'middle' }}
                    onSelect={(selection) =>
                      createForm.setFieldsValue(addressSelectionToFields(selection))
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="city"
                  label="City"
                  tooltip={tips.city}
                  rules={[{ required: true, message: 'City is required' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
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
              <Col xs={12} sm={6} md={4}>
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
              <Col xs={24} md={8}>
                <Form.Item
                  name="priceRange"
                  label="Price range"
                  tooltip={tips.priceRange}
                  initialValue={2}
                  rules={[{ required: true, message: 'Price range is required' }]}
                >
                  <Select options={priceRangeOptions} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="lat"
                  label="Latitude"
                  tooltip={tips.lat}
                  initialValue={40.7128}
                  rules={[
                    { required: true, message: 'Latitude is required' },
                    {
                      type: 'number',
                      min: -90,
                      max: 90,
                      message: 'Latitude must be between -90 and 90',
                    },
                  ]}
                >
                  <InputNumber min={-90} max={90} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="lng"
                  label="Longitude"
                  tooltip={tips.lng}
                  initialValue={-74.006}
                  rules={[
                    { required: true, message: 'Longitude is required' },
                    {
                      type: 'number',
                      min: -180,
                      max: 180,
                      message: 'Longitude must be between -180 and 180',
                    },
                  ]}
                >
                  <InputNumber min={-180} max={180} style={{ width: '100%' }} step={0.0001} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
            <h3 className="rt-form-section-title">Deposits</h3>
            <p className="rt-form-section-desc">Optional hold when guests book.</p>

            <Row gutter={[24, 8]}>
              <Col xs={12} md={8}>
                <Form.Item
                  name="depositRequired"
                  label="Require deposit"
                  tooltip={tips.depositRequired}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  name="depositAmountCents"
                  label="Deposit (cents / guest)"
                  tooltip={tips.depositAmountCents}
                  initialValue={0}
                  rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" htmlType="submit" loading={creating} size="large">
              Submit for approval
            </Button>
          </Form>
        </Card>
      )}

      {restaurants.length === 0 && !showCreate ? (
        <EmptyState
          title="No restaurants yet"
          description="Add your first venue to start taking reservations."
          action={
            <Button type="primary" onClick={() => setShowCreate(true)}>
              Add restaurant
            </Button>
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {restaurants.map((r: {
            id: string;
            name: string;
            status: string;
            cuisine: string;
            address: { city: string; state: string };
            tables?: unknown[];
            shifts?: unknown[];
          }) => (
            <Col key={r.id} xs={24} md={12} lg={8}>
              <Card
                title={r.name}
                extra={<StatusTag status={r.status} />}
                style={{ borderRadius: radii.lg, height: '100%' }}
                styles={{ body: { paddingTop: spacing.sm } }}
                actions={[
                  <Button
                    key="res"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/reservations');
                    }}
                  >
                    Reservations
                  </Button>,
                  <Button
                    key="floor"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/floor-plan');
                    }}
                  >
                    Floor
                  </Button>,
                  <Button
                    key="settings"
                    type="link"
                    style={{ color: colors.brand[600] }}
                    onClick={() => {
                      localStorage.setItem('activeRestaurantId', r.id);
                      window.dispatchEvent(
                        new CustomEvent('rt-restaurant-change', { detail: r.id }),
                      );
                      router.push('/settings');
                    }}
                  >
                    Settings
                  </Button>,
                ]}
              >
                <Text type="secondary">
                  {r.cuisine} · {r.address.city}, {r.address.state}
                </Text>
                <Row gutter={12} style={{ marginTop: spacing.md }}>
                  <Col span={12}>
                    <Statistic title="Tables" value={r.tables?.length ?? 0} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Shifts" value={r.shifts?.length ?? 0} />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Space></div>
  );
}
