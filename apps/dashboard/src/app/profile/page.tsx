'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Alert, Button, Card, Divider, Form, Input, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, ImportOutlined, ReadOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  CANCEL_RESTAURANT_PROFILE_CHANGE_REQUEST,
  MY_RESTAURANTS,
  MY_RESTAURANT_PROFILE_CHANGE_REQUEST,
  REQUEST_RESTAURANT_PROFILE_CHANGE,
  RESTAURANT_PROFILE,
  UPSERT_MENU,
} from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';
import PhotoUpload from '@/components/PhotoUpload';
import { RestaurantProfileFields } from '@/components/RestaurantProfileFields';
import ImportRestaurantModal, { type ImportedRestaurantData } from '@/components/ImportRestaurantModal';
import { applyRestaurantImportToForm } from '@/lib/applyRestaurantImport';
import { buildMenuSectionsFromImport } from '@/lib/importedMenu';
import { uploadImportedMenuImageToSpaces } from '@/lib/importMenuImages';
import {
  profileChangeFromForm,
  profileValuesFromChange,
  profileValuesFromRestaurant,
  type RestaurantProfileFormValues,
} from '@/lib/restaurantInput';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  denied: 'red',
};

type ProfileChangeSnapshot = {
  description?: string | null;
  neighborhood?: string | null;
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
  termsAndConditions?: string | null;
  photos?: string[];
  logoUrl?: string | null;
};

type ProfileChangeRequest = {
  id: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'denied';
  notes?: string | null;
  proposed: ProfileChangeSnapshot;
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<RestaurantProfileFormValues & { reason?: string }>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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
  const { data: requestData, refetch: refetchRequest } = useQuery(MY_RESTAURANT_PROFILE_CHANGE_REQUEST, {
    skip: !restaurantId,
    variables: { restaurantId },
  });

  const [requestChange, { loading: saving }] = useMutation(REQUEST_RESTAURANT_PROFILE_CHANGE);
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_RESTAURANT_PROFILE_CHANGE_REQUEST);
  const [upsertMenu] = useMutation(UPSERT_MENU);

  const restaurant = profileData?.restaurant;
  const request = requestData?.myRestaurantProfileChangeRequest as ProfileChangeRequest | null | undefined;
  const pending = request?.status === 'pending' ? request : null;
  const latestDenied =
    request?.status === 'denied' && request.notes !== 'Cancelled by restaurant' ? request : null;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!restaurant) return;
    const source = pending?.proposed;
    form.setFieldsValue({
      ...(source ? profileValuesFromChange(source) : profileValuesFromRestaurant(restaurant)),
      reason: pending?.reason ?? '',
    });
    setPhotos(source?.photos ?? restaurant.photos ?? []);
    setLogoUrl(source?.logoUrl ?? restaurant.logoUrl ?? null);
  }, [restaurant, pending, form]);

  const handleSave = async (values: RestaurantProfileFormValues & { reason?: string }) => {
    if (!restaurant) return;
    try {
      await requestChange({
        variables: {
          input: {
            restaurantId: restaurant.id,
            profile: profileChangeFromForm(values, photos, logoUrl),
            reason: values.reason?.trim() || undefined,
          },
        },
      });
      message.success(
        pending
          ? 'Profile change request updated. We will review it shortly.'
          : 'Profile change requested. We will review it shortly.',
      );
      await Promise.all([refetch(), refetchRequest()]);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to request profile change');
    }
  };

  const handleImport = (data: ImportedRestaurantData) => {
    applyRestaurantImportToForm(form, data);

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

    if (restaurant?.id && (data.menuItems?.length ?? 0) > 0) {
      void (async () => {
        // Persist menu text immediately; DoorDash item image uploads can be slow/flaky.
        const quickSections = await buildMenuSectionsFromImport(data);
        if (quickSections.length === 0) return;

        await upsertMenu({
          variables: {
            restaurantId: restaurant.id,
            input: { sections: quickSections },
          },
        });
        message.success(`Imported and saved ${data.menuItems?.length ?? 0} menu items to Menu.`);
        await refetch();

        const hasImages = (data.menuItems ?? []).some((item) => Boolean(item.imageUrl));
        if (!hasImages) return;

        const withPhotos = await buildMenuSectionsFromImport(data, {
          resolvePhotoUrl: async (item, index) => {
            if (!item.imageUrl) return undefined;
            return uploadImportedMenuImageToSpaces({
              imageUrl: item.imageUrl,
              filenameHint: `menu-item-${index + 1}.jpg`,
            });
          },
        });
        await upsertMenu({
          variables: {
            restaurantId: restaurant.id,
            input: { sections: withPhotos },
          },
        });
        await refetch();
      })().catch((err: unknown) => {
        message.warning(
          `Profile details were imported, but menu items failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      });
    }

    requestAnimationFrame(() => {
      form.scrollToField('description', { behavior: 'smooth', block: 'center' });
    });
    message.success(`Imported "${data.name ?? 'restaurant'}" — confirm the details, then request review.`);
  };

  if (listLoading || authLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  return (
    <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Public profile"
        subtitle="Request diner-facing updates — photos, features, FAQ, and press mentions go live after a Tablevera review"
        extra={
          <Space wrap>
            <Button icon={<ImportOutlined />} onClick={() => setShowImport(true)}>
              Import from DoorDash / Uber Eats
            </Button>
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
          </Space>
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
          {pending && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: spacing.md }}
              message={
                <Space wrap>
                  <Tag color={STATUS_COLORS.pending}>Pending review</Tag>
                  <Text>Diners still see the current live profile until an admin approves this request.</Text>
                  <Button
                    size="small"
                    loading={cancelling}
                    onClick={async () => {
                      await cancelRequest({ variables: { id: pending.id } });
                      message.success('Request cancelled');
                      form.setFieldValue('reason', '');
                      await refetchRequest();
                    }}
                  >
                    Cancel request
                  </Button>
                </Space>
              }
            />
          )}
          {latestDenied && !pending && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: spacing.md }}
              message={`Last request was declined${latestDenied.notes ? `: ${latestDenied.notes}` : '.'}`}
            />
          )}

          <Form form={form} layout="vertical" onFinish={handleSave}>
            <div style={{ marginBottom: spacing.md }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                Logo
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                Square mark shown next to your name on the public restaurant page.
              </Text>
              <PhotoUpload
                value={logoUrl ? [logoUrl] : []}
                onChange={(urls) => setLogoUrl(urls[0] ?? null)}
                maxCount={1}
                alt="Restaurant logo"
              />
            </div>

            <div style={{ marginBottom: spacing.md }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                Photos
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                Up to 10 photos. Drag to reorder the public hero — first is large, the next two
                sit beside it, and the rest appear in the gallery.
              </Text>
              <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
            </div>

            <Divider />

            <RestaurantProfileFields />

            <Form.Item
              name="reason"
              label="Reason (optional)"
              extra="A short note helps the reviewer understand what changed."
            >
              <Input.TextArea rows={2} maxLength={500} placeholder="Why should this public profile change?" />
            </Form.Item>

            <div style={{ marginTop: spacing.lg }}>
              <Button type="primary" htmlType="submit" loading={saving} size="large">
                {pending ? 'Update request' : 'Request profile change'}
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <Card>
          <Text type="secondary">Select a restaurant to edit its public profile.</Text>
        </Card>
      )}
      <ImportRestaurantModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        excludeRestaurantId={restaurantId}
      />
    </Space>
  );
}
