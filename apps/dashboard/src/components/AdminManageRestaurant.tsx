'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import {
  AddressAutocomplete,
  PhoneInput,
  colors,
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import CuisineSelect from '@/components/CuisineSelect';
import { RestaurantProfileFields } from '@/components/RestaurantProfileFields';
import {
  ADMIN_ASSIGN_RESTAURANT_PACKAGE,
  ADMIN_UPDATE_RESTAURANT,
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  PLANS,
  REMOVE_USER_RESTAURANT,
  RESTAURANT_TEAM,
  SET_RESTAURANT_STATUS,
} from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import { isPlatformAdmin } from '@/lib/roles';

const { Text } = Typography;

export const RESTAURANT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const TEAM_ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'restaurant_owner', label: 'Restaurant owner' },
];

export type AdminRestaurantRecord = {
  id: string;
  name: string;
  slug?: string;
  status: string;
  cuisine: string;
  description?: string | null;
  priceRange: number;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  photos?: string[];
  ownerId: string;
  featured?: boolean;
  featuredUntil?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
  loyaltyEnabled?: boolean;
  loyaltyPointsPerVisit?: number;
  loyaltyMinRedeemPoints?: number;
  spendAlertThresholdCents?: number;
  useSmartAssign?: boolean;
  posEnabled?: boolean;
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    neighborhood?: string | null;
  };
  location?: { lat?: number; lng?: number };
  categoryIds?: string[];
  landmarkIds?: string[];
  diningStyles?: string[];
  discoveryOccasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  wheelchairAccessible?: boolean;
  faq?: Array<{ question: string; answer: string }>;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }>;
  widgetTheme?: {
    primaryColor?: string;
    buttonText?: string;
    showReviews?: boolean;
  };
  subscription?: {
    id: string;
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    monthlyPriceCents?: number;
  } | null;
};

type PlanInfo = {
  key: string;
  name: string;
  monthlyPriceCents?: number;
  trialDays?: number;
  annualFreeMonths?: number;
};

type TeamMember = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

