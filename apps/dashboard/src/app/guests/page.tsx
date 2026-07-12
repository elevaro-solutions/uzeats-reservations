'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
import {
  MY_RESTAURANTS,
  RESTAURANT_GUESTS,
  UPDATE_GUEST_PROFILE,
  ADD_GUEST_TAG,
  REMOVE_GUEST_TAG,
} from '@/lib/graphql';

const { Title, Text } = Typography;

const VIP_COLORS: Record<string, string> = {
  vip: 'gold',
  regular: 'blue',
  blacklisted: 'red',
  none: 'default',
};

export default function GuestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>();
  const [selected, setSelected] = useState<any>(null);
  const [newTag, setNewTag] = useState('');
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(RESTAURANT_GUESTS, {
    skip: !restaurantId,
    variables: { restaurantId, search: search || undefined, vipStatus: vipFilter },
  });
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_GUEST_PROFILE);
  const [addTag] = useMutation(ADD_GUEST_TAG);
  const [removeTag] = useMutation(REMOVE_GUEST_TAG);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const openGuest = (record: any) => {
    setSelected(record);
    form.setFieldsValue({
      notes: record.notes,
      vipStatus: record.vipStatus,
      preferredTable: record.preferredTable,
      dietaryRestrictions: record.dietaryRestrictions?.join(', '),
      allergies: record.allergies?.join(', '),
    });
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      await updateProfile({
        variables: {
          restaurantId,
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
      setSelected(null);
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to save');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await addTag({ variables: { restaurantId, dinerId: selected.dinerId, tag: newTag.trim() } });
    setSelected({ ...selected, tags: [...(selected.tags ?? []), newTag.trim()] });
    setNewTag('');
    refetch();
  };

  const handleRemoveTag = async (tag: string) => {
    await removeTag({ variables: { restaurantId, dinerId: selected.dinerId, tag } });
    setSelected({ ...selected, tags: (selected.tags ?? []).filter((t: string) => t !== tag) });
    refetch();
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Guests</Title>
      <Space wrap>
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
        <Input.Search
          placeholder="Search name or email"
          allowClear
          style={{ width: 240 }}
          onSearch={setSearch}
        />
        <Select
          placeholder="VIP status"
          allowClear
          style={{ width: 160 }}
          value={vipFilter}
          onChange={setVipFilter}
          options={[
            { value: 'vip', label: 'VIP' },
            { value: 'regular', label: 'Regular' },
            { value: 'blacklisted', label: 'Blacklisted' },
            { value: 'none', label: 'None' },
          ]}
        />
      </Space>

      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.restaurantGuests ?? []}
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
            {
              title: 'Total spend',
              dataIndex: 'totalSpendCents',
              render: (v: number) => `$${((v ?? 0) / 100).toFixed(2)}`,
            },
            {
              title: 'Last visit',
              dataIndex: 'lastVisitDate',
              render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
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
            <Button type="primary" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </Space>
        }
      >
        {selected && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space size={24}>
              <Statistic title="Visits" value={selected.totalVisits} />
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

            <Form form={form} layout="vertical">
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
    </Space>
  );
}
