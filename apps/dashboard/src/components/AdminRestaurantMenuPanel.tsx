'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@/lib/apollo-hooks';
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
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { UPSERT_MENU, UPDATE_RESTAURANT } from '@/lib/graphql';
import { buildRestaurantInput } from '@/lib/restaurantInput';
import type { AdminRestaurantRecord } from '@/components/AdminManageRestaurant';

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
  photoUrl?: string;
};

type MenuSectionForm = {
  name: string;
  items: MenuItemForm[];
};

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
        photoUrl?: string | null;
      }>;
    }>;
  } | null;
};

export function AdminRestaurantMenuPanel({
  restaurant,
  onSaved,
}: {
  restaurant: RestaurantWithMenu;
  onSaved?: () => void;
}) {
  const [form] = Form.useForm<{ sections: MenuSectionForm[]; menuUrl: string }>();
  const [upsertMenu, { loading: savingMenu }] = useMutation(UPSERT_MENU);
  const [updateRestaurant, { loading: savingUrl }] = useMutation(UPDATE_RESTAURANT);

  useEffect(() => {
    const sections = restaurant.menu?.sections?.length
      ? restaurant.menu.sections.map((s) => ({
          name: s.name,
          items: (s.items ?? []).map((i) => ({
            name: i.name,
            description: i.description ?? '',
            price: (i.priceCents ?? 0) / 100,
            dietary: i.dietary ?? [],
            available: i.available ?? true,
            photoUrl: i.photoUrl ?? undefined,
          })),
        }))
      : [{ name: 'Starters', items: [{ name: '', description: '', price: 0, dietary: [], available: true }] }];
    form.setFieldsValue({
      sections,
      menuUrl: restaurant.menuUrl ?? '',
    });
  }, [restaurant, form]);

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const sections = (values.sections ?? []).map((s) => ({
        name: s.name.trim(),
        items: (s.items ?? [])
          .filter((i) => i.name?.trim())
          .map((i) => ({
            name: i.name.trim(),
            description: i.description?.trim() || '',
            priceCents: Math.round((i.price ?? 0) * 100),
            dietary: i.dietary ?? [],
            available: i.available ?? true,
            photoUrl: i.photoUrl || undefined,
          })),
      }));
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
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save menu');
    }
  };

  return (
    <Card>
      <Form form={form} layout="vertical">
        <Form.Item
          name="menuUrl"
          label="Full menu URL"
          extra='Optional link for "View full menu" on the public page.'
        >
          <Input placeholder="https://yourrestaurant.com/menu" />
        </Form.Item>

        <Form.List name="sections">
          {(sectionFields, { add: addSection, remove: removeSection }) => (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {sectionFields.map((sectionField) => (
                <Card
                  key={sectionField.key}
                  size="small"
                  title={
                    <Form.Item
                      {...sectionField}
                      name={[sectionField.name, 'name']}
                      rules={[{ required: true, message: 'Section name required' }]}
                      style={{ marginBottom: 0, maxWidth: 280 }}
                    >
                      <Input placeholder="Section name" />
                    </Form.Item>
                  }
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeSection(sectionField.name)}
                    />
                  }
                >
                  <Form.List name={[sectionField.name, 'items']}>
                    {(itemFields, { add: addItem, remove: removeItem }) => (
                      <Collapse
                        size="small"
                        items={itemFields.map((itemField) => ({
                          key: String(itemField.key),
                          label: (
                            <Form.Item
                              {...itemField}
                              name={[itemField.name, 'name']}
                              noStyle
                              shouldUpdate
                            >
                              <Input
                                placeholder="Item name"
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: 240 }}
                              />
                            </Form.Item>
                          ),
                          extra: (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(itemField.name);
                              }}
                            />
                          ),
                          children: (
                            <Space orientation="vertical" style={{ width: '100%' }} size="small">
                              <Form.Item
                                {...itemField}
                                name={[itemField.name, 'description']}
                                label="Description"
                                style={{ marginBottom: 8 }}
                              >
                                <Input.TextArea rows={2} />
                              </Form.Item>
                              <Space wrap>
                                <Form.Item
                                  {...itemField}
                                  name={[itemField.name, 'price']}
                                  label="Price ($)"
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber min={0} step={0.01} style={{ width: 120 }} />
                                </Form.Item>
                                <Form.Item
                                  {...itemField}
                                  name={[itemField.name, 'dietary']}
                                  label="Dietary"
                                  style={{ marginBottom: 0, minWidth: 200 }}
                                >
                                  <Select mode="multiple" options={DIETARY_OPTIONS} allowClear />
                                </Form.Item>
                                <Form.Item
                                  {...itemField}
                                  name={[itemField.name, 'available']}
                                  label="Available"
                                  valuePropName="checked"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Switch />
                                </Form.Item>
                              </Space>
                            </Space>
                          ),
                        }))}
                      />
                    )}
                  </Form.List>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      addItem({
                        name: '',
                        description: '',
                        price: 0,
                        dietary: [],
                        available: true,
                      })
                    }
                    style={{ marginTop: 12 }}
                    block
                  >
                    Add item
                  </Button>
                </Card>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() =>
                  addSection({
                    name: 'New section',
                    items: [{ name: '', description: '', price: 0, dietary: [], available: true }],
                  })
                }
                block
              >
                Add section
              </Button>
            </Space>
          )}
        </Form.List>

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" loading={savingMenu || savingUrl} onClick={() => void onSave()}>
            Save menu
          </Button>
          <Text type="secondary">
            {(restaurant.menu?.sections ?? []).reduce((n, s) => n + (s.items?.length ?? 0), 0)}{' '}
            items currently stored
          </Text>
        </Space>
      </Form>
    </Card>
  );
}
