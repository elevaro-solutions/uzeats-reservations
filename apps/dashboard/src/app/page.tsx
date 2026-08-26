'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NetworkStatus } from '@apollo/client';
import { useQuery, useMutation } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Steps,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ImportOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  RESTAURANT_STATUSES,
  formatPlanDollars,
  getAnnualSavingsPercentFromSettings,
  getPlanDiscountLabel,
  getPlanPriceDisplay,
  normalizeAnnualBillingSettings,
  planForBillingPeriod,
  type AnnualBillingSettings,
} from '@reservations/shared';
import {
  AddressAutocomplete,
  EmptyState,
  PageHeader,
  PhoneInput,
  PlanPrice,
  StatusTag,
  colors,
  radii,
  spacing,
  typography,
  usPhoneRules,
  type BillingPeriod,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin, canCreateRestaurant } from '@/lib/roles';
import {
  MY_RESTAURANTS_OVERVIEW,
  MY_RESTAURANT_LOCATIONS_META,
  CREATE_RESTAURANT,
  PLANS,
  UPSERT_MENU,
} from '@/lib/graphql';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import {
  MANY_LOCATIONS_THRESHOLD,
  type OwnerRestaurant,
} from '@/lib/restaurants';
import ImportRestaurantModal, { type ImportedRestaurantData } from '@/components/ImportRestaurantModal';
import CuisineSelect from '@/components/CuisineSelect';
import PhotoUpload from '@/components/PhotoUpload';
import { applyRestaurantImportToForm } from '@/lib/applyRestaurantImport';
import { buildMenuSectionsFromImport } from '@/lib/importedMenu';
import { uploadImportedMenuImageToSpaces } from '@/lib/importMenuImages';

const { Text, Title } = Typography;

const CREATE_STEPS = [
  { title: 'Details' },
  { title: 'Location' },
  { title: 'Package' },
  { title: 'Review' },
];

const DETAILS_STEP_FIELDS = [
  'name',
  'cuisine',
  'priceRange',
  'phone',
  'website',
] as const;

const LOCATION_STEP_FIELDS = [
  'line1',
  'city',
  'state',
  'zip',
  'lat',
  'lng',
] as const;

type OverviewViewMode = 'cards' | 'table';

const OVERVIEW_VIEW_STORAGE_KEY = 'rt-overview-view';

function readOverviewViewMode(): OverviewViewMode {
  if (typeof window === 'undefined') return 'cards';
  const stored = localStorage.getItem(OVERVIEW_VIEW_STORAGE_KEY);
  return stored === 'table' ? 'table' : 'cards';
}

function selectRestaurant(id: string) {
  localStorage.setItem('activeRestaurantId', id);
  window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: id }));
}

type PlanOption = {
  key: string;
  name: string;
  priceLabel: string;
  blurb: string;
  trialDays: number;
  discountLabel: string | null;
  pricing: {
    monthlyPriceCents: number;
    originalMonthlyPriceCents?: number | null;
    discountType?: string | null;
    discountPercent?: number | null;
    discountAmountCents?: number | null;
    annualFreeMonths?: number | null;
  };
};

const FALLBACK_PLAN_OPTIONS: Omit<PlanOption, 'priceLabel' | 'discountLabel'>[] = [
  {
    key: 'basic',
    name: 'Basic',
    blurb: 'Essential reservation management to get started.',
    trialDays: 30,
    pricing: { monthlyPriceCents: 4900 },
  },
  {
    key: 'core',
    name: 'Core',
    blurb: 'Table management, waitlist, and free website covers.',
    trialDays: 30,
    pricing: { monthlyPriceCents: 9900 },
  },
  {
    key: 'pro',
    name: 'Pro',
    blurb: 'Full suite with guest insights, campaigns, and SMS.',
    trialDays: 30,
    pricing: { monthlyPriceCents: 19900 },
  },
];

