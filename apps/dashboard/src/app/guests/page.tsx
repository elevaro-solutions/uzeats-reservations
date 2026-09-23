'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CrownOutlined, MessageOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  RESTAURANT_GUESTS,
  UPDATE_GUEST_PROFILE,
  ADD_GUEST_TAG,
  REMOVE_GUEST_TAG,
  EXPORT_RESTAURANT_GUESTS,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useFormDirty } from '@/lib/useFormDirty';
import { ExportMenu, type ListExportFormat } from '@/components/ExportMenu';
import { downloadExportPayload } from '@/lib/downloadExport';
import { HubLinkCards } from '@/components/HubLinkCards';
import { hubChildPages, PARTNER_PAGES } from '@/lib/dashboardNav';

const { Title, Text } = Typography;

const VIP_COLORS: Record<string, string> = {
  vip: 'gold',
  regular: 'blue',
  blacklisted: 'red',
  none: 'default',
};

function GuestsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>();
  const [selected, setSelected] = useState<any>(null);
  const [newTag, setNewTag] = useState('');
  const [form] = Form.useForm();
  const { dirty, clearDirty, onValuesChange } = useFormDirty();
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const { data, loading, refetch } = useQuery(RESTAURANT_GUESTS, {
    skip: !activeRestaurantId,
    variables: {
      restaurantId: activeRestaurantId,
      search: search || undefined,
      vipStatus: vipFilter,
      limit,
      offset,
    },
  });
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_GUEST_PROFILE);
  const [addTag] = useMutation(ADD_GUEST_TAG);
  const [removeTag] = useMutation(REMOVE_GUEST_TAG);
  const [exportGuests, { loading: exporting }] = useMutation(EXPORT_RESTAURANT_GUESTS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const openGuest = (record: any) => {
    setSelected(record);
    form.setFieldsValue({
      notes: record.notes,
      vipStatus: record.vipStatus,
      preferredTable: record.preferredTable,
      dietaryRestrictions: record.dietaryRestrictions?.join(', '),
      allergies: record.allergies?.join(', '),
    });
    clearDirty();
  };

  const handleSave = async () => {
    if (!dirty) return;
    const values = await form.validateFields();
    try {
      await updateProfile({
        variables: {
          restaurantId: activeRestaurantId,
          dinerId: selected.dinerId,
          input: {
            notes: values.notes,
            vipStatus: values.vipStatus,
            preferredTable: values.preferredTable,
            dietaryRestrictions: values.dietaryRestrictions
              ?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
            allergies: values.allergies
              ?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
          },
        },
      });
      message.success('Guest profile saved');
      clearDirty();
      setSelected(null);
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await addTag({ variables: { restaurantId: activeRestaurantId, dinerId: selected.dinerId, tag: newTag.trim() } });
    setSelected({ ...selected, tags: [...(selected.tags ?? []), newTag.trim()] });
    setNewTag('');
    refetch();
  };

  const handleRemoveTag = async (tag: string) => {
    await removeTag({ variables: { restaurantId: activeRestaurantId, dinerId: selected.dinerId, tag } });
    setSelected({ ...selected, tags: (selected.tags ?? []).filter((t: string) => t !== tag) });
    refetch();
  };

  const onExportGuests = async (format: ListExportFormat) => {
    if (!activeRestaurantId) return;
    try {
      const res = await exportGuests({
        variables: {
          restaurantId: activeRestaurantId,
          search: search || undefined,
          vipStatus: vipFilter,
          format,
        },
      });
      const payload = res.data?.exportRestaurantGuests;
      if (!payload?.content) throw new Error('No export returned');
      downloadExportPayload(payload);
      message.success(
        `Exported ${payload.rowCount} guests as ${format === 'xlsx' ? 'Excel' : format.toUpperCase()}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const relatedLinks = useMemo(
    () =>
      hubChildPages(PARTNER_PAGES, '/guests').map((p) => ({
        href: p.href,
        title: p.label,
        description: p.description ?? '',
        icon: p.icon,
      })),
    [],
  );

  return (
    <div component="GuestsPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Guests</Title>
      {relatedLinks.length > 0 && (
        <HubLinkCards links={relatedLinks} colProps={{ xs: 24, sm: 12, lg: 12 }} />
      )}
      <Space wrap>
        <Select style={{ width: 260 }} {...restaurantSelectProps} />
        <Input.Search
          placeholder="Search name or email"
          allowClear
          style={{ width: 240 }}
          onSearch={(value) => {
            setSearch(value);
            setPagination(1);
          }}
        />
        <Select
          placeholder="VIP status"
          allowClear
          style={{ width: 160 }}
          value={vipFilter}
          onChange={(value) => {
            setVipFilter(value);
            setPagination(1);
          }}
          options={[
            { value: 'vip', label: 'VIP' },
            { value: 'regular', label: 'Regular' },
            { value: 'blacklisted', label: 'Blacklisted' },
            { value: 'none', label: 'None' },
          ]}
        />
        <ExportMenu
          formats={['xlsx', 'pdf']}
          loading={exporting}
          disabled={!activeRestaurantId}
          onExport={(format) => void onExportGuests(format)}
        />
      </Space>

      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.restaurantGuests?.items ?? []}
          pagination={tablePagination(data?.restaurantGuests?.total ?? 0)}
          onRow={(record) => ({ onClick: () => openGuest(record), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: 'Guest',
              key: 'guest',
              render: (_: any, r: any) => (
                <Space>
                  {r.vipStatus === 'vip' && <CrownOutlined style={{ color: '#d4a017' }} />}
                  <span>
                    {r.diner ? `${r.diner.firstName} ${r.diner.lastName}` : 'Guest'}
                  </span>
                </Space>
              ),
            },
            {
              title: 'Contact',
              key: 'contact',
              render: (_: any, r: any) => (
                <Text type="secondary">{r.diner?.email ?? r.diner?.phone ?? '—'}</Text>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'vipStatus',
              render: (v: string) => <Tag color={VIP_COLORS[v]}>{v.toUpperCase()}</Tag>,
            },
            {
              title: 'Tags',
              dataIndex: 'tags',
              render: (tags: string[]) => (
                <>
                  {(tags ?? []).slice(0, 3).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  {(tags ?? []).length > 3 && <Tag>+{tags.length - 3}</Tag>}
                </>
              ),
            },
            { title: 'Visits', dataIndex: 'totalVisits' },
            { title: 'Loyalty pts', dataIndex: 'loyaltyPoints', render: (v: number) => v ?? 0 },
            {
              title: 'Total spend',
              dataIndex: 'totalSpendCents',
              render: (v: number) => `$${((v ?? 0) / 100).toFixed(2)}`,
            },
            {
              title: 'Last visit',
              dataIndex: 'lastVisitDate',
              render: (v: string) => (v ? new Date(v).toLocaleDateString('en-US') : '—'),
            },
          ]}
        />
      </Card>

      <Drawer
        title={
          selected?.diner
            ? `${selected.diner.firstName} ${selected.diner.lastName}`
            : 'Guest profile'
        }
        width={480}
        open={!!selected}
        onClose={() => setSelected(null)}
        extra={
          <Space>
            <Link href={`/messages?dinerId=${selected?.dinerId}`}>
              <Button icon={<MessageOutlined />}>Message</Button>
            </Link>
            <Button type="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
              Save
            </Button>
          </Space>
        }
      >
        {selected && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Space size={24}>
              <Statistic title="Visits" value={selected.totalVisits} />
              <Statistic title="Loyalty pts" value={selected.loyaltyPoints ?? 0} />
              <Statistic
                title="Total spend"
                value={(selected.totalSpendCents ?? 0) / 100}
                precision={2}
                prefix="$"
              />
              <Statistic title="Avg party" value={selected.averagePartySize} precision={1} />
            </Space>

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Email">{selected.diner?.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selected.diner?.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Occasions">
                {(selected.occasions ?? []).join(', ') || '—'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Tags</Text>
              <div style={{ marginTop: 8 }}>
                {(selected.tags ?? []).map((t: string) => (
                  <Tag key={t} closable onClose={() => handleRemoveTag(t)}>
                    {t}
                  </Tag>
                ))}
              </div>
              <Space.Compact style={{ marginTop: 8 }}>
                <Input
                  size="small"
                  placeholder="New tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onPressEnter={handleAddTag}
                  style={{ width: 160 }}
                />
                <Button size="small" onClick={handleAddTag}>
                  Add
                </Button>
              </Space.Compact>
            </div>

            <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
              <Form.Item name="vipStatus" label="VIP status">
                <Select
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'regular', label: 'Regular' },
                    { value: 'vip', label: 'VIP' },
                    { value: 'blacklisted', label: 'Blacklisted' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="preferredTable" label="Preferred table">
                <Input placeholder="T1" />
              </Form.Item>
              <Form.Item name="dietaryRestrictions" label="Dietary restrictions (comma-separated)">
                <Input placeholder="vegetarian, gluten-free" />
              </Form.Item>
              <Form.Item name="allergies" label="Allergies (comma-separated)">
                <Input placeholder="peanuts, shellfish" />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={4} placeholder="Prefers corner booth, always orders the ribeye…" />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Drawer>
    </Space></div>
  );
}

export default function GuestsPage() {
  return (
    <div component="GuestsPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <GuestsPageContent />
    </Suspense></div>
  );
}
