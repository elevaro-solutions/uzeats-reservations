'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card, Empty, Input, List, Select, Space, Tag, Typography, message } from 'antd';
import { MailOutlined, SendOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  CONVERSATIONS,
  CONVERSATION,
  MESSAGES,
  SEND_MESSAGE,
  MARK_CONVERSATION_READ,
  RESTAURANT_INQUIRIES,
  MARK_RESTAURANT_INQUIRY_READ,
} from '@/lib/graphql';

const { Title, Text, Link } = Typography;

function formatSlot(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type InboxItem =
  | {
      kind: 'conversation';
      key: string;
      sortAt: string;
      reservationId: string;
      dinerId: string;
      unreadCount: number;
      diner?: { firstName?: string; lastName?: string };
      reservation?: { slotStart?: string; partySize?: number };
      lastMessage?: { body?: string };
    }
  | {
      kind: 'inquiry';
      key: string;
      sortAt: string;
      id: string;
      senderName: string;
      senderEmail: string;
      message: string;
      readAt?: string | null;
    };

type ConversationItem = Extract<InboxItem, { kind: 'conversation' }>;

function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeReservationId, setActiveReservationId] = useState<string | null>(
    searchParams.get('reservationId'),
  );
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(
    searchParams.get('inquiryId'),
  );
  const dinerFilter = searchParams.get('dinerId');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, setRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const { data: convData, refetch: refetchConvs } = useQuery(CONVERSATIONS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    pollInterval: 15000,
  });
  const { data: inquiryData, refetch: refetchInquiries } = useQuery(RESTAURANT_INQUIRIES, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId },
    pollInterval: 15000,
  });
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
  const [markInquiryRead] = useMutation(MARK_RESTAURANT_INQUIRY_READ);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const seededRestaurantId = seedData?.conversation?.restaurantId;
    if (!seededRestaurantId) return;
    if (activeRestaurantId === seededRestaurantId) return;
    setRestaurantId(seededRestaurantId);
  }, [seedData?.conversation?.restaurantId, activeRestaurantId, setRestaurantId]);

  const inboxItems = useMemo(() => {
    const conversations: ConversationItem[] = [...(convData?.conversations ?? [])].map((c: any) => ({
      kind: 'conversation' as const,
      key: `res-${c.reservationId}`,
      sortAt: c.lastMessage?.createdAt ?? c.reservation?.slotStart ?? '',
      reservationId: c.reservationId,
      dinerId: c.dinerId,
      unreadCount: c.unreadCount ?? 0,
      diner: c.diner,
      reservation: c.reservation,
      lastMessage: c.lastMessage,
    }));

    const seed = seedData?.conversation;
    if (seed && !conversations.some((c) => c.reservationId === seed.reservationId)) {
      conversations.unshift({
        kind: 'conversation',
        key: `res-${seed.reservationId}`,
        sortAt: seed.lastMessage?.createdAt ?? seed.reservation?.slotStart ?? '',
        reservationId: seed.reservationId,
        dinerId: seed.dinerId,
        unreadCount: seed.unreadCount ?? 0,
        diner: seed.diner,
        reservation: seed.reservation,
        lastMessage: seed.lastMessage,
      });
    }

    const inquiries: InboxItem[] = (inquiryData?.restaurantInquiries ?? []).map((i: any) => ({
      kind: 'inquiry' as const,
      key: `inq-${i.id}`,
      sortAt: i.createdAt,
      id: i.id,
      senderName: i.senderName,
      senderEmail: i.senderEmail,
      message: i.message,
      readAt: i.readAt,
    }));

    let items = [...conversations, ...inquiries];
    if (dinerFilter) {
      items = items.filter(
        (item) => item.kind === 'inquiry' || item.dinerId === dinerFilter,
      );
    }

    return items.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    );
  }, [convData?.conversations, seedData?.conversation, inquiryData?.restaurantInquiries, dinerFilter]);

  useEffect(() => {
    if (activeReservationId || activeInquiryId) return;
    if (inboxItems.length === 1) {
      const only = inboxItems[0];
      if (only.kind === 'conversation') {
        setActiveReservationId(only.reservationId);
      } else {
        setActiveInquiryId(only.id);
      }
    }
  }, [inboxItems, activeReservationId, activeInquiryId]);

  useEffect(() => {
    if (!activeReservationId) return;
    markRead({ variables: { reservationId: activeReservationId } }).then(() => refetchConvs());
  }, [activeReservationId, msgData?.messages?.length]);

  useEffect(() => {
    if (!activeInquiryId) return;
    markInquiryRead({ variables: { id: activeInquiryId } }).then(() => refetchInquiries());
  }, [activeInquiryId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgData?.messages?.length]);

  const selectConversation = (reservationId: string) => {
    setActiveReservationId(reservationId);
    setActiveInquiryId(null);
  };

  const selectInquiry = (inquiryId: string) => {
    setActiveInquiryId(inquiryId);
    setActiveReservationId(null);
  };

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

  const activeConversation = inboxItems.find(
    (item): item is Extract<InboxItem, { kind: 'conversation' }> =>
      item.kind === 'conversation' && item.reservationId === activeReservationId,
  );
  const activeInquiry = inboxItems.find(
    (item): item is Extract<InboxItem, { kind: 'inquiry' }> =>
      item.kind === 'inquiry' && item.id === activeInquiryId,
  );

  const isActive = (item: InboxItem) =>
    item.kind === 'conversation'
      ? activeReservationId === item.reservationId
      : activeInquiryId === item.id;

  return (
    <div component="MessagesContent" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Messages</Title>
      <Select
        style={{ width: 260 }}
        {...restaurantSelectProps}
        onChange={(id) => {
          restaurantSelectProps.onChange(id);
          setActiveReservationId(null);
          setActiveInquiryId(null);
        }}
      />

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <Card style={{ width: 320, flexShrink: 0 }} styles={{ body: { padding: 0 } }}>
          <List
            dataSource={inboxItems}
            locale={{ emptyText: <Empty description="No messages yet" /> }}
            renderItem={(item) => {
              if (item.kind === 'inquiry') {
                const unread = !item.readAt;
                return (
                  <List.Item
                    onClick={() => selectInquiry(item.id)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: isActive(item) ? '#fff1f0' : undefined,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {item.senderName}
                          <Tag color="blue" style={{ margin: 0 }}>Website</Tag>
                          {unread && <Badge dot />}
                        </Space>
                      }
                      description={
                        <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatSlot(item.sortAt)}
                          </Text>
                          <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                            {item.message}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }

              const slot = formatSlot(item.reservation?.slotStart);
              return (
                <List.Item
                  onClick={() => selectConversation(item.reservationId)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background: isActive(item) ? '#fff1f0' : undefined,
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        {item.diner ? `${item.diner.firstName} ${item.diner.lastName}` : 'Guest'}
                        {item.unreadCount > 0 && <Badge count={item.unreadCount} />}
                      </Space>
                    }
                    description={
                      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                        {slot && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {slot}
                            {item.reservation?.partySize
                              ? ` · party of ${item.reservation.partySize}`
                              : ''}
                          </Text>
                        )}
                        <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
                          {item.lastMessage?.body ?? 'No messages yet'}
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
          {!activeReservationId && !activeInquiryId ? (
            <Empty description="Select a conversation" style={{ margin: 'auto' }} />
          ) : activeInquiry ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: 16 }}>
                <Space orientation="vertical" size={4}>
                  <Space>
                    <Text strong>{activeInquiry.senderName}</Text>
                    <Tag color="blue">Website message</Tag>
                  </Space>
                  <Link href={`mailto:${activeInquiry.senderEmail}`}>
                    <MailOutlined /> {activeInquiry.senderEmail}
                  </Link>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatSlot(activeInquiry.sortAt)}
                  </Text>
                </Space>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: colors.neutral[100],
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                }}
              >
                {activeInquiry.message}
              </div>
              <Text type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                Reply to this guest directly at their email address.
              </Text>
            </div>
          ) : (
            <>
              {activeConversation && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong>
                    {activeConversation.diner
                      ? `${activeConversation.diner.firstName} ${activeConversation.diner.lastName}`
                      : 'Guest'}
                  </Text>
                  {activeConversation.reservation?.slotStart && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {formatSlot(activeConversation.reservation.slotStart)}
                      {activeConversation.reservation.partySize
                        ? ` · party of ${activeConversation.reservation.partySize}`
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
    </Space></div>
  );
}

export default function MessagesPage() {
  return (
    <div component="MessagesPage" style={{ display: 'contents' }}><Suspense>
      <MessagesContent />
    </Suspense></div>
  );
}
