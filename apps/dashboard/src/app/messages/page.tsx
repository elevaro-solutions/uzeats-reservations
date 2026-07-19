'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card, Empty, Input, List, Select, Space, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  CONVERSATIONS,
  MESSAGES,
  SEND_MESSAGE,
  MARK_CONVERSATION_READ,
} from '@/lib/graphql';

const { Title, Text } = Typography;

function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [activeDinerId, setActiveDinerId] = useState<string | null>(
    searchParams.get('dinerId'),
  );
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: convData, refetch: refetchConvs } = useQuery(CONVERSATIONS, {
    skip: !restaurantId,
    variables: { restaurantId },
    pollInterval: 15000,
  });
  const { data: msgData, refetch: refetchMsgs } = useQuery(MESSAGES, {
    skip: !restaurantId || !activeDinerId,
    variables: { restaurantId, dinerId: activeDinerId },
    pollInterval: 10000,
  });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  useEffect(() => {
    if (restaurantId && activeDinerId) {
      markRead({ variables: { restaurantId, dinerId: activeDinerId } }).then(() => refetchConvs());
    }
  }, [restaurantId, activeDinerId, msgData?.messages?.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgData?.messages?.length]);

  const handleSend = async () => {
    if (!draft.trim() || !activeDinerId) return;
    try {
      await sendMessage({
        variables: { restaurantId, dinerId: activeDinerId, body: draft.trim() },
      });
      setDraft('');
      refetchMsgs();
      refetchConvs();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to send message');
    }
  };

  const conversations = convData?.conversations ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Messages</Title>
      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          setActiveDinerId(null);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({
          value: r.id,
          label: r.name,
        }))}
      />

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <Card style={{ width: 320, flexShrink: 0 }} styles={{ body: { padding: 0 } }}>
          <List
            dataSource={conversations}
            locale={{ emptyText: <Empty description="No conversations yet" /> }}
            renderItem={(c: any) => (
              <List.Item
                onClick={() => setActiveDinerId(c.dinerId)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  background: activeDinerId === c.dinerId ? '#fff1f0' : undefined,
                }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {c.diner ? `${c.diner.firstName} ${c.diner.lastName}` : 'Guest'}
                      {c.unreadCount > 0 && <Badge count={c.unreadCount} />}
                    </Space>
                  }
                  description={
                    <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                      {c.lastMessage?.body}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }} styles={{ body: { display: 'flex', flexDirection: 'column', height: 520, padding: 16 } }}>
          {!activeDinerId ? (
            <Empty description="Select a conversation" style={{ margin: 'auto' }} />
          ) : (
            <>
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                {(msgData?.messages ?? []).map((m: any) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: m.senderType === 'restaurant' ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: 12,
                        background:
                          m.senderType === 'restaurant' ? colors.brand[600] : colors.neutral[100],
                        color: m.senderType === 'restaurant' ? '#fff' : undefined,
                      }}
                    >
                      <div>{m.body}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={handleSend}
                />
              </Space.Compact>
            </>
          )}
        </Card>
      </div>
    </Space>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
