'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Divider, Form, Select, Space, Spin, Typography, message } from 'antd';
import { ArrowRightOutlined, ReadOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_RESTAURANTS, RESTAURANT_PROFILE, UPDATE_RESTAURANT } from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import PhotoUpload from '@/components/PhotoUpload';
import { RestaurantProfileFields } from '@/components/RestaurantProfileFields';
import {
  buildRestaurantInput,
  profileValuesFromRestaurant,
  type RestaurantProfileFormValues,
} from '@/lib/restaurantInput';

const { Text } = Typography;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<RestaurantProfileFormValues>();
  const [photos, setPhotos] = useState<string[]>([]);

  const { data: listData, loading: listLoading } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (listData?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [listData],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);

  const { data: profileData, loading: profileLoading, refetch } = useQuery(RESTAURANT_PROFILE, {
    skip: !restaurantId,
    variables: { id: restaurantId },
  });

  const [updateRestaurant, { loading: saving }] = useMutation(UPDATE_RESTAURANT);

  const restaurant = profileData?.restaurant;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!restaurant) return;
    form.setFieldsValue(profileValuesFromRestaurant(restaurant));
    setPhotos(restaurant.photos ?? []);
  }, [restaurant, form]);

  const handleSave = async (values: RestaurantProfileFormValues) => {
    if (!restaurant) return;
    try {
      await updateRestaurant({
        variables: {
          id: restaurant.id,
          input: buildRestaurantInput(restaurant, values, photos),
        },
      });
      message.success('Public profile updated');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (listLoading || authLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  return (
    <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Public profile"
        subtitle="Manage what diners see on your restaurant page — photos, features, FAQ, and press mentions"
        extra={
          <Select
            style={{ width: 260 }}
            value={restaurantId}
            onChange={setRestaurantId}
            options={(listData?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
              value: r.id,
              label: r.name,
            }))}
            placeholder="Select restaurant"
          />
        }
      />

      <Card
        size="small"
        style={{ borderRadius: radii.lg, borderColor: colors.brand[100], background: colors.brand[50] }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ReadOutlined style={{ fontSize: 18, color: colors.brand[600], marginTop: 2 }} />
            <div>
              <Text strong>Menu</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Edit sections, dishes, prices, and dietary tags separately.
                </Text>
              </div>
            </div>
          </div>
          <Link href="/menu">
            <Button icon={<ArrowRightOutlined />} iconPlacement="end">
              Edit menu
            </Button>
          </Link>
        </div>
      </Card>

      {profileLoading && !restaurant ? (
        <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
      ) : restaurant ? (
        <Card className="rt-surface-card" styles={{ body: { padding: spacing.lg } }} style={{ borderRadius: radii.lg }}>
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <div style={{ marginBottom: spacing.md }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                Photos
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                Up to 10 photos shown in your gallery. The first photo is the hero image.
              </Text>
              <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
            </div>

            <Divider />

            <RestaurantProfileFields />

            <div style={{ marginTop: spacing.lg }}>
              <Button type="primary" htmlType="submit" loading={saving} size="large">
                Save public profile
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <Card>
          <Text type="secondary">Select a restaurant to edit its public profile.</Text>
        </Card>
      )}
    </Space>
  );
}
