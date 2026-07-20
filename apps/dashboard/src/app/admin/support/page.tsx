'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { SUPPORT_TICKET_SUBJECTS } from '@reservations/shared';
import {
  ADMIN_RESTAURANTS,
  ADMIN_USERS,
  CREATE_SUPPORT_TICKET,
  SUPPORT_TICKETS,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';
import {
  CATEGORY_OPTIONS,
  PRIORITY_COLORS,
  PRIORITY_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
  SUBJECT_OPTIONS,
  personLabel,
} from '@/lib/supportTickets';

function SupportPageContent() {
  const router = useRouter();
  const { ready } = useRequireAdmin();
  const [status, setStatus] = useState<string | undefined>();
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [restaurantId, setRestaurantId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const subjectKey = Form.useWatch('subjectKey', form);
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data, loading, refetch } = useQuery(SUPPORT_TICKETS, {
    skip: !ready,
    variables: {
      status,
      assigneeId,
      restaurantId,
      search: search || undefined,
      limit,
      offset,
    },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const [createTicket, { loading: creating }] = useMutation(CREATE_SUPPORT_TICKET);

  const users = usersData?.adminUsers?.items ?? [];
  const staffOptions = useMemo(
    () =>
      users
        .filter((u: any) => u.role === 'admin' || u.role === 'staff' || u.role === 'restaurant_owner')
        .map((u: any) => ({
          value: u.id,
          label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
        })),
    [users],
  );
  const userOptions = useMemo(
    () =>
      users.map((u: any) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
      })),
    [users],
  );
  const restaurantOptions = useMemo(
    () =>
      (restaurantsData?.adminRestaurants?.items ?? []).map((r: any) => ({
        value: r.id,
        label: r.name,
      })),
    [restaurantsData],
  );

  if (!ready) return null;

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      const preset = SUPPORT_TICKET_SUBJECTS.find((s) => s.key === values.subjectKey);
      const res = await createTicket({
        variables: {
          subjectKey: values.subjectKey,
          subject: values.customSubject?.trim() || preset?.label,
          description: values.description,
          priority: values.priority,
          category: values.category || preset?.category,
          requesterId: values.requesterId,
          restaurantId: values.restaurantId,
          assigneeId: values.assigneeId,
          note: values.note,
        },
      });
      message.success('Ticket created');
      setCreateOpen(false);
      form.resetFields();
      refetch();
      const id = res.data?.createSupportTicket?.id;
      if (id) router.push(`/admin/support/${id}`);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed');
    }
  };

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Support tickets"
        subtitle="Track diner and restaurant cases with assignments, notes, and history."
        extra={
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            New ticket
          </Button>
        }
      />
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 160 }}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPagination(1);
            }}
            options={STATUS_OPTIONS}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Assignee"
            style={{ width: 220 }}
            value={assigneeId}
            onChange={(v) => {
              setAssigneeId(v);
              setPagination(1);
            }}
            options={staffOptions}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Restaurant"
            style={{ width: 220 }}
            value={restaurantId}
            onChange={(v) => {
              setRestaurantId(v);
              setPagination(1);
            }}
            options={restaurantOptions}
          />
          <Input.Search
            placeholder="Search subject"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => {
              setSearch(v);
              setPagination(1);
            }}
          />
        </Space>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.supportTickets?.items ?? []}
          pagination={tablePagination(data?.supportTickets?.total ?? 0)}
          onRow={(record) => ({
            onClick: () => router.push(`/admin/support/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Subject',
              dataIndex: 'subject',
              render: (subject: string, row: any) => (
                <div>
                  <div>{subject}</div>
                  {row.subjectKey && (
                    <div style={{ fontSize: 12, opacity: 0.65 }}>{row.subjectKey}</div>
                  )}
                </div>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s.replace(/_/g, ' ')}</Tag>,
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              width: 100,
              render: (p: string) => <Tag color={PRIORITY_COLORS[p]}>{p}</Tag>,
            },
            { title: 'Category', dataIndex: 'category', width: 110 },
            {
              title: 'Assignee',
              key: 'assignee',
              render: (_: unknown, row: any) => personLabel(row.assignee),
            },
            {
              title: 'Restaurant',
              key: 'restaurant',
              render: (_: unknown, row: any) => row.restaurant?.name ?? '—',
            },
            {
              title: 'Updated',
              dataIndex: 'updatedAt',
              width: 170,
              render: (v: string) => new Date(v).toLocaleString(),
            },
          ]}
        />
      </Card>

      <Modal
        title="New support ticket"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={creating}
        destroyOnClose
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ priority: 'normal', category: 'other' }}
        >
          <Form.Item
            name="subjectKey"
            label="Subject"
            rules={[{ required: true, message: 'Select a subject' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={SUBJECT_OPTIONS}
              onChange={(key) => {
                const preset = SUPPORT_TICKET_SUBJECTS.find((s) => s.key === key);
                if (preset) form.setFieldValue('category', preset.category);
              }}
            />
          </Form.Item>
          {subjectKey === 'other' && (
            <Form.Item
              name="customSubject"
              label="Custom subject"
              rules={[{ required: true, message: 'Enter a subject' }]}
            >
              <Input maxLength={200} />
            </Form.Item>
          )}
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} maxLength={5000} showCount />
          </Form.Item>
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="priority" label="Priority" style={{ minWidth: 160, flex: 1 }}>
              <Select options={PRIORITY_OPTIONS} />
            </Form.Item>
            <Form.Item name="category" label="Category" style={{ minWidth: 160, flex: 1 }}>
              <Select options={CATEGORY_OPTIONS} />
            </Form.Item>
          </Space>
          <Form.Item name="assigneeId" label="Assign to staff">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={staffOptions}
              placeholder="Unassigned"
            />
          </Form.Item>
          <Form.Item name="restaurantId" label="Restaurant">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={restaurantOptions}
              placeholder="Optional"
            />
          </Form.Item>
          <Form.Item name="requesterId" label="Requester">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={userOptions}
              placeholder="Optional"
            />
          </Form.Item>
          <Form.Item name="note" label="Initial internal note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportPageContent />
    </Suspense>
  );
}
