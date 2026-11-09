'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { PageHeader } from '@reservations/ui';
import {
  ADMIN_RESTAURANTS,
  SEND_PLATFORM_ENGAGEMENT_EMAIL,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { RichTextEditor } from '@/components/RichTextEditor';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const AUDIENCE_STATUSES = {
  booked: ['pending', 'confirmed', 'seated', 'completed', 'no_show'],
  visited: ['completed'],
} as const;
type AudienceKind = keyof typeof AUDIENCE_STATUSES;

export default function AdminEngagementPage() {
  const { ready } = useRequireAdmin();
  const [form] = Form.useForm();
  const { data } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit: 200 },
  });
  const [sendEmail, { loading }] = useMutation(SEND_PLATFORM_ENGAGEMENT_EMAIL);
  const [lastResult, setLastResult] = useState<{ sent: number; recipientCount: number } | null>(
    null,
  );

  if (!ready) return null;

  const restaurants = data?.adminRestaurants?.items ?? [];

  const onFinish = async (values: {
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    restaurantId?: string;
    audience?: AudienceKind;
    limit?: number;
  }) => {
    try {
      const { data: result } = await sendEmail({
        variables: {
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          bodyText: values.bodyText || null,
          restaurantId: values.restaurantId || null,
          reservationStatuses: [...AUDIENCE_STATUSES[values.audience ?? 'booked']],
          limit: values.limit ?? 100,
        },
      });
      const payload = result?.sendPlatformEngagementEmail;
      setLastResult(payload ?? null);
      message.success(
        `Sent ${payload?.sent ?? 0} of ${payload?.recipientCount ?? 0} engagement emails`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  return (
    <div component="AdminEngagementPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <PageHeader
          title="Engagement email"
          subtitle="Send a one-off platform email to diners (optionally filtered by restaurant). Use {{firstName}} in the subject or body."
        />
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              limit: 100,
              audience: 'booked',
              bodyHtml: '<p>Hi {{firstName}},</p><p></p>',
            }}
          >
            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true, min: 3, message: 'Subject is required' }]}
            >
              <Input placeholder="We’d love to see you again" />
            </Form.Item>
            <Form.Item name="restaurantId" label="Restaurant audience (optional)">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="All diners"
                options={(Array.isArray(restaurants) ? restaurants : []).map(
                  (r: { id: string; name: string }) => ({
                    value: r.id,
                    label: r.name,
                  }),
                )}
              />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, next) => prev.restaurantId !== next.restaurantId}
            >
              {({ getFieldValue }) =>
                getFieldValue('restaurantId') ? (
                  <Form.Item name="audience" label="Restaurant guests to include">
                    <Select
                      style={{ maxWidth: 420 }}
                      options={[
                        {
                          value: 'booked',
                          label: 'Everyone who booked (upcoming and past)',
                        },
                        { value: 'visited', label: 'Past guests only (completed visits)' },
                      ]}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
            <Form.Item
              name="limit"
              label="Max recipients"
              extra="Hard capped at 500 per send."
              rules={[{ type: 'number', min: 1, max: 500 }]}
            >
              <InputNumber min={1} max={500} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="bodyHtml"
              label="HTML body"
              rules={[{ required: true, min: 10, message: 'Body is required' }]}
            >
              <RichTextEditor minHeight={220} placeholder="Email body…" />
            </Form.Item>
            <Form.Item name="bodyText" label="Plain text (optional)">
              <TextArea rows={4} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Send engagement email
            </Button>
          </Form>
          {lastResult ? (
            <Paragraph style={{ marginTop: 16 }}>
              <Text type="secondary">
                Last send: {lastResult.sent} delivered / {lastResult.recipientCount} matched
              </Text>
            </Paragraph>
          ) : null}
        </Card>
      </Space>
    </div>
  );
}
