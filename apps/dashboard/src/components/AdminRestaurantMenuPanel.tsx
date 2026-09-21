'use client';

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useMutation } from '@/lib/apollo-hooks';
import {
  Button,
  Checkbox,
  Collapse,
  Form,
  Input,
  InputNumber,
  Menu,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  LinkOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import type { FormListFieldData } from 'antd/es/form/FormList';
import { EmptyState } from '@reservations/ui';
import { UPSERT_MENU, UPDATE_RESTAURANT } from '@/lib/graphql';
import { buildRestaurantInput } from '@/lib/restaurantInput';
import type { AdminRestaurantRecord } from '@/components/AdminManageRestaurant';
import { MAX_POPULAR_MENU_ITEMS, countPopularMenuItems } from '@reservations/shared';
import { uploadFile } from '@/lib/upload';

const { Text } = Typography;

const DIETARY_OPTIONS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

type MenuItemForm = {
  name: string;
  description?: string;
  price: number;
  dietary: string[];
  available: boolean;
  popular: boolean;
  photoUrl?: string;
};

type MenuSectionForm = {
  name: string;
  items: MenuItemForm[];
};

const EMPTY_ITEM: MenuItemForm = {
  name: '',
  description: '',
  price: 0,
  dietary: [],
  available: true,
  popular: false,
  photoUrl: undefined,
};

const EMPTY_SECTION: MenuSectionForm = {
  name: 'New section',
  items: [{ ...EMPTY_ITEM }],
};

type OpenKeysBySection = Record<string, string[]>;

type RestaurantWithMenu = AdminRestaurantRecord & {
  menu?: {
    sections?: Array<{
      name: string;
      items: Array<{
        name: string;
        description?: string | null;
        priceCents?: number;
        dietary?: string[];
        available?: boolean;
        popular?: boolean;
        photoUrl?: string | null;
      }>;
    }>;
  } | null;
};

function formatPrice(price?: number) {
  if (typeof price !== 'number' || Number.isNaN(price)) return '';
  return `$${price.toFixed(2)}`;
}

export function AdminRestaurantMenuPanel({
  restaurant,
  onSaved,
}: {
  restaurant: RestaurantWithMenu;
  onSaved?: () => void;
}) {
  const [form] = Form.useForm<{ sections: MenuSectionForm[]; menuUrl: string }>();
  const watchedSections = Form.useWatch('sections', form) as MenuSectionForm[] | undefined;
  const menuUrlWatch = Form.useWatch('menuUrl', form);
  const popularCount = countPopularMenuItems(watchedSections);
  const [upsertMenu, { loading: savingMenu }] = useMutation(UPSERT_MENU);
  const [updateRestaurant, { loading: savingUrl }] = useMutation(UPDATE_RESTAURANT);
  const [activePane, setActivePane] = useState<number | 'url'>(0);
  const [openKeys, setOpenKeys] = useState<OpenKeysBySection>({});
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  const itemKeysRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    const sections = restaurant.menu?.sections?.length
      ? restaurant.menu.sections.map((section) => ({
          name: section.name,
          items: (section.items ?? []).map((item) => ({
            name: item.name,
            description: item.description ?? '',
            price: (item.priceCents ?? 0) / 100,
            dietary: item.dietary ?? [],
            available: item.available ?? true,
            popular: item.popular ?? false,
            photoUrl: item.photoUrl ?? undefined,
          })),
        }))
      : [{ name: 'Starters', items: [{ ...EMPTY_ITEM }] }];
    form.setFieldsValue({
      sections,
      menuUrl: restaurant.menuUrl ?? '',
    });
    setActivePane(0);
    setOpenKeys({});
    setItemCounts(
      Object.fromEntries(sections.map((section, index) => [index, section.items.length])),
    );
  }, [restaurant, form]);

  const liveSections = watchedSections ?? [];
  const itemCount = liveSections.reduce((count, section) => count + (section.items?.length ?? 0), 0);
  const sectionCount = liveSections.length;

  const uploadPhoto = async (file: RcFile, sectionIndex: number, itemIndex: number) => {
    const path = `${sectionIndex}-${itemIndex}`;
    setUploadingPath(path);
    try {
      const { publicUrl } = await uploadFile(file, file.name);
      form.setFieldValue(['sections', sectionIndex, 'items', itemIndex, 'photoUrl'], publicUrl);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPath(null);
    }
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const sections = (values.sections ?? []).map((section) => ({
        name: section.name.trim(),
        items: (section.items ?? [])
          .filter((item) => item.name?.trim())
          .map((item) => ({
            name: item.name.trim(),
            description: item.description?.trim() || '',
            priceCents: Math.round((item.price ?? 0) * 100),
            dietary: item.dietary ?? [],
            available: item.available ?? true,
            popular: item.popular ?? false,
            photoUrl: item.photoUrl || undefined,
          })),
      }));
      if (countPopularMenuItems(sections) > MAX_POPULAR_MENU_ITEMS) {
        message.error(
          `Select up to ${MAX_POPULAR_MENU_ITEMS} popular dishes for the restaurant page`,
        );
        return;
      }
      await Promise.all([
        upsertMenu({ variables: { restaurantId: restaurant.id, input: { sections } } }),
        updateRestaurant({
          variables: {
            id: restaurant.id,
            input: {
              ...buildRestaurantInput({
                name: restaurant.name,
                description: restaurant.description,
                cuisine: restaurant.cuisine,
                priceRange: restaurant.priceRange,
                address: {
                  line1: restaurant.address?.line1 ?? '',
                  line2: restaurant.address?.line2,
                  city: restaurant.address?.city ?? '',
                  state: restaurant.address?.state ?? '',
                  zip: restaurant.address?.zip ?? '',
                  country: restaurant.address?.country,
                  neighborhood: restaurant.address?.neighborhood,
                },
                location: {
                  lat: restaurant.location?.lat ?? 0,
                  lng: restaurant.location?.lng ?? 0,
                },
                phone: restaurant.phone,
                website: restaurant.website,
                menuUrl: restaurant.menuUrl,
                logoUrl: restaurant.logoUrl,
                depositRequired: Boolean(restaurant.depositRequired),
                depositAmountCents: restaurant.depositAmountCents ?? 0,
                loyaltyEnabled: Boolean(restaurant.loyaltyEnabled),
                loyaltyPointsPerVisit: restaurant.loyaltyPointsPerVisit ?? 50,
                loyaltyMinRedeemPoints: restaurant.loyaltyMinRedeemPoints ?? 200,
                photos: restaurant.photos ?? [],
                categoryIds: restaurant.categoryIds,
                landmarkIds: restaurant.landmarkIds,
                diningStyles: restaurant.diningStyles,
                discoveryOccasions: restaurant.discoveryOccasions,
                meals: restaurant.meals,
                dietaryTags: restaurant.dietaryTags,
                amenities: restaurant.amenities,
                wheelchairAccessible: restaurant.wheelchairAccessible,
                faq: restaurant.faq,
                featuredIn: restaurant.featuredIn,
              }),
              menuUrl: values.menuUrl?.trim() || undefined,
            },
          },
        }),
      ]);
      message.success('Menu saved');
      onSaved?.();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to save menu');
    }
  };

  const saving = savingMenu || savingUrl;

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="menuUrl" hidden>
        <Input />
      </Form.Item>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" loading={saving} onClick={() => void onSave()}>
          Save changes
        </Button>
      </div>

      <Form.List name="sections">
        {(sections, { add: addSection, remove: removeSection }) => {
          const activeSection =
            typeof activePane === 'number'
              ? (sections.find((section) => section.name === activePane) ?? sections[0] ?? null)
              : null;
          const selectedKey = activePane === 'url' ? 'url' : String(activeSection?.name ?? '');

          const addNewSection = () => {
            const nextIndex = sections.length;
            addSection({ ...EMPTY_SECTION });
            setItemCounts((prev) => ({
              ...prev,
              [nextIndex]: EMPTY_SECTION.items.length,
            }));
            setActivePane(nextIndex);
          };

          return (
            <div className="rt-manage-groups">
              <nav className="rt-manage-groups__nav" aria-label="Menu groups">
                <Menu
                  mode="inline"
                  selectedKeys={selectedKey ? [selectedKey] : ['url']}
                  onClick={({ key }) => {
                    if (key === 'url') setActivePane('url');
                    else setActivePane(Number(key));
                  }}
                  items={[
                    {
                      key: 'url',
                      icon: <LinkOutlined />,
                      label: 'Public link',
                    },
                    ...sections.map((section, index) => ({
                      key: String(section.name),
                      icon: <UnorderedListOutlined />,
                      label: (
                        <Form.Item shouldUpdate noStyle>
                          {() =>
                            String(
                              form.getFieldValue(['sections', section.name, 'name']) || '',
                            ).trim() || `Section ${index + 1}`
                          }
                        </Form.Item>
                      ),
                    })),
                  ]}
                />
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addNewSection}
                  block
                  style={{ marginTop: 12 }}
                >
                  Add section
                </Button>
              </nav>

              <div className="rt-manage-groups__pane">
                <div hidden={activePane !== 'url'}>
                  <h3 className="rt-form-section-title">Public link</h3>
                  <p className="rt-form-section-desc">
                    Optional URL for “View full menu” on the public page — PDF, website, or a
                    third-party host. Diners only see dishes marked Popular (up to{' '}
                    {MAX_POPULAR_MENU_ITEMS}) unless this link is set.
                  </p>
                  <Form.Item label="Full menu URL">
                    <Input
                      placeholder="https://yourrestaurant.com/menu"
                      value={menuUrlWatch}
                      onChange={(event) => form.setFieldValue('menuUrl', event.target.value)}
                    />
                  </Form.Item>
                  <Text type="secondary">
                    {popularCount}/{MAX_POPULAR_MENU_ITEMS} popular · {itemCount} item
                    {itemCount === 1 ? '' : 's'} · {sectionCount} section
                    {sectionCount === 1 ? '' : 's'}
                  </Text>
                </div>

                {sections.map((section, index) => {
                  const isActive = activePane !== 'url' && section.name === activeSection?.name;
                  const dishCount =
                    itemCounts[section.name] ??
                    form.getFieldValue(['sections', section.name, 'items'])?.length ??
                    0;
                  return (
                    <div
                      key={section.key}
                      hidden={!isActive}
                      aria-hidden={!isActive}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                          marginBottom: 4,
                        }}
                      >
                        <Form.Item shouldUpdate noStyle>
                          {() => (
                            <h3 className="rt-form-section-title" style={{ margin: 0 }}>
                              {String(
                                form.getFieldValue(['sections', section.name, 'name']) || '',
                              ).trim() || `Section ${index + 1}`}
                            </h3>
                          )}
                        </Form.Item>
                        <Space size={4} wrap>
                          <Button
                            type="text"
                            size="small"
                            icon={<NodeExpandOutlined />}
                            onClick={() => {
                              const keys = itemKeysRef.current[String(section.name)] ?? [];
                              setOpenKeys((prev) => ({
                                ...prev,
                                [String(section.name)]: [...keys],
                              }));
                            }}
                          >
                            Expand
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            icon={<NodeCollapseOutlined />}
                            onClick={() =>
                              setOpenKeys((prev) => ({
                                ...prev,
                                [String(section.name)]: [],
                              }))
                            }
                          >
                            Collapse
                          </Button>
                        </Space>
                      </div>
                      <p className="rt-form-section-desc">
                        {dishCount} dish{dishCount === 1 ? '' : 'es'} in this section. Mark up to{' '}
                        {MAX_POPULAR_MENU_ITEMS} dishes as Popular for the restaurant page.
                      </p>
                      <Form.Item
                        name={[section.name, 'name']}
                        label="Section name"
                        rules={[{ required: true, message: 'Section name is required' }]}
                      >
                        <Input placeholder="Section name (e.g. Mains)" />
                      </Form.Item>
                      <Form.List name={[section.name, 'items']}>
                        {(items, { add: addItem, remove: removeItem }) => (
                          <SectionItemsPanel
                            section={section}
                            items={items}
                            addItem={addItem}
                            removeItem={removeItem}
                            form={form}
                            openKeys={openKeys}
                            setOpenKeys={setOpenKeys}
                            itemKeysRef={itemKeysRef}
                            uploadingPath={uploadingPath}
                            uploadPhoto={uploadPhoto}
                            setItemCounts={setItemCounts}
                            popularCount={popularCount}
                          />
                        )}
                      </Form.List>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ marginTop: 8, paddingInline: 0 }}
                        onClick={() => {
                          const remaining = sections.filter((entry) => entry.name !== section.name);
                          const prevSibling = [...remaining]
                            .reverse()
                            .find((entry) => entry.name < section.name);
                          removeSection(section.name);
                          setActivePane(
                            remaining.length === 0 ? 'url' : (prevSibling ?? remaining[0]!).name,
                          );
                        }}
                      >
                        Remove section
                      </Button>
                    </div>
                  );
                })}

                {sections.length === 0 && activePane !== 'url' ? (
                  <EmptyState
                    title="No menu sections"
                    description="Add a section such as Starters or Mains, then add dishes. Popular dishes appear on the public page."
                    action={
                      <Button type="primary" icon={<PlusOutlined />} onClick={addNewSection}>
                        Add section
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </div>
          );
        }}
      </Form.List>
    </Form>
  );
}

