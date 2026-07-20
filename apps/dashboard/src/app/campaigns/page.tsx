'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  CAMPAIGNS,
  CREATE_CAMPAIGN,
  UPDATE_CAMPAIGN,
  DELETE_CAMPAIGN,
  SEND_CAMPAIGN,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  scheduled: 'blue',
  sent: 'green',
  cancelled: 'red',
};

function CampaignsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(CAMPAIGNS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
  });
  const [createCampaign, { loading: creating }] = useMutation(CREATE_CAMPAIGN);
  const [updateCampaign, { loading: updating }] = useMutation(UPDATE_CAMPAIGN);
  const [deleteCampaign] = useMutation(DELETE_CAMPAIGN);
  const [sendCampaign] = useMutation(SEND_CAMPAIGN);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        name: values.name,
        subject: values.subject,
        body: values.body,
        targetTags: values.targetTags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [],
        targetVipStatus: values.targetVipStatus || undefined,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
      };
      if (editingId) {
        await updateCampaign({ variables: { id: editingId, input } });
        message.success('Campaign updated');
      } else {
        await createCampaign({ variables: { restaurantId, input } });
        message.success(input.scheduledAt ? 'Campaign scheduled' : 'Campaign saved as draft');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await sendCampaign({ variables: { id } });
      message.success(
        `Campaign sent to ${res.data?.sendCampaign?.recipientCount ?? 0} guests`,
      );
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to send');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Email campaigns</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          New campaign
        </Button>
      </div>
      <Text type="secondary">
        Target guests by tag or VIP status. Use {'{{firstName}}'} and {'{{restaurantName}}'} in
        the body for personalization. Requires the Pro plan.
      </Text>

      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({
          value: r.id,
          label: r.name,
        }))}
      />

      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.campaigns?.items ?? []}
          pagination={tablePagination(data?.campaigns?.total ?? 0)}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Subject', dataIndex: 'subject' },
            {
              title: 'Audience',
              key: 'audience',
              render: (_: any, r: any) => (
                <>
                  {(r.targetTags ?? []).map((t: string) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  {r.targetVipStatus && <Tag color="gold">{r.targetVipStatus}</Tag>}
                  {!(r.targetTags ?? []).length && !r.targetVipStatus && (
                    <Text type="secondary">All guests</Text>
                  )}
                </>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
            },
            {
              title: 'Sent / Scheduled',
              key: 'when',
              render: (_: any, r: any) =>
                r.sentAt
                  ? `${new Date(r.sentAt).toLocaleString()} · ${r.recipientCount} recipients`
                  : r.scheduledAt
                    ? dayjs(r.scheduledAt).format('MMM D, HH:mm')
                    : '—',
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: any, r: any) =>
                r.status === 'sent' ? null : (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingId(r.id);
                        form.setFieldsValue({
                          name: r.name,
                          subject: r.subject,
                          body: r.body,
                          targetTags: (r.targetTags ?? []).join(', '),
                          targetVipStatus: r.targetVipStatus,
                          scheduledAt: r.scheduledAt ? dayjs(r.scheduledAt) : undefined,
                        });
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Popconfirm title="Send this campaign now?" onConfirm={() => handleSend(r.id)}>
                      <Button size="small" type="primary" icon={<SendOutlined />}>
                        Send now
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title="Cancel this campaign?"
                      onConfirm={async () => {
                        await deleteCampaign({ variables: { id: r.id } });
                        refetch();
                      }}
                    >
                      <Button size="small" danger>
                        Cancel
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit campaign' : 'New campaign'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Internal name" rules={[{ required: true }]}>
            <Input placeholder="Winback — lapsed regulars" />
          </Form.Item>
          <Form.Item name="subject" label="Email subject" rules={[{ required: true }]}>
            <Input placeholder="We miss you at {{restaurantName}}!" />
          </Form.Item>
          <Form.Item name="body" label="Email body" rules={[{ required: true }]}>
            <Input.TextArea
              rows={6}
              placeholder={'Hi {{firstName}},\n\nIt\'s been a while since your last visit…'}
            />
          </Form.Item>
          <Form.Item name="targetTags" label="Target tags (comma-separated, empty = all guests)">
            <Input placeholder="VIP, Regular" />
          </Form.Item>
          <Form.Item name="targetVipStatus" label="Target VIP status">
            <Select
              allowClear
              options={[
                { value: 'vip', label: 'VIP' },
                { value: 'regular', label: 'Regular' },
              ]}
            />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Schedule (empty = save as draft)">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsPageContent />
    </Suspense>
  );
}
