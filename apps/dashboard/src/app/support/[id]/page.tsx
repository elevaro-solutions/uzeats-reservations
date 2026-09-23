'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { App, Button, Card, Empty, Space, Spin, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { htmlToPlainText } from '@reservations/shared';
import { PageHeader, colors, radii, shadows, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { ADD_OWNER_SUPPORT_REPLY, MY_OWNER_SUPPORT_TICKET } from '@/lib/graphql';
import { STATUS_COLORS } from '@/lib/supportTickets';
import { RichTextEditor } from '@/components/RichTextEditor';
import SupportAttachmentUpload, {
  type SupportAttachmentDraft,
} from '@/components/SupportAttachmentUpload';
import { SupportTicketThread } from '@/components/SupportTicketThread';

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export default function PartnerSupportTicketPage() {
  const { user, loading: authLoading } = useAuth();
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? '');
  const [draft, setDraft] = useState('');
  const [draftKey, setDraftKey] = useState(0);
  const [attachments, setAttachments] = useState<SupportAttachmentDraft[]>([]);

  const { data, loading, refetch } = useQuery(MY_OWNER_SUPPORT_TICKET, {
    skip: !user || !id,
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [sendReply, { loading: sending }] = useMutation(ADD_OWNER_SUPPORT_REPLY);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const ticket = data?.myOwnerSupportTicket;

  if (!loading && !ticket) {
    return (
      <div component="PartnerSupportTicketPage" style={{ maxWidth: 800 }}>
        <Link href="/support">
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
            Back to support
          </Button>
        </Link>
        <Empty description="Ticket not found" style={{ marginTop: 48 }} />
      </div>
    );
  }

  const canSend =
    htmlToPlainText(draft).length >= 1 || attachments.length > 0;

  const onSend = async () => {
    if (!canSend) {
      message.error('Write a message or attach an image');
      return;
    }
    try {
      await sendReply({
        variables: {
          ticketId: id,
          body: draft,
          attachments,
        },
      });
      message.success('Message sent');
      setDraft('');
      setAttachments([]);
      setDraftKey((key) => key + 1);
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not send message');
    }
  };

  return (
    <div component="PartnerSupportTicketPage" style={{ maxWidth: 800 }}>
      <Link href="/support">
        <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
          Back to support
        </Button>
      </Link>
      <PageHeader
        title={ticket?.subject ?? 'Support ticket'}
        subtitle={
          ticket
            ? [
                ticket.restaurant?.name,
                `Opened ${new Date(ticket.createdAt).toLocaleString('en-US')}`,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Loading…'
        }
        extra={
          ticket ? (
            <Tag color={STATUS_COLORS[ticket.status] ?? 'default'}>
              {formatStatus(ticket.status)}
            </Tag>
          ) : null
        }
      />

      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <Card
          loading={loading}
          title="Conversation"
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          {ticket ? (
            <SupportTicketThread ticket={ticket} mineIsRequester />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loading…" />
          )}
        </Card>

        <Card
          title="Your reply"
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <RichTextEditor
              key={`owner-reply-${draftKey}`}
              minHeight={140}
              value={draft}
              onChange={setDraft}
              placeholder="Reply to Tablevera…"
            />
            <SupportAttachmentUpload value={attachments} onChange={setAttachments} />
            <Button type="primary" loading={sending} disabled={!canSend} onClick={onSend}>
              Send message
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
