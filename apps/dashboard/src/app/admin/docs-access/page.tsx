'use client';

import { Suspense, useState } from 'react';
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
import { MailOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_DOCS_ACCESS_REQUESTS,
  ADMIN_SEND_DOCS_ACCESS_OTP,
  GRANT_DOCS_ACCESS,
  REVIEW_DOCS_ACCESS_REQUEST,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  denied: 'red',
};

function DocsAccessPageContent() {
  const { ready } = useRequireAdmin();
  const { searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_DOCS_ACCESS_REQUESTS, {
    skip: !ready,
    variables: {
      status: status || undefined,
      search: searchQuery || undefined,
      limit,
      offset,
    },
  });

  const [reviewRequest] = useMutation(REVIEW_DOCS_ACCESS_REQUEST);
  const [grantAccess, { loading: granting }] = useMutation(GRANT_DOCS_ACCESS);
  const [sendOtp] = useMutation(ADMIN_SEND_DOCS_ACCESS_OTP);

  if (!ready) return null;

  const items = data?.adminDocsAccessRequests?.items ?? [];
  const total = data?.adminDocsAccessRequests?.total ?? 0;

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: 'Name',
      render: (_: unknown, r: any) =>
        [r.firstName, r.lastName].filter(Boolean).join(' ') || '—',
    },
    {
      title: 'Company',
      dataIndex: 'company',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: 'Actions',
      render: (_: unknown, r: any) => (
        <Space wrap>
          {r.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={async () => {
                  await reviewRequest({
                    variables: { id: r.id, status: 'approved' },
                  });
                  message.success('Approved');
                  refetch();
                }}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                onClick={async () => {
                  await reviewRequest({
                    variables: { id: r.id, status: 'denied' },
                  });
                  message.success('Denied');
                  refetch();
                }}
              >
                Deny
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button
              size="small"
              icon={<MailOutlined />}
              onClick={async () => {
                const result = await sendOtp({ variables: { email: r.email } });
                message.info(result.data?.adminSendDocsAccessOtp?.message ?? 'Code sent');
              }}
            >
              Send code
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Docs access"
        subtitle="Review documentation access requests and grant access by email."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGrantOpen(true)}>
            Grant access
          </Button>
        }
      />

      <Card style={{ marginBottom: spacing.md }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by email"
            defaultValue={searchQuery}
            onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
            onBlur={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Status"
            value={status || undefined}
            onChange={(v) => setStatus(v ?? '')}
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            ...tablePagination,
            total,
          }}
          expandable={{
            expandedRowRender: (r: any) => (
              <div>
                {r.reason && (
                  <p>
                    <strong>Reason:</strong> {r.reason}
                  </p>
                )}
                {r.notes && (
                  <p>
                    <strong>Admin notes:</strong> {r.notes}
                  </p>
                )}
                {r.reviewer && (
                  <p>
                    <strong>Reviewed by:</strong> {r.reviewer.firstName} {r.reviewer.lastName}
                  </p>
                )}
              </div>
            ),
            rowExpandable: (r: any) => Boolean(r.reason || r.notes || r.reviewer),
          }}
        />
      </Card>

      <Modal
        title="Grant docs access"
        open={grantOpen}
        onCancel={() => {
          setGrantOpen(false);
          grantForm.resetFields();
        }}
        okText="Grant access"
        confirmLoading={granting}
        onOk={async () => {
          const values = await grantForm.validateFields();
          await grantAccess({
            variables: {
              email: values.email.trim().toLowerCase(),
              notes: values.notes?.trim() || undefined,
            },
          });
          message.success('Access granted');
          setGrantOpen(false);
          grantForm.resetFields();
          refetch();
        }}
      >
        <Form form={grantForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          >
            <Input placeholder="developer@company.com" />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function AdminDocsAccessPage() {
  return (
    <Suspense fallback={null}>
      <DocsAccessPageContent />
    </Suspense>
  );
}