export function PlanSelector({
  plans,
  value,
  onChange,
}: {
  plans: PlanInfo[];
  value?: string;
  onChange?: (key: string | undefined) => void;
}) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const visiblePlans = plans.filter((p) => p.key !== 'free' && (p as { isCustom?: boolean }).isCustom !== true);

  const annualMonthlyPrice = (monthly: number, freeMonths: number) => {
    const paidMonths = 12 - freeMonths;
    return Math.round((monthly * paidMonths) / 12);
  };
  const annualTotalPrice = (monthly: number, freeMonths: number) => monthly * (12 - freeMonths);

  const annualDiscountPercent = (freeMonths: number) => Math.round((freeMonths / 12) * 100);

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      cents / 100,
    );

  const activePlan = visiblePlans.find((p) => p.key === value);
  const trialDays = activePlan?.trialDays ?? 0;
  const trialEndLabel =
    trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  const selectedMonthlyPriceCents =
    activePlan && billing === 'annual'
      ? annualMonthlyPrice(activePlan.monthlyPriceCents ?? 0, activePlan.annualFreeMonths ?? 2)
      : activePlan?.monthlyPriceCents ?? 0;
  const selectedAnnualPriceCents =
    activePlan && billing === 'annual'
      ? annualTotalPrice(activePlan.monthlyPriceCents ?? 0, activePlan.annualFreeMonths ?? 2)
      : 0;
  const regularAnnualPriceCents = (activePlan?.monthlyPriceCents ?? 0) * 12;
  const annualSavingsCents =
    billing === 'annual' ? Math.max(0, regularAnnualPriceCents - selectedAnnualPriceCents) : 0;
  const selectedFreeMonths = activePlan?.annualFreeMonths ?? 2;

  const packageLabel = activePlan
    ? `${activePlan.name} — ${
        billing === 'annual'
          ? `${selectedAnnualPriceCents > 0 ? fmt(selectedAnnualPriceCents) : 'Free'}/year`
          : `${selectedMonthlyPriceCents > 0 ? fmt(selectedMonthlyPriceCents) : 'Free'}/mo`
      }`
    : undefined;

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Segmented
        block
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: `Annual (${annualDiscountPercent(visiblePlans[0]?.annualFreeMonths ?? 2)}% off)`, value: 'annual' },
        ]}
        value={billing}
        onChange={(v) => setBilling(v as 'monthly' | 'annual')}
      />

      <Form.Item label="Subscription plan" style={{ marginBottom: 0 }}>
        <Select
          value={value}
          onChange={(next) => onChange?.(next)}
          allowClear
          placeholder="Assign now or later"
          options={[
            ...visiblePlans.map((plan) => {
              const monthly = plan.monthlyPriceCents ?? 0;
              const freeMonths = plan.annualFreeMonths ?? 2;
              const effectiveMonthly = billing === 'annual' ? annualMonthlyPrice(monthly, freeMonths) : monthly;
              const effectiveAnnual = annualTotalPrice(monthly, freeMonths);
              return {
                value: plan.key,
                label:
                  billing === 'annual'
                    ? `${plan.name} — ${monthly === 0 ? 'Free' : `${fmt(effectiveAnnual)}/year`}`
                    : `${plan.name} — ${monthly === 0 ? 'Free' : `${fmt(effectiveMonthly)}/mo`}`,
              };
            }),
          ]}
        />
      </Form.Item>

      {activePlan ? (
        <div
          style={{
            border: '1px solid #ece7df',
            borderRadius: 10,
            background: '#f8f6f3',
            padding: '14px 16px',
          }}
        >
          <Space orientation="vertical" size={2}>
            <Text strong style={{ fontSize: 20, lineHeight: '28px' }}>
              {activePlan.name}
            </Text>
            {billing === 'annual' && regularAnnualPriceCents > selectedAnnualPriceCents ? (
              <Text delete type="secondary" style={{ fontSize: 24, lineHeight: '28px' }}>
                {fmt(regularAnnualPriceCents)}/yr
              </Text>
            ) : null}
            <Text strong style={{ fontSize: 36, lineHeight: '40px' }}>
              {billing === 'annual'
                ? selectedAnnualPriceCents > 0
                  ? fmt(selectedAnnualPriceCents)
                  : 'Free'
                : selectedMonthlyPriceCents > 0
                  ? fmt(selectedMonthlyPriceCents)
                  : 'Free'}
              <Text type="secondary" style={{ fontSize: 24, fontWeight: 500 }}>
                {billing === 'annual' ? '/ year' : '/ month'}
              </Text>
            </Text>
            {billing === 'annual' && selectedMonthlyPriceCents > 0 ? (
              <Text type="secondary" style={{ fontSize: 24, lineHeight: '30px' }}>
                {fmt(selectedMonthlyPriceCents)}/mo equivalent, billed annually
              </Text>
            ) : (
              <Text type="secondary">{packageLabel}</Text>
            )}
            {billing === 'annual' && annualSavingsCents > 0 ? (
              <Text style={{ color: '#389e0d', fontWeight: 600, fontSize: 24, lineHeight: '30px' }}>
                Save {fmt(annualSavingsCents)}/year ({annualDiscountPercent(selectedFreeMonths)}% off vs paying monthly)
              </Text>
            ) : null}
            <Text type="secondary">{activePlan.name} package</Text>
            {billing === 'annual' && selectedFreeMonths > 0 ? (
              <Tag color="gold" bordered={false} style={{ width: 'fit-content' }}>
                {selectedFreeMonths} months free on annual
              </Tag>
            ) : null}
            {trialDays > 0 ? (
              <Tag color="green" bordered={false} style={{ width: 'fit-content' }}>
                Free {trialDays}-day trial
              </Tag>
            ) : null}
            {trialEndLabel ? (
              <Text type="secondary">You will not be charged until {trialEndLabel}.</Text>
            ) : null}
          </Space>
        </div>
      ) : null}
    </Space>
  );
}

function buildRestaurantInput(values: Record<string, unknown>, photoList: string[]) {
  return {
    name: values.name,
    description: values.description || undefined,
    cuisine: values.cuisine,
    priceRange: values.priceRange,
    phone: values.phone || undefined,
    website: values.website || undefined,
    menuUrl: values.menuUrl || undefined,
    depositRequired: Boolean(values.depositRequired),
    depositAmountCents: Math.round((Number(values.depositAmountCents) || 0) * 100),
    loyaltyEnabled: Boolean(values.loyaltyEnabled),
    loyaltyPointsPerVisit: Number(values.loyaltyPointsPerVisit) || 50,
    loyaltyMinRedeemPoints: Number(values.loyaltyMinRedeemPoints) || 200,
    photos: photoList,
    address: {
      line1: values.line1,
      line2: values.line2 || undefined,
      city: values.city,
      state: values.state,
      zip: values.zip,
      country: values.country || 'US',
    },
    location: {
      lat: Number(values.lat),
      lng: Number(values.lng),
    },
    neighborhood: values.neighborhood || undefined,
    categoryIds: values.categoryIds ?? [],
    landmarkIds: values.landmarkIds ?? [],
    diningStyles: values.diningStyles ?? [],
    discoveryOccasions: values.discoveryOccasions ?? [],
    meals: values.meals ?? [],
    dietaryTags: values.dietaryTags ?? [],
    amenities: values.amenities ?? [],
    wheelchairAccessible: Boolean(values.wheelchairAccessible),
    faq: (values.faq as Array<{ question: string; answer: string }> | undefined) ?? [],
    featuredIn:
      (values.featuredIn as Array<{
        title: string;
        description?: string;
        url?: string;
        logoUrl?: string;
      }> | undefined) ?? [],
  };
}

