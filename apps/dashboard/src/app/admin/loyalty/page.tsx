'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import {
  GiftOutlined,
  PlusOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageHeader, StatCard, spacing } from '@reservations/ui';
import { ADMIN_LOYALTY_STATS, UPDATE_LOYALTY_PROGRAM } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { isSuperAdmin } from '@/lib/roles';
import { useFormDirty } from '@/lib/useFormDirty';

const { Paragraph, Text } = Typography;

type LoyaltyTier = {
  id: string;
  name: string;
  minVisits: number;
  earnMultiplier: number;
};

type LoyaltyProgram = {
  pointsPerCompletedVisit: number;
  pointsPerDollarDeposit: number;
  redeemPointsPerDollar: number;
  minRedeemPoints: number;
  firstBookingBonusPoints: number;
  pointsPerReview: number;
  referralBonusPoints: number;
  pointsExpiryMonths: number;
  tiers: LoyaltyTier[];
};

const SECTIONS = [
  {
    key: 'packages',
    label: 'Point packages',
    description:
      'How diners earn and spend Tablevera points. Changes apply to new earnings and redemptions immediately.',
  },
  {
    key: 'tiers',
    label: 'Tiers',
    description:
      'Visit thresholds and earn multipliers. Every diner starts in the 0-visit tier; completed visits unlock the rest.',
  },
  {
    key: 'referrals',
    label: 'Referrals',
    description:
      'Accounts created with a referral code. The referrer earns the referral bonus after the new diner’s first completed visit.',
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const PACKAGE_FIELDS: Array<{
  name: keyof Omit<LoyaltyProgram, 'tiers'>;
  label: string;
  tip: string;
  min: number;
  suffix: string;
}> = [
  {
    name: 'pointsPerCompletedVisit',
    label: 'Points per completed visit',
    tip: 'Base points before the diner’s tier multiplier. Bronze at 1× with 100 = 100 pts.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'pointsPerDollarDeposit',
    label: 'Points per $1 deposit',
    tip: 'Awarded when a deposit hold is authorized.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'redeemPointsPerDollar',
    label: 'Redeem rate (pts per $1)',
    tip: '100 means 100 points take $1 off a deposit.',
    min: 1,
    suffix: 'pts',
  },
  {
    name: 'minRedeemPoints',
    label: 'Minimum redeem',
    tip: 'Diners cannot apply points until they reach this balance.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'firstBookingBonusPoints',
    label: 'First booking bonus',
    tip: 'One-time bonus when a diner books their first reservation.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'pointsPerReview',
    label: 'Review bonus',
    tip: 'Awarded when a diner submits a review after a visit.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'referralBonusPoints',
    label: 'Referral bonus',
    tip: 'Paid to the referrer when the invited diner completes their first visit.',
    min: 0,
    suffix: 'pts',
  },
  {
    name: 'pointsExpiryMonths',
    label: 'Points expiry',
    tip: 'Unused points expire after this many months. 0 means they do not expire.',
    min: 0,
    suffix: 'months',
  },
];

function programInput(program: LoyaltyProgram): Record<string, unknown> {
  const { __typename: _t, ...rates } = program as LoyaltyProgram & { __typename?: string };
  return {
    pointsPerCompletedVisit: rates.pointsPerCompletedVisit,
    pointsPerDollarDeposit: rates.pointsPerDollarDeposit,
    redeemPointsPerDollar: rates.redeemPointsPerDollar,
    minRedeemPoints: rates.minRedeemPoints,
    firstBookingBonusPoints: rates.firstBookingBonusPoints,
    pointsPerReview: rates.pointsPerReview,
    referralBonusPoints: rates.referralBonusPoints,
    pointsExpiryMonths: rates.pointsExpiryMonths,
    tiers: rates.tiers.map(({ id, name, minVisits, earnMultiplier }) => ({
      id,
      name,
      minVisits,
      earnMultiplier,
    })),
  };
}

export default function AdminLoyaltyPage() {
  const { ready, user } = useRequireAdmin();
  const canEdit = user ? isSuperAdmin(user.role) : false;
  const { data, loading, refetch } = useQuery(ADMIN_LOYALTY_STATS, { skip: !ready });
  const [updateProgram, { loading: saving }] = useMutation(UPDATE_LOYALTY_PROGRAM);
  const [activeKey, setActiveKey] = useState<SectionKey>('packages');
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [tierForm] = Form.useForm();
  const packagesDirty = useFormDirty();
  const tierDirty = useFormDirty();

  const stats = data?.adminLoyaltyStats;
  const program: LoyaltyProgram | undefined = data?.loyaltyProgram;
  const leaders = data?.adminReferralLeaders ?? [];
  const activeSection = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];

  const dinerCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stats?.tiers ?? []) {
      map.set(row.id, row.userCount);
    }
    return map;
  }, [stats]);

  useEffect(() => {
    if (!program) return;
    form.setFieldsValue(program);
    packagesDirty.clearDirty();
  }, [program, form, packagesDirty.clearDirty]);

  if (!ready) return null;

  const persist = async (input: Record<string, unknown>, success: string) => {
    await updateProgram({ variables: { input } });
    message.success(success);
    await refetch();
  };

  const onSavePackages = async () => {
    if (!program || !packagesDirty.dirty) return;
    try {
      const values = await form.validateFields();
      await persist(
        {
          ...programInput(program),
          ...values,
        },
        'Point packages saved',
      );
      packagesDirty.clearDirty();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save point packages');
    }
  };

  const openCreateTier = () => {
    if (!program) return;
    const maxVisits = Math.max(0, ...program.tiers.map((t) => t.minVisits));
    setEditingTierId(null);
    tierForm.setFieldsValue({
      name: '',
      minVisits: maxVisits + 5,
      earnMultiplier: 1.25,
    });
    tierDirty.clearDirty();
    setTierModalOpen(true);
  };

  const openEditTier = (tier: LoyaltyTier) => {
    setEditingTierId(tier.id);
    tierForm.setFieldsValue({
      name: tier.name,
      minVisits: tier.minVisits,
      earnMultiplier: tier.earnMultiplier,
    });
    tierDirty.clearDirty();
    setTierModalOpen(true);
  };

  const saveTier = async () => {
    if (!program || !tierDirty.dirty) return;
    try {
      const values = await tierForm.validateFields();
      const nextTiers = editingTierId
        ? program.tiers.map((tier) =>
            tier.id === editingTierId
              ? {
                  ...tier,
                  name: values.name.trim(),
                  minVisits: values.minVisits,
                  earnMultiplier: values.earnMultiplier,
                }
              : tier,
          )
        : [
            ...program.tiers,
            {
              name: values.name.trim(),
              minVisits: values.minVisits,
              earnMultiplier: values.earnMultiplier,
            },
          ];
      await persist({ ...programInput(program), tiers: nextTiers }, editingTierId ? 'Tier updated' : 'Tier created');
      setTierModalOpen(false);
      setEditingTierId(null);
      tierDirty.clearDirty();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save tier');
    }
  };

  const deleteTier = (tier: LoyaltyTier) => {
    if (!program) return;
    if (program.tiers.length <= 1) {
      message.error('Keep at least one loyalty tier');
      return;
    }
    Modal.confirm({
      title: `Delete ${tier.name}?`,
      content:
        'Diners in this range move to the remaining tier that matches their completed visits. This does not change point balances.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await persist(
            {
              ...programInput(program),
              tiers: program.tiers.filter((t) => t.id !== tier.id),
            },
            'Tier deleted',
          );
        } catch (err: any) {
          message.error(err.message || 'Failed to delete tier');
          throw err;
        }
      },
    });
  };

  const visitPts = program?.pointsPerCompletedVisit ?? 100;

  return (
    <div component="AdminLoyaltyPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Loyalty program"
          subtitle="Platform-wide points, diner tiers, and referral activity. Super admins can change earn rates and create tiers."
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Outstanding points"
              value={(stats?.totalOutstandingPoints ?? 0).toLocaleString('en-US')}
              hint="Unredeemed diner balances"
              icon={<TrophyOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Users with points"
              value={stats?.usersWithPoints ?? 0}
              icon={<UserOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Referrals"
              value={stats?.referralsCount ?? 0}
              hint="Accounts created with a code"
              icon={<GiftOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Earned (30d)"
              value={`${(stats?.pointsEarned30d ?? 0).toLocaleString('en-US')} pts`}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Redeemed (30d)"
              value={`${(stats?.pointsRedeemed30d ?? 0).toLocaleString('en-US')} pts`}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
            <StatCard
              label="Tiers"
              value={program?.tiers.length ?? 0}
              hint={(program?.tiers ?? []).map((t) => t.name).join(' · ') || '—'}
              icon={<TeamOutlined />}
              onClick={() => setActiveKey('tiers')}
            />
          </Col>
        </Row>

        {!canEdit ? (
          <Alert
            type="info"
            showIcon
            message="View only"
            description="A super admin can create tiers and change point packages. You can still review stats and referrals."
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Settings" loading={loading}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {SECTIONS.map((section) => (
                  <Button
                    key={section.key}
                    block
                    type={section.key === activeKey ? 'primary' : 'default'}
                    onClick={() => setActiveKey(section.key)}
                  >
                    {section.label}
                  </Button>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            {activeKey === 'packages' ? (
              <Card
                title={activeSection.label}
                loading={loading}
                extra={
                  canEdit ? (
                    <Button
                      type="primary"
                      loading={saving}
                      disabled={!packagesDirty.dirty}
                      onClick={() => void onSavePackages()}
                    >
                      Save changes
                    </Button>
                  ) : undefined
                }
              >
                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                  {activeSection.description}
                </Paragraph>
                <Form
                  form={form}
                  layout="vertical"
                  disabled={!canEdit}
                  onValuesChange={packagesDirty.onValuesChange}
                >
                  <Row gutter={16}>
                    {PACKAGE_FIELDS.map((field) => (
                      <Col xs={24} sm={12} key={field.name}>
                        <Form.Item
                          name={field.name}
                          label={field.label}
                          tooltip={field.tip}
                          rules={[{ required: true, type: 'number', min: field.min }]}
                        >
                          <InputNumber min={field.min} style={{ width: '100%' }} addonAfter={field.suffix} />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </Form>
              </Card>
            ) : null}

            {activeKey === 'tiers' ? (
              <Card
                title={activeSection.label}
                loading={loading}
                extra={
                  canEdit ? (
                    <Button type="link" icon={<PlusOutlined />} onClick={openCreateTier}>
                      Add tier
                    </Button>
                  ) : undefined
                }
              >
                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                  {activeSection.description}
                </Paragraph>
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={program?.tiers ?? []}
                  locale={{ emptyText: 'No tiers configured' }}
                  columns={[
                    {
                      title: 'Tier',
                      dataIndex: 'name',
                      render: (name: string, row: LoyaltyTier) => (
                        <Space orientation="vertical" size={0}>
                          <Text strong>{name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {row.minVisits === 0
                              ? 'Starting tier'
                              : `${row.minVisits}+ completed visits`}
                          </Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'Earn rate',
                      key: 'earn',
                      render: (_: unknown, row: LoyaltyTier) => (
                        <Text>
                          {row.earnMultiplier}× · {Math.round(visitPts * row.earnMultiplier)} pts/visit
                        </Text>
                      ),
                    },
                    {
                      title: 'Diners',
                      key: 'diners',
                      align: 'right' as const,
                      width: 90,
                      render: (_: unknown, row: LoyaltyTier) => dinerCounts.get(row.id) ?? 0,
                    },
                    ...(canEdit
                      ? [
                          {
                            title: '',
                            key: 'actions',
                            align: 'right' as const,
                            width: 140,
                            render: (_: unknown, row: LoyaltyTier) => (
                              <Space size={8}>
                                <Button type="link" size="small" onClick={() => openEditTier(row)}>
                                  Edit
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => deleteTier(row)}
                                  disabled={program?.tiers.length === 1}
                                >
                                  Delete
                                </Button>
                              </Space>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </Card>
            ) : null}

            {activeKey === 'referrals' ? (
              <Card title={activeSection.label} loading={loading}>
                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                  {activeSection.description} Current bonus:{' '}
                  <Text strong>{program?.referralBonusPoints ?? 0} pts</Text>.
                </Paragraph>
                <Table
                  rowKey="userId"
                  pagination={false}
                  dataSource={leaders}
                  locale={{ emptyText: 'No referral activity yet' }}
                  columns={[
                    {
                      title: 'User',
                      key: 'user',
                      render: (
                        _: unknown,
                        r: { firstName: string; lastName: string; email?: string | null },
                      ) => `${r.firstName} ${r.lastName}`.trim() || r.email || '—',
                    },
                    {
                      title: 'Referral code',
                      dataIndex: 'referralCode',
                      render: (code: string | null) => code ?? '—',
                    },
                    {
                      title: 'Referees',
                      dataIndex: 'refereesCount',
                      align: 'right' as const,
                    },
                  ]}
                />
              </Card>
            ) : null}
          </Col>
        </Row>
      </Space>

      <Modal
        title={editingTierId ? 'Edit tier' : 'New tier'}
        open={tierModalOpen}
        onCancel={() => {
          setTierModalOpen(false);
          tierDirty.clearDirty();
        }}
        okText={editingTierId ? 'Save tier' : 'Create tier'}
        okButtonProps={{ disabled: !tierDirty.dirty }}
        confirmLoading={saving}
        onOk={() => void saveTier()}
        destroyOnHidden
      >
        <Paragraph type="secondary">
          Earn multiplier stacks on the visit package. 1.25× with {visitPts} pts/visit awards{' '}
          {Math.round(visitPts * (Number(tierForm.getFieldValue('earnMultiplier')) || 1.25))} points.
        </Paragraph>
        <Form form={tierForm} layout="vertical" onValuesChange={tierDirty.onValuesChange}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, min: 1, max: 40, message: 'Enter a tier name' }]}
          >
            <Input placeholder="Silver" maxLength={40} />
          </Form.Item>
          <Form.Item
            name="minVisits"
            label="Completed visits to unlock"
            tooltip="0 is the starting tier. Each tier needs a unique visit count."
            rules={[{ required: true, type: 'number', min: 0 }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="visits" />
          </Form.Item>
          <Form.Item
            name="earnMultiplier"
            label="Earn multiplier"
            tooltip="1 = base visit points. 1.5 = 50% more points per completed visit."
            rules={[{ required: true, type: 'number', min: 0.1, max: 10 }]}
          >
            <InputNumber min={0.1} max={10} step={0.05} style={{ width: '100%' }} addonAfter="×" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
