'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card, Empty, Input, List, Select, Space, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  CONVERSATIONS,
  CONVERSATION,
  MESSAGES,
  SEND_MESSAGE,
  MARK_CONVERSATION_READ,
} from '@/lib/graphql';

const { Title, Text } = Typography;

function formatSlot(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [activeReservationId, setActiveReservationId] = useState<string | null>(
    searchParams.get('reservationId'),
  );
  const dinerFilter = searchParams.get('dinerId');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: convData, refetch: refetchConvs } = useQuery(CONVERSATIONS, {
    skip: !restaurantId,
    variables: { restaurantId },
    pollInterval: 15000,
  });
  // Seed an empty thread when Message guest deep-links to a reservation with no messages yet.
  const { data: seedData } = useQuery(CONVERSATION, {
    skip: !activeReservationId,
    variables: { reservationId: activeReservationId },
  });
  const { data: msgData, refetch: refetchMsgs } = useQuery(MESSAGES, {
    skip: !activeReservationId,
    variables: { reservationId: activeReservationId },
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
    const seededRestaurantId = seedData?.conversation?.restaurantId;
    if (!seededRestaurantId) return;
    if (restaurantId === seededRestaurantId) return;
    setRestaurantId(seededRestaurantId);
    localStorage.setItem('activeRestaurantId', seededRestaurantId);
  }, [seedData?.conversation?.restaurantId, restaurantId]);

  const conversations = useMemo(() => {
    const all = [...(convData?.conversations ?? [])];
    const seed = seedData?.conversation;
    if (seed && !all.some((c: any) => c.reservationId === seed.reservationId)) {
      all.unshift(seed);
    }
    if (!dinerFilter) return all;
    return all.filter((c: any) => c.dinerId === dinerFilter);
  }, [convData?.conversations, seedData?.conversation, dinerFilter]);

  useEffect(() => {
    if (activeReservationId) return;
    if (conversations.length === 1) {
      setActiveReservationId(conversations[0].reservationId);
    }
  }, [conversations, activeReservationId]);

  useEffect(() => {
    if (activeReservationId) {
      markRead({ variables: { reservationId: activeReservationId } }).then(() => refetchConvs());
    }
  }, [activeReservationId, msgData?.messages?.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgData?.messages?.length]);

  const handleSend = async () => {
    if (!draft.trim() || !activeReservationId) return;
    try {
      await sendMessage({
        variables: { reservationId: activeReservationId, body: draft.trim() },
      });
      setDraft('');
      refetchMsgs();
      refetchConvs();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to send message');
    }
  };

  const active = conversations.find((c: any) => c.reservationId === activeReservationId);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Messages</Title>
      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          setActiveReservationId(null);
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
            renderItem={(c: any) => {
              const slot = formatSlot(c.reservation?.slotStart);
              return (
                <List.Item
                  onClick={() => setActiveReservationId(c.reservationId)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background:
                      activeReservationId === c.reservationId ? '#fff1f0' : undefined,
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
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        {slot && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {slot}
                            {c.reservation?.partySize
                              ? ` · party of ${c.reservation.partySize}`
                              : ''}
                          </Text>
                        )}
                        <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                          {c.lastMessage?.body ?? 'No messages yet'}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>

        <Card
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { display: 'flex', flexDirection: 'column', height: 520, padding: 16 } }}
        >
          {!activeReservationId ? (
            <Empty description="Select a conversation" style={{ margin: 'auto' }} />
          ) : (
            <>
              {active && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong>
                    {active.diner
                      ? `${active.diner.firstName} ${active.diner.lastName}`
                      : 'Guest'}
                  </Text>
                  {active.reservation?.slotStart && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {formatSlot(active.reservation.slotStart)}
                      {active.reservation.partySize
                        ? ` · party of ${active.reservation.partySize}`
                        : ''}
                    </Text>
                  )}
                </div>
              )}
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                {(msgData?.messages ?? []).length === 0 ? (
                  <Empty
                    description="No messages yet. Say hello!"
                    style={{ marginTop: 48 }}
                  />
                ) : (
                  (msgData?.messages ?? []).map((m: any) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent:
                        m.senderType === 'restaurant' ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: 12,
                        background:
                          m.senderType === 'restaurant'
                            ? colors.brand[600]
                            : colors.neutral[100],
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
                  ))
                )}
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
