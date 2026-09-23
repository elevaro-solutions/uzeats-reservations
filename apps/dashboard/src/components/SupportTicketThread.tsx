'use client';

import { SupportHtml } from '@/components/SupportHtml';
import { SupportAttachmentThumbs } from '@/components/SupportAttachmentThumbs';
import { colors, radii } from '@reservations/ui';
import { Typography } from 'antd';

const { Text } = Typography;

export type SupportThreadAttachment = {
  id: string;
  url: string;
  filename: string;
};

export type SupportThreadNote = {
  id: string;
  body: string;
  createdAt: string;
  authorId?: string | null;
  visibleToRequester?: boolean;
  attachments?: SupportThreadAttachment[];
  author?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  } | null;
};

export type SupportThreadTicket = {
  description?: string | null;
  createdAt: string;
  requesterId?: string | null;
  requester?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  attachments?: SupportThreadAttachment[];
  notes?: SupportThreadNote[];
};

type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromRequester: boolean;
  authorLabel: string;
  attachments?: SupportThreadAttachment[];
};

function personName(person?: {
  firstName?: string;
  lastName?: string;
} | null) {
  return `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();
}

export function buildSupportThreadMessages(
  ticket: SupportThreadTicket,
): ThreadMessage[] {
  const requesterId = ticket.requesterId ?? ticket.requester?.id ?? null;
  const opening: ThreadMessage = {
    id: 'opening-message',
    body: ticket.description ?? '',
    createdAt: ticket.createdAt,
    fromRequester: true,
    authorLabel: personName(ticket.requester) || 'Requester',
    attachments: ticket.attachments ?? [],
  };

  const replies = (ticket.notes ?? [])
    .filter((note) => note.visibleToRequester === true)
    .map((note) => {
      const authorId = note.authorId ?? note.author?.id ?? null;
      const fromRequester = Boolean(requesterId && authorId === requesterId);
      return {
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
        fromRequester,
        authorLabel: fromRequester
          ? personName(note.author) || personName(ticket.requester) || 'Requester'
          : personName(note.author) || 'Tablevera',
        attachments: note.attachments ?? [],
      } satisfies ThreadMessage;
    });

  return [opening, ...replies].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/**
 * Chat-style support conversation. `mineIsRequester` means the current viewer
 * sits on the requester side (partner hub); admins pass false so staff is "mine".
 */
export function SupportTicketThread({
  ticket,
  mineIsRequester,
}: {
  ticket: SupportThreadTicket;
  mineIsRequester: boolean;
}) {
  const messages = buildSupportThreadMessages(ticket);

  return (
    <div
      component="SupportTicketThread"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 520,
        overflowY: 'auto',
        padding: '4px 2px',
      }}
    >
      {messages.map((message) => {
        const mine = mineIsRequester ? message.fromRequester : !message.fromRequester;
        return (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: mine ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: 'min(100%, 520px)',
                padding: '10px 12px',
                borderRadius: radii.lg,
                background: mine ? colors.brand[50] : '#fff',
                border: `1px solid ${mine ? colors.brand[200] : colors.bordersubtle}`,
              }}
            >
              <Text
                type="secondary"
                style={{ display: 'block', fontSize: 12, marginBottom: 6 }}
              >
                {message.authorLabel}
                {' · '}
                {new Date(message.createdAt).toLocaleString('en-US')}
              </Text>
              {message.body ? <SupportHtml html={message.body} /> : null}
              {(message.attachments ?? []).length > 0 ? (
                <SupportAttachmentThumbs items={message.attachments!} showFilename />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