type AdminManageRestaurantProps = {
  restaurant: AdminRestaurantRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (restaurant: AdminRestaurantRecord) => void;
  /** modal (list Edit), drawer (preview), or panel (inline on detail page) */
  presentation?: 'modal' | 'drawer' | 'panel';
};

export function AdminManageRestaurant({
  restaurant,
  open,
  onClose,
  onSaved,
  presentation = 'modal',
}: AdminManageRestaurantProps) {
  const [editTab, setEditTab] = useState('details');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [selectedRestaurantStatus, setSelectedRestaurantStatus] = useState<string>();
  const [assignUserId, setAssignUserId] = useState<string>();
  const [assignRole, setAssignRole] = useState('staff');
  const [form] = Form.useForm();

  const active = presentation === 'panel' ? Boolean(restaurant?.id) : open;

  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !active,
    variables: { limit: 500, offset: 0 },
  });
  const { data: plansData } = useQuery(PLANS, { skip: !active });
  const { data: teamData, refetch: refetchTeam } = useQuery(RESTAURANT_TEAM, {
    skip: !active || !restaurant?.id,
    variables: { restaurantId: restaurant?.id ?? '' },
  });

  const [updateRestaurant, { loading: saving }] = useMutation(ADMIN_UPDATE_RESTAURANT);
  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [assignPackage, { loading: assigningPlan }] = useMutation(ADMIN_ASSIGN_RESTAURANT_PACKAGE);
  const [assignUserRestaurants, { loading: assigningUser }] = useMutation(ASSIGN_USER_RESTAURANTS);
  const [removeUserRestaurant] = useMutation(REMOVE_USER_RESTAURANT);

  const plans = (plansData?.plans ?? []) as PlanInfo[];

  const ownerOptions = (usersData?.adminUsers?.items ?? [])
    .filter(
      (u: { role: string }) =>
        u.role === 'restaurant_owner' || isPlatformAdmin(u.role) || u.role === 'staff',
    )
    .map((u: { id: string; firstName: string; lastName: string; email?: string }) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
    }));

  const assignableUserOptions = (usersData?.adminUsers?.items ?? [])
    .filter((u: { id: string; role: string }) => {
      if (isPlatformAdmin(u.role)) return false;
      const teamIds = (teamData?.restaurantTeam ?? []).map((m: { id: string }) => m.id);
      return !teamIds.includes(u.id);
    })
    .map((u: { id: string; firstName: string; lastName: string; email?: string; role: string }) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''} — ${u.role}`,
    }));

  useEffect(() => {
    if (!active || !restaurant) return;
    setEditTab('details');
    setPhotos(restaurant.photos ?? []);
    setSelectedPlan(restaurant.subscription?.plan);
    setSelectedRestaurantStatus(restaurant.status);
    setAssignUserId(undefined);
    setAssignRole('staff');
    form.setFieldsValue({
      name: restaurant.name,
      description: restaurant.description ?? '',
      cuisine: restaurant.cuisine,
      priceRange: restaurant.priceRange,
      phone: restaurant.phone ?? '',
      website: restaurant.website ?? '',
      menuUrl: restaurant.menuUrl ?? '',
      depositRequired: restaurant.depositRequired,
      depositAmountCents: restaurant.depositAmountCents
        ? restaurant.depositAmountCents / 100
        : undefined,
      loyaltyEnabled: Boolean(restaurant.loyaltyEnabled),
      loyaltyPointsPerVisit: restaurant.loyaltyPointsPerVisit ?? 50,
      loyaltyMinRedeemPoints: restaurant.loyaltyMinRedeemPoints ?? 200,
      featured: Boolean(restaurant.featured),
      ownerId: restaurant.ownerId,
      line1: restaurant.address?.line1,
      line2: restaurant.address?.line2 ?? '',
      city: restaurant.address?.city,
      state: restaurant.address?.state,
      zip: restaurant.address?.zip,
      country: restaurant.address?.country ?? 'US',
      lat: restaurant.location?.lat,
      lng: restaurant.location?.lng,
      useSmartAssign: restaurant.useSmartAssign ?? false,
      posEnabled: restaurant.posEnabled ?? false,
      spendAlertDollars: (restaurant.spendAlertThresholdCents ?? 0) / 100,
      primaryColor: restaurant.widgetTheme?.primaryColor ?? colors.brand[600],
      buttonText: restaurant.widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: restaurant.widgetTheme?.showReviews ?? true,
      neighborhood: restaurant.address?.neighborhood ?? '',
      categoryIds: restaurant.categoryIds ?? [],
      landmarkIds: restaurant.landmarkIds ?? [],
      diningStyles: restaurant.diningStyles ?? [],
      discoveryOccasions: restaurant.discoveryOccasions ?? [],
      meals: restaurant.meals ?? [],
      dietaryTags: restaurant.dietaryTags ?? [],
      amenities: restaurant.amenities ?? [],
      wheelchairAccessible: restaurant.wheelchairAccessible ?? false,
      faq: (restaurant.faq ?? []).map((item) => ({ question: item.question, answer: item.answer })),
      featuredIn: (restaurant.featuredIn ?? []).map((item) => ({
        title: item.title,
        description: item.description ?? '',
        url: item.url ?? '',
        logoUrl: item.logoUrl ?? '',
      })),
    });
  }, [active, restaurant, form]);

  const onSave = async () => {
    if (!restaurant) return;
    try {
      const values = await form.validateFields();
      const result = await updateRestaurant({
        variables: {
          id: restaurant.id,
          featured: values.featured,
          ownerId: values.ownerId,
          spendAlertThresholdCents: Math.round((Number(values.spendAlertDollars) || 0) * 100),
          useSmartAssign: Boolean(values.useSmartAssign),
          posEnabled: Boolean(values.posEnabled),
          widgetTheme: {
            primaryColor: values.primaryColor,
            buttonText: values.buttonText,
            showReviews: Boolean(values.showReviews),
          },
          input: buildRestaurantInput(values, photos),
        },
      });
      message.success('Restaurant updated');
      const updated = result.data?.adminUpdateRestaurant as AdminRestaurantRecord | undefined;
      if (updated) onSaved?.(updated);
      else onSaved?.(restaurant);
      if (presentation !== 'panel') onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update restaurant');
    }
  };

  const applyPackageAndStatus = async () => {
    if (!restaurant) return;
    try {
      let hasChanges = false;
      let next: AdminRestaurantRecord = { ...restaurant };

      if (selectedPlan) {
        const previousEnd = restaurant.subscription?.currentPeriodEnd;
        const result = await assignPackage({
          variables: { restaurantId: restaurant.id, plan: selectedPlan },
        });
        const sub = result.data?.adminAssignRestaurantPackage;
        if (sub) {
          next = {
            ...next,
            subscription: {
              id: sub.id,
              plan: sub.plan,
              status: sub.status,
              monthlyPriceCents: sub.monthlyPriceCents,
              currentPeriodStart: sub.currentPeriodStart,
              currentPeriodEnd: sub.currentPeriodEnd,
              trialEndsAt: sub.trialEndsAt,
            },
          };
          const extended =
            previousEnd &&
            sub.currentPeriodEnd &&
            dayjs(sub.currentPeriodEnd).isAfter(dayjs(previousEnd));
          message.success(
            restaurant.subscription
              ? extended
                ? 'Package updated and billing period extended'
                : 'Package updated'
              : 'Package assigned',
          );
        } else {
          message.success('Package updated');
        }
        hasChanges = true;
      }

      if (selectedRestaurantStatus && selectedRestaurantStatus !== restaurant.status) {
        await setStatus({ variables: { id: restaurant.id, status: selectedRestaurantStatus } });
        message.success('Status updated');
        next = { ...next, status: selectedRestaurantStatus };
        hasChanges = true;
      }

      if (!hasChanges) {
        message.info('Select a package or status to update');
        return;
      }

      onSaved?.(next);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update package or status');
    }
  };

  const handleAssignUser = async () => {
    if (!restaurant || !assignUserId) return;
    try {
      await assignUserRestaurants({
        variables: {
          userId: assignUserId,
          restaurantIds: [restaurant.id],
          role: assignRole,
        },
      });
      message.success('Account assigned');
      setAssignUserId(undefined);
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to assign account');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!restaurant) return;
    try {
      await removeUserRestaurant({
        variables: { userId, restaurantId: restaurant.id },
      });
      message.success('Account removed');
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  const updateDisabled = !selectedPlan || !selectedRestaurantStatus;

  const body = (
    <Tabs
      activeKey={editTab}
      onChange={setEditTab}
      items={[
        {
          key: 'details',
          label: 'Details',
          children: (
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="Name" rules={[{ required: true }]} tooltip={tips.name}>
                    <Input maxLength={120} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cuisine" label="Cuisine" rules={[{ required: true }]} tooltip={tips.cuisine}>
                    <CuisineSelect />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description" label="Description" tooltip={tips.description}>
                    <Input.TextArea rows={3} maxLength={2000} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="priceRange" label="Price range" rules={[{ required: true }]} tooltip={tips.priceRange}>
                    <Select options={priceRangeOptions} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })} tooltip={tips.phone}>
                    <PhoneInput />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="website" label="Website" tooltip={tips.website}>
                    <Input placeholder="https://" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="menuUrl"
                    label="Full menu URL"
                    tooltip="External link for View full menu on the public restaurant page"
                  >
                    <Input placeholder="https://" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="ownerId" label="Owner" rules={[{ required: true }]}>
                    <Select
                      options={ownerOptions}
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select owner account"
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Photos">
                    <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Address search">
                    <AddressAutocomplete
                      onSelect={(selection) => {
                        form.setFieldsValue(addressSelectionToFields(selection));
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="line1" label="Street" rules={[{ required: true }]} tooltip={tips.line1}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="line2" label="Apt / suite">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="city" label="City" rules={[{ required: true }]} tooltip={tips.city}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="state" label="State" rules={[{ required: true }]} tooltip={tips.state}>
                    <Input maxLength={2} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="zip" label="ZIP" rules={[{ required: true }]} tooltip={tips.zip}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="lat" label="Latitude" rules={[{ required: true }]} tooltip={tips.lat}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="lng" label="Longitude" rules={[{ required: true }]} tooltip={tips.lng}>
                    <InputNumber style={{ width: '100%' }} step={0.000001} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="depositRequired"
                    label="Deposit required"
                    valuePropName="checked"
                    tooltip={tips.depositRequired}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="depositAmountCents" label="Deposit amount (USD)" tooltip={tips.depositAmountCents}>
                    <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="loyaltyEnabled"
                    label="Loyalty program"
                    valuePropName="checked"
                    tooltip={tips.loyaltyEnabled}
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="loyaltyPointsPerVisit" label="Points per visit" tooltip={tips.loyaltyPointsPerVisit}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="loyaltyMinRedeemPoints" label="Min redeem points" tooltip={tips.loyaltyMinRedeemPoints}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="featured" label="Featured listing" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="useSmartAssign" label="Smart assign" valuePropName="checked" tooltip={tips.useSmartAssign}>
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="posEnabled" label="POS enabled" valuePropName="checked" tooltip={tips.posEnabled}>
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="spendAlertDollars" label="Spend alert (USD)" tooltip={tips.spendAlertDollars}>
                    <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="primaryColor" label="Widget color" tooltip={tips.primaryColor}>
                    <Input placeholder="#0b3d2e" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="buttonText" label="Widget button text" tooltip={tips.buttonText}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="showReviews" label="Show reviews on widget" valuePropName="checked" tooltip={tips.showReviews}>
                    <Switch />
                  </Form.Item>
                </Col>
                <Form.Item name="country" hidden>
                  <Input />
                </Form.Item>
              </Row>
            </Form>
          ),
        },
        {
          key: 'profile',
          label: 'Public profile',
          children: (
            <Form form={form} layout="vertical">
              <RestaurantProfileFields />
            </Form>
          ),
        },
        {
          key: 'package',
          label: 'Package',
          children: (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {restaurant?.subscription ? (
                <div
                  style={{
                    border: '1px solid #ece7df',
                    borderRadius: 10,
                    background: '#f8f6f3',
                    padding: '12px 14px',
                  }}
                >
                  <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                      Current package dates
                    </Text>
                    {restaurant.subscription.status === 'trialing' &&
                    restaurant.subscription.trialEndsAt ? (
                      <Text>
                        Trial ends{' '}
                        <Text strong>
                          {dayjs(restaurant.subscription.trialEndsAt).format('MMM D, YYYY')}
                        </Text>
                      </Text>
                    ) : null}
                    {restaurant.subscription.currentPeriodEnd ? (
                      <Text>
                        {restaurant.subscription.status === 'trialing'
                          ? 'Billing period ends'
                          : 'Next pay / renews'}{' '}
                        <Text strong>
                          {dayjs(restaurant.subscription.currentPeriodEnd).format('MMM D, YYYY')}
                        </Text>
                        {restaurant.subscription.currentPeriodStart ? (
                          <Text type="secondary">
                            {' '}
                            (started {dayjs(restaurant.subscription.currentPeriodStart).format('MMM D, YYYY')})
                          </Text>
                        ) : null}
                      </Text>
                    ) : (
                      <Text type="secondary">No billing period on file yet.</Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Updating the package extends the period by one billing cycle from the later of today
                      or the current end date.
                    </Text>
                  </Space>
                </div>
              ) : (
                <Text type="secondary">No package assigned yet. Choose a plan below to assign one.</Text>
              )}
              <Form layout="vertical">
                <Form.Item label="Package" required style={{ marginBottom: spacing.md }}>
                  <PlanSelector plans={plans} value={selectedPlan} onChange={setSelectedPlan} />
                </Form.Item>
                <Form.Item label="Restaurant status" required style={{ marginBottom: spacing.md }}>
                  <Select
                    value={selectedRestaurantStatus}
                    onChange={setSelectedRestaurantStatus}
                    options={RESTAURANT_STATUS_OPTIONS}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  loading={assigningPlan}
                  disabled={updateDisabled}
                  onClick={applyPackageAndStatus}
                >
                  Update package & status
                </Button>
              </Form>
            </Space>
          ),
        },
        {
          key: 'team',
          label: 'Accounts',
          children: (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <Table<TeamMember>
                size="small"
                rowKey="id"
                dataSource={(teamData?.restaurantTeam ?? []) as TeamMember[]}
                pagination={false}
                columns={[
                  {
                    title: 'Name',
                    render: (_: unknown, member) => `${member.firstName} ${member.lastName}`,
                  },
                  { title: 'Email', dataIndex: 'email' },
                  {
                    title: 'Role',
                    dataIndex: 'role',
                    render: (role: string, record) => (
                      <Space>
                        <Tag>{role}</Tag>
                        {record.id === restaurant?.ownerId && <Tag color="blue">Owner</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: '',
                    width: 100,
                    render: (_: unknown, record) =>
                      record.id !== restaurant?.ownerId ? (
                        <Button size="small" danger onClick={() => handleRemoveUser(record.id)}>
                          Remove
                        </Button>
                      ) : null,
                  },
                ]}
              />
              <Divider plain>Assign account</Divider>
              <Space wrap align="start">
                <Select
                  style={{ width: 280 }}
                  placeholder="Select user to assign"
                  value={assignUserId}
                  onChange={setAssignUserId}
                  options={assignableUserOptions}
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  style={{ width: 160 }}
                  value={assignRole}
                  onChange={setAssignRole}
                  options={TEAM_ROLE_OPTIONS}
                />
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={assigningUser}
                  disabled={!assignUserId}
                  onClick={handleAssignUser}
                >
                  Assign
                </Button>
              </Space>
            </Space>
          ),
        },
      ]}
    />
  );

  const footer =
    editTab === 'details' || editTab === 'profile' ? (
      <Space>
        {presentation !== 'panel' ? <Button onClick={onClose}>Cancel</Button> : null}
        <Button type="primary" loading={saving} onClick={onSave}>
          Save changes
        </Button>
      </Space>
    ) : presentation !== 'panel' ? (
      <Button onClick={onClose}>Close</Button>
    ) : null;

  const title = restaurant ? `Manage — ${restaurant.name}` : 'Manage restaurant';

  if (presentation === 'panel') {
    if (!restaurant) return null;
    return (
      <div component="AdminManageRestaurantPanel">
        {body}
        {footer ? <div style={{ marginTop: spacing.md }}>{footer}</div> : null}
      </div>
    );
  }

  if (presentation === 'drawer') {
    return (
      <Drawer
        title={title}
        open={open}
        onClose={onClose}
        width={720}
        destroyOnClose
        footer={footer}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={800}
      destroyOnClose
      footer={footer}
    >
      {body}
    </Modal>
  );
}
