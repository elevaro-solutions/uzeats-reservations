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
  CodeOutlined,
  EnvironmentOutlined,
  ImportOutlined,
  LinkOutlined,
  PhoneOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { AddressAutocomplete, PageHeader, PhoneInput, colors, radii, spacing, usPhoneRules } from '@reservations/ui';
import { BookingSharePanel } from '@/components/BookingSharePanel';
import CuisineSelect from '@/components/CuisineSelect';
import { ManageDetailGroups, type ManageDetailGroup } from '@/components/ManageDetailGroups';
import { WidgetThemeEditor } from '@/components/WidgetThemeEditor';
import { RestaurantSlugPanel } from '@/components/RestaurantSlugPanel';
import { useAuth } from '@/lib/auth';
import { addressSelectionToFields } from '@/lib/address';
import {
  MY_RESTAURANTS,
  UPDATE_RESTAURANT,
  RESTAURANT_SETTINGS,
  UPDATE_RESTAURANT_SETTINGS,
  UPSERT_MENU,
} from '@/lib/graphql';
import PhotoUpload from '@/components/PhotoUpload';
import ImportRestaurantModal, { type ImportedRestaurantData } from '@/components/ImportRestaurantModal';
import { applyRestaurantImportToForm } from '@/lib/applyRestaurantImport';
import {
  depositAmountWhenRequiredRule,
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import { useFormDirty } from '@/lib/useFormDirty';
import { useUrlTab } from '@/lib/useUrlTab';
import { buildMenuSectionsFromImport } from '@/lib/importedMenu';
import { uploadImportedMenuImageToSpaces } from '@/lib/importMenuImages';

const { Text } = Typography;

const PROFILE_SECTIONS = [
  'listing',
  'photos',
  'contact',
  'address',
  'policies',
  'operations',
  'widget',
  'slug',
] as const;

type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export default function RestaurantProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [photos, setPhotos] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const { dirty, markDirty, clearDirty, onValuesChange } = useFormDirty();
  const [section, setSection] = useUrlTab({
    param: 'section',
    defaultValue: 'listing',
    allowed: PROFILE_SECTIONS,
  });
  const { data, loading: dataLoading, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (data?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [data],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const [updateRestaurant, { loading: saving }] = useMutation(UPDATE_RESTAURANT);
  const [upsertMenu] = useMutation(UPSERT_MENU);
  const { data: settingsData, refetch: refetchSettings } = useQuery(RESTAURANT_SETTINGS, {
    skip: !restaurantId,
    variables: { id: restaurantId },
  });
  const [updateSettings, { loading: savingSettings }] = useMutation(UPDATE_RESTAURANT_SETTINGS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const restaurant = (data?.myRestaurants ?? []).find(
    (r: { id: string }) => r.id === restaurantId,
  );
  const settings = settingsData?.restaurant;
  const settingsLoading = Boolean(restaurantId) && settingsData === undefined;

  useEffect(() => {
    if (!restaurant || settingsLoading) return;
    form.setFieldsValue({
      name: restaurant.name,
      description: restaurant.description ?? '',
      cuisine: restaurant.cuisine,
      priceRange: restaurant.priceRange,
      line1: restaurant.address?.line1,
      line2: restaurant.address?.line2 ?? '',
      city: restaurant.address?.city,
      state: restaurant.address?.state,
      zip: restaurant.address?.zip,
      country: restaurant.address?.country ?? 'US',
      lat: restaurant.location?.lat,
      lng: restaurant.location?.lng,
      depositRequired: restaurant.depositRequired,
      depositAmountCents: restaurant.depositAmountCents
        ? restaurant.depositAmountCents / 100
        : undefined,
      loyaltyEnabled: restaurant.loyaltyEnabled ?? false,
      loyaltyPointsPerVisit: restaurant.loyaltyPointsPerVisit ?? 50,
      loyaltyMinRedeemPoints: restaurant.loyaltyMinRedeemPoints ?? 200,
      phone: restaurant.phone ?? '',
      website: restaurant.website ?? '',
      menuUrl: restaurant.menuUrl ?? '',
      useSmartAssign: settings?.useSmartAssign ?? false,
      allowGuestTableSelection: settings?.allowGuestTableSelection ?? false,
      reservationsEnabled: settings?.reservationsEnabled ?? true,
      reservationsVisible: settings?.reservationsVisible ?? true,
      posEnabled: settings?.posEnabled ?? false,
      manualApprovalEnabled: settings?.manualApprovalEnabled ?? false,
      manualApprovalPartySizeOp: settings?.manualApprovalPartySizeOp ?? 'gte',
      manualApprovalPartySize: settings?.manualApprovalPartySize ?? undefined,
      spendAlertDollars: (settings?.spendAlertThresholdCents ?? 0) / 100,
    });
    setPhotos(restaurant.photos ?? []);
    setLogoUrl(restaurant.logoUrl ?? null);
    clearDirty();
  }, [restaurant, settings, settingsLoading, form]);

  const handleSave = async () => {
    if (!restaurantId) return;
    try {
      const values = await form.validateFields();
      const [restaurantResult, settingsResult] = await Promise.all([
        updateRestaurant({
          variables: {
            id: restaurantId,
            input: {
              name: values.name,
              description: values.description || undefined,
              cuisine: values.cuisine,
              priceRange: values.priceRange,
              address: {
                line1: values.line1,
                line2: values.line2 || undefined,
                city: values.city,
                state: values.state,
                zip: values.zip,
                country: values.country || 'US',
              },
              location: { lng: values.lng, lat: values.lat },
              depositRequired: values.depositRequired ?? false,
              depositAmountCents: Math.round((Number(values.depositAmountCents) || 0) * 100),
              loyaltyEnabled: values.loyaltyEnabled ?? false,
              loyaltyPointsPerVisit: values.loyaltyPointsPerVisit ?? 50,
              loyaltyMinRedeemPoints: values.loyaltyMinRedeemPoints ?? 200,
              phone: values.phone || undefined,
              website: values.website || undefined,
              menuUrl: values.menuUrl || undefined,
              photos,
              logoUrl: logoUrl ?? null,
            },
          },
        }),
        updateSettings({
          variables: {
            restaurantId,
            spendAlertThresholdCents: Math.round((values.spendAlertDollars ?? 0) * 100),
            useSmartAssign: values.useSmartAssign ?? false,
            allowGuestTableSelection: values.allowGuestTableSelection ?? false,
            reservationsEnabled: values.reservationsEnabled ?? true,
            reservationsVisible: values.reservationsVisible ?? true,
            posEnabled: values.posEnabled ?? false,
            manualApprovalEnabled: values.manualApprovalEnabled ?? false,
            manualApprovalPartySizeOp: values.manualApprovalPartySizeOp ?? 'gte',
            manualApprovalPartySize: values.manualApprovalEnabled
              ? values.manualApprovalPartySize ?? null
              : null,
          },
        }),
      ]);
      if (!restaurantResult.data?.updateRestaurant?.id) {
        message.error('Restaurant was not saved. Check required fields and try again.');
        return;
      }
      if (!settingsResult.data?.updateRestaurantSettings?.id) {
        message.error('Preferences were not saved. Try again.');
        return;
      }
      message.success('Restaurant updated');
      clearDirty();
      await Promise.all([refetch(), refetchSettings()]);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleOwnerImport = (data: ImportedRestaurantData) => {
    applyRestaurantImportToForm(form, data);
    markDirty();
    setSection('address');

    if (data.coverImageUrl) {
      void uploadImportedMenuImageToSpaces({
        imageUrl: data.coverImageUrl,
        filenameHint: 'restaurant-cover.jpg',
      })
        .then((photoUrl) => {
          if (!photoUrl) return;
          setPhotos((prev) => [photoUrl, ...prev.filter((url) => url !== photoUrl)]);
          markDirty();
        })
        .catch(() => {
          /* non-fatal */
        });
    }

    if (restaurantId && (data.menuItems?.length ?? 0) > 0) {
      void (async () => {
        const quickSections = await buildMenuSectionsFromImport(data);
        if (quickSections.length === 0) return;

        await upsertMenu({
          variables: {
            restaurantId,
            input: { sections: quickSections },
          },
        });
        message.success(`Imported and saved ${data.menuItems?.length ?? 0} menu items to Menu.`);
        await refetch();

        const hasImages = (data.menuItems ?? []).some((item) => Boolean(item.imageUrl));
        if (!hasImages) return;

        const withPhotos = await buildMenuSectionsFromImport(data, {
          resolvePhotoUrl: async (item, index) => {
            if (!item.imageUrl) return undefined;
            return uploadImportedMenuImageToSpaces({
              imageUrl: item.imageUrl,
              filenameHint: `menu-item-${index + 1}.jpg`,
            });
          },
        });
        await upsertMenu({
          variables: {
            restaurantId,
            input: { sections: withPhotos },
          },
        });
        await refetch();
      })().catch((err: unknown) => {
        message.warning(
          `Profile details were imported, but menu items failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      });
    }

    requestAnimationFrame(() => {
      form.scrollToField('line1', { behavior: 'smooth', block: 'center' });
    });
    message.success(`Imported "${data.name ?? 'restaurant'}" — use Address search to confirm the location, then save.`);
  };

  const detailGroups: ManageDetailGroup[] = [
    {
      key: 'listing',
      label: 'Listing',
      hint: 'Name, cuisine, and how the restaurant appears to diners.',
      icon: <ShopOutlined />,
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
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
          <Col xs={24} sm={12}>
            <Form.Item
              name="cuisine"
              label="Cuisine"
              tooltip={tips.cuisine}
              rules={[{ required: true, message: 'Cuisine is required' }]}
            >
              <CuisineSelect />
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
          <Col xs={24} sm={12}>
            <Form.Item
              name="priceRange"
              label="Price range"
              tooltip={tips.priceRange}
              rules={[{ required: true, message: 'Price range is required' }]}
            >
              <Select options={priceRangeOptions} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'photos',
      label: 'Photos',
      hint: 'Logo sits next to the name. The first photo is the hero.',
      icon: <PictureOutlined />,
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Logo"
              extra="Square mark shown next to the restaurant name on the public page."
            >
              <PhotoUpload
                value={logoUrl ? [logoUrl] : []}
                onChange={(urls) => {
                  setLogoUrl(urls[0] ?? null);
                  markDirty();
                }}
                maxCount={1}
                alt="Restaurant logo"
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="Photos"
              extra="Drag to reorder. The first photo is the large hero; the next two appear beside it on the public page."
            >
              <PhotoUpload
                value={photos}
                onChange={(urls) => {
                  setPhotos(urls);
                  markDirty();
                }}
                maxCount={10}
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      hint: 'Phone, website, and the full-menu link diners see.',
      icon: <PhoneOutlined />,
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone" rules={usPhoneRules()} tooltip={tips.phone}>
              <PhoneInput />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
              <Input placeholder="https://" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="menuUrl"
              label="Full menu URL"
              tooltip="External link for View full menu on the public restaurant page"
            >
              <Input placeholder="https://" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      hint: 'Search to fill the street fields, then adjust pin coordinates if needed.',
      icon: <EnvironmentOutlined />,
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Address search">
              <AddressAutocomplete
                style={{ width: '100%' }}
                onSelect={(selection) => {
                  form.setFieldsValue(addressSelectionToFields(selection));
                  markDirty();
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item
              name="line1"
              label="Street"
              tooltip={tips.line1}
              rules={[{ required: true, message: 'Address is required' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="line2" label="Apt / suite">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="city"
              label="City"
              tooltip={tips.city}
              rules={[{ required: true, message: 'City is required' }]}
            >
              <Input placeholder="Austin" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="state"
              label="State"
              tooltip={tips.state}
              rules={[
                { required: true, message: 'State is required' },
                { len: 2, message: 'Use 2-letter state code' },
              ]}
            >
              <Input maxLength={2} placeholder="TX" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="zip"
              label="ZIP"
              tooltip={tips.zip}
              rules={[
                { required: true, message: 'ZIP is required' },
                { min: 5, max: 10, message: 'ZIP must be 5–10 characters' },
              ]}
            >
              <Input maxLength={10} placeholder="78701" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
              <InputNumber min={-90} max={90} style={{ width: '100%' }} step={0.000001} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
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
              <InputNumber min={-180} max={180} style={{ width: '100%' }} step={0.000001} />
            </Form.Item>
          </Col>
          <Form.Item name="country" hidden>
            <Input />
          </Form.Item>
        </Row>
      ),
    },
    {
      key: 'policies',
      label: 'Booking policies',
      hint: 'Deposit and loyalty rules applied when diners book.',
      icon: <SafetyCertificateOutlined />,
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="depositRequired"
              label="Deposit required"
              valuePropName="checked"
              tooltip={tips.depositRequired}
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="depositAmountCents"
              label="Deposit amount (USD)"
              tooltip={tips.depositAmountCents}
              dependencies={['depositRequired']}
              rules={[
                { type: 'number', min: 0, message: 'Must be 0 or greater' },
                depositAmountWhenRequiredRule,
              ]}
            >
              <InputNumber min={0} precision={2} step={0.01} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="loyaltyEnabled"
              label="Loyalty program"
              valuePropName="checked"
              tooltip={tips.loyaltyEnabled}
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="loyaltyPointsPerVisit"
              label="Points per visit"
              tooltip={tips.loyaltyPointsPerVisit}
              rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="loyaltyMinRedeemPoints"
              label="Min redeem points"
              tooltip={tips.loyaltyMinRedeemPoints}
              rules={[{ type: 'number', min: 0, message: 'Must be 0 or greater' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="manualApprovalEnabled"
              label="Require manual approval"
              valuePropName="checked"
              tooltip={tips.manualApprovalEnabled}
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, next) =>
                prev.manualApprovalEnabled !== next.manualApprovalEnabled
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('manualApprovalEnabled') ? (
                  <Form.Item
                    label="Approve when party size"
                    tooltip={tips.manualApprovalPartySize}
                    extra="Leave empty to require approval for all online bookings"
                  >
                    <Space.Compact block>
                      <Form.Item name="manualApprovalPartySizeOp" noStyle initialValue="gte">
                        <Select
                          style={{ width: 72 }}
                          options={[
                            { value: 'gte', label: '≥' },
                            { value: 'gt', label: '>' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name="manualApprovalPartySize"
                        noStyle
                        rules={[
                          {
                            type: 'number',
                            min: 1,
                            max: 50,
                            message: 'Enter 1–50 or leave empty',
                          },
                        ]}
                      >
                        <InputNumber
                          min={1}
                          max={50}
                          precision={0}
                          style={{ width: '100%' }}
                          placeholder="All parties"
                        />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'operations',
      label: 'Operations',
      hint: 'Online booking, table assign, POS, and spend alerts.',
      icon: <SettingOutlined />,
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="reservationsEnabled"
              label="Accept online reservations"
              tooltip="When disabled, guests cannot make new online reservations. You can still create reservations manually from the dashboard."
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="reservationsVisible"
              label="Show booking widget"
              tooltip="When disabled, the booking form is hidden on your public profile. Useful if you want to temporarily hide reservations without fully disabling them."
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="allowGuestTableSelection"
              label="Guest table selection"
              tooltip="Let guests pick a table with photo when booking"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="useSmartAssign"
              label="Smart assign"
              tooltip={tips.useSmartAssign}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="posEnabled"
              label="POS enabled"
              tooltip={tips.posEnabled}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="spendAlertDollars"
              label="Spend alert (USD)"
              tooltip={tips.spendAlertDollars}
              extra="0 disables alerts"
              rules={[
                { type: 'number', min: 0, message: 'Enter a dollar amount (0 to disable)' },
              ]}
            >
              <InputNumber
                min={0}
                step={10}
                precision={2}
                style={{ width: '100%' }}
                prefix="$"
                placeholder="e.g. 150"
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'widget',
      label: 'Booking widget',
      hint: 'Theme for the embeddable reserve button. Share your booking page or copy the embed script below.',
      icon: <CodeOutlined />,
      children: restaurant ? (
        <WidgetThemeEditor restaurantId={restaurant.id} initialTheme={settings?.widgetTheme}>
          {(theme) => (
            <>
              <Divider style={{ margin: `${spacing.md}px 0 ${spacing.lg}px` }} />
              <BookingSharePanel
                restaurant={restaurant}
                widgetTheme={theme}
                defaultEmbedMode="inline"
              />
            </>
          )}
        </WidgetThemeEditor>
      ) : null,
    },
    {
      key: 'slug',
      label: 'Public URL',
      hint: 'Your booking page lives at /restaurants/{slug}. Request a change if you need a cleaner link.',
      icon: <LinkOutlined />,
      children: restaurant ? (
        <RestaurantSlugPanel
          restaurant={restaurant}
          canRequest={user?.role === 'restaurant_owner'}
        />
      ) : null,
    },
  ];

  if (dataLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  return (
    <div component="RestaurantProfilePage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Restaurant profile"
          subtitle="Name, location, contact, deposits, loyalty, media, booking widget, and public URL"
          extra={
            <Space wrap>
              <Button icon={<ImportOutlined />} onClick={() => setShowImport(true)}>
                Import from DoorDash / Uber Eats
              </Button>
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
            </Space>
          }
        />

        {restaurant && (
          <Card
            className="rt-surface-card"
            styles={{ body: { padding: spacing.lg } }}
            style={{ borderRadius: radii.lg }}
          >
            <Form
              form={form}
              layout="vertical"
              component="div"
              requiredMark="optional"
              onValuesChange={onValuesChange}
            >
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    loading={saving || savingSettings}
                    disabled={!dirty}
                    onClick={() => void handleSave()}
                  >
                    Save changes
                  </Button>
                </div>
                <ManageDetailGroups
                  groups={detailGroups}
                  layout="nav"
                  activeKey={section}
                  onChange={(key) => setSection(key as ProfileSection)}
                />
              </Space>
            </Form>
          </Card>
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

        <ImportRestaurantModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleOwnerImport}
          excludeRestaurantId={restaurantId}
        />
      </Space>
    </div>
  );
}
