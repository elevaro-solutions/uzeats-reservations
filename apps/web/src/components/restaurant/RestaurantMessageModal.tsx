'use client';

import { useEffect } from 'react';
import { Form, Input, Modal, Typography, message } from 'antd';
import { useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth';
import { SEND_RESTAURANT_INQUIRY } from '@/lib/graphql';
import { getGraphQLErrorMessage } from '@/lib/errors';

const { Text } = Typography;

type Props = {
  open: boolean;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
};

export function RestaurantMessageModal({ open, restaurantId, restaurantName, onClose }: Props) {
  const { user } = useAuth();
  const [form] = Form.useForm<{ name?: string; email?: string; message: string }>();
  const [sendInquiry, { loading }] = useMutation(SEND_RESTAURANT_INQUIRY);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : undefined,
      email: user?.email ?? undefined,
      message: '',
    });
  }, [open, user, form]);

  const submit = async () => {
    const values = await form.validateFields();
    try {
      const { data } = await sendInquiry({
        variables: {
          input: {
            restaurantId,
            message: values.message.trim(),
            ...(user
              ? {}
              : {
                  name: values.name?.trim(),
                  email: values.email?.trim().toLowerCase(),
                }),
          },
        },
      });
      const payload = (data as any)?.sendRestaurantInquiry;
      message.success(payload?.message ?? 'Message sent');
      form.resetFields();
      onClose();
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not send message'));
    }
  };

  return (
    <Modal
      title={`Message ${restaurantName}`}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Send message"
      confirmLoading={loading}
      destroyOnClose
      width={480}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Your message is emailed to the restaurant. They may reply to you directly.
      </Text>
      <Form form={form} layout="vertical" requiredMark={false}>
        {!user && (
          <>
            <Form.Item
              name="name"
              label="Your name"
              rules={[{ required: true, message: 'Enter your name' }]}
            >
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Your email"
              rules={[
                { required: true, message: 'Enter your email' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input type="email" maxLength={200} />
            </Form.Item>
          </>
        )}
        <Form.Item
          name="message"
          label="Message"
          rules={[
            { required: true, message: 'Write a message' },
            { max: 2000, message: 'Max 2000 characters' },
          ]}
        >
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            placeholder="Ask about private dining, dietary needs, large parties…"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
