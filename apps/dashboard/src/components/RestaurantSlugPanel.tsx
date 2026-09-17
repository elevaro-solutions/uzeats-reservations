'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Form, Input, Space, Tag, Typography, message } from 'antd';
import { buildRestaurantBookingUrl, normalizeRestaurantSlug } from '@reservations/shared';
import { spacing } from '@reservations/ui';
import {
  CANCEL_RESTAURANT_SLUG_REQUEST,
  MY_RESTAURANT_SLUG_REQUEST,
  REQUEST_RESTAURANT_SLUG_CHANGE,
  RESTAURANT_SLUG_AVAILABLE,
} from '@/lib/graphql';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Text, Paragraph } = Typography;

type SlugRequest = {
  id: string;
  currentSlug: string;
  requestedSlug: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'denied';
  notes?: string | null;
};

type RestaurantSlugPanelProps = {
  restaurant: { id: string; slug?: string | null };
  canRequest: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  denied: 'red',
};

export function RestaurantSlugPanel({ restaurant, canRequest }: RestaurantSlugPanelProps) {
  const [form] = Form.useForm();
  const webUrl = getPublicWebUrl();
  const proposed = Form.useWatch('slug', form);
  const [checking, setChecking] = useState(false);

  const { data, refetch } = useQuery(MY_RESTAURANT_SLUG_REQUEST, {
    skip: !restaurant.id || !canRequest,
    variables: { restaurantId: restaurant.id },
  });
  const [requestChange, { loading: submitting }] = useMutation(REQUEST_RESTAURANT_SLUG_CHANGE);
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_RESTAURANT_SLUG_REQUEST);
  const [checkSlug] = useLazyQuery(RESTAURANT_SLUG_AVAILABLE);

  const request = data?.myRestaurantSlugRequest as SlugRequest | null | undefined;
  const pending = request?.status === 'pending' ? request : null;
  const latestDenied =
    request?.status === 'denied' && request.notes !== 'Cancelled by restaurant owner' ? request : null;

  const currentUrl = useMemo(
    () =>
      buildRestaurantBookingUrl(webUrl, {
        slug: restaurant.slug,
        id: restaurant.id,
      }),
    [restaurant.id, restaurant.slug, webUrl],
  );

  const previewSlug = normalizeRestaurantSlug(proposed || '');
  const previewUrl = previewSlug
    ? buildRestaurantBookingUrl(webUrl, { slug: previewSlug, id: restaurant.id })
    : currentUrl;

  useEffect(() => {
    if (pending) {
      form.setFieldsValue({ slug: pending.requestedSlug, reason: pending.reason ?? '' });
    }
  }, [pending, form]);

  if (!canRequest) {
    return (
      <div>
        <Text type="secondary">Public URL</Text>
        <Paragraph copyable={{ text: currentUrl }} style={{ marginBottom: 0 }}>
          <a href={currentUrl} target="_blank" rel="noreferrer">
            {currentUrl}
          </a>
        </Paragraph>
      </div>
    );
  }

  const onFinish = async (values: { slug: string; reason?: string }) => {
    const slug = normalizeRestaurantSlug(values.slug);
    if (slug === restaurant.slug) {
      message.info('That is already your public URL');
      return;
    }
    setChecking(true);
    try {
      const availability = await checkSlug({
        variables: { slug, excludeRestaurantId: restaurant.id },
      });
      if (!availability.data?.restaurantSlugAvailable) {
        message.error('That URL is already in use or is not allowed');
        return;
      }
      await requestChange({
        variables: {
          input: {
            restaurantId: restaurant.id,
            slug,
            reason: values.reason?.trim() || undefined,
          },
        },
      });
      message.success('URL change requested. We will review it shortly.');
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to request URL change');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <Text type="secondary">Current public URL</Text>
      <Paragraph copyable={{ text: currentUrl }} style={{ marginBottom: spacing.sm }}>
        <a href={currentUrl} target="_blank" rel="noreferrer">
          {currentUrl}
        </a>
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: spacing.md }}>
        Owners cannot change the booking URL directly. Request a new slug and a Tablevera admin will
        review it. Previous URLs keep working after a change.
      </Paragraph>

      {pending && (
        <Space wrap style={{ marginBottom: spacing.md }}>
          <Tag color={STATUS_COLORS.pending}>Pending review</Tag>
          <Text>
            Requested <Text code>/restaurants/{pending.requestedSlug}</Text>
          </Text>
          <Button
            size="small"
            loading={cancelling}
            onClick={async () => {
              await cancelRequest({ variables: { id: pending.id } });
              message.success('Request cancelled');
              form.resetFields();
              await refetch();
            }}
          >
            Cancel request
          </Button>
        </Space>
      )}

      {latestDenied && !pending && (
        <Paragraph type="secondary">
          Last request for <Text code>/restaurants/{latestDenied.requestedSlug}</Text> was declined
          {latestDenied.notes ? `: ${latestDenied.notes}` : '.'}
        </Paragraph>
      )}

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
        <Form.Item
          name="slug"
          label="Requested slug"
          extra={previewSlug ? previewUrl : 'Lowercase letters, numbers, and hyphens'}
          rules={[{ required: true, message: 'Enter a slug' }]}
        >
          <Input
            placeholder={restaurant.slug || 'my-restaurant'}
            onBlur={() => {
              const value = form.getFieldValue('slug');
              if (value) form.setFieldValue('slug', normalizeRestaurantSlug(value));
            }}
          />
        </Form.Item>
        <Form.Item name="reason" label="Reason (optional)">
          <Input.TextArea rows={2} maxLength={500} placeholder="Why should this URL change?" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting || checking}>
          {pending ? 'Update request' : 'Request URL change'}
        </Button>
      </Form>
    </div>
  );
}
