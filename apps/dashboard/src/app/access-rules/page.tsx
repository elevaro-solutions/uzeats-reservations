'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  ACCESS_RULES,
  CREATE_ACCESS_RULE,
  UPDATE_ACCESS_RULE,
  DELETE_ACCESS_RULE,
} from '@/lib/graphql';

const { Title, Text } = Typography;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AccessRulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(ACCESS_RULES, {
    skip: !restaurantId,
    variables: { restaurantId },
    onError: (err) => message.error(err.message),
  });
  const [createRule, { loading: creating }] = useMutation(CREATE_ACCESS_RULE);
  const [updateRule, { loading: updating }] = useMutation(UPDATE_ACCESS_RULE);
  const [deleteRule] = useMutation(DELETE_ACCESS_RULE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const buildInput = (values: any) => ({
    name: values.name,
    daysOfWeek: values.daysOfWeek ?? [],
    startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
    endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
    startTime: values.startTime || undefined,
    endTime: values.endTime || undefined,
    minPartySize: values.minPartySize ?? undefined,
    maxPartySize: values.maxPartySize ?? undefined,
    maxCoversPerSlot: values.maxCoversPerSlot ?? undefined,
    minAdvanceHours: values.minAdvanceHours ?? undefined,
    maxAdvanceDays: values.maxAdvanceDays ?? undefined,
    active: values.active ?? true,
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = buildInput(values);
      if (editingId) {
        await updateRule({ variables: { id: editingId, input } });
        message.success('Rule updated');
      } else {
        await createRule({ variables: { restaurantId, input } });
        message.success('Rule created');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.message) message.error(err.message);
    }
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    form.setFieldsValue({
      name: rule.name,
      daysOfWeek: rule.daysOfWeek ?? [],
      startDate: rule.startDate ? dayjs(rule.startDate) : undefined,
      endDate: rule.endDate ? dayjs(rule.endDate) : undefined,
      startTime: rule.startTime,
      endTime: rule.endTime,
      minPartySize: rule.minPartySize,
      maxPartySize: rule.maxPartySize,
      maxCoversPerSlot: rule.maxCoversPerSlot,
      minAdvanceHours: rule.minAdvanceHours,
      maxAdvanceDays: rule.maxAdvanceDays,
      active: rule.active,
    });
    setModalOpen(true);
  };

  const toggleActive = async (rule: any, active: boolean) => {
    try {
      await updateRule({
        variables: {
          id: rule.id,
          input: {
            name: rule.name,
            daysOfWeek: rule.daysOfWeek ?? [],
            startDate: rule.startDate ?? undefined,
            endDate: rule.endDate ?? undefined,
            startTime: rule.startTime ?? undefined,
            endTime: rule.endTime ?? undefined,
            minPartySize: rule.minPartySize ?? undefined,
            maxPartySize: rule.maxPartySize ?? undefined,
            maxCoversPerSlot: rule.maxCoversPerSlot ?? undefined,
            minAdvanceHours: rule.minAdvanceHours ?? undefined,
            maxAdvanceDays: rule.maxAdvanceDays ?? undefined,
            active,
          },
        },
      });
      message.success(active ? 'Rule activated' : 'Rule deactivated');
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to update rule');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Access rules</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          New rule
        </Button>
      </div>
      <Text type="secondary">
        Control when and how guests can book: party size limits, cover caps per slot, and
        booking windows.
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
          dataSource={data?.accessRules ?? []}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Days',
              dataIndex: 'daysOfWeek',
              render: (days: number[]) =>
                days?.length ? days.map((d) => DAYS[d]).join(', ') : 'Every day',
            },
            {
              title: 'Dates',
              key: 'dates',
              render: (_: any, r: any) =>
                r.startDate || r.endDate ? `${r.startDate ?? '…'} → ${r.endDate ?? '…'}` : '—',
            },
            {
              title: 'Time',
              key: 'time',
              render: (_: any, r: any) =>
                r.startTime || r.endTime ? `${r.startTime ?? '…'}–${r.endTime ?? '…'}` : '—',
            },
            {
              title: 'Party size',
              key: 'party',
              render: (_: any, r: any) =>
                r.minPartySize || r.maxPartySize
                  ? `${r.minPartySize ?? 1}–${r.maxPartySize ?? '∞'}`
                  : '—',
            },
            {
              title: 'Covers/slot',
              dataIndex: 'maxCoversPerSlot',
              render: (v: number) => v ?? '—',
            },
            {
              title: 'Booking window',
              key: 'window',
              render: (_: any, r: any) => (
                <>
                  {r.minAdvanceHours != null && <Tag>≥ {r.minAdvanceHours}h ahead</Tag>}
                  {r.maxAdvanceDays != null && <Tag>≤ {r.maxAdvanceDays}d ahead</Tag>}
                  {r.minAdvanceHours == null && r.maxAdvanceDays == null && '—'}
                </>
              ),
            },
            {
              title: 'Active',
              dataIndex: 'active',
              render: (active: boolean, r: any) => (
                <Switch size="small" checked={active} onChange={(v) => toggleActive(r, v)} />
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: any, r: any) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete this rule?"
                    onConfirm={async () => {
                      try {
                        await deleteRule({ variables: { id: r.id } });
                        message.success('Rule deleted');
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
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit access rule' : 'New access rule'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Weekend large-party cap" />
          </Form.Item>
          <Form.Item name="daysOfWeek" label="Days of week (empty = every day)">
            <Select mode="multiple" options={DAYS.map((d, i) => ({ value: i, label: d }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startTime" label="Start time (HH:mm)">
                <Input placeholder="17:00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="End time (HH:mm)">
                <Input placeholder="22:00" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="minPartySize" label="Min party size">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxPartySize" label="Max party size">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxCoversPerSlot" label="Max covers per slot">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="minAdvanceHours" label="Min advance notice (hours)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxAdvanceDays" label="Max advance booking (days)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
