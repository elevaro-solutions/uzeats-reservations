'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { getGraphQLErrorMessage } from '@/lib/errors';
import {
  ADD_MESSENGER_LINK_MANUAL,
  CREATE_MESSENGER_LINK_INVITE,
  REMOVE_MESSENGER_LINK,
  RESTAURANT_MESSENGER_BOT,
  SEND_MESSENGER_BOT_TEST,
  SET_RESTAURANT_MESSENGER_BOT_ENABLED,
  UPDATE_MESSENGER_LINK,
} from '@/lib/graphql';

const { Text, Paragraph, Link } = Typography;

function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <Link key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type LinkInfo = {
  id: string;
  chatId: string;
  displayName?: string | null;
  label?: string | null;
  effectiveProfile?: string | null;
  paused: boolean;
};

type Member = {
  userId: string;
  name?: string | null;
  email?: string | null;
  role: string;
  profile?: string | null;
  isYou: boolean;
  links: LinkInfo[];
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    (cents || 0) / 100,
  );
}

export function MessengerBotCard({ restaurantId }: { restaurantId: string | null }) {
  const { data, loading, refetch } = useQuery(RESTAURANT_MESSENGER_BOT, {
    variables: { restaurantId },
    skip: !restaurantId,
  });
  const [setEnabled, { loading: toggling }] = useMutation(SET_RESTAURANT_MESSENGER_BOT_ENABLED);
  const [createInvite, { loading: inviting }] = useMutation(CREATE_MESSENGER_LINK_INVITE);
  const [addManual, { loading: linking }] = useMutation(ADD_MESSENGER_LINK_MANUAL);
  const [updateLink] = useMutation(UPDATE_MESSENGER_LINK);
  const [removeLink, { loading: removing }] = useMutation(REMOVE_MESSENGER_LINK);
  const [sendTest, { loading: testing }] = useMutation(SEND_MESSENGER_BOT_TEST);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState<string | null>(null);
  const [manualChatId, setManualChatId] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const bot = data?.restaurantMessengerBot;
  const members: Member[] = bot?.members ?? [];
  const linkRows = useMemo(
    () =>
      members.flatMap((m) =>
        m.links.map((l) => ({
          ...l,
          memberName: m.name || m.email || 'Team member',
          memberRole: m.role,
          userId: m.userId,
        })),
      ),
    [members],
  );

  if (!restaurantId) return null;

  const handleToggle = async (enabled: boolean) => {
    try {
      await setEnabled({ variables: { restaurantId, enabled } });
      message.success(enabled ? 'Messenger bot enabled' : 'Messenger bot disabled');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleInvite = async (userId?: string) => {
    try {
      const result = await createInvite({
        variables: { restaurantId, userId: userId ?? null },
      });
      const url = result.data?.createMessengerLinkInvite?.url as string | undefined;
      if (!url) {
        message.error('Invite unavailable');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      message.success('Open Telegram and tap Start to link');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create invite');
    }
  };

  const closeManual = () => {
    setManualOpen(false);
    setLinkError(null);
  };

  const handleManual = async () => {
    if (!manualUserId || !manualChatId.trim()) {
      message.error('Pick a team member and enter a Telegram chat id');
      return;
    }
    setLinkError(null);
    try {
      await addManual({
        variables: {
          input: {
            restaurantId,
            userId: manualUserId,
            chatId: manualChatId.trim(),
          },
        },
      });
      message.success('Telegram chat linked');
      closeManual();
      setManualChatId('');
      await refetch();
    } catch (err) {
      setLinkError(getGraphQLErrorMessage(err, 'Failed to link chat'));
    }
  };

  const handlePause = async (linkId: string, paused: boolean) => {
    try {
      await updateLink({
        variables: { input: { restaurantId, linkId, paused } },
      });
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update link');
    }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await removeLink({ variables: { restaurantId, linkId } });
      message.success('Chat disconnected');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to remove link');
    }
  };

  const handleTest = async () => {
    try {
      const result = await sendTest({ variables: { restaurantId } });
      const n = result.data?.sendMessengerBotTest ?? 0;
      message.success(n > 0 ? `Test sent to ${n} chat(s)` : 'No linked chats to notify');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Test failed');
    }
  };

  return (
    <Card className="rt-surface-card" loading={loading} title="Telegram messenger bot">
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {!bot?.available ? (
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            The messenger bot is not available for this restaurant yet. Ask a platform admin to
            connect the bot and grant access.
          </Paragraph>
        ) : (
          <>
            <Space wrap align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
              <Space>
                <Text>Enabled for this venue</Text>
                <Switch
                  checked={Boolean(bot.enabled)}
                  disabled={!bot.canActivate || toggling}
                  loading={toggling}
                  onChange={handleToggle}
                />
              </Space>
              {bot.botUsername ? (
                bot.botUrl ? (
                  <Link href={bot.botUrl} target="_blank" rel="noopener noreferrer">
                    @{bot.botUsername}
                  </Link>
                ) : (
                  <Tag color="blue">@{bot.botUsername}</Tag>
                )
              ) : null}
            </Space>

            {bot.feeMonthlyCents > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Fee: {money(bot.totalMonthlyCents)}/mo
                {bot.feePricingMode === 'PER_ACCOUNT'
                  ? ` (${money(bot.feePerAccountCents)} × ${bot.linkedAccountCount} linked)`
                  : ''}{' '}
                · billed on monthly invoice
              </Text>
            ) : null}

            <Space wrap>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={inviting}
                disabled={!bot.enabled}
                onClick={() => handleInvite()}
              >
                Connect my Telegram
              </Button>
              {bot.canManageTeam ? (
                <Button
                  disabled={!bot.enabled}
                  onClick={() => {
                    setLinkError(null);
                    setManualOpen(true);
                  }}
                >
                  Link chat ID manually
                </Button>
              ) : null}
              <Button loading={testing} disabled={!bot.enabled} onClick={handleTest}>
                Send test
              </Button>
            </Space>

            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={linkRows}
              locale={{ emptyText: 'No Telegram chats linked yet.' }}
              columns={[
                {
                  title: 'Chat',
                  render: (_: unknown, row: (typeof linkRows)[0]) => (
                    <div>
                      <Text strong>{row.label || row.displayName || row.chatId}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {row.memberName} · {row.memberRole}
                          {row.effectiveProfile ? ` · ${row.effectiveProfile}` : ''}
                        </Text>
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Paused',
                  width: 90,
                  render: (_: unknown, row: (typeof linkRows)[0]) => (
                    <Switch
                      size="small"
                      checked={row.paused}
                      onChange={(v) => handlePause(row.id, v)}
                    />
                  ),
                },
                {
                  title: '',
                  width: 100,
                  render: (_: unknown, row: (typeof linkRows)[0]) => (
                    <Button
                      danger
                      size="small"
                      loading={removing}
                      onClick={() => handleRemove(row.id)}
                    >
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </Space>

      <Modal
        title="Link Telegram chat ID"
        open={manualOpen}
        onCancel={closeManual}
        onOk={handleManual}
        confirmLoading={linking}
        okText="Link"
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">Team member</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select member"
              value={manualUserId}
              onChange={setManualUserId}
              options={members.map((m) => ({
                value: m.userId,
                label: `${m.name || m.email || m.userId} (${m.role})`,
              }))}
            />
          </div>
          <div>
            <Text type="secondary">Telegram chat ID</Text>
            <Input
              style={{ marginTop: 4 }}
              value={manualChatId}
              onChange={(e) => setManualChatId(e.target.value)}
              placeholder="123456789"
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {bot?.botUrl ? (
              <>
                This person must open{' '}
                <Link href={bot.botUrl} target="_blank" rel="noopener noreferrer">
                  @{bot.botUsername ?? 'the bot'}
                </Link>{' '}
                and tap <Text strong>Start</Text> (or send /start). The bot replies with a numeric
                chat ID — paste that here.
              </>
            ) : (
              'This person must open the bot and tap Start (or send /start). The bot replies with a numeric chat ID — paste that here.'
            )}
          </Text>
          {linkError ? (
            <Alert
              type="error"
              showIcon
              message="Couldn't link this Telegram chat"
              description={
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <TextWithLinks text={linkError} />
                </div>
              }
            />
          ) : null}
        </Space>
      </Modal>
    </Card>
  );
}
