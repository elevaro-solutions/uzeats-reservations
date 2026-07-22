'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Form, Input, Row, Space, message } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { EMAIL_TEMPLATES, UPDATE_EMAIL_TEMPLATE } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

export default function AdminTemplatesPage() {
  const { ready } = useRequireAdmin();
  const { data, loading, refetch } = useQuery(EMAIL_TEMPLATES, { skip: !ready });
  const [updateTemplate, { loading: saving }] = useMutation(UPDATE_EMAIL_TEMPLATE);
  const [activeKey, setActiveKey] = useState<string>();
  const [form] = Form.useForm();

  const templates = data?.emailTemplates ?? [];

  useEffect(() => {
    const tpl = templates.find((t: any) => t.key === activeKey) ?? templates[0];
    if (!tpl) return;
    setActiveKey(tpl.key);
    form.setFieldsValue(tpl);
  }, [templates, activeKey, form]);

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

  return (
    <div component="AdminTemplatesPage" style={{ display: 'contents' }}><Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Email templates"
        subtitle="Edit transactional email subject and body. Use {{firstName}}, {{restaurantName}}, {{resetUrl}}, etc."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Templates" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {templates.map((t: any) => (
                <Button
                  key={t.key}
                  block
                  type={t.key === activeKey ? 'primary' : 'default'}
                  onClick={() => setActiveKey(t.key)}
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
              <Button type="primary" loading={saving} onClick={onSave}>
                Save template
              </Button>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="bodyHtml" label="HTML body" rules={[{ required: true }]}>
                <Input.TextArea rows={10} />
              </Form.Item>
              <Form.Item name="bodyText" label="Plain text body">
                <Input.TextArea rows={6} />
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space></div>
  );
}