function SectionItemsPanel({
  section,
  items,
  addItem,
  removeItem,
  form,
  openKeys,
  setOpenKeys,
  itemKeysRef,
  uploadingPath,
  uploadPhoto,
  setItemCounts,
  popularCount,
}: {
  section: FormListFieldData;
  items: FormListFieldData[];
  addItem: (defaultValue?: MenuItemForm) => void;
  removeItem: (index: number | number[]) => void;
  form: ReturnType<typeof Form.useForm<{ sections: MenuSectionForm[]; menuUrl: string }>>[0];
  openKeys: OpenKeysBySection;
  setOpenKeys: Dispatch<SetStateAction<OpenKeysBySection>>;
  itemKeysRef: MutableRefObject<Record<string, string[]>>;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
  setItemCounts: Dispatch<SetStateAction<Record<number, number>>>;
  popularCount: number;
}) {
  const panelKeys = items.map((item) => String(item.key));
  itemKeysRef.current[String(section.name)] = panelKeys;

  useEffect(() => {
    setItemCounts((prev) =>
      prev[section.name] === items.length ? prev : { ...prev, [section.name]: items.length },
    );
  }, [items.length, section.name, setItemCounts]);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      {items.length === 0 ? (
        <Text type="secondary">No dishes in this section yet.</Text>
      ) : (
        <Collapse
          bordered={false}
          className="rt-manage-collapse"
          activeKey={openKeys[String(section.name)] ?? []}
          onChange={(keys) =>
            setOpenKeys((prev) => ({
              ...prev,
              [String(section.name)]: keys as string[],
            }))
          }
          items={items.map((item, itemIndex) =>
            buildItemPanel({
              item,
              itemIndex,
              section,
              form,
              removeItem,
              uploadingPath,
              uploadPhoto,
              popularCount,
            }),
          )}
        />
      )}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => addItem({ ...EMPTY_ITEM })} block>
        Add item
      </Button>
    </Space>
  );
}

