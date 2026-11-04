'use client';

import { Button, Modal, Typography } from 'antd';
import { DownloadOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import { TableveraBrand } from './brand';
import { colors, radii, spacing, typography } from './tokens';
import { useScrollReachedEnd } from './useScrollReachedEnd';

const { Title, Text } = Typography;

export type AgreementReviewModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  name: string;
  version: number;
  bodyHtml: string;
  versionPublishedAt?: string | null;
  onDownloadPdf?: () => void;
  downloading?: boolean;
  /** Primary footer label. Default: "I accept" */
  confirmLabel?: string;
  /**
   * When true (default), Confirm stays disabled until the user scrolls to the end.
   * Set false for view-only flows (e.g. already-signed) where "Done" should not be blocked.
   */
  requireScrollToEnd?: boolean;
};

export function AgreementReviewModal({
  open,
  onCancel,
  onConfirm,
  name,
  version,
  bodyHtml,
  versionPublishedAt,
  onDownloadPdf,
  downloading,
  confirmLabel = 'I accept',
  requireScrollToEnd = true,
}: AgreementReviewModalProps) {
  const { scrollRef, reachedEnd, scrollToEnd } = useScrollReachedEnd([open, bodyHtml, version]);
  const canConfirm = !requireScrollToEnd || reachedEnd;

  const published = versionPublishedAt
    ? new Date(versionPublishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={null}
      width={720}
      destroyOnHidden
      centered
      styles={{
        body: { padding: 0 },
        footer: { marginTop: 0 },
      }}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: spacing.sm,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <div>
            {requireScrollToEnd && !reachedEnd ? (
              <Button icon={<VerticalAlignBottomOutlined />} onClick={scrollToEnd}>
                Scroll to end
              </Button>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: spacing.sm, marginLeft: 'auto' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              disabled={!canConfirm}
              onClick={onConfirm}
              style={canConfirm ? { background: colors.brand[600] } : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
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
          ref={scrollRef}
          className="agreement-review-html"
          style={{
            maxHeight: 'min(50vh, 420px)',
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

        {requireScrollToEnd && !reachedEnd ? (
          <Text
            type="secondary"
            style={{ display: 'block', marginTop: spacing.sm, fontSize: typography.fontSize.sm }}
          >
            Scroll to the end of the agreement to enable acceptance.
          </Text>
        ) : null}
      </div>
    </Modal>
  );
}
