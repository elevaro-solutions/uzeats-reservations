'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Switch,
  Typography,
  message,
  Spin,
} from 'antd';
import {
  ApiOutlined,
  ArrowRightOutlined,
  BellOutlined,
  ClusterOutlined,
  FormOutlined,
  LockOutlined,
  ReadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import { AddressAutocomplete, PageHeader, PhoneInput, colors, radii, spacing, usPhoneRules } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { addressSelectionToFields } from '@/lib/address';
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
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Text } = Typography;

const TOOL_LINKS = [
  {
    href: '/menu',
    title: 'Menu',
    description: 'Sections, dishes, dietary tags, and photos',
    icon: <ReadOutlined />,
  },
  {
    href: '/blackouts',
    title: 'Blackouts',
    description: 'Block dates or hours when you are closed',
    icon: <StopOutlined />,
  },
  {
    href: '/access-rules',
    title: 'Access rules',
    description: 'Party size, lead time, and booking limits',
    icon: <LockOutlined />,
  },
  {
    href: '/surveys',
    title: 'Surveys',
    description: 'Post-dining feedback questions and results',
    icon: <FormOutlined />,
  },
  {
    href: '/groups',
    title: 'Groups',
    description: 'Multi-location restaurant groups',
    icon: <ClusterOutlined />,
  },
  {
    href: '/integrations',
    title: 'Integrations',
    description: 'API keys, POS, and embed partners',
    icon: <ApiOutlined />,
  },
  {
    href: '/notifications',
    title: 'Notifications',
    description: 'Per-user alert matrix by feature and channel',
    icon: <BellOutlined />,
  },
] as const;

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div component="FormSection" style={{ marginBottom: spacing.lg }}>
      <h3 className="rt-form-section-title">{title}</h3>
      {description && <p className="rt-form-section-desc">{description}</p>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [photos, setPhotos] = useState<string[]>([]);
  const { data, loading: dataLoading, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (data?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [data],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const [updateRestaurant, { loading: saving }] = useMutation(UPDATE_RESTAURANT);
  const { data: settingsData, refetch: refetchSettings } = useQuery(RESTAURANT_SETTINGS, {
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

  const restaurant = (data?.myRestaurants ?? []).find(
    (r: { id: string }) => r.id === restaurantId,
  );

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
      loyaltyEnabled: restaurant.loyaltyEnabled ?? false,
      loyaltyPointsPerVisit: restaurant.loyaltyPointsPerVisit ?? 50,
      loyaltyMinRedeemPoints: restaurant.loyaltyMinRedeemPoints ?? 200,
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
        primaryColor: settings.widgetTheme?.primaryColor ?? colors.brand[600],
        buttonText: settings.widgetTheme?.buttonText ?? 'Reserve a table',
        showReviews: settings.widgetTheme?.showReviews ?? true,
      });
    }
  }, [settings, settingsForm]);

  const handleSettingsFinish = async (values: {
    spendAlertDollars?: number;
    useSmartAssign?: boolean;
    posEnabled?: boolean;
    primaryColor?: string;
    buttonText?: string;
    showReviews?: boolean;
  }) => {
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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const handleFinish = async (values: Record<string, unknown>) => {
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
            loyaltyEnabled: values.loyaltyEnabled ?? false,
            loyaltyPointsPerVisit: values.loyaltyPointsPerVisit ?? 50,
            loyaltyMinRedeemPoints: values.loyaltyMinRedeemPoints ?? 200,
            phone: values.phone || undefined,
            website: values.website || undefined,
            photos,
          },
        },
      });
      message.success('Restaurant updated');
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  if (dataLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  return (
    <div component="SettingsPage" style={{ display: 'contents' }}><Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Settings"
        subtitle="Restaurant profile, booking preferences, and setup tools"
        extra={
          <Select
            style={{ width: 260 }}
            value={restaurantId}
            onChange={setRestaurantId}
            options={(data?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
              value: r.id,
              label: r.name,
            }))}
            placeholder="Select restaurant"
          />
        }
      />

      <div>
        <h3 className="rt-form-section-title">Setup tools</h3>
        <p className="rt-form-section-desc">
          Less frequent configuration — kept here so your daily sidebar stays focused.
        </p>
        <Row gutter={[16, 16]}>
          {TOOL_LINKS.map((tool) => (
            <Col key={tool.href} xs={24} sm={12} lg={8}>
              <Link href={tool.href} style={{ display: 'block', height: '100%' }}>
                <Card
                  className="rt-settings-link"
                  size="small"
                  styles={{
                    body: {
                      padding: spacing.md,
                      height: '100%',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                    },
                  }}
                  style={{
                    height: '100%',
                    borderRadius: radii.lg,
                    borderColor: colors.border,
                  }}
                  hoverable={false}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radii.sm,
                        background: colors.brand[50],
                        color: colors.brand[600],
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {tool.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text strong style={{ fontSize: 14 }}>
                          {tool.title}
                        </Text>
                        <ArrowRightOutlined
                          className="rt-settings-link-arrow"
                          style={{
                            fontSize: 12,
                            color: colors.textTertiary,
                            transition: 'color 0.2s ease, transform 0.2s ease',
                          }}
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                        {tool.description}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      {restaurant && (
        <>
          <Card
            className="rt-surface-card"
            styles={{ body: { padding: spacing.lg } }}
            style={{ borderRadius: radii.lg }}
          >
            <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
              <FormSection
                title="Restaurant profile"
                description="How your venue appears to diners on Tablevera."
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
              </FormSection>

              <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />

              <FormSection
                title="Location"
                description="Address and map coordinates used for discovery."
              >
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
                          form.setFieldsValue(addressSelectionToFields(selection))
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
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="lat"
                      label="Latitude"
                      tooltip={tips.lat}
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
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="lng"
                      label="Longitude"
                      tooltip={tips.lng}
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
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="priceRange"
                      label="Price range"
                      tooltip={tips.priceRange}
                      rules={[{ required: true, message: 'Price range is required' }]}
                    >
                      <Select options={priceRangeOptions} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </FormSection>

              <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />

              <FormSection
                title="Contact & deposits"
                description="How guests reach you and whether bookings require a deposit."
              >
                <Row gutter={[24, 8]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="phone"
                      label="Phone"
                      tooltip={tips.phone}
                      rules={usPhoneRules()}
                    >
                      <PhoneInput />
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
                      rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                    >
                      <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </FormSection>

              <FormSection
                title="Restaurant loyalty"
                description="Reward repeat guests with points they can redeem on future bookings at your venue."
              >
                <Row gutter={[24, 8]}>
                  <Col xs={12} md={8}>
                    <Form.Item
                      name="loyaltyEnabled"
                      label="Enable loyalty program"
                      tooltip={tips.loyaltyEnabled}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item
                      name="loyaltyPointsPerVisit"
                      label="Points per visit"
                      tooltip={tips.loyaltyPointsPerVisit}
                      rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                    >
                      <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item
                      name="loyaltyMinRedeemPoints"
                      label="Min redeem (points)"
                      tooltip={tips.loyaltyMinRedeemPoints}
                      rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
                    >
                      <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </FormSection>

              <Button type="primary" htmlType="submit" loading={saving} size="large">
                Save profile
              </Button>
            </Form>
          </Card>

          <Card
            className="rt-surface-card"
            styles={{ body: { padding: spacing.lg } }}
            style={{ borderRadius: radii.lg }}
          >
            <FormSection
              title="Photos"
              description="Showcase your space. Photos save when you update the profile above."
            >
              <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
            </FormSection>
          </Card>

          <Card
            className="rt-surface-card"
            styles={{ body: { padding: spacing.lg } }}
            style={{ borderRadius: radii.lg }}
          >
            <Form
              form={settingsForm}
              layout="vertical"
              onFinish={handleSettingsFinish}
              requiredMark="optional"
            >
              <FormSection
                title="Operations"
                description="Automation and alerts for day-of service."
              >
                <Row gutter={[24, 8]}>
                  <Col xs={12} md={8}>
                    <Form.Item
                      name="useSmartAssign"
                      label="Smart table assign"
                      tooltip={tips.useSmartAssign}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item
                      name="posEnabled"
                      label="POS integration"
                      tooltip={tips.posEnabled}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="spendAlertDollars"
                      label="Spend alert ($)"
                      tooltip={tips.spendAlertDollars}
                      extra="0 disables alerts"
                    >
                      <InputNumber min={0} step={10} precision={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </FormSection>

              <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />

              <FormSection
                title="Booking widget"
                description="Theme for the embeddable reserve button on your website."
              >
                <Row gutter={[24, 8]} align="bottom">
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="primaryColor"
                      label="Primary color"
                      tooltip={tips.primaryColor}
                      rules={[
                        {
                          pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
                          message: 'Enter a hex color like #0b3d2e',
                        },
                      ]}
                    >
                      <Input
                        placeholder={colors.brand[600]}
                        addonBefore={
                          <span
                            style={{
                              display: 'inline-block',
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              background: previewColor || colors.brand[600],
                              border: `1px solid ${colors.border}`,
                            }}
                          />
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="buttonText" label="Button text" tooltip={tips.buttonText}>
                      <Input placeholder="Reserve a table" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Item
                      name="showReviews"
                      label="Show reviews"
                      tooltip={tips.showReviews}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item label="Preview">
                      <Space>
                        <Button
                          style={{
                            background: previewColor || colors.brand[600],
                            borderColor: previewColor || colors.brand[600],
                            color: '#fff',
                          }}
                        >
                          {previewText || 'Reserve a table'}
                        </Button>
                        {previewShowReviews && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ★ 4.8
                          </Text>
                        )}
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </FormSection>

              <Button type="primary" htmlType="submit" loading={savingSettings} size="large">
                Save preferences
              </Button>
            </Form>
          </Card>
        </>
      )}

      {!restaurant && !(data?.myRestaurants?.length) && (
        <Card style={{ borderRadius: radii.lg }}>
          <Text type="secondary">
            No restaurants yet.{' '}
            <Link href="/" style={{ color: colors.brand[600], fontWeight: 600 }}>
              Add one from Overview
            </Link>
          </Text>
        </Card>
      )}
    </Space></div>
  );
}
