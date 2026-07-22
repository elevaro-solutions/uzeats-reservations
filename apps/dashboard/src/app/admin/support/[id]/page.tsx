'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { PageHeader, spacing } from '@reservations/ui';
import { SUPPORT_TICKET_SUBJECTS } from '@reservations/shared';
import {
  ADD_SUPPORT_ATTACHMENT,
  ADD_SUPPORT_NOTE,
  ADMIN_RESTAURANTS,
  ADMIN_USERS,
  CREATE_UPLOAD_URL,
  DELETE_SUPPORT_NOTE,
  REMOVE_SUPPORT_ATTACHMENT,
  SUPPORT_TICKET,
  UPDATE_SUPPORT_ATTACHMENT,
  UPDATE_SUPPORT_NOTE,
  UPDATE_SUPPORT_TICKET,
} from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import {
  CATEGORY_OPTIONS,
  PRIORITY_COLORS,
  PRIORITY_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
  SUBJECT_OPTIONS,
  canManageOwnedItem,
  formatBytes,
  formatEventLabel,
  personLabel,
} from '@/lib/supportTickets';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SupportTicketDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { user } = useAuth();
  const { ready } = useRequireAdmin();
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; body: string } | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<{
    id: string;
    filename: string;
  } | null>(null);

  const { data, loading, refetch } = useQuery(SUPPORT_TICKET, {
    skip: !ready || !id,
    variables: { id },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });

  const [updateTicket, { loading: updating }] = useMutation(UPDATE_SUPPORT_TICKET);
  const [addNote, { loading: noting }] = useMutation(ADD_SUPPORT_NOTE);
  const [updateNote, { loading: updatingNote }] = useMutation(UPDATE_SUPPORT_NOTE);
  const [deleteNote, { loading: deletingNote }] = useMutation(DELETE_SUPPORT_NOTE);
  const [addAttachment] = useMutation(ADD_SUPPORT_ATTACHMENT);
  const [updateAttachment, { loading: updatingAttachment }] = useMutation(UPDATE_SUPPORT_ATTACHMENT);
  const [removeAttachment] = useMutation(REMOVE_SUPPORT_ATTACHMENT);
  const [createUploadUrl] = useMutation(CREATE_UPLOAD_URL);

  const ticket = data?.supportTicket;
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

  const canManageNote = (authorId?: string | null) =>
    canManageOwnedItem({
      currentUserId: user?.id,
      currentUserRole: user?.role,
      ownerId: authorId,
    });

  const canManageAttachment = (uploadedById?: string | null) =>
    canManageOwnedItem({
      currentUserId: user?.id,
      currentUserRole: user?.role,
      ownerId: uploadedById,
    });

  const patch = async (variables: Record<string, unknown>, success = 'Updated') => {
    try {
      await updateTicket({ variables: { id, ...variables } });
      message.success(success);
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Update failed');
    }
  };

  const onUpload = async (file: RcFile) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`${file.name} exceeds 10MB limit`);
      return false;
    }
    setUploading(true);
    try {
      const { data: uploadData } = await createUploadUrl({
        variables: { filename: file.name, contentType: file.type || 'application/octet-stream' },
      });
      const { uploadUrl, publicUrl, key } = uploadData.createUploadUrl;
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      await addAttachment({
        variables: {
          ticketId: id,
          url: publicUrl,
          key,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        },
      });
      message.success(`${file.name} attached`);
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  if (!loading && !ticket) {
    return (
      <Space orientation="vertical" size={spacing.lg}>
        <Link href="/admin/support">
          <Button icon={<ArrowLeftOutlined />}>Back to tickets</Button>
        </Link>
        <Empty description="Ticket not found" />
      </Space>
    );
  }

  const timelineItems = [...(ticket?.events ?? [])]
    .slice()
    .reverse()
    .map((event: any) => ({
      key: event.id,
      children: (
        <div>
          <div>{formatEventLabel(event)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {personLabel(event.actor)} · {new Date(event.createdAt).toLocaleString()}
          </Typography.Text>
        </div>
      ),
    }));

  return (
    <div component="SupportTicketDetailPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <div>
        <Link href="/admin/support">
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
            Back to tickets
          </Button>
        </Link>
        <PageHeader
          title={ticket?.subject ?? 'Support ticket'}
          subtitle={
            ticket
              ? `${ticket.category} · Created ${new Date(ticket.createdAt).toLocaleString()}`
              : 'Loading…'
          }
          extra={
            ticket ? (
              <Space wrap>
                <Tag color={STATUS_COLORS[ticket.status]}>{ticket.status.replace(/_/g, ' ')}</Tag>
                <Tag color={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Tag>
              </Space>
            ) : null
          }
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
            <Card title="Details" loading={loading}>
              {ticket && (
                <Form layout="vertical">
                  <Form.Item label="Subject">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      value={ticket.subjectKey ?? undefined}
                      options={SUBJECT_OPTIONS}
                      onChange={(key) => {
                        const preset = SUPPORT_TICKET_SUBJECTS.find((s) => s.key === key);
                        patch(
                          {
                            subjectKey: key,
                            subject: preset?.label,
                            category: preset?.category,
                          },
                          'Subject updated',
                        );
                      }}
                    />
                  </Form.Item>
                  {(!ticket.subjectKey || ticket.subjectKey === 'other') && (
                    <Form.Item label="Subject text">
                      <Input
                        defaultValue={ticket.subject}
                        key={ticket.subject}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== ticket.subject) {
                            patch({ subject: next }, 'Subject updated');
                          }
                        }}
                      />
                    </Form.Item>
                  )}
                  <Form.Item label="Description">
                    <Input.TextArea
                      rows={4}
                      defaultValue={ticket.description}
                      key={ticket.description}
                      maxLength={5000}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next !== (ticket.description ?? '')) {
                          patch({ description: next }, 'Description updated');
                        }
                      }}
                    />
                  </Form.Item>
                  <Space wrap style={{ width: '100%' }}>
                    <Form.Item label="Status" style={{ minWidth: 160 }}>
                      <Select
                        value={ticket.status}
                        options={STATUS_OPTIONS}
                        loading={updating}
                        onChange={(status) => patch({ status }, 'Status updated')}
                        style={{ width: 180 }}
                      />
                    </Form.Item>
                    <Form.Item label="Priority" style={{ minWidth: 140 }}>
                      <Select
                        value={ticket.priority}
                        options={PRIORITY_OPTIONS}
                        onChange={(priority) => patch({ priority }, 'Priority updated')}
                        style={{ width: 160 }}
                      />
                    </Form.Item>
                    <Form.Item label="Category" style={{ minWidth: 140 }}>
                      <Select
                        value={ticket.category}
                        options={CATEGORY_OPTIONS}
                        onChange={(category) => patch({ category }, 'Category updated')}
                        style={{ width: 160 }}
                      />
                    </Form.Item>
                  </Space>
                </Form>
              )}
            </Card>

            <Card title="Internal notes" loading={loading}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                {(ticket?.notes ?? []).length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes yet" />
                )}
                {(ticket?.notes ?? []).map((n: any) => {
                  const manageable = canManageNote(n.authorId);
                  return (
                    <Card
                      key={n.id}
                      size="small"
                      type="inner"
                      extra={
                        manageable ? (
                          <Space size={4}>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => setEditingNote({ id: n.id, body: n.body })}
                            />
                            <Popconfirm
                              title="Delete this note?"
                              okText="Delete"
                              okButtonProps={{ danger: true, loading: deletingNote }}
                              onConfirm={async () => {
                                try {
                                  await deleteNote({
                                    variables: { ticketId: id, noteId: n.id },
                                  });
                                  message.success('Note deleted');
                                  refetch();
                                } catch (err: any) {
                                  message.error(err.message || 'Failed');
                                }
                              }}
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ) : null
                      }
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {personLabel(n.author)} · {new Date(n.createdAt).toLocaleString()}
                        {n.updatedAt
                          ? ` · edited ${new Date(n.updatedAt).toLocaleString()}`
                          : ''}
                      </Typography.Text>
                    </Card>
                  );
                })}
                <Input.TextArea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note (staff only)"
                />
                <Button
                  type="primary"
                  loading={noting}
                  disabled={!note.trim()}
                  onClick={async () => {
                    try {
                      await addNote({ variables: { ticketId: id, body: note.trim() } });
                      setNote('');
                      message.success('Note added');
                      refetch();
                    } catch (err: any) {
                      message.error(err.message || 'Failed');
                    }
                  }}
                >
                  Add note
                </Button>
              </Space>
            </Card>

            <Card
              title="Attachments"
              loading={loading}
              extra={
                <Upload
                  showUploadList={false}
                  beforeUpload={onUpload}
                  disabled={uploading || !ticket}
                >
                  <Button icon={<PaperClipOutlined />} loading={uploading}>
                    Upload
                  </Button>
                </Upload>
              }
            >
              {(ticket?.attachments ?? []).length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attachments" />
              ) : (
                <List
                  dataSource={ticket.attachments}
                  renderItem={(item: any) => {
                    const manageable = canManageAttachment(item.uploadedById);
                    const actions = [
                      <a key="open" href={item.url} target="_blank" rel="noreferrer">
                        Open
                      </a>,
                    ];
                    if (manageable) {
                      actions.push(
                        <Button
                          key="edit"
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() =>
                            setEditingAttachment({ id: item.id, filename: item.filename })
                          }
                        >
                          Rename
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="Delete this attachment?"
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                          onConfirm={async () => {
                            try {
                              await removeAttachment({
                                variables: { ticketId: id, attachmentId: item.id },
                              });
                              message.success('Attachment removed');
                              refetch();
                            } catch (err: any) {
                              message.error(err.message || 'Failed');
                            }
                          }}
                        >
                          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            Delete
                          </Button>
                        </Popconfirm>,
                      );
                    }
                    return (
                      <List.Item actions={actions}>
                        <List.Item.Meta
                          avatar={<FileOutlined />}
                          title={item.filename}
                          description={`${item.contentType}${formatBytes(item.size) ? ` · ${formatBytes(item.size)}` : ''} · ${personLabel(item.uploadedBy)} · ${new Date(item.createdAt).toLocaleString()}`}
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
            <Card title="Assignments" loading={loading}>
              {ticket && (
                <Form layout="vertical">
                  <Form.Item label="Assignee (staff)">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      value={ticket.assigneeId ?? undefined}
                      options={staffOptions}
                      placeholder="Unassigned"
                      onChange={(assigneeId) =>
                        patch({ assigneeId: assigneeId ?? null }, 'Assignee updated')
                      }
                    />
                  </Form.Item>
                  <Form.Item label="Restaurant">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      value={ticket.restaurantId ?? undefined}
                      options={restaurantOptions}
                      placeholder="None"
                      onChange={(restaurantId) =>
                        patch({ restaurantId: restaurantId ?? null }, 'Restaurant updated')
                      }
                    />
                  </Form.Item>
                  <Form.Item label="Requester">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      value={ticket.requesterId ?? undefined}
                      options={userOptions}
                      placeholder="None"
                      onChange={(requesterId) =>
                        patch({ requesterId: requesterId ?? null }, 'Requester updated')
                      }
                    />
                  </Form.Item>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    First response:{' '}
                    {ticket.firstResponseAt
                      ? new Date(ticket.firstResponseAt).toLocaleString()
                      : '—'}
                    <br />
                    Resolved:{' '}
                    {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : '—'}
                  </Typography.Text>
                </Form>
              )}
            </Card>

            <Card title="Change timeline" loading={loading}>
              {timelineItems.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No history yet" />
              ) : (
                <Timeline items={timelineItems} />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      <Modal
        title="Edit note"
        open={Boolean(editingNote)}
        onCancel={() => setEditingNote(null)}
        onOk={async () => {
          if (!editingNote) return;
          const body = editingNote.body.trim();
          if (!body) {
            message.error('Note body is required');
            return;
          }
          try {
            await updateNote({
              variables: { ticketId: id, noteId: editingNote.id, body },
            });
            message.success('Note updated');
            setEditingNote(null);
            refetch();
          } catch (err: any) {
            message.error(err.message || 'Failed');
          }
        }}
        confirmLoading={updatingNote}
        destroyOnClose
      >
        <Input.TextArea
          rows={5}
          value={editingNote?.body ?? ''}
          onChange={(e) =>
            setEditingNote((prev) => (prev ? { ...prev, body: e.target.value } : prev))
          }
          maxLength={5000}
          showCount
        />
      </Modal>

      <Modal
        title="Rename attachment"
        open={Boolean(editingAttachment)}
        onCancel={() => setEditingAttachment(null)}
        onOk={async () => {
          if (!editingAttachment) return;
          const filename = editingAttachment.filename.trim();
          if (!filename) {
            message.error('Filename is required');
            return;
          }
          try {
            await updateAttachment({
              variables: {
                ticketId: id,
                attachmentId: editingAttachment.id,
                filename,
              },
            });
            message.success('Attachment renamed');
            setEditingAttachment(null);
            refetch();
          } catch (err: any) {
            message.error(err.message || 'Failed');
          }
        }}
        confirmLoading={updatingAttachment}
        destroyOnClose
      >
        <Input
          value={editingAttachment?.filename ?? ''}
          onChange={(e) =>
            setEditingAttachment((prev) =>
              prev ? { ...prev, filename: e.target.value } : prev,
            )
          }
          maxLength={255}
        />
      </Modal>
    </Space></div>
  );
}
