'use client';

import { useEffect, useRef } from 'react';
import { Button, Input, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { colors, radii } from '@reservations/ui';
import { SupportAttachmentThumbs } from '@/components/SupportAttachmentThumbs';
import SupportAttachmentUpload, {
  type SupportAttachmentDraft,
} from '@/components/SupportAttachmentUpload';

const { Text, Paragraph } = Typography;

export type ReviewReportAttachmentView = {
  id: string;
  url: string;
  filename: string;
};

export type ReviewReportResponseView = {
  id: string;
  body: string;
  createdAt?: string | null;
  authorName?: string | null;
  fromReporter?: boolean | null;
  attachments?: ReviewReportAttachmentView[];
};

export type ReviewReportOpening = {
  flaggedByName?: string | null;
  flagReason?: string | null;
  flagDetails?: string | null;
  flaggedAt?: string | null;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromReporter: boolean;
  authorLabel: string;
  attachments?: ReviewReportAttachmentView[];
};

export function buildReviewReportChatMessages(input: {
  opening?: ReviewReportOpening | null;
  responses?: ReviewReportResponseView[] | null;
}): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const opening = input.opening;
  if (opening?.flaggedAt || opening?.flagReason || opening?.flagDetails) {
    const reason = opening.flagReason?.trim();
    const details = opening.flagDetails?.trim();
    const body = [reason, details].filter(Boolean).join('\n\n');
    if (body || opening.flaggedAt) {
      messages.push({
        id: 'report-opening',
        body: body || 'Reported this review',
        createdAt: opening.flaggedAt || new Date(0).toISOString(),
        fromReporter: true,
        authorLabel: opening.flaggedByName?.trim() || 'Reporter',
      });
    }
  }

  for (const response of input.responses ?? []) {
    messages.push({
      id: response.id,
      body: response.body ?? '',
      createdAt: response.createdAt || new Date(0).toISOString(),
      fromReporter: Boolean(response.fromReporter),
      authorLabel: response.fromReporter
        ? response.authorName?.trim() || opening?.flaggedByName?.trim() || 'Reporter'
        : response.authorName?.trim() || 'Tablevera',
      attachments: response.attachments,
    });
  }

  return messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function formatChatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Chat-style moderation thread. `mineIsReporter` is true on Partner Hub,
 * false for platform admins (so Tablevera bubbles sit on the right for staff).
 */
export function ReviewReportThread({
  opening,
  responses,
  mineIsReporter,
  autoScroll = true,
}: {
  opening?: ReviewReportOpening | null;
  responses?: ReviewReportResponseView[] | null;
  mineIsReporter: boolean;
  autoScroll?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const messages = buildReviewReportChatMessages({ opening, responses });

  useEffect(() => {
    if (!autoScroll || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [autoScroll, messages.length]);

  if (!messages.length) {
    return (
      <div
        style={{
          padding: '28px 16px',
          textAlign: 'center',
          color: colors.textTertiary,
          fontSize: 13,
        }}
      >
        No messages yet
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      component="ReviewReportThread"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        minHeight: 180,
        maxHeight: 360,
        overflowY: 'auto',
        padding: '14px 12px',
        background: colors.background,
      }}
    >
      {messages.map((message, index) => {
        const mine = mineIsReporter ? message.fromReporter : !message.fromReporter;
        const prev = messages[index - 1];
        const showAuthor =
          !prev ||
          prev.fromReporter !== message.fromReporter ||
          prev.authorLabel !== message.authorLabel;
        const timeLabel = formatChatTime(message.createdAt);

        return (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: mine ? 'flex-end' : 'flex-start',
              gap: 4,
            }}
          >
            {showAuthor ? (
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  padding: mine ? '0 6px 0 0' : '0 0 0 6px',
                  lineHeight: 1.2,
                }}
              >
                {message.authorLabel}
              </Text>
            ) : null}
            <div
              style={{
                maxWidth: 'min(78%, 340px)',
                padding: '8px 12px',
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: mine ? colors.brand[600] : colors.surface,
                color: mine ? colors.textInverse : colors.textPrimary,
                boxShadow: mine ? 'none' : '0 1px 2px rgba(20, 20, 20, 0.06)',
                border: mine ? 'none' : `1px solid ${colors.bordersubtle}`,
              }}
            >
              {message.body ? (
                <Paragraph
                  style={{
                    marginBottom: 0,
                    whiteSpace: 'pre-wrap',
                    color: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {message.body}
                </Paragraph>
              ) : null}
              {(message.attachments ?? []).length > 0 ? (
                <div style={{ marginTop: message.body ? 8 : 0 }}>
                  <SupportAttachmentThumbs
                    items={message.attachments!}
                    showFilename={false}
                    size={72}
                  />
                </div>
              ) : null}
              {timeLabel ? (
                <Text
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 10,
                    lineHeight: 1,
                    textAlign: 'right',
                    color: mine ? 'rgba(255,255,255,0.72)' : colors.textTertiary,
                  }}
                >
                  {timeLabel}
                </Text>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type ReviewReportComposerProps = {
  body: string;
  attachments: SupportAttachmentDraft[];
  onBodyChange: (value: string) => void;
  onAttachmentsChange: (files: SupportAttachmentDraft[]) => void;
  onSend: () => void;
  sending?: boolean;
  placeholder?: string;
  hint?: string | null;
};

/** Compact message bar: text field, paperclip attach, send. */
export function ReviewReportComposer({
  body,
  attachments,
  onBodyChange,
  onAttachmentsChange,
  onSend,
  sending = false,
  placeholder = 'Write a message…',
  hint,
}: ReviewReportComposerProps) {
  const canSend = Boolean(body.trim() || attachments.length > 0);

  const submit = () => {
    if (!canSend || sending) return;
    onSend();
  };

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.bordersubtle}`,
        background: colors.surface,
        padding: '10px 12px 12px',
      }}
    >
      {hint ? (
        <Text
          type="secondary"
          style={{ display: 'block', fontSize: 12, marginBottom: 8, lineHeight: 1.35 }}
        >
          {hint}
        </Text>
      ) : null}
      <SupportAttachmentUpload
        variant="compact"
        value={attachments}
        onChange={onAttachmentsChange}
        leading={
          <Input.TextArea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={placeholder}
            maxLength={5000}
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            style={{
              borderRadius: radii.lg,
              resize: 'none',
            }}
          />
        }
        trailing={
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            loading={sending}
            disabled={!canSend}
            onClick={submit}
            aria-label="Send message"
          />
        }
      />
    </div>
  );
}

/** Full chat shell: message scroller + optional composer / closed notice. */
export function ReviewReportChat({
  title,
  opening,
  responses,
  mineIsReporter,
  composer,
  closedNotice,
}: {
  title?: string;
  opening?: ReviewReportOpening | null;
  responses?: ReviewReportResponseView[] | null;
  mineIsReporter: boolean;
  composer?: ReviewReportComposerProps | null;
  closedNotice?: string | null;
}) {
  return (
    <div
      component="ReviewReportChat"
      style={{
        marginTop: 12,
        border: `1px solid ${colors.bordersubtle}`,
        borderRadius: radii.lg,
        overflow: 'hidden',
        background: colors.surface,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title ? (
        <div
          style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${colors.bordersubtle}`,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {title}
        </div>
      ) : null}
      <ReviewReportThread
        opening={opening}
        responses={responses}
        mineIsReporter={mineIsReporter}
      />
      {composer ? <ReviewReportComposer {...composer} /> : null}
      {!composer && closedNotice ? (
        <div
          style={{
            borderTop: `1px solid ${colors.bordersubtle}`,
            padding: '10px 14px',
            background: '#fafafa',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {closedNotice}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
