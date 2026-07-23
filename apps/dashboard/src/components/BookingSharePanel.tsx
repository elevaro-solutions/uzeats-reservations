'use client';

import { useMemo, useState } from 'react';
import { Button, Divider, Input, Segmented, Space, Typography, message } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { buildRestaurantBookingUrl, buildWidgetEmbedCode } from '@reservations/shared';
import { spacing } from '@reservations/ui';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Text, Paragraph } = Typography;

export type WidgetTheme = {
  primaryColor?: string | null;
  buttonText?: string | null;
  showReviews?: boolean | null;
};

export async function copyBookingText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  } catch {
    message.error('Failed to copy');
  }
}

export function useBookingShare(
  restaurant: { id: string; slug?: string | null } | null | undefined,
  widgetTheme?: WidgetTheme | null,
  embedMode: 'inline' | 'button' = 'button',
) {
  const webUrl = getPublicWebUrl();
  const bookingUrl = useMemo(
    () =>
      restaurant
        ? buildRestaurantBookingUrl(webUrl, { slug: restaurant.slug, id: restaurant.id })
        : '',
    [restaurant, webUrl],
  );

  const widgetEmbedCode = useMemo(() => {
    if (!restaurant?.id) return '';
    return buildWidgetEmbedCode({
      restaurantId: restaurant.id,
      widgetUrl: `${webUrl.replace(/\/$/, '')}/widget.js`,
      appUrl: webUrl,
      mode: embedMode,
      primaryColor: widgetTheme?.primaryColor ?? undefined,
      buttonText: widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: widgetTheme?.showReviews ?? true,
    });
  }, [restaurant?.id, restaurant?.slug, embedMode, widgetTheme, webUrl]);

  return { bookingUrl, widgetEmbedCode };
}

type BookingSharePanelProps = {
  restaurant: { id: string; slug?: string | null } | null | undefined;
  widgetTheme?: WidgetTheme | null;
  showBookingLink?: boolean;
  defaultEmbedMode?: 'inline' | 'button';
};

export function BookingSharePanel({
  restaurant,
  widgetTheme,
  showBookingLink = true,
  defaultEmbedMode = 'button',
}: BookingSharePanelProps) {
  const [embedMode, setEmbedMode] = useState<'inline' | 'button'>(defaultEmbedMode);
  const { bookingUrl, widgetEmbedCode } = useBookingShare(restaurant, widgetTheme, embedMode);

  if (!restaurant) return null;

  return (
    <div component="BookingSharePanel">
      {showBookingLink && (
        <>
          <Text strong style={{ display: 'block', marginBottom: spacing.xs }}>
            Booking link
          </Text>
          <Input
            readOnly
            value={bookingUrl}
            addonAfter={
              <Space size={0}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyBookingText(bookingUrl)}
                >
                  Copy
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview
                </Button>
              </Space>
            }
          />
          <Paragraph type="secondary" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
            <strong>Google Business Profile:</strong> Edit profile → Bookings → Add your booking
            link. Google will show a &ldquo;Reserve a table&rdquo; button that opens this page.
          </Paragraph>
          <Divider style={{ margin: `${spacing.md}px 0` }} />
        </>
      )}

      <Text strong style={{ display: 'block', marginBottom: spacing.xs }}>
        Website embed script
      </Text>
      <Paragraph type="secondary" style={{ marginBottom: spacing.sm }}>
        Copy this script and paste it into your restaurant website HTML — anywhere you want the
        booking widget to appear.
      </Paragraph>
      <Segmented
        value={embedMode}
        onChange={(value) => setEmbedMode(value as 'inline' | 'button')}
        options={[
          { label: 'Inline form', value: 'inline' },
          { label: 'Reserve button', value: 'button' },
        ]}
        style={{ marginBottom: spacing.sm }}
      />
      <Input.TextArea
        readOnly
        value={widgetEmbedCode}
        autoSize={{ minRows: 5, maxRows: 10 }}
        style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
      />
      <Space wrap style={{ marginTop: spacing.sm }}>
        <Button type="primary" icon={<CopyOutlined />} onClick={() => copyBookingText(widgetEmbedCode)}>
          Copy script
        </Button>
      </Space>
    </div>
  );
}