function toPlanOption(
  plan: Omit<PlanOption, 'priceLabel' | 'discountLabel'>,
  billingPeriod: BillingPeriod,
  annualBilling: AnnualBillingSettings,
): PlanOption {
  const periodPricing = planForBillingPeriod(plan.pricing, billingPeriod, {
    annualBilling,
    planKey: plan.key,
  });
  const display = getPlanPriceDisplay(periodPricing);
  const suffix = display.primarySuffix.includes('year') ? '/yr' : '/mo';
  return {
    ...plan,
    priceLabel: `${formatPlanDollars(display.primaryCents)}${suffix}`,
    discountLabel: getPlanDiscountLabel(periodPricing),
  };
}

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [createRestaurant, { loading: creating }] = useMutation(CREATE_RESTAURANT);
  const [upsertMenu] = useMutation(UPSERT_MENU);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('core');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [photos, setPhotos] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [pendingImportedMenuSections, setPendingImportedMenuSections] = useState<
    Awaited<ReturnType<typeof buildMenuSectionsFromImport>>
  >([]);
  const pendingImportDataRef = useRef<ImportedRestaurantData | null>(null);
  const lastGeocodedCreateAddressRef = useRef('');
  const [viewMode, setViewMode] = useState<OverviewViewMode>(() => readOverviewViewMode());
  const createLine1 = Form.useWatch('line1', createForm);
  const createCity = Form.useWatch('city', createForm);
  const createState = Form.useWatch('state', createForm);
  const createZip = Form.useWatch('zip', createForm);
  const {
    search: searchInput,
    searchQuery,
    status: statusFilter,
    city: cityFilter,
    setSearch,
    setStatus: setStatusFilter,
    setCity: setCityFilter,
  } = useUrlListFilters({ search: 'q', status: 'status', city: 'city' });
  const { data: metaData, refetch: refetchMeta } = useQuery(MY_RESTAURANT_LOCATIONS_META, {
    skip: !user,
  });
  const { data, refetch, loading: restaurantsLoading, networkStatus } = useQuery(
    MY_RESTAURANTS_OVERVIEW,
    {
      skip: !user,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      variables: {
        search: searchQuery || undefined,
        status: statusFilter,
        city: cityFilter,
      },
    },
  );
  const { data: plansData } = useQuery(PLANS, { skip: !user });

  const closeCreateForm = () => {
    setShowCreate(false);
    setCreateStep(0);
    setSelectedPlan('core');
    setBillingPeriod('monthly');
    setPhotos([]);
    createForm.resetFields();
    setPendingImportedMenuSections([]);
    pendingImportDataRef.current = null;
    lastGeocodedCreateAddressRef.current = '';
  };

  const openCreateForm = (step = 0) => {
    setCreateStep(step);
    setShowCreate(true);
  };

  useEffect(() => {
    if (!showCreate) return;

    const line1 = String(createLine1 ?? '').trim();
    const city = String(createCity ?? '').trim();
    const state = String(createState ?? '').trim().toUpperCase();
    const zip = String(createZip ?? '').trim();
    const hasFullAddress = line1 && city && state && zip;
    if (!hasFullAddress) return;

    const normalizedAddress = `${line1}, ${city}, ${state} ${zip}`;
    if (normalizedAddress === lastGeocodedCreateAddressRef.current) return;

    createForm.setFieldsValue({ lat: undefined, lng: undefined });

    const timer = setTimeout(() => {
      const googleMaps = (window as Window & { google?: any }).google?.maps;
      if (!googleMaps?.Geocoder) return;

      const geocoder = new googleMaps.Geocoder();
      geocoder.geocode(
        { address: normalizedAddress },
        (
          results: Array<{ geometry?: { location?: { lat: () => number; lng: () => number } } }>,
          status: string,
        ) => {
          if (status !== 'OK') return;
          const location = results?.[0]?.geometry?.location;
          if (!location) return;
          lastGeocodedCreateAddressRef.current = normalizedAddress;
          createForm.setFieldsValue({
            lat: Number(location.lat().toFixed(6)),
            lng: Number(location.lng().toFixed(6)),
          });
        },
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [showCreate, createLine1, createCity, createState, createZip, createForm]);

  const handleOwnerImport = (data: ImportedRestaurantData) => {
    applyRestaurantImportToForm(createForm, data);
    pendingImportDataRef.current = data;

    if (data.coverImageUrl) {
      void uploadImportedMenuImageToSpaces({
        imageUrl: data.coverImageUrl,
        filenameHint: 'restaurant-cover.jpg',
      })
        .then((photoUrl) => {
          if (!photoUrl) return;
          setPhotos((prev) => [photoUrl, ...prev.filter((url) => url !== photoUrl)]);
        })
        .catch(() => {
          /* non-fatal */
        });
    }

    // Details is step 1 — review imported fields, then continue to location / package.
    openCreateForm(0);

    void (async () => {
      const quickSections = await buildMenuSectionsFromImport(data);
      setPendingImportedMenuSections(quickSections);

      const hasImages = (data.menuItems ?? []).some((item) => Boolean(item.imageUrl));
      if (!hasImages || quickSections.length === 0) return;

      const withPhotos = await buildMenuSectionsFromImport(data, {
        resolvePhotoUrl: async (item, index) => {
          if (!item.imageUrl) return undefined;
          return uploadImportedMenuImageToSpaces({
            imageUrl: item.imageUrl,
            filenameHint: `menu-item-${index + 1}.jpg`,
          });
        },
      });
      if (pendingImportDataRef.current === data) {
        setPendingImportedMenuSections(withPhotos);
      }
    })();

    message.success(
      `Imported "${data.name ?? 'restaurant'}" — review details, then continue to package.`,
    );
  };

  const submitCreateRestaurant = async () => {
    try {
      await createForm.validateFields([
        ...DETAILS_STEP_FIELDS,
        ...LOCATION_STEP_FIELDS,
        'plan',
        'description',
        'depositRequired',
        'depositAmountCents',
        'loyaltyEnabled',
        'loyaltyPointsPerVisit',
        'loyaltyMinRedeemPoints',
      ]);
      const values = createForm.getFieldsValue(true);

      const importData = pendingImportDataRef.current;
      let menuSections = pendingImportedMenuSections;
      if (menuSections.length === 0 && (importData?.menuItems?.length ?? 0) > 0) {
        menuSections = await buildMenuSectionsFromImport(importData!);
      }

      const { data } = await createRestaurant({
        variables: {
          plan: values.plan,
          input: {
            name: values.name,
            description: values.description || undefined,
            cuisine: values.cuisine,
            priceRange: values.priceRange,
            phone: values.phone || undefined,
            website: values.website || undefined,
            menuUrl: values.menuUrl || undefined,
            photos,
            address: {
              line1: values.line1,
              city: values.city,
              state: values.state,
              zip: values.zip,
              country: 'US',
            },
            location: { lng: values.lng, lat: values.lat },
            depositRequired: Boolean(values.depositRequired),
            depositAmountCents: Math.round((Number(values.depositAmountCents) || 0) * 100),
            loyaltyEnabled: Boolean(values.loyaltyEnabled),
            loyaltyPointsPerVisit: Number(values.loyaltyPointsPerVisit) || 50,
            loyaltyMinRedeemPoints: Number(values.loyaltyMinRedeemPoints) || 200,
          },
        },
      });
      const created = data?.createRestaurant;

      if (created?.id && menuSections.length > 0) {
        try {
          await upsertMenu({
            variables: {
              restaurantId: created.id,
              input: { sections: menuSections },
            },
          });
        } catch (menuErr: unknown) {
          message.warning(
            `Restaurant created, but menu import failed: ${
              menuErr instanceof Error ? menuErr.message : 'Unknown error'
            }`,
          );
        }
      }

      const confirmedPlan =
        planOptions.find((p) => p.key === values.plan) ?? planInfo;
      localStorage.setItem('activeRestaurantId', created.id);
      window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: created.id }));
      message.success(
        confirmedPlan.trialDays > 0
          ? `${created.name} submitted — ${confirmedPlan.name} trial started`
          : `${created.name} submitted — ${confirmedPlan.name} plan active`,
      );
      closeCreateForm();
      await Promise.all([refetch(), refetchMeta()]);
      router.push('/onboarding');
    } catch (err) {
      const errorFields =
        err && typeof err === 'object' && 'errorFields' in err
          ? (err as { errorFields?: { name: (string | number)[] }[] }).errorFields
          : undefined;
      if (errorFields?.length) {
        const names = new Set(errorFields.flatMap((f) => f.name.map(String)));
        if (DETAILS_STEP_FIELDS.some((f) => names.has(f))) setCreateStep(0);
        else if (LOCATION_STEP_FIELDS.some((f) => names.has(f))) setCreateStep(1);
        else if (names.has('plan')) setCreateStep(2);
        else setCreateStep(3);
        return;
      }
      message.error(err instanceof Error ? err.message : 'Failed to add restaurant');
    }
  };

  const goCreateNext = async () => {
    try {
      if (createStep === 0) {
        await createForm.validateFields([...DETAILS_STEP_FIELDS]);
      } else if (createStep === 1) {
        await createForm.validateFields([...LOCATION_STEP_FIELDS]);
      } else if (createStep === 2) {
        await createForm.validateFields(['plan']);
      }
      setCreateStep((step) => Math.min(step + 1, CREATE_STEPS.length - 1));
    } catch {
      /* validation errors shown by Form */
    }
  };

  const goCreateBack = () => setCreateStep((step) => Math.max(step - 1, 0));

  const annualBilling: AnnualBillingSettings = useMemo(
    () =>
      normalizeAnnualBillingSettings(
        (plansData as { annualBillingSettings?: AnnualBillingSettings })?.annualBillingSettings,
      ),
    [plansData],
  );

  const planOptions = useMemo((): PlanOption[] => {
    const fromApi = ((plansData as { plans?: Array<{
      key: string;
      name: string;
      description?: string | null;
      monthlyPriceCents: number;
      originalMonthlyPriceCents?: number | null;
      discountType?: string | null;
      discountPercent?: number | null;
      discountAmountCents?: number | null;
      annualFreeMonths?: number | null;
      trialDays: number;
      isCustom?: boolean;
    }> })?.plans ?? []);
    const base: Omit<PlanOption, 'priceLabel' | 'discountLabel'>[] = fromApi.length
      ? (() => {
          const list = fromApi.filter((p) => p.key !== 'free' && p.isCustom !== true);
          return list.map((p) => ({
            key: p.key,
            name: p.name,
            blurb: p.description?.trim() || `${p.name} package`,
            trialDays: p.trialDays ?? 0,
            pricing: {
              monthlyPriceCents: p.monthlyPriceCents,
              originalMonthlyPriceCents: p.originalMonthlyPriceCents,
              discountType: p.discountType,
              discountPercent: p.discountPercent,
              discountAmountCents: p.discountAmountCents,
              annualFreeMonths: p.annualFreeMonths,
            },
          }));
        })()
      : FALLBACK_PLAN_OPTIONS;
    return base.map((p) => toPlanOption(p, billingPeriod, annualBilling));
  }, [plansData, billingPeriod, annualBilling]);

  const planInfo = useMemo(
    () =>
      planOptions.find((p) => p.key === selectedPlan) ??
      planOptions[0] ??
      toPlanOption(FALLBACK_PLAN_OPTIONS[1], billingPeriod, annualBilling),
    [selectedPlan, planOptions, billingPeriod, annualBilling],
  );

  const annualToggleLabel = useMemo(() => {
    if (!annualBilling.enabled) return 'Annual';
    if (annualBilling.discountType === 'percent_off') {
      return `Annual (${annualBilling.discountPercent}% off)`;
    }
    const savings = getAnnualSavingsPercentFromSettings(annualBilling);
    return savings > 0 ? `Annual (${savings}% off)` : 'Annual';
  }, [annualBilling]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user && isPlatformAdmin(user.role)) router.replace('/admin');
  }, [authLoading, user, router]);

  const restaurants: OwnerRestaurant[] = data?.myRestaurants ?? [];
  const totalLocations = metaData?.myRestaurantLocationsMeta?.total ?? restaurants.length;
  const canAddLocation = Boolean(user && canCreateRestaurant(user.role));
  const showLocationFilters = totalLocations >= MANY_LOCATIONS_THRESHOLD;

  const cityOptions = useMemo(
    () =>
      (metaData?.myRestaurantLocationsMeta?.cities ?? []).map((city: string) => ({
        value: city,
        label: city,
      })),
    [metaData],
  );

  const statusOptions = useMemo(
    () =>
      RESTAURANT_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    [],
  );

  const hasActiveFilters = Boolean(searchInput || statusFilter || cityFilter);
  const isSearchPending = searchInput !== searchQuery;
  const isFetchingResults =
    isSearchPending ||
    restaurantsLoading ||
    networkStatus === NetworkStatus.refetch ||
    networkStatus === NetworkStatus.setVariables;

  const handleViewModeChange = (value: OverviewViewMode) => {
    setViewMode(value);
    localStorage.setItem(OVERVIEW_VIEW_STORAGE_KEY, value);
  };

  const navigateToRestaurant = (id: string, path: string) => {
    selectRestaurant(id);
    router.push(path);
  };

  const viewToggle = (
    <Segmented
      value={viewMode}
      onChange={(value) => handleViewModeChange(value as OverviewViewMode)}
      options={[
        { label: 'Cards', value: 'cards', icon: <AppstoreOutlined /> },
        { label: 'Table', value: 'table', icon: <UnorderedListOutlined /> },
      ]}
    />
  );

  return (
    <div component="OverviewPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Overview"
        subtitle="Your venues at a glance — jump into service or add a new listing"
        extra={
          canAddLocation ? (
            <Space wrap>
              <Button
                icon={<ImportOutlined />}
                size="large"
                onClick={() => setShowImport(true)}
              >
                Import from file
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => openCreateForm(0)}
              >
                Add restaurant
              </Button>
            </Space>
          ) : undefined
        }
      />

      <Modal
        title="Add restaurant"
        open={showCreate}
        onCancel={closeCreateForm}
        width={800}
        destroyOnClose
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={closeCreateForm}>Cancel</Button>
            <Space>
              {createStep > 0 && (
                <Button icon={<ArrowLeftOutlined />} onClick={goCreateBack}>
                  Back
                </Button>
              )}
              {createStep < CREATE_STEPS.length - 1 ? (
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={goCreateNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={creating}
                  onClick={submitCreateRestaurant}
                >
                  {planInfo.trialDays > 0
                    ? `Start ${planInfo.trialDays}-day trial & submit`
                    : 'Subscribe & submit for approval'}
                </Button>
              )}
            </Space>
          </Space>
        }
      >
        <Steps
          size="small"
          current={createStep}
          items={CREATE_STEPS}
          style={{ marginBottom: spacing.lg }}
        />
        <Form
          form={createForm}
          layout="vertical"
          preserve
          scrollToFirstError={{ block: 'center', behavior: 'smooth' }}
          initialValues={{
            plan: 'core',
            priceRange: 2,
            depositRequired: false,
            depositAmountCents: 0,
            loyaltyEnabled: false,
            loyaltyPointsPerVisit: 50,
            loyaltyMinRedeemPoints: 200,
            country: 'US',
          }}
        >
          <div style={{ display: createStep === 0 ? 'block' : 'none' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.md,
              }}
            >
              <div>
                <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                  Restaurant details
                </Title>
                <Text type="secondary">
                  Basic information guests will see on the listing.
                </Text>
              </div>
              <Button icon={<ImportOutlined />} size="small" onClick={() => setShowImport(true)}>
                Import from DoorDash / Uber Eats
              </Button>
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true, message: 'Enter a restaurant name' }]}
                  tooltip={tips.name}
                >
                  <Input maxLength={120} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="cuisine"
                  label="Cuisine / category"
                  rules={[{ required: true, message: 'Select or add a cuisine' }]}
                  tooltip={tips.cuisine}
                >
                  <CuisineSelect />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="priceRange"
                  label="Price range"
                  rules={[{ required: true, message: 'Select a price range' }]}
                  tooltip={tips.priceRange}
                >
                  <Select options={priceRangeOptions} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Description" tooltip={tips.description}>
                  <Input.TextArea rows={3} maxLength={2000} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label="Restaurant phone"
                  rules={usPhoneRules({ required: false })}
                  tooltip={tips.phone}
                >
                  <PhoneInput />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="website" label="Website" tooltip={tips.website}>
                  <Input placeholder="https://" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="menuUrl" label="Full menu URL">
                  <Input placeholder="https://" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Photos">
                  <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={{ display: createStep === 1 ? 'block' : 'none' }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Location & policies
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
              Address, coordinates, and optional deposit or loyalty settings.
            </Text>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Address search">
                  <AddressAutocomplete
                    style={{ width: '100%' }}
                    onSelect={(selection) => {
                      createForm.setFieldsValue(addressSelectionToFields(selection));
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="line1"
                  label="Street"
                  rules={[{ required: true, message: 'Enter a street address' }]}
                  tooltip={tips.line1}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: 'Enter a city' }]}
                  tooltip={tips.city}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="state"
                  label="State"
                  rules={[{ required: true, message: 'Enter a state code' }]}
                  tooltip={tips.state}
                >
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="zip"
                  label="ZIP"
                  rules={[{ required: true, message: 'Enter a ZIP code' }]}
                  tooltip={tips.zip}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lat"
                  label="Latitude"
                  rules={[{ required: true, message: 'Enter latitude' }]}
                  tooltip={tips.lat}
                >
                  <InputNumber style={{ width: '100%' }} step={0.000001} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lng"
                  label="Longitude"
                  rules={[{ required: true, message: 'Enter longitude' }]}
                  tooltip={tips.lng}
                >
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
                <Form.Item
                  name="depositAmountCents"
                  label="Deposit amount (USD)"
                  tooltip={tips.depositAmountCents}
                >
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
                <Form.Item
                  name="loyaltyPointsPerVisit"
                  label="Points per visit"
                  tooltip={tips.loyaltyPointsPerVisit}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="loyaltyMinRedeemPoints"
                  label="Min redeem points"
                  tooltip={tips.loyaltyMinRedeemPoints}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Form.Item name="country" hidden>
                <Input />
              </Form.Item>
            </Row>
          </div>

          <div style={{ display: createStep === 2 ? 'block' : 'none' }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Subscription package
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
              Each location has its own subscription. Billing starts after your free trial.
            </Text>
            <div style={{ marginBottom: 16, maxWidth: 420 }}>
              <Segmented
                value={billingPeriod}
                onChange={(value) => setBillingPeriod(value as BillingPeriod)}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: annualToggleLabel, value: 'annual' },
                ]}
                block
              />
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="plan"
                  label="Package"
                  rules={[{ required: true, message: 'Select a subscription plan' }]}
                >
                  <Select
                    value={selectedPlan}
                    onChange={(value: string) => {
                      setSelectedPlan(value);
                      createForm.setFieldValue('plan', value);
                    }}
                    options={planOptions.map((p) => ({
                      value: p.key,
                      label: `${p.name} — ${p.priceLabel}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <div
                  style={{
                    padding: '14px 16px',
                    background: colors.neutral[50],
                    borderRadius: radii.md,
                    border: `1px solid ${colors.bordersubtle}`,
                  }}
                >
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    {planInfo.name}
                  </Text>
                  <PlanPrice
                    plan={planInfo.pricing}
                    planKey={planInfo.key}
                    size="medium"
                    billingPeriod={billingPeriod}
                    annualBilling={annualBilling}
                  />
                  <Text
                    type="secondary"
                    style={{ fontSize: typography.fontSize.sm, display: 'block', marginTop: 8 }}
                  >
                    {planInfo.blurb}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {planInfo.discountLabel ? (
                      <Tag color="gold" style={{ marginInlineEnd: 8 }}>
                        {planInfo.discountLabel}
                      </Tag>
                    ) : null}
                    {planInfo.trialDays > 0 ? (
                      <Tag color="green">Free {planInfo.trialDays}-day trial</Tag>
                    ) : (
                      <Tag>Billed immediately</Tag>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <div style={{ display: createStep === 3 ? 'block' : 'none' }}>
            <Title level={5} style={{ marginTop: 0 }}>
              Review & create
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
              Confirm everything looks right before creating the restaurant.
            </Text>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const values = createForm.getFieldsValue(true);
                const priceLabel =
                  priceRangeOptions.find((o) => o.value === values.priceRange)?.label ??
                  String(values.priceRange ?? '—');
                const menuItemCount = pendingImportedMenuSections.reduce(
                  (sum, section) => sum + (section.items?.length ?? 0),
                  0,
                );

                return (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Card size="small" title="Restaurant">
                      <Space orientation="vertical" size={4}>
                        <Text>
                          <Text type="secondary">Name: </Text>
                          {values.name || '—'}
                        </Text>
                        <Text>
                          <Text type="secondary">Cuisine: </Text>
                          {values.cuisine || '—'}
                        </Text>
                        <Text>
                          <Text type="secondary">Price range: </Text>
                          {priceLabel}
                        </Text>
                        {values.description ? (
                          <Text>
                            <Text type="secondary">Description: </Text>
                            {values.description}
                          </Text>
                        ) : null}
                        {photos.length > 0 ? (
                          <Text>
                            <Text type="secondary">Photos: </Text>
                            {photos.length}
                          </Text>
                        ) : null}
                      </Space>
                    </Card>
                    <Card size="small" title="Location">
                      <Text>
                        {[values.line1, values.city, values.state, values.zip]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </Text>
                    </Card>
                    <Card size="small" title="Package">
                      <Space orientation="vertical" size={4}>
                        <Text>
                          <Text type="secondary">Plan: </Text>
                          {`${planInfo.name} (${planInfo.priceLabel})`}
                        </Text>
                        <Text>
                          <Text type="secondary">Billing: </Text>
                          {billingPeriod === 'annual' ? 'Annual' : 'Monthly'}
                        </Text>
                        <Text>
                          <Text type="secondary">Deposit: </Text>
                          {values.depositRequired
                            ? `$${Number(values.depositAmountCents || 0).toFixed(2)}`
                            : 'Not required'}
                        </Text>
                        {menuItemCount > 0 ? (
                          <Text>
                            <Text type="secondary">Menu: </Text>
                            {`${menuItemCount} items from import`}
                          </Text>
                        ) : null}
                      </Space>
                    </Card>
                    <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                      Your listing will be pending approval.
                      {planInfo.trialDays > 0
                        ? ` Your ${planInfo.trialDays}-day ${planInfo.name} trial starts immediately.`
                        : ` Your ${planInfo.name} subscription starts immediately.`}
                    </Text>
                  </Space>
                );
              }}
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {totalLocations === 0 ? (
        <EmptyState
          title="No restaurants yet"
          description="Add your first venue to start taking reservations — or import from DoorDash / Uber Eats."
          action={
            canAddLocation ? (
              <Space wrap>
                <Button icon={<ImportOutlined />} onClick={() => setShowImport(true)}>
                  Import from file
                </Button>
                <Button type="primary" onClick={() => openCreateForm(0)}>
                  Add restaurant
                </Button>
              </Space>
            ) : undefined
          }
        />
      ) : (
        <>
          {(showLocationFilters || restaurants.length > 0) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: spacing.md,
              width: '100%',
            }}
          >
            {showLocationFilters ? (
              <Space wrap>
                <Input.Search
                  placeholder="Search name, cuisine, or city"
                  allowClear
                  style={{ width: 280 }}
                  value={searchInput}
                  loading={isFetchingResults}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: 160 }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={statusOptions}
                />
                {cityOptions.length > 1 && (
                  <Select
                    placeholder="City"
                    allowClear
                    style={{ width: 180 }}
                    value={cityFilter}
                    onChange={setCityFilter}
                    options={cityOptions}
                  />
                )}
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                  {restaurants.length} of {totalLocations} locations
                </Text>
              </Space>
            ) : (
              <span />
            )}
            {restaurants.length > 0 ? viewToggle : null}
          </div>
          )}

          {restaurants.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'No matching locations' : 'No restaurants yet'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first venue to start taking reservations — or import from DoorDash / Uber Eats.'
              }
              action={
                hasActiveFilters ? undefined : canAddLocation ? (
                  <Space wrap>
                    <Button icon={<ImportOutlined />} onClick={() => setShowImport(true)}>
                      Import from file
                    </Button>
                    <Button type="primary" onClick={() => openCreateForm(0)}>
                      Add restaurant
                    </Button>
                  </Space>
                ) : undefined
              }
            />
          ) : viewMode === 'table' ? (
            <Table<OwnerRestaurant>
              rowKey="id"
              dataSource={restaurants}
              loading={isFetchingResults}
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  render: (name: string, r) => {
                    const isInactive = r.status === 'rejected' || r.status === 'suspended';
                    return (
                      <Space orientation="vertical" size={0}>
                        <Text strong style={{ opacity: isInactive ? 0.85 : 1 }}>
                          {name}
                        </Text>
                        {isInactive && (
                          <Text type="danger" style={{ fontSize: typography.fontSize.sm }}>
                            Not active
                          </Text>
                        )}
                      </Space>
                    );
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status: string) => <StatusTag status={status} />,
                },
                { title: 'Cuisine', dataIndex: 'cuisine' },
                {
                  title: 'Location',
                  render: (_: unknown, r) => `${r.address.city}, ${r.address.state}`,
                },
                {
                  title: 'Tables',
                  width: 90,
                  render: (_: unknown, r) => r.tables?.length ?? 0,
                },
                {
                  title: 'Shifts',
                  width: 90,
                  render: (_: unknown, r) => r.shifts?.length ?? 0,
                },
                {
                  title: 'Actions',
                  fixed: 'right',
                  width: 280,
                  render: (_: unknown, r) => {
                    const isInactive = r.status === 'rejected' || r.status === 'suspended';
                    return (
                      <Space size={4} wrap>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => navigateToRestaurant(r.id, '/reservations')}
                        >
                          Reservations
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => navigateToRestaurant(r.id, '/floor-plan')}
                        >
                          Floor
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600], paddingInline: 4 }}
                          onClick={() => navigateToRestaurant(r.id, '/settings')}
                        >
                          Settings
                        </Button>
                      </Space>
                    );
                  },
                },
              ]}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {restaurants.map((r) => {
                const isInactive = r.status === 'rejected' || r.status === 'suspended';
                return (
                  <Col key={r.id} xs={24} md={12} lg={8}>
                    <Card
                      title={r.name}
                      extra={<StatusTag status={r.status} />}
                      style={{ borderRadius: radii.lg, height: '100%', opacity: isInactive ? 0.85 : 1 }}
                      styles={{ body: { paddingTop: spacing.sm } }}
                      actions={[
                        <Button
                          key="res"
                          type="link"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600] }}
                          onClick={() => navigateToRestaurant(r.id, '/reservations')}
                        >
                          Reservations
                        </Button>,
                        <Button
                          key="floor"
                          type="link"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600] }}
                          onClick={() => navigateToRestaurant(r.id, '/floor-plan')}
                        >
                          Floor
                        </Button>,
                        <Button
                          key="settings"
                          type="link"
                          disabled={isInactive}
                          style={{ color: isInactive ? undefined : colors.brand[600] }}
                          onClick={() => navigateToRestaurant(r.id, '/settings')}
                        >
                          Settings
                        </Button>,
                      ]}
                    >
                      {isInactive && (
                        <Text type="danger" style={{ display: 'block', marginBottom: spacing.sm }}>
                          This location is not active. Contact support if you believe this is an error.
                        </Text>
                      )}
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
                );
              })}
            </Row>
          )}
        </>
      )}

      <ImportRestaurantModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleOwnerImport}
      />
    </Space></div>
  );
}
