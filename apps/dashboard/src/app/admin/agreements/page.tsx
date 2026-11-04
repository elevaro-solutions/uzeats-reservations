'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Form, Input, Row, Space, Tag, Typography, message } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { ADMIN_LEGAL_AGREEMENTS, UPDATE_LEGAL_AGREEMENT } from '@/lib/graphql';
import { useRequireSuperAdmin } from '@/lib/useRequireSuperAdmin';
import { RichTextEditor } from '@/components/RichTextEditor';
import { getGraphQLErrorMessage } from '@/lib/errors';

const { Paragraph } = Typography;

type LegalAgreement = {
  id: string;
  key: string;
  name: string;
  description: string;
  bodyHtml: string;
  version: number;
  updatedAt?: string | null;
};

export default function AdminAgreementsPage() {
  const { ready } = useRequireSuperAdmin();
  const { data, loading, refetch } = useQuery(ADMIN_LEGAL_AGREEMENTS, {
    skip: !ready,
  });
  const [updateAgreement, { loading: saving }] = useMutation(UPDATE_LEGAL_AGREEMENT);
  const [activeKey, setActiveKey] = useState<string>();
  const [form] = Form.useForm();

  const agreements: LegalAgreement[] = data?.adminLegalAgreements ?? [];
  const active =
    agreements.find((a) => a.key === activeKey) ?? agreements[0] ?? null;

  useEffect(() => {
    const next =
      agreements.find((a) => a.key === activeKey) ?? agreements[0] ?? null;
    if (!next) return;
    setActiveKey(next.key);
    form.setFieldsValue({
      name: next.name,
      description: next.description,
      bodyHtml: next.bodyHtml,
    });
  }, [agreements, activeKey, form]);

  if (!ready) return null;

  const onSave = async () => {
    if (!activeKey) return;
    try {
      const values = await form.validateFields();
      await updateAgreement({
        variables: {
          key: activeKey,
          name: values.name,
          description: values.description,
          bodyHtml: values.bodyHtml,
        },
      });
      message.success('Agreement saved (version bumped if content changed)');
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(getGraphQLErrorMessage(err, 'Save failed'));
    }
  };

  return (
    <div style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Agreements"
          subtitle="Edit Terms of Use (diners) and the Partner Agreement (restaurants). Saving a content change publishes a new version: restaurant owners get 7 days to re-sign, then Partner Hub locks until they do."
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Documents" loading={loading}>
              <Space orientation="vertical" style={{ width: '100%' }}>
                {agreements.map((a) => (
                  <Button
                    key={a.key}
                    block
                    type={a.key === activeKey ? 'primary' : 'default'}
                    onClick={() => setActiveKey(a.key)}
                    style={{
                      height: 'auto',
                      whiteSpace: 'normal',
                      textAlign: 'left',
                      padding: '8px 15px',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>v{a.version}</div>
                  </Button>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card
              title={active?.name ?? 'Agreement'}
              loading={loading}
              extra={
                <Space wrap>
                  {active ? <Tag>Version {active.version}</Tag> : null}
                  {active?.key === 'partner_agreement' ? (
                    <Button href="/agreements/sign" target="_blank">
                      Preview signing page
                    </Button>
                  ) : null}
                  <Button type="primary" loading={saving} onClick={onSave}>
                    Save agreement
                  </Button>
                </Space>
              }
            >
              {active?.description ? (
                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                  {active.description}
                </Paragraph>
              ) : null}
              <Form form={form} layout="vertical">
                <Form.Item name="name" label="Title" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="Admin note">
                  <Input.TextArea rows={2} placeholder="Where this agreement is used" />
                </Form.Item>
                <Form.Item
                  name="bodyHtml"
                  label="Agreement body"
                  rules={[{ required: true, message: 'Content is required' }]}
                  valuePropName="value"
                  getValueFromEvent={(html: string) => html}
                >
                  <RichTextEditor minHeight={360} />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
