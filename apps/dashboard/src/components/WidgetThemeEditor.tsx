'use client';

import { useEffect } from 'react';
import { useMutation } from '@/lib/apollo-hooks';
import { Button, Col, Form, Input, Row, Space, Switch, Typography, message } from 'antd';
import { colors } from '@reservations/ui';
import type { WidgetTheme } from '@/components/BookingSharePanel';
import { UPDATE_RESTAURANT_SETTINGS } from '@/lib/graphql';
import { restaurantFieldTooltips as tips } from '@/lib/restaurantFormTooltips';

const { Text } = Typography;

const DEFAULT_BUTTON_TEXT = 'Reserve a table';

export function WidgetThemeEditor({
  restaurantId,
  initialTheme,
  onSaved,
  children,
}: {
  restaurantId: string;
  initialTheme?: WidgetTheme | null;
  onSaved?: (theme: WidgetTheme) => void;
  children?: (theme: WidgetTheme) => React.ReactNode;
}) {
  const [form] = Form.useForm();
  const [updateSettings, { loading }] = useMutation(UPDATE_RESTAURANT_SETTINGS);
  const previewColor = Form.useWatch('primaryColor', form);
  const previewText = Form.useWatch('buttonText', form);
  const previewShowReviews = Form.useWatch('showReviews', form);

  useEffect(() => {
    form.setFieldsValue({
      primaryColor: initialTheme?.primaryColor ?? colors.brand[600],
      buttonText: initialTheme?.buttonText ?? DEFAULT_BUTTON_TEXT,
      showReviews: initialTheme?.showReviews ?? true,
    });
  }, [
    form,
    restaurantId,
    initialTheme?.primaryColor,
    initialTheme?.buttonText,
    initialTheme?.showReviews,
  ]);

  const widgetTheme: WidgetTheme = {
    primaryColor: previewColor || initialTheme?.primaryColor || colors.brand[600],
    buttonText: previewText || initialTheme?.buttonText || DEFAULT_BUTTON_TEXT,
    showReviews: previewShowReviews ?? initialTheme?.showReviews ?? true,
  };

  const onSaveTheme = async () => {
    try {
      const values = await form.validateFields();
      const result = await updateSettings({
        variables: {
          restaurantId,
          widgetTheme: {
            primaryColor: values.primaryColor,
            buttonText: values.buttonText,
            showReviews: Boolean(values.showReviews),
          },
        },
      });
      message.success('Widget theme saved');
      const updatedTheme = result.data?.updateRestaurantSettings?.widgetTheme;
      onSaved?.(
        updatedTheme ?? {
          primaryColor: values.primaryColor,
          buttonText: values.buttonText,
          showReviews: Boolean(values.showReviews),
        },
      );
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to save widget theme');
    }
  };

  return (
    <div component="WidgetThemeEditor">
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={[24, 8]} className="rt-widget-theme-row" align="bottom">
          <Col xs={24} md={6}>
            <Form.Item
              name="primaryColor"
              label="Primary color"
              tooltip={tips.primaryColor}
              rules={[
                {
                  pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
                  message: 'Enter a hex color like #0b3d2e',
                },
              ]}
            >
              <Input
                placeholder={colors.brand[600]}
                addonBefore={
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      background: widgetTheme.primaryColor || colors.brand[600],
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="buttonText" label="Button text" tooltip={tips.buttonText}>
              <Input placeholder={DEFAULT_BUTTON_TEXT} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item
              name="showReviews"
              label="Show reviews"
              tooltip={tips.showReviews}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Preview">
              <Space>
                <Button
                  style={{
                    background: widgetTheme.primaryColor || colors.brand[600],
                    borderColor: widgetTheme.primaryColor || colors.brand[600],
                    color: '#fff',
                  }}
                >
                  {widgetTheme.buttonText || DEFAULT_BUTTON_TEXT}
                </Button>
                {widgetTheme.showReviews && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ★ 4.8
                  </Text>
                )}
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" loading={loading} onClick={() => void onSaveTheme()}>
          Save widget theme
        </Button>
      </Form>
      {children?.(widgetTheme)}
    </div>
  );
}
