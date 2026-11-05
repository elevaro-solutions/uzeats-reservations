'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, App, Button, Card, Modal, Space, Tag, Typography } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  CONFIRM_DEFAULT_PAYMENT_METHOD,
  DEFAULT_PAYMENT_METHOD,
  START_DEFAULT_PAYMENT_METHOD_SETUP,
} from '@/lib/graphql';
import { SignupPaymentForm } from '@/components/SignupPaymentForm';

const { Paragraph, Text } = Typography;

export const DEFAULT_PAYMENT_METHOD_SECTION = 'payment-method';

const AUTO_CHARGE_COPY =
  'We automatically charge this card for your subscription renewals, monthly cover-fee invoices, and paid extras such as SMS credits and the 3D room.';

type CardSummary = {
  brand?: string | null;
  last4?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
};

function cardLabel(card: CardSummary | null | undefined) {
  if (!card?.last4) return 'Card on file';
  const brand = card.brand ? card.brand.replace(/^./, (s) => s.toUpperCase()) : 'Card';
  const exp =
    card.expMonth && card.expYear
      ? ` · expires ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
      : '';
  return `${brand} •••• ${card.last4}${exp}`;
}

export function DefaultPaymentMethodCard({
  restaurantId,
  canEditBilling,
}: {
  restaurantId: string;
  canEditBilling: boolean;
}) {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const anchorRef = useRef<HTMLDivElement>(null);
  const { data, loading, refetch } = useQuery(DEFAULT_PAYMENT_METHOD, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });
  const [startSetup, { loading: starting }] = useMutation(START_DEFAULT_PAYMENT_METHOD_SETUP);
  const [confirmCard] = useMutation(CONFIRM_DEFAULT_PAYMENT_METHOD);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const subscription = data?.mySubscription as
    | { hasDefaultPaymentMethod?: boolean; defaultCard?: CardSummary | null }
    | null
    | undefined;
  const hasCard = Boolean(subscription?.hasDefaultPaymentMethod);
  const focused = searchParams.get('section') === DEFAULT_PAYMENT_METHOD_SECTION;

  useEffect(() => {
    if (focused && !loading) {
      anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focused, loading]);

  const openSetup = async () => {
    try {
      const { data: setupData } = await startSetup({ variables: { restaurantId } });
      const secret = setupData?.startDefaultPaymentMethodSetup?.clientSecret;
      if (!secret) {
        message.error('Could not start card setup');
        return;
      }
      setClientSecret(secret);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start card setup');
    }
  };

  const finishSetup = async (setupIntentId?: string) => {
    try {
      await confirmCard({
        variables: { restaurantId, setupIntentId: setupIntentId ?? null },
        refetchQueries: ['SetupGuideSignals'],
      });
      setClientSecret(null);
      message.success(hasCard ? 'Default card updated' : 'Default card saved');
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not save the card');
      throw err;
    }
  };

  if (!subscription && !loading) return null;

  return (
    <div ref={anchorRef} id={DEFAULT_PAYMENT_METHOD_SECTION}>
      <Card
        loading={loading && !subscription}
        title={
          <Space size={8}>
            <CreditCardOutlined />
            Default payment method
            {hasCard ? <Tag color="green">Auto-charge on</Tag> : <Tag color="red">Required</Tag>}
          </Space>
        }
        extra={
          canEditBilling ? (
            <Button
              type={hasCard ? 'default' : 'primary'}
              loading={starting}
              onClick={() => void openSetup()}
            >
              {hasCard ? 'Replace card' : 'Add card'}
            </Button>
          ) : null
        }
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {hasCard ? (
            <Text strong>{cardLabel(subscription?.defaultCard)}</Text>
          ) : (
            <Alert
              type="warning"
              showIcon
              title="No default card on file"
              description={
                canEditBilling
                  ? 'Add a debit or credit card to finish setup. Without it, charges cannot be collected automatically.'
                  : 'Ask the restaurant owner to add a default card in Billing.'
              }
            />
          )}
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {AUTO_CHARGE_COPY}
          </Paragraph>
        </Space>
      </Card>

      <Modal
        title={hasCard ? 'Replace default card' : 'Add a default card'}
        open={Boolean(clientSecret)}
        footer={null}
        destroyOnHidden
        onCancel={() => setClientSecret(null)}
      >
        {clientSecret ? (
          <SignupPaymentForm
            clientSecret={clientSecret}
            paymentMode="setup"
            planName="Default card"
            monthlyLabel="no charge today"
            trialDays={0}
            description={AUTO_CHARGE_COPY}
            onSuccess={(intentId) => finishSetup(intentId)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
