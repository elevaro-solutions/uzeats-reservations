'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { CLEAR_SEED_DATA, PLATFORM_CONFIG, UPDATE_PLATFORM_CONFIG } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Paragraph, Text } = Typography;

const FEATURE_FLAGS = [
  ['waitlist', 'Waitlist'],
  ['deposits', 'Deposits'],
  ['messaging', 'Messaging'],
  ['reviews', 'Reviews'],
  ['experiences', 'Experiences'],
  ['campaigns', 'Campaigns'],
  ['widget', 'Booking widget'],
  ['publicRegistration', 'Public registration'],
  ['partnerRegistration', 'Partner registration'],
] as const;

const CONFIG_SECTIONS = [
  {
    key: 'support',
    label: 'Support contacts',
    description: 'Shown to diners and restaurant owners when they need help.',
  },
  {
    key: 'roles',
    label: 'Default roles',
    description: 'Assigned automatically when someone signs up or is invited.',
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Defaults for invoices and subscription charges.',
  },
  {
    key: 'registration',
    label: 'Registration & access',
    description: 'Control who can sign up and whether the platform is in maintenance.',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Extra safeguards for sensitive admin actions.',
  },
  {
    key: 'features',
    label: 'Feature kill switches',
    description: 'Turn platform capabilities off globally without a deploy.',
  },
  {
    key: 'danger',
    label: 'Danger zone',
    description: 'Destructive actions that cannot be undone.',
  },
] as const;

type ConfigSectionKey = (typeof CONFIG_SECTIONS)[number]['key'];

const ROLE_OPTIONS = [
  { value: 'diner', label: 'Diner' },
  { value: 'restaurant_owner', label: 'Restaurant owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminConfigPage() {
  const { ready } = useRequireAdmin();
  const { data, loading, refetch } = useQuery(PLATFORM_CONFIG, { skip: !ready });
  const [updateConfig, { loading: saving }] = useMutation(UPDATE_PLATFORM_CONFIG);
  const [clearSeed, { loading: clearing }] = useMutation(CLEAR_SEED_DATA);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<ConfigSectionKey>('support');
  const [form] = Form.useForm();

  const activeSection = CONFIG_SECTIONS.find((s) => s.key === activeKey) ?? CONFIG_SECTIONS[0];

  useEffect(() => {
    if (!data?.platformConfig) return;
    form.setFieldsValue(data.platformConfig);
  }, [data, form]);

  if (!ready) return null;

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      await updateConfig({
        variables: {
          input: {
            supportEmail: values.supportEmail,
            supportPhone: values.supportPhone,
            defaultSignupRole: values.defaultSignupRole,
            defaultPartnerRole: values.defaultPartnerRole,
            defaultStaffRole: values.defaultStaffRole,
            maintenanceMode: values.maintenanceMode,
            allowPublicRegistration: values.allowPublicRegistration,
            allowPartnerRegistration: values.allowPartnerRegistration,
            requireAdminDelete2FA: values.requireAdminDelete2FA,
            invoicePrefix: values.invoicePrefix,
            currency: values.currency,
            featureFlags: values.featureFlags,
          },
        },
      });
      message.success('Configuration saved');
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save configuration');
    }
  };

  const onClearSeedData = async () => {
    try {
      const res = await clearSeed();
      const payload = res.data?.clearSeedData;
      message.success(payload?.message || 'Seed data cleared');
      setClearConfirmOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to clear seed data');
    }
  };

  const renderSectionContent = () => {
    switch (activeKey) {
      case 'support':
        return (
          <>
            <Form.Item
              name="supportEmail"
              label="Support email"
              rules={[{ required: true, type: 'email' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="supportPhone" label="Support phone">
              <Input />
            </Form.Item>
          </>
        );
      case 'roles':
        return (
          <>
            <Form.Item
              name="defaultSignupRole"
              label="Default diner signup role"
              rules={[{ required: true }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="defaultPartnerRole"
              label="Default partner signup role"
              rules={[{ required: true }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="defaultStaffRole"
              label="Default staff invite role"
              rules={[{ required: true }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
          </>
        );
      case 'billing':
        return (
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="invoicePrefix"
                label="Invoice number prefix"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="currency" label="Billing currency" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'usd', label: 'USD' },
                    { value: 'eur', label: 'EUR' },
                    { value: 'gbp', label: 'GBP' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        );
      case 'registration':
        return (
          <>
            <Form.Item
              name="allowPublicRegistration"
              label="Allow public diner registration"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="allowPartnerRegistration"
              label="Allow partner self-registration"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="maintenanceMode"
              label="Maintenance mode"
              valuePropName="checked"
              extra="Flag for ops — wire into public apps when you want a global banner or hard stop."
            >
              <Switch />
            </Form.Item>
          </>
        );
      case 'security':
        return (
          <Form.Item
            name="requireAdminDelete2FA"
            label="Require 2FA to delete users"
            valuePropName="checked"
            extra="When enabled, deleting a user sends a confirmation code to support.uzeats@gmail.com."
          >
            <Switch />
          </Form.Item>
        );
      case 'features':
        return (
          <Row gutter={[16, 0]}>
            {FEATURE_FLAGS.map(([key, label]) => (
              <Col xs={24} sm={12} key={key}>
                <Form.Item name={['featureFlags', key]} label={label} valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            ))}
          </Row>
        );
      case 'danger':
        return (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Text strong>Clear seed / demo data</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                Deletes restaurants, reservations, non-admin users, and related demo records.
                Platform admin accounts are left untouched.
              </Paragraph>
            </div>
            <Button danger loading={clearing} onClick={() => setClearConfirmOpen(true)}>
              Clear seed data
            </Button>
          </Space>
        );
      default:
        return null;
    }
  };

  return (
    <div component="AdminConfigPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Platform configuration"
        subtitle="Default roles, registration switches, support contacts, and invoice settings."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Configuration" loading={loading}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              {CONFIG_SECTIONS.map((section) => (
                <Button
                  key={section.key}
                  block
                  type={section.key === activeKey ? 'primary' : 'default'}
                  danger={section.key === 'danger' && section.key !== activeKey}
                  onClick={() => setActiveKey(section.key)}
                >
                  {section.label}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card
            title={activeSection.label}
            loading={loading}
            styles={
              activeKey === 'danger'
                ? { header: { color: '#a8071a' } }
                : undefined
            }
            style={activeKey === 'danger' ? { borderColor: '#ffa39e' } : undefined}
            extra={
              activeKey !== 'danger' ? (
                <Button type="primary" loading={saving} onClick={onSave}>
                  Save changes
                </Button>
              ) : undefined
            }
          >
            <Paragraph type="secondary" style={{ marginTop: 0 }}>
              {activeSection.description}
            </Paragraph>
            <Form form={form} layout="vertical">
              {renderSectionContent()}
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Clear seed data?"
        open={clearConfirmOpen}
        onCancel={() => setClearConfirmOpen(false)}
        okText="Clear seed data"
        okButtonProps={{ danger: true, loading: clearing }}
        onOk={onClearSeedData}
      >
        <Paragraph>
          This permanently deletes restaurants, bookings, reviews, subscriptions, and all
          non-admin users. Admin accounts stay signed in and unchanged.
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Platform configuration and email templates are preserved. This cannot be undone
          without re-running <Text code>pnpm seed</Text>.
        </Paragraph>
      </Modal>
    </Space></div>
  );
}
