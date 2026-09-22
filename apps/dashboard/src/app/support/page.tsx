'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons';
import {
  OWNER_SUPPORT_TICKET_SUBJECTS,
  htmlToPlainText,
} from '@reservations/shared';
import { EmptyState, PageHeader, colors, radii, shadows, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { CREATE_OWNER_SUPPORT_TICKET, MY_OWNER_SUPPORT_TICKETS, MY_RESTAURANTS } from '@/lib/graphql';
import { STATUS_COLORS } from '@/lib/supportTickets';
import { RichTextEditor } from '@/components/RichTextEditor';
import SupportAttachmentUpload, {
  type SupportAttachmentDraft,
} from '@/components/SupportAttachmentUpload';
import { SupportHtml } from '@/components/SupportHtml';

const { Text } = Typography;

type TicketItem = {
  id: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  restaurant?: { id: string; name: string } | null;
  createdAt: string;
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    contentType: string;
    size?: number | null;
  }>;
};

const SUBJECT_OPTIONS = OWNER_SUPPORT_TICKET_SUBJECTS.map((subject) => ({
  value: subject.key,
  label: subject.label,
}));

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export default function PartnerSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [formOpen, setFormOpen] = useState(false);
  const subjectKey = Form.useWatch('subjectKey', form);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantOptions } = usePartnerRestaurant(restaurants);

  const { data, loading, refetch } = useQuery(MY_OWNER_SUPPORT_TICKETS, {
    skip: !user,
    variables: { limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const [createTicket, { loading: creating }] = useMutation(CREATE_OWNER_SUPPORT_TICKET);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!formOpen) return;
    form.setFieldsValue({
      restaurantId: activeRestaurantId || undefined,
    });
  }, [formOpen, activeRestaurantId, form]);

  if (authLoading || !user) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const tickets: TicketItem[] = data?.myOwnerSupportTickets?.items ?? [];

  const onCreate = async (values: {
    subjectKey: string;
    subject?: string;
    description: string;
    restaurantId?: string;
    attachments?: SupportAttachmentDraft[];
  }) => {
    try {
      await createTicket({
        variables: {
          input: {
            subjectKey: values.subjectKey,
            subject: values.subjectKey === 'other' ? values.subject?.trim() : undefined,
            description: values.description,
            restaurantId: values.restaurantId || undefined,
            attachments: values.attachments ?? [],
          },
        },
      });
      message.success('Support ticket opened');
      form.resetFields();
      setFormOpen(false);
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not open ticket');
    }
  };

  return (
    <div component="PartnerSupportPage" style={{ maxWidth: 800 }}>
      <PageHeader
        title="Support"
        subtitle="Ask Tablevera about billing, restaurant settings, or the dashboard. We typically reply within 1–2 business days."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? 'Close form' : 'New ticket'}
          </Button>
        }
      />

      {formOpen ? (
        <Card
          style={{
            marginBottom: spacing.lg,
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={onCreate}
            initialValues={{
              subjectKey: 'general_inquiry',
              restaurantId: activeRestaurantId || undefined,
              attachments: [],
            }}
          >
            <Form.Item
              name="subjectKey"
              label="Topic"
              rules={[{ required: true, message: 'Choose a topic' }]}
            >
              <Select options={SUBJECT_OPTIONS} />
            </Form.Item>
            {subjectKey === 'other' ? (
              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: 'Enter a subject' }]}
              >
                <Input maxLength={200} placeholder="Short summary" />
              </Form.Item>
            ) : null}
            {restaurantOptions.length > 0 ? (
              <Form.Item name="restaurantId" label="Restaurant">
                <Select
                  allowClear
                  placeholder="Related restaurant (optional)"
                  options={restaurantOptions}
                />
              </Form.Item>
            ) : null}
            <Form.Item
              name="description"
              label="Details"
              rules={[
                { required: true, message: 'Describe the issue' },
                {
                  validator: async (_, value: string) => {
                    if (htmlToPlainText(value ?? '').length < 10) {
                      throw new Error('Please enter at least 10 characters');
                    }
                  },
                },
              ]}
              extra="Format the message as needed. Screenshots help us reproduce bugs."
            >
              <RichTextEditor
                minHeight={180}
                placeholder="Include location names, error messages, or anything else that helps us help you."
              />
            </Form.Item>
            <Form.Item
              name="attachments"
              label="Screenshots"
              extra="JPEG, PNG, WebP, or GIF — up to 8 images, 10 MB each"
            >
              <SupportAttachmentUpload />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              Submit ticket
            </Button>
          </Form>
        </Card>
      ) : null}

      {loading && tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<CustomerServiceOutlined />}
          title="No support tickets yet"
          description="Open a ticket for billing, onboarding, dashboard bugs, or restaurant settings. Platform admins see it in Tickets."
          action={
            <Button type="primary" onClick={() => setFormOpen(true)}>
              New ticket
            </Button>
          }
        />
      ) : (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.bordersubtle}`,
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Text strong>{ticket.subject}</Text>
                <Tag color={STATUS_COLORS[ticket.status] ?? 'default'}>{formatStatus(ticket.status)}</Tag>
              </div>
              {ticket.restaurant?.name ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  {ticket.restaurant.name}
                </Text>
              ) : null}
              <div style={{ margin: '8px 0 0' }}>
                <SupportHtml html={ticket.description} />
              </div>
              {(ticket.attachments ?? []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {ticket.attachments!.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      title={attachment.filename}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.filename}
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: `1px solid ${colors.bordersubtle}`,
                        }}
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 8 }}>
                Opened {new Date(ticket.createdAt).toLocaleString('en-US')}
              </Text>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
}
