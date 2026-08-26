'use client';

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Menu,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import type { FormListFieldData } from 'antd/es/form/FormList';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { MY_RESTAURANTS, UPSERT_MENU, UPDATE_RESTAURANT } from '@/lib/graphql';
import { buildRestaurantInput } from '@/lib/restaurantInput';
import { uploadFile } from '@/lib/upload';

const { Title, Text } = Typography;

const DIETARY_OPTIONS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

type MenuItemForm = {
  name: string;
  description?: string;
  price: number;
  dietary: string[];
  available: boolean;
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
  photoUrl: undefined,
};

const EMPTY_SECTION: MenuSectionForm = {
  name: 'New section',
  items: [{ ...EMPTY_ITEM }],
};

/** Active accordion panel keys, keyed by Form.List section field name. */
type OpenKeysBySection = Record<string, string[]>;

export default function MenuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<{ sections: MenuSectionForm[] }>();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const [upsertMenu, { loading }] = useMutation(UPSERT_MENU);
  const [updateRestaurant, { loading: savingMenuUrl }] = useMutation(UPDATE_RESTAURANT);
  const [menuUrl, setMenuUrl] = useState('');
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  /** Empty = all item accordions collapsed (default). */
  const [openKeys, setOpenKeys] = useState<OpenKeysBySection>({});
  /** Latest item keys per section, updated each render for expand-all. */
  const itemKeysRef = useRef<Record<string, string[]>>({});
  /** Form.List field name of the category shown in the side panel. */
  const [activeSectionName, setActiveSectionName] = useState<number>(0);
  const watchedSections = Form.useWatch('sections', form) as MenuSectionForm[] | undefined;
  /** Item counts from nested Form.List (authoritative; useWatch can lag on nested lists). */
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const restaurant = restaurants.find(
      (r: { id: string }) => r.id === activeRestaurantId,
    );
    if (!activeRestaurantId) return;

    setMenuUrl(restaurant?.menuUrl ?? '');

    const nextSections = restaurant?.menu?.sections?.length
      ? restaurant.menu.sections.map(
          (s: {
            name: string;
            items: Array<{
              name: string;
              description?: string;
              priceCents?: number;
              dietary?: string[];
              available?: boolean;
              photoUrl?: string;
            }>;
          }) => ({
            name: s.name,
            items: s.items.map((i) => ({
              name: i.name,
              description: i.description ?? '',
              price: (i.priceCents ?? 0) / 100,
              dietary: i.dietary ?? [],
              available: i.available ?? true,
              photoUrl: i.photoUrl ?? undefined,
            })),
          }),
        )
      : [
          {
            name: 'Starters',
            items: [{ ...EMPTY_ITEM, name: 'Soup', price: 12 }],
          },
        ];

    form.setFieldsValue({ sections: nextSections });
    setItemCounts(
      Object.fromEntries(nextSections.map((s, i) => [i, s.items.length])) as Record<
        number,
        number
      >,
    );
    setOpenKeys({});
    itemKeysRef.current = {};
    setActiveSectionName(0);
  }, [data, activeRestaurantId, form, restaurants]);

  // Keep the side-tab selection in range after removals.
  useEffect(() => {
    const len = watchedSections?.length ?? 0;
    if (len === 0) return;
    if (activeSectionName >= len) {
      setActiveSectionName(len - 1);
    }
  }, [watchedSections?.length, activeSectionName]);

  async function uploadPhoto(file: RcFile, sectionIndex: number, itemIndex: number) {
    if (file.size > 5 * 1024 * 1024) {
      message.error('File exceeds 5MB limit');
      return;
    }

    const path = `${sectionIndex}-${itemIndex}`;
    setUploadingPath(path);
    try {
      const { publicUrl } = await uploadFile(file, file.name);
      form.setFieldValue(['sections', sectionIndex, 'items', itemIndex, 'photoUrl'], publicUrl);
      message.success('Photo uploaded');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPath(null);
    }
  }

  return (
    <div component="MenuPage" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Menu editor
        </Title>
        <Select style={{ width: 240 }} {...restaurantSelectProps} />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!activeRestaurantId) return;
          const restaurant = restaurants.find(
            (r: { id: string }) => r.id === activeRestaurantId,
          );
          if (!restaurant) return;
          try {
            const sections = (values.sections ?? []).map((s) => ({
              name: s.name.trim(),
              items: (s.items ?? []).map((i) => ({
                name: i.name.trim(),
                description: i.description?.trim() || '',
                priceCents: Math.round((i.price ?? 0) * 100),
                dietary: i.dietary ?? [],
                available: i.available ?? true,
                photoUrl: i.photoUrl || undefined,
              })),
            }));
            await Promise.all([
              updateRestaurant({
                variables: {
                  id: activeRestaurantId,
                  input: {
                    ...buildRestaurantInput(restaurant),
                    menuUrl: menuUrl.trim() || undefined,
                  },
                },
              }),
              upsertMenu({ variables: { restaurantId: activeRestaurantId, input: { sections } } }),
            ]);
            message.success('Menu saved');
            refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Failed to save menu');
          }
        }}
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Full menu URL"
            extra='Optional link for "View full menu" on your public page — PDF, website menu, or third-party menu host.'
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="https://yourrestaurant.com/menu"
              value={menuUrl}
              onChange={(e) => setMenuUrl(e.target.value)}
            />
          </Form.Item>
        </Card>

        <Form.List name="sections">
          {(sections, { add: addSection, remove: removeSection }) => {
            const activeSection =
              sections.find((s) => s.name === activeSectionName) ?? sections[0] ?? null;
            const activeKey = activeSection ? String(activeSection.name) : '';

            const categoryMenuItems = sections.map((section, index) => {
              const sectionData = watchedSections?.[section.name];
              const label = sectionData?.name?.trim() || `Category ${index + 1}`;
              const itemCount =
                itemCounts[section.name] ??
                sectionData?.items?.length ??
                form.getFieldValue(['sections', section.name, 'items'])?.length ??
                0;
              return {
                key: String(section.name),
                label: (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                    <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                      {itemCount}
                    </Text>
                  </div>
                ),
              };
            });

            return (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <Card
                  size="small"
                  title="Categories"
                  styles={{ body: { padding: '8px 0' } }}
                  style={{
                    width: 240,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 16,
                  }}
                  extra={
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const nextIndex = sections.length;
                        addSection({ ...EMPTY_SECTION });
                        setItemCounts((prev) => ({
                          ...prev,
                          [nextIndex]: EMPTY_SECTION.items.length,
                        }));
                        setActiveSectionName(nextIndex);
                      }}
                      aria-label="Add category"
                    />
                  }
                >
                  <Menu
                    mode="inline"
                    selectedKeys={activeKey ? [activeKey] : []}
                    items={categoryMenuItems}
                    onClick={({ key }) => setActiveSectionName(Number(key))}
                    style={{ border: 'none' }}
                  />
                  {sections.length === 0 ? (
                    <Text type="secondary" style={{ display: 'block', padding: '8px 16px' }}>
                      No categories yet
                    </Text>
                  ) : null}
                </Card>

                <div style={{ flex: 1, minWidth: 280 }}>
                  <Space wrap style={{ marginBottom: 12 }}>
                    <Button
                      icon={<NodeExpandOutlined />}
                      onClick={() => {
                        if (!activeSection) return;
                        const keys = itemKeysRef.current[String(activeSection.name)] ?? [];
                        setOpenKeys((prev) => ({
                          ...prev,
                          [String(activeSection.name)]: [...keys],
                        }));
                      }}
                      disabled={!activeSection}
                    >
                      Expand items
                    </Button>
                    <Button
                      icon={<NodeCollapseOutlined />}
                      onClick={() => {
                        if (!activeSection) return;
                        setOpenKeys((prev) => ({
                          ...prev,
                          [String(activeSection.name)]: [],
                        }));
                      }}
                      disabled={!activeSection}
                    >
                      Collapse items
                    </Button>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Switch categories in the sidebar — items start collapsed
                    </Text>
                  </Space>

                  {sections.map((section) => {
                    const isActive = activeSection?.name === section.name;
                    return (
                      <div
                        key={section.key}
                        style={{ display: isActive ? 'block' : 'none' }}
                        aria-hidden={!isActive}
                      >
                        <Card
                          title={
                            <Form.Item
                              name={[section.name, 'name']}
                              rules={[{ required: true, message: 'Section name is required' }]}
                              style={{ marginBottom: 0, maxWidth: 360 }}
                            >
                              <Input placeholder="Section name (e.g. Mains)" />
                            </Form.Item>
                          }
                          extra={
                            <Space wrap size={4}>
                              <SectionExpandControls
                                sectionKey={String(section.name)}
                                itemKeysRef={itemKeysRef}
                                onExpand={(keys) =>
                                  setOpenKeys((prev) => ({
                                    ...prev,
                                    [String(section.name)]: keys,
                                  }))
                                }
                                onCollapse={() =>
                                  setOpenKeys((prev) => ({
                                    ...prev,
                                    [String(section.name)]: [],
                                  }))
                                }
                              />
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  const removing = section.name;
                                  const remaining = sections.filter((s) => s.name !== removing);
                                  const prevSibling = [...remaining]
                                    .reverse()
                                    .find((s) => s.name < removing);
                                  removeSection(removing);
                                  setActiveSectionName(
                                    remaining.length === 0
                                      ? 0
                                      : (prevSibling ?? remaining[0]!).name,
                                  );
                                }}
                                disabled={sections.length <= 1}
                              >
                                Remove section
                              </Button>
                            </Space>
                          }
                        >
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
                              />
                            )}
                          </Form.List>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
        </Form.List>

        <Button type="primary" htmlType="submit" loading={loading || savingMenuUrl} style={{ marginTop: 16 }}>
          Save menu
        </Button>
      </Form>
    </Space></div>
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
}: {
  section: FormListFieldData;
  items: FormListFieldData[];
  addItem: (defaultValue?: MenuItemForm) => void;
  removeItem: (index: number | number[]) => void;
  form: ReturnType<typeof Form.useForm<{ sections: MenuSectionForm[] }>>[0];
  openKeys: OpenKeysBySection;
  setOpenKeys: Dispatch<SetStateAction<OpenKeysBySection>>;
  itemKeysRef: MutableRefObject<Record<string, string[]>>;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
  setItemCounts: Dispatch<SetStateAction<Record<number, number>>>;
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
      <Collapse
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
            itemsLength: items.length,
            uploadingPath,
            uploadPhoto,
          }),
        )}
      />
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => addItem({ ...EMPTY_ITEM })} block>
        Add item
      </Button>
    </Space>
  );
}

