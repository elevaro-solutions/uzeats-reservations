'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
  Switch,
  Typography,
  message,
  Spin,
} from 'antd';
import { CUISINES } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  UPDATE_RESTAURANT,
  RESTAURANT_SETTINGS,
  UPDATE_RESTAURANT_SETTINGS,
} from '@/lib/graphql';
import PhotoUpload from '@/components/PhotoUpload';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';

const { Title } = Typography;

export default function EditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [settingsForm] = Form.useForm();
  const { data, loading: dataLoading, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [updateRestaurant, { loading: saving }] = useMutation(UPDATE_RESTAURANT);
  const {
    data: settingsData,
    refetch: refetchSettings,
  } = useQuery(RESTAURANT_SETTINGS, {
    skip: !restaurantId,
    variables: { id: restaurantId },
  });
  const [updateSettings, { loading: savingSettings }] = useMutation(UPDATE_RESTAURANT_SETTINGS);

  const previewColor = Form.useWatch('primaryColor', settingsForm);
  const previewText = Form.useWatch('buttonText', settingsForm);
  const previewShowReviews = Form.useWatch('showReviews', settingsForm);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    setRestaurantId(saved ?? data?.myRestaurants?.[0]?.id);
  }, [data]);

  const restaurant = (data?.myRestaurants ?? []).find((r: any) => r.id === restaurantId);

  useEffect(() => {
    if (!restaurant) return;
    form.setFieldsValue({
      name: restaurant.name,
      description: restaurant.description ?? '',
      cuisine: restaurant.cuisine,
      priceRange: restaurant.priceRange,
      line1: restaurant.address?.line1,
      city: restaurant.address?.city,
      state: restaurant.address?.state,
      zip: restaurant.address?.zip,
      lat: restaurant.location?.lat,
      lng: restaurant.location?.lng,
      depositRequired: restaurant.depositRequired,
      depositAmountCents: restaurant.depositAmountCents,
      phone: restaurant.phone ?? '',
      website: restaurant.website ?? '',
    });
    setPhotos(restaurant.photos ?? []);
  }, [restaurant?.id, restaurant, form]);

  const settings = settingsData?.restaurant;

  useEffect(() => {
    if (settings) {
      settingsForm.setFieldsValue({
        useSmartAssign: settings.useSmartAssign ?? false,
        posEnabled: settings.posEnabled ?? false,
        spendAlertDollars: (settings.spendAlertThresholdCents ?? 0) / 100,
        primaryColor: settings.widgetTheme?.primaryColor ?? '#1677ff',
        buttonText: settings.widgetTheme?.buttonText ?? 'Reserve a table',
        showReviews: settings.widgetTheme?.showReviews ?? true,
      });
    }
  }, [settings, settingsForm]);

  const handleSettingsFinish = async (values: any) => {
    if (!restaurantId) return;
    try {
      await updateSettings({
        variables: {
          restaurantId,
          spendAlertThresholdCents: Math.round((values.spendAlertDollars ?? 0) * 100),
          useSmartAssign: values.useSmartAssign ?? false,
          posEnabled: values.posEnabled ?? false,
          widgetTheme: {
            primaryColor: values.primaryColor,
            buttonText: values.buttonText,
            showReviews: values.showReviews ?? false,
          },
        },
      });
      message.success('Settings updated');
      refetchSettings();
    } catch (err: any) {
      message.error(err.message ?? 'Failed to update settings');
    }
  };

  const handleFinish = async (values: any) => {
    if (!restaurantId) return;
    try {
      await updateRestaurant({
        variables: {
          id: restaurantId,
          input: {
            name: values.name,
            description: values.description || undefined,
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
            phone: values.phone || undefined,
            website: values.website || undefined,
            photos,
          },
        },
      });
      message.success('Restaurant updated');
      await refetch();
    } catch (err: any) {
      message.error(err.message ?? 'Update failed');
    }
  };

  if (dataLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Edit restaurant</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(data?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />

      {restaurant && (
        <>
          <Card>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
              <Row gutter={16}>
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
                <Col xs={24} md={8}>
                  <Form.Item
                    name="line1"
                    label="Address"
                    tooltip={tips.line1}
                    rules={[{ required: true, message: 'Address is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} md={5}>
                  <Form.Item
                    name="city"
                    label="City"
                    tooltip={tips.city}
                    rules={[{ required: true, message: 'City is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={6} md={3}>
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
                <Col xs={6} md={4}>
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
                <Col xs={12} md={4}>
                  <Form.Item
                    name="priceRange"
                    label="Price"
                    tooltip={tips.priceRange}
                    rules={[{ required: true, message: 'Price range is required' }]}
                  >
                    <Select options={priceRangeOptions} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="lat"
                    label="Latitude"
                    tooltip={tips.lat}
                    rules={[
                      { required: true, message: 'Latitude is required' },
                      { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' },
                    ]}
                  >
                    <InputNumber min={-90} max={90} style={{ width: '100%' }} step={0.0001} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="lng"
                    label="Longitude"
                    tooltip={tips.lng}
                    rules={[
                      { required: true, message: 'Longitude is required' },
                      { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' },
                    ]}
                  >
                    <InputNumber min={-180} max={180} style={{ width: '100%' }} step={0.0001} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="depositRequired"
                    label="Require deposit"
                    tooltip={tips.depositRequired}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="depositAmountCents"
                    label="Deposit (cents/guest)"
                    tooltip={tips.depositAmountCents}
                    rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                  >
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="phone"
                    label="Phone"
                    tooltip={tips.phone}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          if (!/^\+?[1-9]\d{7,14}$/.test(value)) {
                            return Promise.reject(new Error('Use E.164 format, e.g. +12125551234'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input placeholder="+12125551234" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="website"
                    label="Website"
                    tooltip={tips.website}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          try {
                            // eslint-disable-next-line no-new
                            new URL(value);
                            return Promise.resolve();
                          } catch {
                            return Promise.reject(new Error('Enter a valid URL'));
                          }
                        },
                      },
                    ]}
                  >
                    <Input placeholder="https://example.com" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save changes
              </Button>
            </Form>
          </Card>

          <Card title="Restaurant Photos">
            <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
              Photos are saved when you click &quot;Save changes&quot; above.
            </Typography.Text>
          </Card>

          <Card title="Settings">
            <Form form={settingsForm} layout="vertical" onFinish={handleSettingsFinish}>
              <Row gutter={16}>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="useSmartAssign"
                    label="Smart table assign"
                    tooltip={tips.useSmartAssign}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="posEnabled"
                    label="POS integration"
                    tooltip={tips.posEnabled}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="spendAlertDollars"
                    label="Spend alert threshold ($, 0 = disabled)"
                    tooltip={tips.spendAlertDollars}
                  >
                    <InputNumber min={0} step={10} precision={2} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                Booking widget theme
              </Typography.Text>
              <Row gutter={16} align="bottom">
                <Col xs={12} md={5}>
                  <Form.Item
                    name="primaryColor"
                    label="Primary color (hex)"
                    tooltip={tips.primaryColor}
                    rules={[
                      {
                        pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
                        message: 'Enter a hex color like #1677ff',
                      },
                    ]}
                  >
                    <Input placeholder="#1677ff" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="buttonText" label="Button text" tooltip={tips.buttonText}>
                    <Input placeholder="Reserve a table" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={5}>
                  <Form.Item
                    name="showReviews"
                    label="Show reviews"
                    tooltip={tips.showReviews}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="Preview">
                    <Space>
                      <Button
                        style={{
                          background: previewColor || '#1677ff',
                          borderColor: previewColor || '#1677ff',
                          color: '#fff',
                        }}
                      >
                        {previewText || 'Reserve a table'}
                      </Button>
                      {previewShowReviews && (
                        <Typography.Text type="secondary">★ 4.8 (120 reviews)</Typography.Text>
                      )}
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              <Button type="primary" htmlType="submit" loading={savingSettings}>
                Save settings
              </Button>
            </Form>
          </Card>
        </>
      )}
    </Space>
  );
}
