'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ApiOutlined, CopyOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  INTEGRATIONS,
  CREATE_INTEGRATION,
  SET_INTEGRATION_ENABLED,
  DELETE_INTEGRATION,
  GENERATE_POS_API_KEY,
} from '@/lib/graphql';

const { Title, Text, Paragraph } = Typography;

const PROVIDER_OPTIONS = [
  { value: 'google_reserve', label: 'Google Reserve' },
  { value: 'partner_site', label: 'Partner site' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'other', label: 'Other' },
];

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  } catch {
    message.error('Failed to copy');
  }
};

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [posKey, setPosKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(INTEGRATIONS, {
    skip: !restaurantId,
    variables: { restaurantId },
    onError: (err) => message.error(err.message),
  });
  const [createIntegration, { loading: creating }] = useMutation(CREATE_INTEGRATION);
  const [setEnabled] = useMutation(SET_INTEGRATION_ENABLED);
  const [deleteIntegration] = useMutation(DELETE_INTEGRATION);
  const [generatePosKey, { loading: generatingKey }] = useMutation(GENERATE_POS_API_KEY);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createIntegration({
        variables: { restaurantId, provider: values.provider, name: values.name },
      });
      message.success('Integration created');
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  const handleGeneratePosKey = async () => {
    try {
      const res = await generatePosKey({ variables: { restaurantId } });
      setPosKey(res.data?.generatePosApiKey ?? null);
      message.success('POS API key generated');
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to generate key');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Integrations</Title>
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

      <Card
        title={
          <Space>
            <ApiOutlined /> Partner API integrations
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            New integration
          </Button>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">
            Partners call REST endpoints under <Text code>/api/partner</Text> using the{' '}
            <Text code>X-API-Key</Text> header with the key below.
          </Text>
          <Table
            loading={loading}
            rowKey="id"
            pagination={false}
            dataSource={data?.integrations ?? []}
            columns={[
              { title: 'Name', dataIndex: 'name' },
              {
                title: 'Provider',
                dataIndex: 'provider',
                render: (p: string) => (
                  <Tag>{PROVIDER_OPTIONS.find((o) => o.value === p)?.label ?? p}</Tag>
                ),
              },
              {
                title: 'API key',
                dataIndex: 'apiKey',
                render: (key: string) => (
                  <Space>
                    <Text code style={{ fontSize: 12 }}>
                      {key.length > 16 ? `${key.slice(0, 8)}…${key.slice(-4)}` : key}
                    </Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(key)}
                    />
                  </Space>
                ),
              },
              { title: 'Bookings', dataIndex: 'bookingsCount' },
              {
                title: 'Last used',
                dataIndex: 'lastUsedAt',
                render: (v: string) => (v ? new Date(v).toLocaleString() : '—'),
              },
              {
                title: 'Enabled',
                dataIndex: 'enabled',
                render: (enabled: boolean, r: any) => (
                  <Switch
                    size="small"
                    checked={enabled}
                    onChange={async (v) => {
                      try {
                        await setEnabled({ variables: { id: r.id, enabled: v } });
                        message.success(v ? 'Integration enabled' : 'Integration disabled');
                        refetch();
                      } catch (err: any) {
                        message.error(err?.message ?? 'Failed to update');
                      }
                    }}
                  />
                ),
              },
              {
                title: '',
                key: 'actions',
                render: (_: any, r: any) => (
                  <Popconfirm
                    title="Delete this integration? Its API key will stop working."
                    onConfirm={async () => {
                      try {
                        await deleteIntegration({ variables: { id: r.id } });
                        message.success('Integration deleted');
                        refetch();
                      } catch (err: any) {
                        message.error(err?.message ?? 'Failed to delete');
                      }
                    }}
                  >
                    <Button size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <KeyOutlined /> POS integration
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ maxWidth: 640 }}>
          <Text type="secondary">
            Connect your point-of-sale system to sync check totals and spend data with guest
            profiles. Generate an API key for your POS provider to use.
          </Text>
          <Button
            type="primary"
            icon={<KeyOutlined />}
            loading={generatingKey}
            onClick={handleGeneratePosKey}
          >
            Generate POS API key
          </Button>
          {posKey && (
            <Alert
              type="warning"
              showIcon
              message="Save this key now — it is only shown once"
              description={
                <Space>
                  <Paragraph code copyable={{ text: posKey }} style={{ margin: 0 }}>
                    {posKey}
                  </Paragraph>
                </Space>
              }
            />
          )}
        </Space>
      </Card>

      <Modal
        title="New partner integration"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="provider"
            label="Provider"
            rules={[{ required: true }]}
            initialValue="partner_site"
          >
            <Select options={PROVIDER_OPTIONS} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Google Reserve — main listing" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
