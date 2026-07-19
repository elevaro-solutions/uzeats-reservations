'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { Button, Card, Empty, Input, Space, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { colors, radii } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MESSAGES, SEND_MESSAGE, RESTAURANT_DETAIL } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function MessagesPage() {
  const params = useParams<{ restaurantId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: restaurantData } = useQuery(RESTAURANT_DETAIL, {
    variables: { id: params.restaurantId },
  });
  const { data, loading, refetch } = useQuery(MESSAGES, {
    variables: { restaurantId: params.restaurantId, dinerId: user?.id },
    skip: !user,
    pollInterval: 5000,
  });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  const messages = (data as any)?.messages ?? [];
  const restaurantName = (restaurantData as any)?.restaurant?.name ?? 'Restaurant';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  if (!authLoading && !user) {
    router.replace(`/login?next=/messages/${params.restaurantId}`);
    return null;
  }

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await sendMessage({ variables: { restaurantId: params.restaurantId, body } });
      setDraft('');
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not send message');
    }
  };

  return (
    <Card
      style={{ maxWidth: 720, margin: '0 auto' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '70vh', padding: 16 } }}
    >
      <Title level={4} style={{ marginTop: 0 }}>
        {restaurantName}
      </Title>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {!loading && messages.length === 0 && (
          <Empty description="No messages yet. Say hello!" style={{ marginTop: 48 }} />
        )}
        {messages.map((m: any) => {
          const mine = m.senderType === 'diner';
          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: mine ? colors.brand[600] : colors.neutral[100],
                color: mine ? colors.textInverse : 'inherit',
                borderRadius: radii.md,
                padding: '8px 12px',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
              <Text
                style={{
                  display: 'block',
                  fontSize: 11,
                  marginTop: 2,
                  color: mine ? 'rgba(255,255,255,0.75)' : undefined,
                }}
                type={mine ? undefined : 'secondary'}
              >
                {new Date(m.createdAt).toLocaleString()}
              </Text>
            </div>
          );
        })}
      </div>
      <Space.Compact style={{ width: '100%', marginTop: 12 }}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={send}
          placeholder={`Message ${restaurantName}...`}
          disabled={sending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          loading={sending}
          disabled={!draft.trim()}
        >
          Send
        </Button>
      </Space.Compact>
    </Card>
  );
}
