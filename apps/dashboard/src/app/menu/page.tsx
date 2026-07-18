'use client';

import { useEffect, useState } from 'react';
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
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
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

export default function MenuPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<{ sections: MenuSectionForm[] }>();
  const [restaurantId, setRestaurantId] = useState<string>();
  const { data, refetch } = useQuery(MY_RESTAURANTS, { skip: !user });
  const [upsertMenu, { loading }] = useMutation(UPSERT_MENU);
  const [createUploadUrl] = useMutation(CREATE_UPLOAD_URL);
  const [uploadingPath, setUploadingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const id = saved ?? data?.myRestaurants?.[0]?.id;
    setRestaurantId(id);
  }, [data]);

  useEffect(() => {
    const restaurant = (data?.myRestaurants ?? []).find((r: any) => r.id === restaurantId);
    if (!restaurantId) return;

    if (restaurant?.menu?.sections?.length) {
      form.setFieldsValue({
        sections: restaurant.menu.sections.map((s: any) => ({
          name: s.name,
          items: s.items.map((i: any) => ({
            name: i.name,
            description: i.description ?? '',
            price: (i.priceCents ?? 0) / 100,
            dietary: i.dietary ?? [],
            available: i.available ?? true,
            photoUrl: i.photoUrl ?? undefined,
          })),
        })),
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
    } catch (err: any) {
      message.error(err.message ?? 'Upload failed');
    } finally {
      setUploadingPath(null);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Menu editor</Title>
      <Select
        style={{ width: 280 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(data?.myRestaurants ?? []).map((r: any) => ({ value: r.id, label: r.name }))}
      />

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
          } catch (err: any) {
            message.error(err.message ?? 'Failed to save menu');
          }
        }}
      >
        <Form.List name="sections">
          {(sections, { add: addSection, remove: removeSection }) => (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeSection(section.name)}
                      disabled={sections.length <= 1}
                    >
                      Remove section
                    </Button>
                  }
                >
                  <Form.List name={[section.name, 'items']}>
                    {(items, { add: addItem, remove: removeItem }) => (
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Collapse
                          defaultActiveKey={items.map((item) => String(item.key))}
                          items={items.map((item, itemIndex) => ({
                            key: String(item.key),
                            label: (
                              <Form.Item shouldUpdate noStyle>
                                {() => {
                                  const name =
                                    form.getFieldValue([
                                      'sections',
                                      section.name,
                                      'items',
                                      item.name,
                                      'name',
                                    ]) || `Item ${itemIndex + 1}`;
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
                                disabled={items.length <= 1}
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
                                  <Form.Item
                                    name={[item.name, 'available']}
                                    label="Available"
                                    valuePropName="checked"
                                  >
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
                                            <Button
                                              icon={<UploadOutlined />}
                                              loading={uploadingPath === path}
                                            >
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
                          }))}
                        />
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => addItem({ ...EMPTY_ITEM })}
                          block
                        >
                          Add item
                        </Button>
                      </Space>
                    )}
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
