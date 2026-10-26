'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Empty,
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
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { PageHeader, spacing } from '@reservations/ui';
import {
  QA_ISSUE_SEVERITIES,
  QA_ISSUE_SEVERITY_LABELS,
  QA_ISSUE_STATUS_LABELS,
  QA_ISSUE_STATUSES,
  QA_ISSUE_TAG_PRESETS,
  canManageQaChecklist,
  type QaIssueSeverity,
  type QaIssueStatus,
} from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { DELETE_QA_ISSUE, EXPORT_QA_ISSUES, QA_ISSUES, SAVE_QA_ISSUE } from '@/lib/graphql';
import { downloadExportPayload } from '@/lib/downloadExport';
import { ExportMenu, type ListExportFormat } from '@/components/ExportMenu';
import { RichTextArea } from '@/components/RichTextArea';
import SupportAttachmentUpload, {
  type SupportAttachmentDraft,
} from '@/components/SupportAttachmentUpload';

type Attachment = {
  id: string;
  url: string;
  key: string;
  filename: string;
  contentType: string;
  size: number | null;
};

type QaIssueRow = {
  id: string;
  number: number;
  code: string;
  title: string;
  description: string;
  tags: string[];
  status: QaIssueStatus;
  severity: QaIssueSeverity;
  path: string;
  environment: string;
  release: string;
  attachments: Attachment[];
  reporterName: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type IssueForm = {
  title: string;
  description: string;
  tags: string[];
  status: QaIssueStatus;
  severity: QaIssueSeverity;
  path: string;
  environment: string;
  release: string;
  attachments: SupportAttachmentDraft[];
};

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<QaIssueStatus, string> = {
  open: 'red',
  in_progress: 'blue',
  blocked: 'orange',
  ready_for_retest: 'purple',
  fixed: 'green',
  wont_fix: 'default',
  duplicate: 'default',
};

const SEVERITY_COLOR: Record<QaIssueSeverity, string> = {
  p0: 'red',
  p1: 'volcano',
  p2: 'gold',
  p3: 'default',
};

const EMPTY_FORM: IssueForm = {
  title: '',
  description: '',
  tags: ['bug'],
  status: 'open',
  severity: 'p2',
  path: '',
  environment: '',
  release: '',
  attachments: [],
};

function plainPreview(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDrafts(files: Attachment[]): SupportAttachmentDraft[] {
  return files.map((file) => ({
    url: file.url,
    key: file.key,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size ?? undefined,
  }));
}

export default function AdminQaIssuesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<QaIssueStatus | undefined>();
  const [severity, setSeverity] = useState<QaIssueSeverity | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QaIssueRow | null>(null);
  const [form] = Form.useForm<IssueForm>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status, severity, tags]);

  const variables = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
      severity: severity || undefined,
      tags: tags.length ? tags : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [search, status, severity, tags, page],
  );

  const { data, loading } = useQuery(QA_ISSUES, { skip: !allowed, variables });
  const [saveIssue, { loading: saving }] = useMutation(SAVE_QA_ISSUE);
  const [removeIssue, { loading: deleting }] = useMutation(DELETE_QA_ISSUE);
  const [exportIssues, { loading: exporting }] = useMutation(EXPORT_QA_ISSUES);

  const connection = data?.qaIssues as
    | { total: number; items: QaIssueRow[] }
    | undefined;
  const items = connection?.items ?? [];
  const filtersActive = Boolean(search || status || severity || tags.length);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: QaIssueRow) => {
    setEditing(row);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      form.setFieldsValue(EMPTY_FORM);
      return;
    }
    form.setFieldsValue({
      title: editing.title,
      description: editing.description,
      tags: editing.tags,
      status: editing.status,
      severity: editing.severity,
      path: editing.path,
      environment: editing.environment,
      release: editing.release,
      attachments: toDrafts(editing.attachments),
    });
  }, [open, editing, form]);

  const persist = async (input: Record<string, unknown>, success: string) => {
    try {
      await saveIssue({
        variables: { input },
        refetchQueries: [{ query: QA_ISSUES, variables }],
        awaitRefetchQueries: true,
      });
      message.success(success);
      return true;
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save the issue');
      return false;
    }
  };

  const submit = async () => {
    let values: IssueForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const input = {
      id: editing?.id,
      title: values.title,
      description: values.description ?? '',
      tags: values.tags,
      status: values.status,
      severity: values.severity,
      path: values.path ?? '',
      environment: values.environment ?? '',
      release: values.release ?? '',
      attachments: (values.attachments ?? []).map((file) => ({
        url: file.url,
        key: file.key,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
      })),
    };
    const ok = await persist(input, editing ? 'Issue updated' : 'Issue created');
    if (ok) setOpen(false);
  };

  const changeStatus = (row: QaIssueRow, next: QaIssueStatus) => {
    if (next === row.status) return;
    void persist({ id: row.id, status: next }, `${row.code} marked ${QA_ISSUE_STATUS_LABELS[next]}`);
  };

  const destroy = async (row: QaIssueRow) => {
    try {
      await removeIssue({
        variables: { id: row.id },
        refetchQueries: [{ query: QA_ISSUES, variables }],
        awaitRefetchQueries: true,
      });
      message.success(`${row.code} deleted`);
      if (editing?.id === row.id) setOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not delete the issue');
    }
  };

  const onExport = async (format: ListExportFormat) => {
    const apiFormat = format === 'xlsx' ? 'excel' : format === 'docx' ? 'word' : format;
    try {
      const result = await exportIssues({
        variables: {
          search: search || undefined,
          status: status || undefined,
          severity: severity || undefined,
          tags: tags.length ? tags : undefined,
          format: apiFormat,
        },
      });
      const payload = result.data?.exportQaIssues;
      if (!payload) throw new Error('Export failed');
      downloadExportPayload(payload);
      message.success(`Downloaded ${payload.rowCount} issues`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not export issues');
    }
  };

  const columns: TableProps<QaIssueRow>['columns'] = [
    {
      title: 'Issue',
      dataIndex: 'code',
      width: 96,
      render: (code: string) => <Typography.Text strong>{code}</Typography.Text>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      render: (title: string, row) => (
        <div>
          <div>{title}</div>
          {row.description ? (
            <Typography.Text type="secondary" ellipsis style={{ maxWidth: 360 }}>
              {plainPreview(row.description)}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      width: 180,
      render: (rowTags: string[]) => (
        <Space size={4} wrap>
          {rowTags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      width: 88,
      render: (value: QaIssueSeverity) => (
        <Tag color={SEVERITY_COLOR[value]}>{QA_ISSUE_SEVERITY_LABELS[value]}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 180,
      render: (value: QaIssueStatus, row) => (
        <Select
          size="small"
          value={value}
          style={{ width: 160 }}
          options={QA_ISSUE_STATUSES.map((item) => ({
            value: item,
            label: QA_ISSUE_STATUS_LABELS[item],
          }))}
          onClick={(event) => event.stopPropagation()}
          onChange={(next) => changeStatus(row, next)}
        />
      ),
    },
    {
      title: 'Path',
      dataIndex: 'path',
      width: 180,
      ellipsis: true,
      render: (path: string) => path || '—',
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      width: 120,
      render: (iso: string | null) => (iso ? dayjs(iso).format('MMM D, YYYY') : '—'),
    },
  ];

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="Issues"
        subtitle="Bugs, features, and follow-ups for a later fix. Super Admin and QA only."
        extra={
          <Space>
            <Link href="/admin/qa">Checklist</Link>
            <ExportMenu
              formats={['pdf', 'xlsx', 'docx']}
              loading={exporting}
              disabled={loading}
              onExport={(format) => void onExport(format)}
            />
            <Button type="primary" onClick={openCreate}>
              New issue
            </Button>
          </Space>
        }
      />

      <Space wrap style={{ marginBottom: spacing.lg, width: '100%' }}>
        <Input.Search
          allowClear
          placeholder="Search title, path, QA-001…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Status"
          value={status}
          style={{ width: 180 }}
          options={QA_ISSUE_STATUSES.map((item) => ({
            value: item,
            label: QA_ISSUE_STATUS_LABELS[item],
          }))}
          onChange={(value) => setStatus(value)}
        />
        <Select
          allowClear
          placeholder="Severity"
          value={severity}
          style={{ width: 120 }}
          options={QA_ISSUE_SEVERITIES.map((item) => ({
            value: item,
            label: QA_ISSUE_SEVERITY_LABELS[item],
          }))}
          onChange={(value) => setSeverity(value)}
        />
        <Select
          mode="tags"
          allowClear
          placeholder="Tags"
          value={tags}
          style={{ minWidth: 220 }}
          tokenSeparators={[',']}
          options={QA_ISSUE_TAG_PRESETS.map((tag) => ({ value: tag, label: tag }))}
          onChange={(value) => setTags(value.map((tag) => tag.trim().toLowerCase()).filter(Boolean))}
        />
        {filtersActive ? (
          <Button
            type="link"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setStatus(undefined);
              setSeverity(undefined);
              setTags([]);
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 980 }}
        locale={{ emptyText: <Empty description="No issues match these filters" /> }}
        onRow={(row) => ({
          onClick: () => openEdit(row),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: connection?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Modal
        title={editing ? `Edit ${editing.code}` : 'New issue'}
        open={open}
        onCancel={() => setOpen(false)}
        width={760}
        destroyOnHidden
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              {editing ? (
                <Popconfirm
                  title={`Delete ${editing.code}?`}
                  description="This removes the issue from the list and from future exports."
                  okText="Delete"
                  okButtonProps={{ danger: true, loading: deleting }}
                  onConfirm={() => void destroy(editing)}
                >
                  <Button danger>Delete</Button>
                </Popconfirm>
              ) : null}
            </div>
            <Space>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="primary" loading={saving} onClick={() => void submit()}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </Space>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM} requiredMark="optional">
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: 'Add a title' },
              { min: 3, message: 'Use at least 3 characters' },
              { max: 200, message: 'Keep the title under 200 characters' },
            ]}
          >
            <Input placeholder="What failed, or what should be built" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <RichTextArea rows={6} maxLength={20000} placeholder="Steps, expected result, and what happened" />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item
              name="tags"
              label="Tags"
              rules={[{ required: true, message: 'Add a tag such as bug or feature' }]}
              style={{ flex: 1, minWidth: 220 }}
            >
              <Select
                mode="tags"
                placeholder="bug, feature…"
                options={QA_ISSUE_TAG_PRESETS.map((tag) => ({ value: tag, label: tag }))}
                tokenSeparators={[',']}
              />
            </Form.Item>
            <Form.Item name="severity" label="Severity" style={{ width: 120 }}>
              <Select
                options={QA_ISSUE_SEVERITIES.map((item) => ({
                  value: item,
                  label: QA_ISSUE_SEVERITY_LABELS[item],
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Status" style={{ width: 180 }}>
              <Select
                options={QA_ISSUE_STATUSES.map((item) => ({
                  value: item,
                  label: QA_ISSUE_STATUS_LABELS[item],
                }))}
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="path"
            label="Issue URL path"
            extra="The page where you found it. A path like /reservations, or a full URL."
          >
            <Input placeholder="/admin/reservations" maxLength={500} />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="environment" label="Environment" style={{ flex: 1 }}>
              <Input placeholder="Staging URL or build" maxLength={200} />
            </Form.Item>
            <Form.Item name="release" label="Release" style={{ width: 160 }}>
              <Input placeholder="0.90.0" maxLength={40} />
            </Form.Item>
          </Space>
          <Form.Item name="attachments" label="Attachments">
            <SupportAttachmentUpload />
          </Form.Item>
          {editing ? (
            <Typography.Text type="secondary">
              Filed by {editing.reporterName}
              {editing.createdAt ? ` · ${dayjs(editing.createdAt).format('MMM D, YYYY · h:mm A')}` : ''}
              {editing.status ? (
                <>
                  {' '}
                  · <Tag color={STATUS_COLOR[editing.status]}>{QA_ISSUE_STATUS_LABELS[editing.status]}</Tag>
                </>
              ) : null}
            </Typography.Text>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
