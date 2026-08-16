'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import {
  ADMIN_BLOG_POSTS,
  CREATE_BLOG_POST,
  DELETE_BLOG_POST,
  PUBLISH_BLOG_POST,
  UPDATE_BLOG_POST,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { useUrlListFilters } from '@/lib/useUrlListFilters';

const { Text, Paragraph } = Typography;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  coverImageUrl?: string | null;
  status: string;
  publishedAt?: string | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  faq: Array<{ question: string; answer: string }>;
  author?: { firstName?: string; lastName?: string } | null;
  updatedAt?: string;
};

function slugifyPreview(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function AdminBlogPageContent() {
  const { ready } = useRequireAdmin();
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { search, searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<BlogPostRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, loading, refetch } = useQuery(ADMIN_BLOG_POSTS, {
    skip: !ready,
    variables: {
      search: searchQuery || undefined,
      status: status || undefined,
      limit,
      offset,
    },
  });

  const [createPost, { loading: creating }] = useMutation(CREATE_BLOG_POST);
  const [updatePost, { loading: updating }] = useMutation(UPDATE_BLOG_POST);
  const [deletePost, { loading: deleting }] = useMutation(DELETE_BLOG_POST);
  const [publishPost, { loading: publishing }] = useMutation(PUBLISH_BLOG_POST);

  if (!ready) return null;

  const items: BlogPostRow[] = data?.adminBlogPosts?.items ?? [];
  const total = data?.adminBlogPosts?.total ?? 0;
  const saving = creating || updating;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      tags: [],
      faq: [],
      coverPhotos: [],
    });
    setModalOpen(true);
  };

  const openEdit = (record: BlogPostRow) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      slug: record.slug,
      excerpt: record.excerpt,
      bodyHtml: record.bodyHtml,
      status: record.status,
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      tags: record.tags ?? [],
      faq: (record.faq ?? []).map((f) => ({ question: f.question, answer: f.answer })),
      coverPhotos: record.coverImageUrl ? [record.coverImageUrl] : [],
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        title: values.title,
        slug: values.slug || undefined,
        excerpt: values.excerpt || '',
        bodyHtml: values.bodyHtml,
        coverImageUrl: values.coverPhotos?.[0] || '',
        status: values.status,
        seoTitle: values.seoTitle || '',
        seoDescription: values.seoDescription || '',
        tags: values.tags ?? [],
        faq: values.faq ?? [],
      };

      if (editing) {
        await updatePost({ variables: { id: editing.id, input } });
        message.success('Article updated');
      } else {
        await createPost({ variables: { input } });
        message.success('Article created');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Save failed');
    }
  };

  const onDelete = (record: BlogPostRow) => {
    Modal.confirm({
      title: 'Delete article?',
      content: `“${record.title}” will be permanently removed.`,
      okText: 'Delete',
      okButtonProps: { danger: true, loading: deleting },
      onOk: async () => {
        try {
          await deletePost({ variables: { id: record.id } });
          message.success('Article deleted');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Delete failed');
        }
      },
    });
  };

  const onPublish = async (record: BlogPostRow) => {
    try {
      await publishPost({ variables: { id: record.id } });
      message.success('Article published');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Publish failed');
    }
  };

  const titleWatch = Form.useWatch('title', form);

  return (
    <div component="AdminBlogPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Blog articles"
          subtitle="Publish SEO and AEO content for diners and restaurant partners. Published posts appear on tablevera.online/blog."
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New article
            </Button>
          }
        />

        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search title, slug, or tag"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="Status"
            value={status}
            onChange={(v) => setStatus(v)}
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
          />
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{
            ...tablePagination,
            total,
            onChange: (page, pageSize) => setPagination(page, pageSize),
          }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              render: (title: string, record) => (
                <Space orientation="vertical" size={0}>
                  <Text strong>{title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    /blog/{record.slug}
                  </Text>
                </Space>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Tags',
              dataIndex: 'tags',
              width: 200,
              render: (tags: string[]) =>
                tags?.length ? (
                  <Space size={[4, 4]} wrap>
                    {tags.slice(0, 4).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                    {tags.length > 4 ? <Tag>+{tags.length - 4}</Tag> : null}
                  </Space>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: 'Updated',
              dataIndex: 'updatedAt',
              width: 140,
              render: (v?: string) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
            {
              title: '',
              key: 'actions',
              width: 220,
              render: (_: unknown, record: BlogPostRow) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    Edit
                  </Button>
                  {record.status !== 'published' ? (
                    <Button
                      size="small"
                      icon={<SendOutlined />}
                      loading={publishing}
                      onClick={() => onPublish(record)}
                    >
                      Publish
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(record)}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title={editing ? 'Edit article' : 'New article'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        width={840}
        destroyOnClose
        okText={editing ? 'Save changes' : 'Create article'}
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Use clear titles, a short excerpt, and FAQ answers so search engines and answer engines can
          cite this content.
        </Paragraph>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Title is required' }, { max: 200 }]}
              >
                <Input
                  maxLength={200}
                  onBlur={() => {
                    const slug = form.getFieldValue('slug');
                    if (!slug && titleWatch) {
                      form.setFieldValue('slug', slugifyPreview(titleWatch));
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="slug"
            label="URL slug"
            extra="Lowercase letters, numbers, and hyphens. Leave blank to auto-generate from the title."
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) return;
                  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
                    throw new Error('Use lowercase letters, numbers, and hyphens only');
                  }
                },
              },
            ]}
          >
            <Input addonBefore="/blog/" placeholder={slugifyPreview(titleWatch || 'my-article')} />
          </Form.Item>

          <Form.Item name="excerpt" label="Excerpt" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} maxLength={500} showCount placeholder="1–2 sentence summary" />
          </Form.Item>

          <Form.Item
            name="bodyHtml"
            label="Body (HTML)"
            rules={[{ required: true, message: 'Body is required' }]}
            extra="Use simple HTML: <p>, <h2>, <ul>, <a>, <strong>. Avoid scripts and inline styles."
          >
            <Input.TextArea rows={12} placeholder="<p>Start writing…</p>" />
          </Form.Item>

          <Form.Item name="coverPhotos" label="Cover image" valuePropName="value">
            <PhotoUpload maxCount={1} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="seoTitle"
                label="SEO title"
                rules={[{ max: 70 }]}
                extra="Defaults to the article title when empty."
              >
                <Input maxLength={70} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="seoDescription" label="SEO description" rules={[{ max: 160 }]}>
                <Input.TextArea rows={2} maxLength={160} showCount />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="Add tags (press Enter)" />
          </Form.Item>

          <div style={{ marginBottom: 8 }}>
            <Text strong>FAQ (AEO)</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Short question/answer pairs help answer engines cite this article.
              </Text>
            </div>
          </div>
          <Form.List name="faq">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      border: '1px solid var(--color-border, #e3dfd8)',
                      borderRadius: 12,
                    }}
                  >
                    <Form.Item
                      {...rest}
                      name={[name, 'question']}
                      label="Question"
                      rules={[{ required: true, message: 'Question is required' }, { max: 300 }]}
                    >
                      <Input maxLength={300} />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'answer']}
                      label="Answer"
                      rules={[{ required: true, message: 'Answer is required' }, { max: 2000 }]}
                    >
                      <Input.TextArea rows={2} maxLength={2000} showCount />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                  Add FAQ
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

export default function AdminBlogPage() {
  return (
    <Suspense fallback={null}>
      <AdminBlogPageContent />
    </Suspense>
  );
}
