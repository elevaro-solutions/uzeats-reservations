'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Form, Input, Modal, Row, Space, message } from 'antd';
import { EyeOutlined, MailOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { EMAIL_TEMPLATES, SEND_TEST_EMAIL_TEMPLATE, UPDATE_EMAIL_TEMPLATE } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { RichTextEditor } from '@/components/RichTextEditor';
import { EmailPreviewModal } from '@/components/EmailPreviewModal';
import { EMAIL_TEMPLATE_VARIABLES } from '@/lib/emailPreview';

export default function AdminTemplatesPage() {
  const { ready, user } = useRequireAdmin();
  const { data, loading, refetch } = useQuery(EMAIL_TEMPLATES, { skip: !ready });
  const [updateTemplate, { loading: saving }] = useMutation(UPDATE_EMAIL_TEMPLATE);
  const [sendTestEmail, { loading: sendingTest }] = useMutation(SEND_TEST_EMAIL_TEMPLATE);
  const [activeKey, setActiveKey] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [form] = Form.useForm();

  const templates = data?.emailTemplates ?? [];
  const activeTemplate = templates.find((t: { key: string }) => t.key === activeKey) ?? templates[0];
  const variables = EMAIL_TEMPLATE_VARIABLES[activeKey ?? ''] ?? [
    'firstName',
    'restaurantName',
  ];

  const bodyHtmlWatch = Form.useWatch('bodyHtml', form);
  const subjectWatch = Form.useWatch('subject', form);
  const bodyTextWatch = Form.useWatch('bodyText', form);
  const nameWatch = Form.useWatch('name', form);

  useEffect(() => {
    const tpl = templates.find((t: { key: string }) => t.key === activeKey) ?? templates[0];
    if (!tpl) return;
    setActiveKey(tpl.key);
    form.setFieldsValue(tpl);
  }, [templates, activeKey, form]);

  useEffect(() => {
    if (testOpen) {
      setTestEmail(user?.email ?? '');
    }
  }, [testOpen, user?.email]);

  if (!ready) return null;

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      await updateTemplate({
        variables: {
          key: activeKey,
          name: values.name,
          subject: values.subject,
          bodyHtml: values.bodyHtml,
          bodyText: values.bodyText,
        },
      });
      message.success('Template saved');
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Save failed');
    }
  };

  const onSendTest = async () => {
    const to = testEmail.trim();
    if (!to) {
      message.error('Enter an email address');
      return;
    }
    if (!activeKey) return;
    try {
      await sendTestEmail({
        variables: {
          key: activeKey,
          to,
          subject: subjectWatch || undefined,
          bodyHtml: bodyHtmlWatch || undefined,
          bodyText: bodyTextWatch || undefined,
        },
      });
      message.success(`Test email sent to ${to}`);
      setTestOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to send test email');
    }
  };

  return (
    <div component="AdminTemplatesPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Email templates"
          subtitle="Edit transactional email subject and body. Use {{firstName}}, {{restaurantName}}, {{resetUrl}}, etc."
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Templates" loading={loading}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {templates.map((t: { key: string; name: string }) => (
                  <Button
                    key={t.key}
                    block
                    type={t.key === activeKey ? 'primary' : 'default'}
                    onClick={() => setActiveKey(t.key)}
                    style={{ height: 'auto', whiteSpace: 'normal', textAlign: 'left', padding: '6px 15px' }}
                  >
                    {t.name}
                  </Button>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card
              title={activeKey}
              loading={loading}
              extra={
                <Space wrap>
                  <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
                    Preview
                  </Button>
                  <Button
                    icon={<MailOutlined />}
                    disabled={!activeKey}
                    onClick={() => setTestOpen(true)}
                  >
                    Send test
                  </Button>
                  <Button type="primary" loading={saving} onClick={onSave}>
                    Save template
                  </Button>
                </Space>
              }
            >
              {activeTemplate?.description ? (
                <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
                  {activeTemplate.description}
                </p>
              ) : null}
              <Form form={form} layout="vertical">
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="bodyHtml"
                  label="HTML body"
                  rules={[{ required: true, message: 'HTML body is required' }]}
                  extra="Visual editor for content. Use the code icon for raw HTML (keeps nested email tables intact)."
                >
                  <RichTextEditor
                    key={activeKey}
                    minHeight={280}
                    variables={variables}
                    defaultSourceMode
                    placeholder="Email body…"
                  />
                </Form.Item>
                <Form.Item name="bodyText" label="Plain text body">
                  <Input.TextArea rows={6} />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Space>

      <EmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subject={subjectWatch}
        bodyHtml={bodyHtmlWatch}
        templateName={nameWatch || activeTemplate?.name}
      />

      <Modal
        title={`Send test — ${nameWatch || activeTemplate?.name || activeKey || 'template'}`}
        open={testOpen}
        onCancel={() => setTestOpen(false)}
        okText="Send test email"
        confirmLoading={sendingTest}
        onOk={onSendTest}
        destroyOnHidden
      >
        <p style={{ marginTop: 0, color: 'var(--color-text-secondary)' }}>
          Sends the current editor content with sample variables. Subject is prefixed with{' '}
          <code>[Test]</code>.
        </p>
        <Form layout="vertical">
          <Form.Item
            label="Recipient email"
            required
            extra="Defaults to your account email. Change it to send elsewhere."
          >
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              onPressEnter={onSendTest}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
