'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { Form, Input, Switch, Tag, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { buildOnlineOrderLink, isValidOnlineOrderUrl } from '@reservations/shared';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Text } = Typography;

export const onlineOrderUrlRule = {
  validator(_: unknown, value: unknown) {
    if (!value || !String(value).trim()) return Promise.resolve();
    return isValidOnlineOrderUrl(String(value))
      ? Promise.resolve()
      : Promise.reject(new Error('Enter a valid ordering link, e.g. https://www.doordash.com/store/…'));
  },
};

/**
 * `onlineOrderUrl` + `onlineOrderEnabled` fields for an antd Form. Typing the first
 * valid link switches ordering on; owners, managers, and admins can switch it off.
 */
export function OnlineOrderFields({
  slug,
  restaurantId,
  canToggle,
  label = 'Online order URL',
  tooltip,
}: {
  slug?: string | null;
  restaurantId?: string | null;
  canToggle: boolean;
  label?: ReactNode;
  tooltip?: ReactNode;
}) {
  const form = Form.useFormInstance();
  const url = Form.useWatch('onlineOrderUrl', form) as string | undefined;
  const enabled = Form.useWatch('onlineOrderEnabled', form) as boolean | null | undefined;
  const valid = isValidOnlineOrderUrl(url);
  const live = valid && enabled !== false;
  const trackedLink = valid
    ? buildOnlineOrderLink(url, { siteUrl: getPublicWebUrl(), slug, id: restaurantId })
    : null;

  let status: string;
  if (!valid) status = 'Add a valid ordering link to show Order online on your restaurant page.';
  else if (live) status = 'Diners see an Order online button on your restaurant page.';
  else status = 'Order online is hidden from diners. Your link stays saved.';
  if (valid && !canToggle) status += ' Only owners, managers, and admins can turn it on or off.';

  return (
    <div>
      <Form.Item
        name="onlineOrderUrl"
        label={label}
        tooltip={tooltip}
        rules={[onlineOrderUrlRule]}
        style={{ marginBottom: 8 }}
        getValueFromEvent={(event: ChangeEvent<HTMLInputElement>) => {
          const next = event?.target?.value ?? '';
          if (
            !isValidOnlineOrderUrl(form.getFieldValue('onlineOrderUrl')) &&
            isValidOnlineOrderUrl(next)
          ) {
            form.setFieldValue('onlineOrderEnabled', true);
          }
          return next;
        }}
      >
        <Input
          allowClear
          prefix={<LinkOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
          placeholder="https://www.doordash.com/store/..."
        />
      </Form.Item>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Form.Item
          name="onlineOrderEnabled"
          valuePropName="checked"
          getValueProps={(value: boolean | null | undefined) => ({
            checked: valid && value !== false,
          })}
          noStyle
        >
          <Switch size="small" disabled={!valid || !canToggle} aria-label="Show Order online button" />
        </Form.Item>
        <Text>Show Order online button</Text>
        <Tag color={live ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
          {live ? 'Live' : valid ? 'Off' : 'No link'}
        </Tag>
      </div>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
        {status}
      </Text>
      {trackedLink ? (
        <Text
          type="secondary"
          copyable={{ text: trackedLink, tooltips: ['Copy tracked link', 'Copied'] }}
          ellipsis={{ tooltip: trackedLink }}
          style={{ display: 'block', fontSize: 12, marginTop: 4, maxWidth: '100%' }}
        >
          Tracked link: {trackedLink}
        </Text>
      ) : null}
    </div>
  );
}
