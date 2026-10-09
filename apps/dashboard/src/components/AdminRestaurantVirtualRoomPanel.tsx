'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Space,
  Statistic,
  Switch,
  Typography,
  message,
} from 'antd';
import { spacing } from '@reservations/ui';
import {
  ADMIN_SET_VIRTUAL_ROOM_ADDON,
  VIRTUAL_ROOM_ADDON,
} from '@/lib/graphql';

const { Text } = Typography;

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

type Addon = {
  restaurantId: string;
  platformEnabled: boolean;
  enabled: boolean;
  eligible: boolean;
  active: boolean;
  ineligibleReason?: string | null;
  monthlyPriceCents: number;
  effectiveMonthlyPriceCents: number;
  trialPriceCents?: number | null;
  trialEndsAt?: string | null;
  trialDurationMonths?: number | null;
  onTrial: boolean;
  priceOverrideCents?: number | null;
  selectionAttemptCount?: number;
};

export function AdminRestaurantVirtualRoomPanel({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const { data, loading, refetch } = useQuery(VIRTUAL_ROOM_ADDON, {
    variables: { restaurantId },
    skip: !restaurantId,
  });
  const [setAddon, { loading: saving }] = useMutation(ADMIN_SET_VIRTUAL_ROOM_ADDON);

  const addon = (data?.virtualRoomAddon ?? null) as Addon | null;
  const [enabled, setEnabled] = useState(false);
  const [useTrial, setUseTrial] = useState(true);
  const [trialMode, setTrialMode] = useState<'free' | 'custom'>('free');
  const [trialPriceDollars, setTrialPriceDollars] = useState<number | null>(0);
  const [trialUnit, setTrialUnit] = useState<'months' | 'year'>('months');
  const [trialMonths, setTrialMonths] = useState(3);
  const [priceOverrideDollars, setPriceOverrideDollars] = useState<number | null>(null);
  const [emailOwner, setEmailOwner] = useState(true);

  useEffect(() => {
    if (!addon) return;
    setEnabled(addon.enabled);
    setUseTrial(Boolean(addon.onTrial || addon.trialEndsAt));
    if (addon.trialPriceCents != null && addon.trialPriceCents > 0) {
      setTrialMode('custom');
      setTrialPriceDollars(addon.trialPriceCents / 100);
    } else {
      setTrialMode('free');
      setTrialPriceDollars(0);
    }
    if (addon.trialDurationMonths === 12) {
      setTrialUnit('year');
      setTrialMonths(12);
    } else if (addon.trialDurationMonths) {
      setTrialUnit('months');
      setTrialMonths(addon.trialDurationMonths);
    }
    setPriceOverrideDollars(
      addon.priceOverrideCents != null ? addon.priceOverrideCents / 100 : null,
    );
  }, [addon]);

  const apply = async () => {
    try {
      const months = useTrial ? (trialUnit === 'year' ? 12 : trialMonths) : null;
      const trialPriceCents =
        useTrial && enabled
          ? trialMode === 'free'
            ? 0
            : Math.round((trialPriceDollars ?? 0) * 100)
          : null;
      const res = await setAddon({
        variables: {
          input: {
            restaurantId,
            enabled,
            trialMonths: enabled && useTrial ? months : null,
            trialPriceCents: enabled && useTrial ? trialPriceCents : null,
            priceOverrideCents:
              enabled && priceOverrideDollars != null
                ? Math.round(priceOverrideDollars * 100)
                : null,
            clearTrial: !enabled || !useTrial,
            generateInvoice: true,
            emailOwner,
          },
        },
      });
      const result = res.data?.adminSetVirtualRoomAddon;
      const invoice = result?.invoice;
      message.success(
        invoice
          ? `Virtual 3D updated · invoice ${invoice.number} generated${
              emailOwner ? ' and emailed to owner' : ''
            }`
          : 'Virtual 3D updated',
      );
      await refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update Virtual 3D');
    }
  };

  return (
    <div component="AdminRestaurantVirtualRoomPanel">
      <Card title="Virtual 3D room" loading={loading}>
        <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
          {!addon?.platformEnabled ? (
            <Alert
              type="warning"
              showIcon
              message="Virtual 3D is off platform-wide"
              description="Turn it on in Admin → Platform config → Experimental features before enabling for a restaurant."
            />
          ) : null}

          {addon?.ineligibleReason && !addon.eligible ? (
            <Alert type="info" showIcon message={addon.ineligibleReason} />
          ) : null}

          {addon?.enabled ? (
            <Alert
              type={addon.onTrial ? 'success' : 'info'}
              showIcon
              message={
                addon.onTrial
                  ? `On trial until ${dayjs(addon.trialEndsAt).format('MMM D, YYYY')} at ${money(
                      addon.trialPriceCents ?? 0,
                    )}/mo`
                  : `Active · ${money(addon.effectiveMonthlyPriceCents)}/mo`
              }
              description={`Platform default ${money(addon.monthlyPriceCents)}/mo. After trial, ${
                addon.priceOverrideCents != null
                  ? `${money(addon.priceOverrideCents)}/mo (custom)`
                  : `${money(addon.monthlyPriceCents)}/mo (platform default)`
              }.`}
            />
          ) : null}

          <Statistic
            title="3D table selection attempts"
            value={addon?.selectionAttemptCount ?? 0}
          />
          <Text type="secondary">
            Guests who opened Choose your table in 3D after picking a time (one count per browser
            tab session).
          </Text>

          <Form layout="vertical">
            <Form.Item label="Enable for this restaurant">
              <Switch checked={enabled} onChange={setEnabled} />
            </Form.Item>

            {enabled ? (
              <>
                <Form.Item label="Free / custom trial">
                  <Switch checked={useTrial} onChange={setUseTrial} />
                </Form.Item>

                {useTrial ? (
                  <>
                    <Form.Item label="Trial price">
                      <Select
                        value={trialMode}
                        onChange={setTrialMode}
                        options={[
                          { value: 'free', label: 'Free ($0)' },
                          { value: 'custom', label: 'Custom amount' },
                        ]}
                        style={{ maxWidth: 240 }}
                      />
                    </Form.Item>
                    {trialMode === 'custom' ? (
                      <Form.Item label="Trial monthly amount (USD)">
                        <InputNumber
                          min={0}
                          step={1}
                          value={trialPriceDollars}
                          onChange={(v) => setTrialPriceDollars(typeof v === 'number' ? v : 0)}
                          prefix="$"
                          style={{ width: 160 }}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item label="Trial length">
                      <Space wrap>
                        <Select
                          value={trialUnit}
                          onChange={(v) => {
                            setTrialUnit(v);
                            if (v === 'year') setTrialMonths(12);
                          }}
                          options={[
                            { value: 'months', label: 'Months' },
                            { value: 'year', label: '1 year' },
                          ]}
                          style={{ width: 140 }}
                        />
                        {trialUnit === 'months' ? (
                          <InputNumber
                            min={1}
                            max={36}
                            value={trialMonths}
                            onChange={(v) => setTrialMonths(typeof v === 'number' ? v : 1)}
                            addonAfter="months"
                            style={{ width: 160 }}
                          />
                        ) : null}
                      </Space>
                    </Form.Item>
                  </>
                ) : null}

                <Form.Item
                  label="Ongoing monthly price after trial (USD)"
                  extra="Leave empty to use the platform default."
                >
                  <InputNumber
                    min={0}
                    step={1}
                    value={priceOverrideDollars}
                    onChange={(v) => setPriceOverrideDollars(typeof v === 'number' ? v : null)}
                    prefix="$"
                    placeholder="Platform default"
                    style={{ width: 200 }}
                  />
                </Form.Item>
              </>
            ) : null}

            <Form.Item label="Email invoice to owner">
              <Switch checked={emailOwner} onChange={setEmailOwner} />
            </Form.Item>

            <Text type="secondary" style={{ display: 'block', marginBottom: spacing.md }}>
              Saving generates or refreshes this month&apos;s subscription invoice (plan + Virtual 3D
              lines). When the owner pays, their card is saved as the preferred method for
              auto-charge on upcoming invoices.
            </Text>

            <Button type="primary" loading={saving} onClick={() => void apply()}>
              Save Virtual 3D billing
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
