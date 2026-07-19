'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
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
import { MY_RESTAURANTS, UPSERT_MENU, CREATE_UPLOAD_URL } from '@/lib/graphql';

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
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [upsertMenu, { loading }] = useMutation(UPSERT_MENU);
  const [createUploadUrl] = useMutation(CREATE_UPLOAD_URL);
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);
  /** Empty = all item accordions collapsed (default). */
  const [openKeys, setOpenKeys] = useState<OpenKeysBySection>({});
  /** Latest item keys per section, updated each render for expand-all. */
  const itemKeysRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const id = saved ?? data?.myRestaurants?.[0]?.id;
    setRestaurantId(id);
  }, [data]);

  useEffect(() => {
    const restaurant = (data?.myRestaurants ?? []).find(
      (r: { id: string }) => r.id === restaurantId,
    );
    if (!restaurantId) return;

    if (restaurant?.menu?.sections?.length) {
      form.setFieldsValue({
        sections: restaurant.menu.sections.map(
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
        ),
      });
    } else {
      form.setFieldsValue({
        sections: [
          {
            name: 'Starters',
            items: [{ ...EMPTY_ITEM, name: 'Soup', price: 12 }],
          },
        ],
      });
    }
    setOpenKeys({});
    itemKeysRef.current = {};
  }, [data, restaurantId, form]);

  async function uploadPhoto(file: RcFile, sectionIndex: number, itemIndex: number) {
    if (file.size > 5 * 1024 * 1024) {
      message.error('File exceeds 5MB limit');
      return;
    }

    const path = `${sectionIndex}-${itemIndex}`;
    setUploadingPath(path);
    try {
      const { data: upload } = await createUploadUrl({
        variables: { filename: file.name, contentType: file.type },
      });
      const { uploadUrl, publicUrl } = upload.createUploadUrl;
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      form.setFieldValue(['sections', sectionIndex, 'items', itemIndex, 'photoUrl'], publicUrl);
      message.success('Photo uploaded');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPath(null);
    }
  }

  const expandAll = () => {
    const next: OpenKeysBySection = {};
    Object.entries(itemKeysRef.current).forEach(([sectionKey, keys]) => {
      next[sectionKey] = [...keys];
    });
    setOpenKeys(next);
  };

  const collapseAll = () => {
    const next: OpenKeysBySection = {};
    Object.keys(itemKeysRef.current).forEach((sectionKey) => {
      next[sectionKey] = [];
    });
    setOpenKeys(next);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
        <Select
          style={{ width: 240 }}
          value={restaurantId}
          onChange={(id) => {
            setRestaurantId(id);
            localStorage.setItem('activeRestaurantId', id);
          }}
          options={(data?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
            value: r.id,
            label: r.name,
          }))}
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!restaurantId) return;
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
            await upsertMenu({ variables: { restaurantId, input: { sections } } });
            message.success('Menu saved');
            refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Failed to save menu');
          }
        }}
      >
        <Form.List name="sections">
          {(sections, { add: addSection, remove: removeSection }) => (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space wrap>
                <Button icon={<NodeExpandOutlined />} onClick={expandAll}>
                  Expand all categories
                </Button>
                <Button icon={<NodeCollapseOutlined />} onClick={collapseAll}>
                  Collapse all categories
                </Button>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Items start collapsed — expand a dish or use the controls to open by category
                </Text>
              </Space>

              {sections.map((section) => (
                <Card
                  key={section.key}
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
                          setOpenKeys((prev) => ({ ...prev, [String(section.name)]: keys }))
                        }
                        onCollapse={() =>
                          setOpenKeys((prev) => ({ ...prev, [String(section.name)]: [] }))
                        }
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeSection(section.name)}
                        disabled={sections.length <= 1}
                      >
                        Remove section
                      </Button>
                    </Space>
                  }
                >
                  <Form.List name={[section.name, 'items']}>
                    {(items, { add: addItem, remove: removeItem }) => {
                      const panelKeys = items.map((item) => String(item.key));
                      itemKeysRef.current[String(section.name)] = panelKeys;

                      return (
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              addItem({ ...EMPTY_ITEM });
                              // Newly added panel key isn't known until next render;
                              // leave collapsed to match default behavior.
                            }}
                            block
                          >
                            Add item
                          </Button>
                        </Space>
                      );
                    }}
                  </Form.List>
                </Card>
              ))}

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => addSection({ ...EMPTY_SECTION })}
                block
              >
                Add section
              </Button>
            </Space>
          )}
        </Form.List>

        <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 16 }}>
          Save menu
        </Button>
      </Form>
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
    <>
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
    </>
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
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
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
              <Space direction="vertical" size={8} style={{ marginBottom: 16 }}>
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
