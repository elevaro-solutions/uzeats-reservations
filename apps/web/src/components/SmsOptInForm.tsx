'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Form, Typography, message } from 'antd';
import { useMutation } from '@apollo/client/react';
import { PhoneInput, colors, radii, typography, usPhoneRules } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { UPDATE_NOTIFICATION_PREFERENCES } from '@/lib/graphql';
import { COMPANY_NAME } from '@/lib/legal';

const { Paragraph, Text } = Typography;

const SMS_OPT_IN_EVENTS = {
  reservationUpdates: { sms: true },
  waitlistAvailable: { sms: true },
  availabilityAlerts: { sms: true },
} as const;

type FormValues = {
  phone: string;
  smsConsent: boolean;
};

/**
 * Standalone web opt-in for Twilio Toll-Free Verification.
 * Checkbox must stay unchecked by default; consent is not bundled into Terms.
 */
export function SmsOptInForm() {
  const { user, refreshMe } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  const onFinish = async (values: FormValues) => {
    if (!values.smsConsent) {
      message.error('Please check the box to opt in to SMS from Tablevera');
      return;
    }

    setSubmitting(true);
    try {
      if (user) {
        await updatePrefs({ variables: { input: SMS_OPT_IN_EVENTS } });
        await refreshMe();
        message.success('You are opted in to Tablevera transactional SMS');
        form.resetFields(['smsConsent']);
        return;
      }

      const params = new URLSearchParams({
        tab: 'register',
        smsOptIn: '1',
        phone: values.phone,
      });
      message.info('Create an account to finish SMS opt-in');
      router.push(`/login?${params.toString()}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save SMS opt-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="sms-opt-in-form"
      className="sms-opt-in-form"
      style={{
        marginTop: 16,
        padding: 24,
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
      }}
    >
      <Text strong style={{ fontSize: typography.fontSize.lg, display: 'block', marginBottom: 8 }}>
        Opt in to SMS from {COMPANY_NAME}
      </Text>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        This standalone form is how diners consent to transactional texts from {COMPANY_NAME} —
        reservation confirmations, reminders, cancellations, and waitlist / availability alerts.
        Consent is not required to use the website or book a table.
      </Paragraph>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          phone: user?.phone ?? undefined,
          smsConsent: false,
        }}
        onFinish={onFinish}
      >
        <Form.Item
          name="phone"
          label="Mobile phone number"
          rules={usPhoneRules({ required: true })}
        >
          <PhoneInput size="large" />
        </Form.Item>

        <Form.Item
          name="smsConsent"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Check the box to opt in')),
            },
          ]}
        >
          <Checkbox>
            Please check this box to opt in to automated transactional SMS from {COMPANY_NAME} about
            my reservations and waitlist status. Message frequency varies. Msg &amp; data rates may
            apply. Reply STOP to cancel, HELP for help. See our{' '}
            <Link href="/sms" onClick={(e) => e.stopPropagation()}>
              SMS Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" onClick={(e) => e.stopPropagation()}>
              Privacy Policy
            </Link>
            .
          </Checkbox>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={submitting}
          style={{ background: colors.brand[600], fontWeight: typography.fontWeight.semibold }}
        >
          {user ? 'Save SMS opt-in' : 'Continue to create account'}
        </Button>
      </Form>
    </div>
  );
}