function buildItemPanel({
  item,
  itemIndex,
  section,
  form,
  removeItem,
  uploadingPath,
  uploadPhoto,
  popularCount,
}: {
  item: FormListFieldData;
  itemIndex: number;
  section: FormListFieldData;
  form: ReturnType<typeof Form.useForm<{ sections: MenuSectionForm[]; menuUrl: string }>>[0];
  removeItem: (index: number | number[]) => void;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
  popularCount: number;
}) {
  const isPopular = Boolean(
    form.getFieldValue(['sections', section.name, 'items', item.name, 'popular']),
  );
  const path = `${section.name}-${item.name}`;

  return {
    key: String(item.key),
    label: (
      <Form.Item shouldUpdate noStyle>
        {() => {
          const name =
            form.getFieldValue(['sections', section.name, 'items', item.name, 'name']) ||
            `Untitled item ${itemIndex + 1}`;
          const price = form.getFieldValue([
            'sections',
            section.name,
            'items',
            item.name,
            'price',
          ]);
          const popular = Boolean(
            form.getFieldValue(['sections', section.name, 'items', item.name, 'popular']),
          );
          const available = form.getFieldValue([
            'sections',
            section.name,
            'items',
            item.name,
            'available',
          ]);
          return (
            <Space size={8} wrap>
              <Text strong>{name}</Text>
              {typeof price === 'number' ? <Text type="secondary">{formatPrice(price)}</Text> : null}
              {popular ? <Tag color="gold">Popular</Tag> : null}
              {available === false ? <Tag>Unavailable</Tag> : null}
            </Space>
          );
        }}
      </Form.Item>
    ),
    extra: (
      <Space size={4} onClick={(event) => event.stopPropagation()}>
        <Form.Item name={[item.name, 'popular']} valuePropName="checked" noStyle>
          <Checkbox disabled={!isPopular && popularCount >= MAX_POPULAR_MENU_ITEMS}>
            Popular
          </Checkbox>
        </Form.Item>
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            removeItem(item.name);
          }}
        >
          Remove
        </Button>
      </Space>
    ),
    children: (
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        <Form.Item name={[item.name, 'name']} label="Name">
          <Input placeholder="Dish name" />
        </Form.Item>
        <Form.Item name={[item.name, 'description']} label="Description">
          <Input.TextArea rows={2} placeholder="Short description for diners" />
        </Form.Item>
        <Space wrap align="start" style={{ width: '100%' }}>
          <Form.Item name={[item.name, 'price']} label="Price ($)">
            <InputNumber min={0} step={0.01} precision={2} prefix="$" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name={[item.name, 'available']} label="Available" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Form.Item name={[item.name, 'dietary']} label="Dietary tags">
          <Select
            mode="tags"
            allowClear
            placeholder="Select or type tags"
            options={DIETARY_OPTIONS}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name={[item.name, 'photoUrl']} hidden>
          <Input />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => {
            const photoUrl = form.getFieldValue([
              'sections',
              section.name,
              'items',
              item.name,
              'photoUrl',
            ]);
            return (
              <Form.Item label="Photo">
                <Space orientation="vertical" size={8}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                  ) : null}
                  <Space>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={(file: RcFile) => {
                        void uploadPhoto(file, section.name, item.name);
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />} loading={uploadingPath === path}>
                        {photoUrl ? 'Replace photo' : 'Upload photo'}
                      </Button>
                    </Upload>
                    {photoUrl ? (
                      <Button
                        type="link"
                        danger
                        onClick={() =>
                          form.setFieldValue(
                            ['sections', section.name, 'items', item.name, 'photoUrl'],
                            undefined,
                          )
                        }
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </Space>
                </Space>
              </Form.Item>
            );
          }}
        </Form.Item>
      </Space>
    ),
  };
}
