'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import type { FormInstance } from 'antd/es/form';
import {
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  SearchOutlined,
  PlusOutlined,
  UserAddOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import {
  AddressAutocomplete,
  PageHeader,
  PhoneInput,
  StatusTag,
  colors,
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import CuisineSelect from '@/components/CuisineSelect';
import ImportRestaurantModal, { type ImportedRestaurantData } from '@/components/ImportRestaurantModal';
import { RestaurantProfileFields } from '@/components/RestaurantProfileFields';
import {
  ADMIN_RESTAURANTS,
  ADMIN_CREATE_RESTAURANT,
  ADMIN_DELETE_RESTAURANT,
  ADMIN_UPDATE_RESTAURANT,
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  CHANGE_PLAN,
  CREATE_SUBSCRIPTION,
  PLANS,
  REMOVE_USER_RESTAURANT,
  RESTAURANT_TEAM,
  SET_RESTAURANT_STATUS,
  UPSERT_MENU,
} from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { isPlatformAdmin, isSuperAdmin } from '@/lib/roles';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { buildMenuSectionsFromImport } from '@/lib/importedMenu';

const CREATE_STEPS = [
  { title: 'Owner' },
  { title: 'Details' },
  { title: 'Location' },
  { title: 'Review' },
];

type OwnerMode = 'existing' | 'new';

type FormFieldError = { name: (string | number)[]; errors: string[] };

const OWNER_STEP_FIELDS = new Set([
  'ownerMode',
  'ownerId',
  'ownerFirstName',
  'ownerLastName',
  'ownerEmail',
  'ownerPhone',
  'ownerPassword',
  'confirmPassword',
  'plan',
  'status',
]);

const DETAILS_STEP_FIELDS = new Set([
  'name',
  'cuisine',
  'description',
  'priceRange',
  'phone',
  'website',
]);

function isFormValidationError(err: unknown): err is { errorFields: FormFieldError[] } {
  return Boolean(
    err && typeof err === 'object' && 'errorFields' in err && Array.isArray((err as { errorFields: unknown }).errorFields),
  );
}

function resolveCreateStepForField(fieldName: string): number {
  if (OWNER_STEP_FIELDS.has(fieldName)) return 0;
  if (DETAILS_STEP_FIELDS.has(fieldName)) return 1;
  return 2;
}

function resolveCreateStepForErrors(errorFields: FormFieldError[]): number {
  return Math.min(...errorFields.map((f) => resolveCreateStepForField(String(f.name[0]))));
}

function ownerFieldsForMode(mode: OwnerMode): string[] {
  return mode === 'existing'
    ? ['ownerId']
    : ['ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerPhone', 'ownerPassword', 'confirmPassword'];
}

async function revealCreateFieldErrors(
  form: FormInstance,
  errorFields: FormFieldError[],
  setStep: (step: number) => void,
  setMode: (mode: OwnerMode) => void,
) {
  const step = resolveCreateStepForErrors(errorFields);
  const firstField = String(errorFields[0]?.name[0] ?? '');

  if (firstField === 'ownerId') {
    setMode('existing');
    form.setFieldValue('ownerMode', 'existing');
  } else if (firstField.startsWith('owner')) {
    setMode('new');
    form.setFieldValue('ownerMode', 'new');
  }

  setStep(step);
  form.setFields(
    errorFields.map((field) => ({
      name: field.name,
      errors: field.errors,
    })),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  if (firstField) {
    form.scrollToField(firstField, { block: 'center', behavior: 'smooth' });
  }
}

function mapCreateApiErrorToFields(
  form: FormInstance,
  err: unknown,
  setStep: (step: number) => void,
  setMode: (mode: OwnerMode) => void,
): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : '';
  if (!msg) return false;

  if (/email already registered/i.test(msg)) {
    setMode('new');
    form.setFieldsValue({ ownerMode: 'new' });
    form.setFields([{ name: 'ownerEmail', errors: [msg] }]);
    setStep(0);
    requestAnimationFrame(() => {
      form.scrollToField('ownerEmail', { block: 'center', behavior: 'smooth' });
    });
    return true;
  }

  if (/owner user not found/i.test(msg)) {
    setMode('existing');
    form.setFieldsValue({ ownerMode: 'existing' });
    form.setFields([{ name: 'ownerId', errors: [msg] }]);
    setStep(0);
    requestAnimationFrame(() => {
      form.scrollToField('ownerId', { block: 'center', behavior: 'smooth' });
    });
    return true;
  }

  return false;
}

const { Text, Title } = Typography;

// ─── Plan Selector ────────────────────────────────────────────────────────────

type PlanInfo = {
  key: string;
  name: string;
  monthlyPriceCents?: number;
  trialDays?: number;
  annualFreeMonths?: number;
};

function PlanSelector({
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

  const annualDiscountPercent = (freeMonths: number) =>
    Math.round((freeMonths / 12) * 100);

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
          <Space direction="vertical" size={2}>
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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const TEAM_ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'restaurant_owner', label: 'Restaurant owner' },
];

type RestaurantRecord = {
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
    monthlyPriceCents?: number;
  } | null;
};

type TeamMember = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

function formatPlanLabel(planKey: string, plans: Array<{ key: string; name: string }>) {
  const match = plans.find((p) => p.key === planKey);
  return match?.name ?? planKey;
}

function AdminRestaurantsContent() {
  const { ready, user } = useRequireAdmin();
  const canDeleteRestaurants = user ? isSuperAdmin(user.role) : false;
  const { search, status: statusFilter, setSearch, setStatus: setStatusFilter } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { data, refetch, loading } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: {
      search: search || undefined,
      status: statusFilter,
      limit,
      offset,
    },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 500, offset: 0 },
  });
  const { data: plansData } = useQuery(PLANS, { skip: !ready });

  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [createRestaurant, { loading: creating }] = useMutation(ADMIN_CREATE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant created');
      closeCreate();
      refetch();
    },
  });
  const [updateRestaurant, { loading: saving }] = useMutation(ADMIN_UPDATE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant updated');
      setEditing(null);
      refetch();
    },
  });
  const [deleteRestaurant] = useMutation(ADMIN_DELETE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant deleted');
      refetch();
    },
  });
  const [createSubscription, { loading: assigningPlan }] = useMutation(CREATE_SUBSCRIPTION);
  const [changePlan, { loading: changingPlan }] = useMutation(CHANGE_PLAN);
  const [assignUserRestaurants, { loading: assigningUser }] = useMutation(ASSIGN_USER_RESTAURANTS);
  const [removeUserRestaurant] = useMutation(REMOVE_USER_RESTAURANT);
  const [upsertMenu] = useMutation(UPSERT_MENU);

  const [editing, setEditing] = useState<RestaurantRecord | null>(null);
  const [editTab, setEditTab] = useState('details');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('new');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [selectedRestaurantStatus, setSelectedRestaurantStatus] = useState<string>();
  const [assignUserId, setAssignUserId] = useState<string>();
  const [assignRole, setAssignRole] = useState('staff');
  const [pendingImportedMenuSections, setPendingImportedMenuSections] = useState<
    Array<{ name: string; items: Array<{ name: string; description: string; priceCents: number; dietary: string[]; available: boolean }> }>
  >([]);

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();
  const lastGeocodedCreateAddressRef = useRef('');

  const createLine1 = Form.useWatch('line1', createForm);
  const createCity = Form.useWatch('city', createForm);
  const createState = Form.useWatch('state', createForm);
  const createZip = Form.useWatch('zip', createForm);

  const plans = (plansData?.plans ?? []) as PlanInfo[];
  const defaultPlanKey =
    plans.find((p) => p.key !== 'free' && (p as { isCustom?: boolean }).isCustom !== true)?.key;

  const { data: teamData, refetch: refetchTeam } = useQuery(RESTAURANT_TEAM, {
    skip: !editing?.id,
    variables: { restaurantId: editing?.id ?? '' },
  });

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
    if (!editing) return;
    setEditTab('details');
    setPhotos(editing.photos ?? []);
    setSelectedPlan(editing.subscription?.plan);
    setSelectedRestaurantStatus(editing.status);
    form.setFieldsValue({
      name: editing.name,
      description: editing.description ?? '',
      cuisine: editing.cuisine,
      priceRange: editing.priceRange,
      phone: editing.phone ?? '',
      website: editing.website ?? '',
      menuUrl: editing.menuUrl ?? '',
      depositRequired: editing.depositRequired,
      depositAmountCents: editing.depositAmountCents
        ? editing.depositAmountCents / 100
        : 0,
      loyaltyEnabled: Boolean(editing.loyaltyEnabled),
      loyaltyPointsPerVisit: editing.loyaltyPointsPerVisit ?? 50,
      loyaltyMinRedeemPoints: editing.loyaltyMinRedeemPoints ?? 200,
      featured: Boolean(editing.featured),
      ownerId: editing.ownerId,
      line1: editing.address?.line1,
      line2: editing.address?.line2 ?? '',
      city: editing.address?.city,
      state: editing.address?.state,
      zip: editing.address?.zip,
      country: editing.address?.country ?? 'US',
      lat: editing.location?.lat,
      lng: editing.location?.lng,
      useSmartAssign: editing.useSmartAssign ?? false,
      posEnabled: editing.posEnabled ?? false,
      spendAlertDollars: (editing.spendAlertThresholdCents ?? 0) / 100,
      primaryColor: editing.widgetTheme?.primaryColor ?? colors.brand[600],
      buttonText: editing.widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: editing.widgetTheme?.showReviews ?? true,
      neighborhood: editing.address?.neighborhood ?? '',
      diningStyles: editing.diningStyles ?? [],
      discoveryOccasions: editing.discoveryOccasions ?? [],
      meals: editing.meals ?? [],
      dietaryTags: editing.dietaryTags ?? [],
      amenities: editing.amenities ?? [],
      wheelchairAccessible: editing.wheelchairAccessible ?? false,
      faq: (editing.faq ?? []).map((item) => ({ question: item.question, answer: item.answer })),
      featuredIn: (editing.featuredIn ?? []).map((item) => ({
        title: item.title,
        description: item.description ?? '',
        url: item.url ?? '',
        logoUrl: item.logoUrl ?? '',
      })),
    });
  }, [editing, form]);

  useEffect(() => {
    if (!showCreate || !defaultPlanKey) return;
    if (!createForm.getFieldValue('plan')) {
      createForm.setFieldValue('plan', defaultPlanKey);
    }
  }, [showCreate, defaultPlanKey, createForm]);

  const closeCreate = () => {
    setShowCreate(false);
    setCreateStep(0);
    setOwnerMode('new');
    lastGeocodedCreateAddressRef.current = '';
    createForm.resetFields();
    setPhotos([]);
    setPendingImportedMenuSections([]);
  };

  useEffect(() => {
    if (!showCreate) return;

    const line1 = String(createLine1 ?? '').trim();
    const city = String(createCity ?? '').trim();
    const state = String(createState ?? '').trim().toUpperCase();
    const zip = String(createZip ?? '').trim();
    const hasFullAddress = line1 && city && state && zip;
    if (!hasFullAddress) {
      return;
    }

    const normalizedAddress = `${line1}, ${city}, ${state} ${zip}`;
    if (normalizedAddress === lastGeocodedCreateAddressRef.current) {
      return;
    }
    createForm.setFieldsValue({ lat: undefined, lng: undefined });

    const timer = setTimeout(() => {
      const googleMaps = (window as Window & { google?: any }).google?.maps;
      if (!googleMaps?.Geocoder) return;

      const geocoder = new googleMaps.Geocoder();
      geocoder.geocode(
        { address: normalizedAddress },
        (results: Array<{ geometry?: { location?: { lat: () => number; lng: () => number } } }>, status: string) => {
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

  const handleAdminImport = (data: ImportedRestaurantData) => {
    // Pre-fill all extracted fields
    createForm.setFieldsValue({
      name: data.name ?? createForm.getFieldValue('name'),
      cuisine: data.cuisine ?? createForm.getFieldValue('cuisine'),
      priceRange: data.priceRange ?? createForm.getFieldValue('priceRange'),
      description: data.description ?? createForm.getFieldValue('description'),
      phone: data.phone ?? createForm.getFieldValue('phone'),
      website: data.website ?? createForm.getFieldValue('website'),
      ...(data.address?.line1 ? { line1: data.address.line1 } : {}),
      ...(data.address?.city ? { city: data.address.city } : {}),
      ...(data.address?.state ? { state: data.address.state } : {}),
      ...(data.address?.zip ? { zip: data.address.zip } : {}),
    });

    if (!showCreate) {
      setOwnerMode('new');
      setShowCreate(true);
    }
    setPendingImportedMenuSections(buildMenuSectionsFromImport(data));
    // Return to the first step so the user starts by choosing or creating the owner.
    setCreateStep(0);
    message.success(`Imported "${data.name ?? 'restaurant'}" — continue from the owner step.`);
  };

  const getOwnerMode = () =>
    (createForm.getFieldValue('ownerMode') as OwnerMode | undefined) ?? ownerMode;

  const goCreateNext = async () => {
    try {
      const mode = getOwnerMode();
      if (createStep === 0) {
        await createForm.validateFields(['ownerMode', ...ownerFieldsForMode(mode), 'plan', 'status']);
      } else if (createStep === 1) {
        await createForm.validateFields(['name', 'cuisine', 'priceRange', 'phone', 'website']);
      } else if (createStep === 2) {
        await createForm.validateFields(['line1', 'city', 'state', 'zip', 'lat', 'lng']);
      }
      setCreateStep((step) => Math.min(step + 1, CREATE_STEPS.length - 1));
    } catch (err: unknown) {
      if (isFormValidationError(err) && err.errorFields.length) {
        await revealCreateFieldErrors(createForm, err.errorFields, setCreateStep, setOwnerMode);
      }
    }
  };

  const goCreateBack = () => setCreateStep((step) => Math.max(step - 1, 0));

  const buildRestaurantInput = (values: Record<string, unknown>, photoList: string[]) => ({
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
    diningStyles: values.diningStyles ?? [],
    discoveryOccasions: values.discoveryOccasions ?? [],
    meals: values.meals ?? [],
    dietaryTags: values.dietaryTags ?? [],
    amenities: values.amenities ?? [],
    wheelchairAccessible: Boolean(values.wheelchairAccessible),
    faq: (values.faq as Array<{ question: string; answer: string }> | undefined) ?? [],
    featuredIn: (values.featuredIn as Array<{
      title: string;
      description?: string;
      url?: string;
      logoUrl?: string;
    }> | undefined) ?? [],
  });

  const onSave = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await updateRestaurant({
        variables: {
          id: editing.id,
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
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update restaurant');
    }
  };

  const onCreate = async () => {
    const mode = getOwnerMode();
    try {
      await createForm.validateFields([
        'ownerMode',
        ...ownerFieldsForMode(mode),
        'plan',
        'status',
        'name',
        'cuisine',
        'priceRange',
        'phone',
        'website',
        'line1',
        'city',
        'state',
        'zip',
        'lat',
        'lng',
        'depositRequired',
        'depositAmountCents',
        'loyaltyEnabled',
        'loyaltyPointsPerVisit',
        'loyaltyMinRedeemPoints',
      ]);
      const values = createForm.getFieldsValue(true);
      const ownerInput =
        values.ownerMode === 'new'
          ? {
              firstName: values.ownerFirstName,
              lastName: values.ownerLastName,
              email: values.ownerEmail,
              phone: values.ownerPhone || undefined,
              password: values.ownerPassword,
            }
          : undefined;

      const result = await createRestaurant({
        variables: {
          ownerId: values.ownerMode === 'existing' ? values.ownerId : undefined,
          ownerInput,
          plan: values.plan || undefined,
          status: values.status || 'approved',
          input: buildRestaurantInput(values, photos),
        },
      });

      const createdRestaurantId = result.data?.adminCreateRestaurant?.id as string | undefined;
      if (createdRestaurantId && pendingImportedMenuSections.length > 0) {
        await upsertMenu({
          variables: {
            restaurantId: createdRestaurantId,
            input: { sections: pendingImportedMenuSections },
          },
        });
      }
    } catch (err: unknown) {
      if (isFormValidationError(err) && err.errorFields.length) {
        await revealCreateFieldErrors(createForm, err.errorFields, setCreateStep, setOwnerMode);
        return;
      }
      if (mapCreateApiErrorToFields(createForm, err, setCreateStep, setOwnerMode)) return;
      message.error(err instanceof Error ? err.message : 'Failed to create restaurant');
    }
  };

  const applyPackageAndStatus = async () => {
    if (!editing) return;
    try {
      let hasChanges = false;

      if (selectedPlan && selectedPlan !== editing.subscription?.plan) {
        if (editing.subscription) {
          await changePlan({
            variables: { restaurantId: editing.id, plan: selectedPlan },
          });
          message.success('Package updated');
        } else {
          await createSubscription({
            variables: { restaurantId: editing.id, plan: selectedPlan },
          });
          message.success('Package assigned');
        }
        hasChanges = true;
      }

      if (selectedRestaurantStatus && selectedRestaurantStatus !== editing.status) {
        await setStatus({ variables: { id: editing.id, status: selectedRestaurantStatus } });
        message.success('Status updated');
        hasChanges = true;
      }

      if (!hasChanges) {
        message.info('No package or status changes to apply');
        return;
      }

      const refreshed = await refetch();
      const updated = refreshed.data?.adminRestaurants?.items?.find(
        (r: RestaurantRecord) => r.id === editing.id,
      );
      if (updated) setEditing(updated);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update package or status');
    }
  };

  const updateDisabled = !selectedPlan || !selectedRestaurantStatus;

  const handleAssignUser = async () => {
    if (!editing || !assignUserId) return;
    try {
      await assignUserRestaurants({
        variables: {
          userId: assignUserId,
          restaurantIds: [editing.id],
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
    if (!editing) return;
    try {
      await removeUserRestaurant({
        variables: { userId, restaurantId: editing.id },
      });
      message.success('Account removed');
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  const actionItems = (r: RestaurantRecord): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => setEditing(r),
      },
    ];

    if (r.status !== 'approved') {
      items.push({
        key: 'approve',
        label: 'Approve',
        onClick: async () => {
          await setStatus({ variables: { id: r.id, status: 'approved' } });
          message.success('Approved');
          refetch();
        },
      });
    }

    if (r.status !== 'rejected') {
      items.push({
        key: 'reject',
        label: 'Reject',
        danger: true,
        onClick: async () => {
          await setStatus({ variables: { id: r.id, status: 'rejected' } });
          refetch();
        },
      });
    }

    if (r.status === 'approved') {
      items.push({
        key: 'suspend',
        label: 'Suspend',
        onClick: async () => {
          await setStatus({ variables: { id: r.id, status: 'suspended' } });
          refetch();
        },
      });
    }

    if (canDeleteRestaurants) {
      items.push(
        { type: 'divider' },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Delete',
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: `Delete ${r.name}?`,
              content:
                'Permanently deletes this restaurant and all related records. This cannot be undone.',
              okText: 'Delete permanently',
              okButtonProps: { danger: true },
              onOk: async () => {
                await deleteRestaurant({ variables: { id: r.id } });
              },
            });
          },
        },
      );
    }

    return items;
  };

  if (!ready) return null;

  const restaurantFormFields = (formInstance: typeof form, isCreate = false) => (
  <>
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
        <Form.Item name="menuUrl" label="Full menu URL" tooltip="External link for View full menu on the public restaurant page">
          <Input placeholder="https://" />
        </Form.Item>
      </Col>
      {!isCreate && (
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
      )}
      <Col span={24}>
        <Form.Item label="Photos">
          <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Address search">
          <AddressAutocomplete
            onSelect={(selection) => {
              formInstance.setFieldsValue(addressSelectionToFields(selection));
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
      {!isCreate && (
        <>
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
        </>
      )}
      <Form.Item name="country" hidden>
        <Input />
      </Form.Item>
    </Row>
  </>
  );

  return (
    <div component="AdminRestaurantsContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Restaurants"
          subtitle="Create venues, assign packages and accounts, and manage full restaurant profiles."
          extra={
            <Space>
              <Button
                icon={<ImportOutlined />}
                onClick={() => setShowImport(true)}
              >
                Import from file
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setCreateStep(0);
                  setOwnerMode('new');
                  setShowCreate(true);
                }}
              >
                Add restaurant
              </Button>
            </Space>
          }
        />
        <Card>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Input
                placeholder="Search name, cuisine, or location..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                allowClear
                style={{ width: 300 }}
              />
              <Select
                placeholder="Status"
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPagination(1);
                }}
                options={STATUS_OPTIONS}
              />
            </Space>
            <Table
              loading={loading}
              rowKey="id"
              dataSource={data?.adminRestaurants?.items ?? []}
              scroll={{ y: 420, x: 'max-content' }}
              pagination={tablePagination(data?.adminRestaurants?.total ?? 0, {
                showSizeChanger: true,
              })}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                { title: 'Cuisine', dataIndex: 'cuisine' },
                {
                  title: 'Location',
                  render: (_: unknown, r: RestaurantRecord) =>
                    `${r.address?.city ?? ''}, ${r.address?.state ?? ''}`,
                },
                {
                  title: 'Package',
                  render: (_: unknown, r: RestaurantRecord) => {
                    if (!r.subscription) return <Text type="secondary">None</Text>;
                    return (
                      <Space size={4}>
                        <Tag>{formatPlanLabel(r.subscription.plan, plans)}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {r.subscription.status}
                        </Text>
                      </Space>
                    );
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (s: string) => <StatusTag status={s} />,
                },
                {
                  title: 'Actions',
                  width: 90,
                  fixed: 'right',
                  render: (_: unknown, r: RestaurantRecord) => (
                    <Dropdown
                      menu={{ items: actionItems(r) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button size="small" icon={<MoreOutlined />}>
                        More
                      </Button>
                    </Dropdown>
                  ),
                },
              ]}
            />
          </Space>
        </Card>

        <Modal
          title="Add restaurant"
          open={showCreate}
          onCancel={closeCreate}
          width={800}
          destroyOnClose
          footer={
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={closeCreate}>Cancel</Button>
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
                    onClick={onCreate}
                  >
                    Create restaurant
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
              ownerMode: 'new',
              status: 'approved',
              priceRange: 2,
              depositRequired: false,
              depositAmountCents: 0,
              loyaltyEnabled: false,
              loyaltyPointsPerVisit: 50,
              loyaltyMinRedeemPoints: 200,
              country: 'US',
            }}
          >
            <Form.Item name="ownerMode" hidden>
              <Input />
            </Form.Item>

            <div style={{ display: createStep === 0 ? 'block' : 'none' }}>
              <Title level={5} style={{ marginTop: 0 }}>
                Owner account
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
                Create a new restaurant owner or link an existing account.
              </Text>
              <Segmented
                block
                value={ownerMode}
                onChange={(value) => {
                  const mode = value as OwnerMode;
                  setOwnerMode(mode);
                  createForm.setFieldValue('ownerMode', mode);
                }}
                options={[
                  { label: 'New owner', value: 'new' },
                  { label: 'Existing account', value: 'existing' },
                ]}
                style={{ marginBottom: spacing.md }}
              />

              {ownerMode === 'existing' ? (
                <Form.Item
                  name="ownerId"
                  label="Owner account"
                  rules={[{ required: true, message: 'Select an owner account' }]}
                >
                  <Select
                    options={ownerOptions}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Search by name or email"
                  />
                </Form.Item>
              ) : (
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="ownerFirstName"
                      label="First name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input autoComplete="given-name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="ownerLastName"
                      label="Last name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input autoComplete="family-name" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name="ownerEmail"
                      label="Email"
                      rules={[
                        { required: true, message: 'Required' },
                        { type: 'email', message: 'Enter a valid email' },
                      ]}
                    >
                      <Input autoComplete="email" placeholder="owner@restaurant.com" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name="ownerPhone"
                      label="Phone"
                      rules={usPhoneRules({ required: false })}
                    >
                      <PhoneInput />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="ownerPassword"
                      label="Password"
                      rules={[
                        { required: true, message: 'Required' },
                        { min: 8, message: 'At least 8 characters' },
                      ]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="confirmPassword"
                      label="Confirm password"
                      dependencies={['ownerPassword']}
                      rules={[
                        { required: true, message: 'Confirm the password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('ownerPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Divider plain>Package & status</Divider>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="plan"
                    label="Package"
                    rules={[{ required: true, message: 'Select a subscription plan' }]}
                  >
                    <PlanSelector plans={plans} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="status"
                    label="Restaurant status"
                    rules={[{ required: true, message: 'Select an initial status' }]}
                  >
                    <Select options={STATUS_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div style={{ display: createStep === 1 ? 'block' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <div>
                  <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                    Restaurant details
                  </Title>
                  <Text type="secondary">
                    Basic information guests will see on the listing.
                  </Text>
                </div>
                <Button
                  icon={<ImportOutlined />}
                  size="small"
                  onClick={() => setShowImport(true)}
                >
                  Import from DoorDash / Uber Eats
                </Button>
              </div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter a restaurant name' }]} tooltip={tips.name}>
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

            <div style={{ display: createStep === 2 ? 'block' : 'none' }}>
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
                  const ownerLabel =
                    values.ownerMode === 'existing'
                      ? ownerOptions.find((o: { value: string; label: string }) => o.value === values.ownerId)?.label ?? '—'
                      : `${values.ownerFirstName ?? ''} ${values.ownerLastName ?? ''}`.trim() +
                        (values.ownerEmail ? ` (${values.ownerEmail})` : '');
                  const priceLabel =
                    priceRangeOptions.find((o) => o.value === values.priceRange)?.label ??
                    String(values.priceRange ?? '—');

                  return (
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                      <Card size="small" title="Owner & package">
                        <Space orientation="vertical" size={4}>
                          <Text>
                            <Text type="secondary">Owner: </Text>
                            {ownerLabel || '—'}
                          </Text>
                          <Text>
                            <Text type="secondary">Package: </Text>
                            {values.plan
                              ? formatPlanLabel(values.plan, plans)
                              : 'None (assign later)'}
                          </Text>
                          <Text>
                            <Text type="secondary">Status: </Text>
                            <Tag>{values.status ?? 'approved'}</Tag>
                          </Text>
                        </Space>
                      </Card>
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
                        </Space>
                      </Card>
                      <Card size="small" title="Location">
                        <Text>
                          {[values.line1, values.line2, values.city, values.state, values.zip]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </Text>
                      </Card>
                    </Space>
                  );
                }}
              </Form.Item>
            </div>
          </Form>
        </Modal>

        <Modal
          title={editing ? `Manage — ${editing.name}` : 'Manage restaurant'}
          open={Boolean(editing)}
          onCancel={() => setEditing(null)}
          width={800}
          destroyOnClose
          footer={
            editTab === 'details' || editTab === 'profile'
              ? [
                  <Button key="cancel" onClick={() => setEditing(null)}>Cancel</Button>,
                  <Button key="save" type="primary" loading={saving} onClick={onSave}>
                    Save changes
                  </Button>,
                ]
              : [
                  <Button key="close" onClick={() => setEditing(null)}>Close</Button>,
                ]
          }
        >
          <Tabs
            activeKey={editTab}
            onChange={setEditTab}
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <Form form={form} layout="vertical">
                    {restaurantFormFields(form)}
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
                    <Form layout="vertical">
                      <Form.Item label="Package" required style={{ marginBottom: spacing.md }}>
                        <PlanSelector plans={plans} value={selectedPlan} onChange={setSelectedPlan} />
                      </Form.Item>
                      <Form.Item label="Restaurant status" required style={{ marginBottom: spacing.md }}>
                        <Select
                          value={selectedRestaurantStatus}
                          onChange={setSelectedRestaurantStatus}
                          options={STATUS_OPTIONS}
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        loading={assigningPlan || changingPlan}
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
                              {record.id === editing?.ownerId && <Tag color="blue">Owner</Tag>}
                            </Space>
                          ),
                        },
                        {
                          title: '',
                          width: 100,
                          render: (_: unknown, record) =>
                            record.id !== editing?.ownerId ? (
                              <Button
                                size="small"
                                danger
                                onClick={() => handleRemoveUser(record.id)}
                              >
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
        </Modal>

        <ImportRestaurantModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleAdminImport}
        />
      </Space>
    </div>
  );
}

export default function AdminRestaurantsPage() {
  return (
    <div component="AdminRestaurantsPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminRestaurantsContent />
      </Suspense>
    </div>
  );
}
