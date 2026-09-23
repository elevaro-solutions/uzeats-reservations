'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
  Upload,
  Image,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  MoreOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { PageHeader, spacing } from '@reservations/ui';
import { htmlToPlainText } from '@reservations/shared';
import { SupportHtml } from '@/components/SupportHtml';
import { SupportTicketThread } from '@/components/SupportTicketThread';
import { RichTextEditor } from '@/components/RichTextEditor';
import SupportAttachmentUpload, {
  type SupportAttachmentDraft,
} from '@/components/SupportAttachmentUpload';
import {
  ADD_SUPPORT_ATTACHMENT,
  ADD_SUPPORT_NOTE,
  ADMIN_RESTAURANTS,
  ADMIN_USERS,
  DELETE_SUPPORT_NOTE,
  REMOVE_SUPPORT_ATTACHMENT,
  SUPPORT_TICKET,
  UPDATE_SUPPORT_ATTACHMENT,
  UPDATE_SUPPORT_NOTE,
  UPDATE_SUPPORT_TICKET,
} from '@/lib/graphql';
import { uploadFile } from '@/lib/upload';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import {
  CATEGORY_OPTIONS,
  PRIORITY_COLORS,
  PRIORITY_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
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
  const [noteKey, setNoteKey] = useState(0);
  const [reply, setReply] = useState('');
  const [replyKey, setReplyKey] = useState(0);
  const [replyAttachments, setReplyAttachments] = useState<SupportAttachmentDraft[]>([]);
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

  const ticket = data?.supportTicket;
  const users = usersData?.adminUsers?.items ?? [];
  const staffOptions = useMemo(
    () =>
      users
        .filter(
          (u: any) =>
            u.role === 'admin' ||
            u.role === 'account_manager' ||
            u.role === 'manager' ||
            u.role === 'restaurant_owner',
        )
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
      return true;
    } catch (err: any) {
      message.error(err.message || 'Update failed');
      return false;
    }
  };

  const onUpload = async (file: RcFile) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`${file.name} exceeds 10MB limit`);
      return false;
    }
    setUploading(true);
    try {
      const { publicUrl, key } = await uploadFile(
        file,
        file.name,
      );
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

  const internalNotes = (ticket?.notes ?? []).filter((n: { visibleToRequester?: boolean }) => !n.visibleToRequester);

  const submitNote = async (
    body: string,
    visibleToRequester: boolean,
    attachments: SupportAttachmentDraft[] = [],
  ) => {
    if (htmlToPlainText(body).length < 1 && attachments.length === 0) {
      message.error('Write a message or attach an image');
      return;
    }
    try {
      await addNote({
        variables: { ticketId: id, body, visibleToRequester, attachments },
      });
      message.success(visibleToRequester ? 'Reply sent' : 'Note added');
      if (visibleToRequester) {
        setReply('');
        setReplyAttachments([]);
        setReplyKey((key) => key + 1);
      } else {
        setNote('');
        setNoteKey((key) => key + 1);
      }
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed');
    }
  };

  const timelineItems = [...(ticket?.events ?? [])]
    .slice()
    .reverse()
    .map((event: any) => ({
      key: event.id,
      children: (
        <div>
          <div>{formatEventLabel(event)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {personLabel(event.actor)} · {new Date(event.createdAt).toLocaleString('en-US')}
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
              ? `${ticket.category} · Created ${new Date(ticket.createdAt).toLocaleString('en-US')}`
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
            <Card title="Conversation" loading={loading}>
              {ticket ? (
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                  <Typography.Text type="secondary">
                    {personLabel(ticket.requester)}
                    {ticket.restaurant?.name ? ` · ${ticket.restaurant.name}` : ''}
                  </Typography.Text>
                  <SupportTicketThread ticket={ticket} mineIsRequester={false} />
                  <RichTextEditor
                    key={`reply-${replyKey}`}
                    minHeight={140}
                    value={reply}
                    onChange={setReply}
                    placeholder="Reply to the restaurant owner…"
                  />
                  <SupportAttachmentUpload
                    value={replyAttachments}
                    onChange={setReplyAttachments}
                  />
                  <Button
                    type="primary"
                    loading={noting}
                    disabled={
                      htmlToPlainText(reply).length < 1 && replyAttachments.length === 0
                    }
                    onClick={() => submitNote(reply, true, replyAttachments)}
                  >
                    Send reply
                  </Button>
                </Space>
              ) : null}
            </Card>

            <Card title="Internal notes" loading={loading}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                {internalNotes.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No internal notes yet" />
                ) : (
                  internalNotes.map((n: any) => {
                    const manageable = canManageNote(n.authorId);
                    return (
                      <Card
                        key={n.id}
                        size="small"
                        type="inner"
                        extra={
                          manageable ? (
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: 'edit',
                                    icon: <EditOutlined />,
                                    label: 'Edit',
                                    onClick: () => setEditingNote({ id: n.id, body: n.body }),
                                  },
                                  {
                                    key: 'delete',
                                    danger: true,
                                    icon: <DeleteOutlined />,
                                    label: 'Delete',
                                    onClick: () => {
                                      Modal.confirm({
                                        title: 'Delete this note?',
                                        okText: 'Delete',
                                        okButtonProps: { danger: true, loading: deletingNote },
                                        onOk: async () => {
                                          try {
                                            await deleteNote({
                                              variables: { ticketId: id, noteId: n.id },
                                            });
                                            message.success('Note deleted');
                                            refetch();
                                          } catch (err: any) {
                                            message.error(err.message || 'Failed');
                                          }
                                        },
                                      });
                                    },
                                  },
                                ] as MenuProps['items'],
                              }}
                              trigger={['click']}
                            >
                              <Button
                                type="text"
                                size="small"
                                icon={<MoreOutlined />}
                                aria-label="Note actions"
                              />
                            </Dropdown>
                          ) : null
                        }
                      >
                        <SupportHtml html={n.body} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {personLabel(n.author)} · {new Date(n.createdAt).toLocaleString('en-US')}
                          {n.updatedAt
                            ? ` · edited ${new Date(n.updatedAt).toLocaleString('en-US')}`
                            : ''}
                        </Typography.Text>
                      </Card>
                    );
                  })
                )}
                <RichTextEditor
                  key={`note-${noteKey}`}
                  minHeight={140}
                  value={note}
                  onChange={setNote}
                  placeholder="Add an internal note (admins only)"
                />
                <Button
                  loading={noting}
                  disabled={htmlToPlainText(note).length < 1}
                  onClick={() => submitNote(note, false)}
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
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
                    const items: MenuProps['items'] = [
                      {
                        key: 'open',
                        icon: <EyeOutlined />,
                        label: 'Open',
                        onClick: () => window.open(item.url, '_blank', 'noopener,noreferrer'),
                      },
                    ];
                    if (manageable) {
                      items.push(
                        {
                          key: 'rename',
                          icon: <EditOutlined />,
                          label: 'Rename',
                          onClick: () =>
                            setEditingAttachment({ id: item.id, filename: item.filename }),
                        },
                        {
                          key: 'delete',
                          danger: true,
                          icon: <DeleteOutlined />,
                          label: 'Delete',
                          onClick: () => {
                            Modal.confirm({
                              title: 'Delete this attachment?',
                              okText: 'Delete',
                              okButtonProps: { danger: true },
                              onOk: async () => {
                                try {
                                  await removeAttachment({
                                    variables: { ticketId: id, attachmentId: item.id },
                                  });
                                  message.success('Attachment removed');
                                  refetch();
                                } catch (err: any) {
                                  message.error(err.message || 'Failed');
                                }
                              },
                            });
                          },
                        },
                      );
                    }
                    return (
                      <List.Item
                        actions={[
                          <Dropdown key="more" menu={{ items }} trigger={['click']}>
                            <Button
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              aria-label="Attachment actions"
                            />
                          </Dropdown>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            item.contentType?.startsWith('image/') ? (
                              <Image
                                src={item.url}
                                alt={item.filename}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 6 }}
                              />
                            ) : (
                              <FileOutlined />
                            )
                          }
                          title={item.filename}
                          description={`${item.contentType}${formatBytes(item.size) ? ` · ${formatBytes(item.size)}` : ''} · ${personLabel(item.uploadedBy)} · ${new Date(item.createdAt).toLocaleString('en-US')}`}
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
            <Card title="Triage" loading={loading}>
              {ticket && (
                <Form layout="vertical">
                  <Form.Item label="Status">
                    <Select
                      value={ticket.status}
                      options={STATUS_OPTIONS}
                      loading={updating}
                      onChange={(status) => patch({ status }, 'Status updated')}
                    />
                  </Form.Item>
                  <Form.Item label="Priority">
                    <Select
                      value={ticket.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={(priority) => patch({ priority }, 'Priority updated')}
                    />
                  </Form.Item>
                  <Form.Item label="Category">
                    <Select
                      value={ticket.category}
                      options={CATEGORY_OPTIONS}
                      onChange={(category) => patch({ category }, 'Category updated')}
                    />
                  </Form.Item>
                  <Form.Item label="Assignee (admin)">
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
                      ? new Date(ticket.firstResponseAt).toLocaleString('en-US')
                      : '—'}
                    <br />
                    Resolved:{' '}
                    {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('en-US') : '—'}
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
          const body = editingNote.body;
          if (htmlToPlainText(body).length < 1) {
            message.error('Message is required');
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
        <RichTextEditor
          minHeight={160}
          value={editingNote?.body ?? ''}
          onChange={(html) =>
            setEditingNote((prev) => (prev ? { ...prev, body: html } : prev))
          }
          placeholder="Edit message…"
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