function SectionExpandControls({
  sectionKey,
  itemKeysRef,
  onExpand,
  onCollapse,
}: {
  sectionKey: string;
  itemKeysRef: MutableRefObject<Record<string, string[]>>;
  onExpand: (keys: string[]) => void;
  onCollapse: () => void;
}) {
  return (
    <div component="SectionExpandControls" style={{ display: 'contents' }}><>
      <Button
        type="text"
        size="small"
        icon={<NodeExpandOutlined />}
        onClick={() => onExpand([...(itemKeysRef.current[sectionKey] ?? [])])}
      >
        Expand category
      </Button>
      <Button type="text" size="small" icon={<NodeCollapseOutlined />} onClick={onCollapse}>
        Collapse category
      </Button>
    </></div>
  );
}

function buildItemPanel({
  item,
  itemIndex,
  section,
  form,
  removeItem,
  itemsLength,
  uploadingPath,
  uploadPhoto,
}: {
  item: FormListFieldData;
  itemIndex: number;
  section: FormListFieldData;
  form: ReturnType<typeof Form.useForm<{ sections: MenuSectionForm[] }>>[0];
  removeItem: (index: number | number[]) => void;
  itemsLength: number;
  uploadingPath: string | null;
  uploadPhoto: (file: RcFile, sectionIndex: number, itemIndex: number) => Promise<void>;
}) {
  return {
    key: String(item.key),
    label: (
      <Form.Item shouldUpdate noStyle>
        {() => {
          const name =
            form.getFieldValue(['sections', section.name, 'items', item.name, 'name']) ||
            `Item ${itemIndex + 1}`;
          const price = form.getFieldValue([
            'sections',
            section.name,
            'items',
            item.name,
            'price',
          ]);
          return (
            <Text>
              {name}
              {typeof price === 'number' ? ` — $${price.toFixed(2)}` : ''}
            </Text>
          );
        }}
      </Form.Item>
    ),
    extra: (
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          removeItem(item.name);
        }}
        disabled={itemsLength <= 1}
      />
    ),
    children: (
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        <Form.Item
          name={[item.name, 'name']}
          label="Name"
          rules={[{ required: true, message: 'Item name is required' }]}
        >
          <Input placeholder="Dish name" />
        </Form.Item>
        <Form.Item name={[item.name, 'description']} label="Description">
          <Input.TextArea rows={2} placeholder="Short description" />
        </Form.Item>
        <Space wrap align="start" style={{ width: '100%' }}>
          <Form.Item
            name={[item.name, 'price']}
            label="Price ($)"
            rules={[{ required: true, message: 'Price is required' }]}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name={[item.name, 'available']} label="Available" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Form.Item name={[item.name, 'dietary']} label="Dietary tags">
          <Select
            mode="tags"
            placeholder="Select or type tags"
            options={DIETARY_OPTIONS}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name={[item.name, 'photoUrl']} label="Photo URL" hidden>
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
            const path = `${section.name}-${item.name}`;
            return (
              <Space orientation="vertical" size={8} style={{ marginBottom: 16 }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Menu item"
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
            );
          }}
        </Form.Item>
      </Space>
    ),
  };
}
