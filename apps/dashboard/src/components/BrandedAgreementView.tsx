'use client';

import { Button, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { TableveraBrand, colors, radii, spacing, typography } from '@reservations/ui';

const { Title, Text } = Typography;

type Props = {
  name: string;
  version: number;
  bodyHtml: string;
  versionPublishedAt?: string | null;
  onDownloadPdf?: () => void;
  downloading?: boolean;
};

/** On-screen agreement view with forest/gold brand chrome (matches A4 PDF). */
export function BrandedAgreementView({
  name,
  version,
  bodyHtml,
  versionPublishedAt,
  onDownloadPdf,
  downloading,
}: Props) {
  const published = versionPublishedAt
    ? new Date(versionPublishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        overflow: 'hidden',
        background: colors.surface,
      }}
    >
      <div
        style={{
          background: colors.brand[800] ?? colors.brand[700],
          padding: `${spacing.md}px ${spacing.lg}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          borderBottom: `3px solid ${colors.accent[500]}`,
        }}
      >
        <TableveraBrand surface="dark" iconSize={28} />
        <Text
          style={{
            color: colors.accent[400],
            fontSize: typography.fontSize.xs,
            letterSpacing: '0.06em',
          }}
        >
          LEGAL AGREEMENT
        </Text>
      </div>
      <div style={{ padding: spacing.lg }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: spacing.md,
            alignItems: 'flex-start',
            marginBottom: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {name}
            </Title>
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
              Version {version}
              {published ? ` · Effective ${published}` : ''}
            </Text>
          </div>
          {onDownloadPdf ? (
            <Button icon={<DownloadOutlined />} loading={downloading} onClick={onDownloadPdf}>
              Download PDF (A4)
            </Button>
          ) : null}
        </div>
        <div
          className="branded-agreement-html"
          style={{
            maxHeight: 360,
            overflow: 'auto',
            padding: spacing.md,
            background: colors.background,
            borderRadius: radii.md,
            border: `1px solid ${colors.bordersubtle}`,
            fontSize: typography.fontSize.base,
            lineHeight: typography.lineHeight.normal,
            color: colors.textPrimary,
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>
  );
}

export function downloadBase64Pdf(filename: string, base64: string) {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  link.click();
}
