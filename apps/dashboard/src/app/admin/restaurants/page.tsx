'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Select,
  Space,
  Steps,
  Segmented,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import type { FormInstance } from 'antd/es/form';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ImportOutlined,
  SearchOutlined,
  PlusOutlined,
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
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import CuisineSelect from '@/components/CuisineSelect';
import ImportRestaurantModal, { type ImportedRestaurantData } from '@/components/ImportRestaurantModal';
import { applyRestaurantImportToForm } from '@/lib/applyRestaurantImport';
import {
  AdminManageRestaurant,
  PlanSelector,
  RESTAURANT_STATUS_OPTIONS,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import {
  ADMIN_RESTAURANTS,
  ADMIN_RESTAURANT_FILTER_META,
  ADMIN_CREATE_RESTAURANT,
  ADMIN_DELETE_RESTAURANT,
  ADMIN_USERS,
  PLANS,
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
import { uploadImportedMenuImageToSpaces } from '@/lib/importMenuImages';

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

type PlanInfo = {
  key: string;
  name: string;
  monthlyPriceCents?: number;
  trialDays?: number;
  annualFreeMonths?: number;
};

type RestaurantRecord = AdminRestaurantRecord;

function formatPlanLabel(planKey: string, plans: Array<{ key: string; name: string }>) {
  const match = plans.find((p) => p.key === planKey);
  return match?.name ?? planKey;
}

function AdminRestaurantsContent() {
  const router = useRouter();
  const { ready, user } = useRequireAdmin();
  const canDeleteRestaurants = user ? isSuperAdmin(user.role) : false;
  const {
    search,
    searchQuery,
    status: statusFilter,
    city: cityFilter,
    cuisine: cuisineFilter,
    setSearch,
    setStatus: setStatusFilter,
    setCity: setCityFilter,
    setCuisine: setCuisineFilter,
  } = useUrlListFilters({
    search: 'q',
    status: 'status',
    city: 'city',
    cuisine: 'cuisine',
  });
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { data, refetch, loading } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: {
      search: searchQuery || undefined,
      status: statusFilter,
      city: cityFilter,
      cuisine: cuisineFilter,
      limit,
      offset,
    },
  });
  const { data: filterMetaData, refetch: refetchFilterMeta } = useQuery(ADMIN_RESTAURANT_FILTER_META, {
    skip: !ready,
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 500, offset: 0 },
  });
  const { data: plansData } = useQuery(PLANS, { skip: !ready });

  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [createRestaurant, { loading: creating }] = useMutation(ADMIN_CREATE_RESTAURANT);
  const [deleteRestaurant] = useMutation(ADMIN_DELETE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant deleted');
      refetch();
      refetchFilterMeta();
    },
  });
  const [upsertMenu] = useMutation(UPSERT_MENU);

  const [editing, setEditing] = useState<RestaurantRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('new');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pendingImportedMenuSections, setPendingImportedMenuSections] = useState<
    Awaited<ReturnType<typeof buildMenuSectionsFromImport>>
  >([]);
  /** Raw import payload — used at create time so DoorDash image uploads cannot race past menu save. */
  const pendingImportDataRef = useRef<ImportedRestaurantData | null>(null);

  const [createForm] = Form.useForm();
  const lastGeocodedCreateAddressRef = useRef('');

  const createLine1 = Form.useWatch('line1', createForm);
  const createCity = Form.useWatch('city', createForm);
  const createState = Form.useWatch('state', createForm);
  const createZip = Form.useWatch('zip', createForm);

  const plans = (plansData?.plans ?? []) as PlanInfo[];
  const defaultPlanKey =
    plans.find((p) => p.key !== 'free' && (p as { isCustom?: boolean }).isCustom !== true)?.key;

  const ownerOptions = (usersData?.adminUsers?.items ?? [])
    .filter(
      (u: { role: string }) =>
        u.role === 'restaurant_owner' || isPlatformAdmin(u.role) || u.role === 'staff',
    )
    .map((u: { id: string; firstName: string; lastName: string; email?: string }) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
    }));

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
    pendingImportDataRef.current = null;
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

    if (!showCreate) {
      setOwnerMode('new');
      setShowCreate(true);
    }

    // Save menu text/prices immediately. DoorDash includes many item images; waiting on those
    // uploads used to leave pendingImportedMenuSections empty when the restaurant was created.
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
      // Only apply photo enrichment if this import is still the active one.
      if (pendingImportDataRef.current === data) {
        setPendingImportedMenuSections(withPhotos);
      }
    })();

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
        if (mode === 'new') {
          const emailInput = document.getElementById('create-owner-email') as HTMLInputElement | null;
          if (emailInput) createForm.setFieldValue('ownerEmail', emailInput.value);
        }
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
    categoryIds: values.categoryIds ?? [],
    landmarkIds: values.landmarkIds ?? [],
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

      const importData = pendingImportDataRef.current;
      let menuSections = pendingImportedMenuSections;
      if (menuSections.length === 0 && (importData?.menuItems?.length ?? 0) > 0) {
        menuSections = await buildMenuSectionsFromImport(importData!);
      }

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
      if (createdRestaurantId && menuSections.length > 0) {
        try {
          await upsertMenu({
            variables: {
              restaurantId: createdRestaurantId,
              input: { sections: menuSections },
            },
          });
        } catch (menuErr: unknown) {
          message.warning(
            `Restaurant created, but menu import failed: ${
              menuErr instanceof Error ? menuErr.message : 'Unknown error'
            }`,
          );
          closeCreate();
          refetch();
          refetchFilterMeta();
          return;
        }
      }

      message.success('Restaurant created');
      closeCreate();
      refetch();
      refetchFilterMeta();
    } catch (err: unknown) {
      if (isFormValidationError(err) && err.errorFields.length) {
        await revealCreateFieldErrors(createForm, err.errorFields, setCreateStep, setOwnerMode);
        return;
      }
      if (mapCreateApiErrorToFields(createForm, err, setCreateStep, setOwnerMode)) return;
      message.error(err instanceof Error ? err.message : 'Failed to create restaurant');
    }
  };

  const actionItems = (r: RestaurantRecord): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View as diner',
        onClick: () => router.push(`/admin/restaurants/${r.id}`),
      },
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

  const matchingTotal = data?.adminRestaurants?.total ?? 0;
  const overallTotal = filterMetaData?.adminRestaurantFilterMeta?.total ?? matchingTotal;
  const hasActiveFilters = Boolean(searchQuery || statusFilter || cityFilter || cuisineFilter);
  const cityOptions = (filterMetaData?.adminRestaurantFilterMeta?.cities ?? []).map(
    (city: string) => ({ value: city, label: city }),
  );
  const cuisineOptions = (filterMetaData?.adminRestaurantFilterMeta?.cuisines ?? []).map(
    (cuisine: string) => ({ value: cuisine, label: cuisine }),
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
            <Space wrap align="center">
              <Input
                placeholder="Search name, cuisine, or location..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                allowClear
                style={{ width: 280 }}
              />
              <Select
                placeholder="Status"
                allowClear
                style={{ width: 150 }}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPagination(1);
                }}
                options={RESTAURANT_STATUS_OPTIONS}
              />
              <Select
                placeholder="Location"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 180 }}
                value={cityFilter}
                onChange={(value) => {
                  setCityFilter(value);
                  setPagination(1);
                }}
                options={cityOptions}
              />
              <Select
                placeholder="Cuisine"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 180 }}
                value={cuisineFilter}
                onChange={(value) => {
                  setCuisineFilter(value);
                  setPagination(1);
                }}
                options={cuisineOptions}
              />
              <Text type="secondary">
                {hasActiveFilters
                  ? `${matchingTotal} of ${overallTotal} restaurant${overallTotal === 1 ? '' : 's'}`
                  : `${overallTotal} restaurant${overallTotal === 1 ? '' : 's'}`}
              </Text>
            </Space>
            <Table
              loading={loading}
              rowKey="id"
              dataSource={data?.adminRestaurants?.items ?? []}
              scroll={{ x: 'max-content' }}
              pagination={tablePagination(matchingTotal, {
                showSizeChanger: true,
              })}
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  render: (name: string, r: RestaurantRecord) => (
                    <Link href={`/admin/restaurants/${r.id}`} style={{ fontWeight: 500 }}>
                      {name}
                    </Link>
                  ),
                },
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
                      validateTrigger={[]}
                      rules={[
                        { required: true, message: 'Required', whitespace: true },
                        { type: 'email', message: 'Enter a valid email' },
                      ]}
                    >
                      <Input
                        id="create-owner-email"
                        autoComplete="email"
                        placeholder="owner@restaurant.com"
                      />
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
                    <Select options={RESTAURANT_STATUS_OPTIONS} />
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

        <AdminManageRestaurant
          restaurant={editing}
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(updated);
            refetch();
            refetchFilterMeta();
          }}
        />

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
