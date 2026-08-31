'use client';

import { Modal, Space, Typography } from 'antd';
import { buildEmailPreviewHtml, renderTemplateString } from '@/lib/emailPreview';

const { Text } = Typography;

type EmailPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  subject?: string;
  bodyHtml?: string;
  templateName?: string;
};

export function EmailPreviewModal({
  open,
  onClose,
  subject = '',
  bodyHtml = '',
  templateName,
}: EmailPreviewModalProps) {
  const renderedSubject = renderTemplateString(subject);
  const previewHtml = buildEmailPreviewHtml(bodyHtml, subject);

  return (
    <Modal
      title={
        <Space orientation="vertical" size={0}>
          <span>Email preview{templateName ? ` — ${templateName}` : ''}</span>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            Subject: {renderedSubject || '(empty)'}
          </Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      styles={{
        body: {
          padding: 0,
          background: '#f7f5f2',
          maxHeight: '75vh',
          overflow: 'auto',
        },
      }}
    >
      <iframe
        title="Email preview"
        srcDoc={previewHtml}
        sandbox=""
        style={{
          display: 'block',
          width: '100%',
          minHeight: 560,
          border: 'none',
          background: '#f7f5f2',
        }}
      />
    </Modal>
  );
}
