'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { CLEAR_SEED_DATA, PLATFORM_CONFIG, UPDATE_PLATFORM_CONFIG } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { isSuperAdmin } from '@/lib/roles';
import { useFormDirty } from '@/lib/useFormDirty';

const { Paragraph, Text } = Typography;

const FEATURE_FLAGS = [
  ['waitlist', 'Waitlist'],
  ['deposits', 'Deposits'],
  ['messaging', 'Messaging'],
  ['sms', 'Premium SMS'],
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
    description: 'Defaults for invoices and subscription charges, plus the Stripe environment.',
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

const NON_DANGER_SECTIONS = CONFIG_SECTIONS.filter((s) => s.key !== 'danger');

type ConfigSectionKey = (typeof CONFIG_SECTIONS)[number]['key'];
type StripeMode = 'test' | 'live';

const ROLE_OPTIONS = [
  { value: 'diner', label: 'Guest' },
  { value: 'restaurant_owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'host', label: 'Host' },
  { value: 'admin', label: 'Admin' },
  { value: 'account_manager', label: 'Account manager' },
];

export default function AdminConfigPage() {
  const { ready, user } = useRequireAdmin();
  const canClearSeed = user ? isSuperAdmin(user.role) : false;
  const canEditSignupEmailVerification = canClearSeed;
  const canEditStripeMode = canClearSeed;
  const { data, loading, refetch } = useQuery(PLATFORM_CONFIG, { skip: !ready });
  const [updateConfig, { loading: saving }] = useMutation(UPDATE_PLATFORM_CONFIG);
  const [clearSeed, { loading: clearing }] = useMutation(CLEAR_SEED_DATA);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);
  const [pendingLiveValues, setPendingLiveValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [activeKey, setActiveKey] = useState<ConfigSectionKey>('support');
  const [form] = Form.useForm();
  const { dirty, clearDirty, onValuesChange } = useFormDirty();

  const visibleSections = canClearSeed ? CONFIG_SECTIONS : NON_DANGER_SECTIONS;
  const activeSection = visibleSections.find((s) => s.key === activeKey) ?? visibleSections[0];
  const savedStripeMode = (data?.platformConfig?.stripeMode as StripeMode | undefined) ?? 'test';
  const sandboxConfigured = Boolean(data?.platformConfig?.stripeSandboxConfigured);
  const productionConfigured = Boolean(data?.platformConfig?.stripeProductionConfigured);

  useEffect(() => {
    if (!data?.platformConfig) return;
    form.setFieldsValue(data.platformConfig);
    clearDirty();
  }, [data, form, clearDirty]);

  useEffect(() => {
    if (!canClearSeed && activeKey === 'danger') {
      setActiveKey('support');
    }
  }, [canClearSeed, activeKey]);

  if (!ready) return null;

  const saveConfig = async (values: Record<string, unknown>) => {
    await updateConfig({
      variables: {
        input: {
          supportEmail: values.supportEmail,
          supportPhone: values.supportPhone,
          defaultSignupRole: values.defaultSignupRole,
          defaultPartnerRole: values.defaultPartnerRole,
          defaultManagerRole: values.defaultManagerRole,
          maintenanceMode: values.maintenanceMode,
          allowPublicRegistration: values.allowPublicRegistration,
          allowPartnerRegistration: values.allowPartnerRegistration,
          requireAdminDelete2FA: values.requireAdminDelete2FA,
          ...(canEditSignupEmailVerification
            ? {
                requireSignupEmailVerification: values.requireSignupEmailVerification,
              }
            : {}),
          invoicePrefix: values.invoicePrefix,
          currency: values.currency,
          ...(canEditStripeMode && values.stripeMode !== savedStripeMode
            ? { stripeMode: values.stripeMode }
            : {}),
          featureFlags: values.featureFlags,
        },
      },
    });
    message.success('Configuration saved');
    clearDirty();
    refetch();
  };

  const onSave = async () => {
    if (!dirty) return;
    try {
      const values = await form.validateFields();
      const nextMode = values.stripeMode as StripeMode | undefined;
      if (canEditStripeMode && nextMode === 'live' && savedStripeMode !== 'live') {
        setPendingLiveValues(values);
        setLiveConfirmOpen(true);
        return;
      }
      await saveConfig(values);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save configuration');
    }
  };

  const onConfirmLive = async () => {
    if (!pendingLiveValues) return;
    try {
      await saveConfig(pendingLiveValues);
      setLiveConfirmOpen(false);
      setPendingLiveValues(null);
    } catch (err: any) {
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
              name="defaultManagerRole"
              label="Default manager invite role"
              rules={[{ required: true }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
          </>
        );
      case 'billing':
        return (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
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

            <div>
              <Text strong>Stripe environment</Text>
              <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 12 }}>
                {canEditStripeMode
                  ? 'Routes API payment calls to sandbox or production Stripe keys. Existing customers, subscriptions, and payment intents are not migrated.'
                  : 'Super admins only. Shows which Stripe account the API is using.'}
              </Paragraph>
              <Space wrap size={8} style={{ marginBottom: 12 }}>
                <Tag color={sandboxConfigured ? 'green' : 'default'}>
                  Sandbox keys {sandboxConfigured ? 'configured' : 'missing'}
                </Tag>
                <Tag color={productionConfigured ? 'green' : 'default'}>
                  Production keys {productionConfigured ? 'configured' : 'missing'}
                </Tag>
              </Space>
              <Form.Item
                name="stripeMode"
                style={{ marginBottom: 0 }}
                extra={
                  canEditStripeMode
                    ? 'Set STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE (and matching publishable + webhook secrets) in the API env.'
                    : undefined
                }
              >
                <Segmented
                  disabled={!canEditStripeMode}
                  options={[
                    {
                      value: 'test',
                      label: 'Sandbox',
                      disabled: canEditStripeMode && !sandboxConfigured,
                    },
                    {
                      value: 'live',
                      label: 'Production',
                      disabled: canEditStripeMode && !productionConfigured,
                    },
                  ]}
                />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, next) => prev.stripeMode !== next.stripeMode}>
                {() =>
                  form.getFieldValue('stripeMode') === 'live' ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginTop: 12 }}
                      message="Production charges real cards"
                      description="Switching to production uses live Stripe keys for deposits, invoices, and subscriptions. Test Stripe IDs will not work against the live account."
                    />
                  ) : null
                }
              </Form.Item>
            </div>
          </Space>
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
          <>
            <Form.Item
              name="requireAdminDelete2FA"
              label="Require 2FA to delete users"
              valuePropName="checked"
              extra="When enabled, deleting a user sends a confirmation code to support.uzeats@gmail.com."
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="requireSignupEmailVerification"
              label="Require signup email verification"
              valuePropName="checked"
              extra={
                canEditSignupEmailVerification
                  ? 'When enabled, new email signups stay unverified until they confirm. Default: off locally, on in production.'
                  : 'Super admins only. When enabled, new email signups stay unverified until they confirm.'
              }
            >
              <Switch disabled={!canEditSignupEmailVerification} />
            </Form.Item>
          </>
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
                Deletes restaurants, reservations, non-platform-admin users, and related demo
                records. Super admin accounts are left untouched.
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
              {visibleSections.map((section) => (
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
                <Button type="primary" loading={saving} disabled={!dirty} onClick={onSave}>
                  Save changes
                </Button>
              ) : undefined
            }
          >
            <Paragraph type="secondary" style={{ marginTop: 0 }}>
              {activeSection.description}
            </Paragraph>
            <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
              {renderSectionContent()}
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Switch to production Stripe?"
        open={liveConfirmOpen}
        onCancel={() => {
          setLiveConfirmOpen(false);
          setPendingLiveValues(null);
        }}
        okText="Use production Stripe"
        okButtonProps={{ danger: true, loading: saving }}
        onOk={onConfirmLive}
      >
        <Paragraph>
          The API will charge real cards and talk to your live Stripe account. Existing sandbox
          customer and subscription IDs will not work until you switch back.
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Make sure <Text code>STRIPE_SECRET_KEY_LIVE</Text>, webhook, and publishable keys are set
          before continuing.
        </Paragraph>
      </Modal>

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
          non-platform-admin users. Admin accounts stay signed in and unchanged.
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Platform configuration and email templates are preserved. This cannot be undone
          without re-running <Text code>pnpm seed</Text>.
        </Paragraph>
      </Modal>
    </Space></div>
  );
}
