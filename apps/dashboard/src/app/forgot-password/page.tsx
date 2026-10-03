'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@/lib/apollo-hooks';
import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { REQUEST_PASSWORD_RESET } from '@/lib/graphql';
import { AuthLayout } from '@/components/AuthLayout';

const FALLBACK_SUPPORT_EMAIL = 'support@tablevera.online';

type ResetResult = {
  success: boolean;
  message: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  maxAttempts: number;
  supportEmail: string;
};

export default function ForgotPasswordPage() {
  const [requestReset, { loading }] = useMutation<{ requestPasswordReset: ResetResult }>(
    REQUEST_PASSWORD_RESET,
  );
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [supportEmail, setSupportEmail] = useState(FALLBACK_SUPPORT_EMAIL);
  const [statusMessage, setStatusMessage] = useState(
    "If an account exists with that email, we've sent a password reset link.",
  );

  const applyResult = (result: ResetResult | null | undefined) => {
    if (!result) {
      setSubmitted(true);
      return;
    }
    setAttemptsRemaining(result.attemptsRemaining);
    setMaxAttempts(result.maxAttempts);
    setSupportEmail(result.supportEmail || FALLBACK_SUPPORT_EMAIL);
    setStatusMessage(result.message);
    setSubmitted(true);
  };

  const sendReset = async (targetEmail: string) => {
    try {
      const { data } = await requestReset({
        variables: { email: targetEmail, app: 'dashboard' },
      });
      applyResult(data?.requestPasswordReset);
    } catch {
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setSubmitted(true);
    }
  };

  const onFinish = async (values: { email: string }) => {
    const nextEmail = values.email.trim();
    setEmail(nextEmail);
    await sendReset(nextEmail);
  };

  const exhausted = submitted && attemptsRemaining <= 0;

  return (
    <div component="ForgotPasswordPage" style={{ display: 'contents' }}>
      <AuthLayout
        heading="Reset your password"
        subheading={
          submitted
            ? undefined
            : "Enter your email and we'll send you a link to reset your password."
        }
      >
        {submitted ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type={exhausted ? 'warning' : 'success'}
              message={exhausted ? "Still didn't get the email?" : 'Check your email'}
              description={
                exhausted ? (
                  <span>
                    You&apos;ve used all {maxAttempts} reset email attempts. Contact support at{' '}
                    <Typography.Link href={`mailto:${supportEmail}`}>
                      {supportEmail}
                    </Typography.Link>{' '}
                    and we&apos;ll help you reset your password.
                  </span>
                ) : (
                  statusMessage
                )
              }
              showIcon
            />
            {!exhausted ? (
              <Button
                block
                size="large"
                loading={loading}
                onClick={() => void sendReset(email)}
                style={{
                  height: 46,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Resend email ({attemptsRemaining} left)
              </Button>
            ) : null}
            <Link href="/login">
              <Button
                type="primary"
                block
                size="large"
                style={{
                  height: 46,
                  fontWeight: typography.fontWeight.semibold,
                  background: colors.brand[600],
                }}
              >
                Back to sign in
              </Button>
            </Link>
          </Space>
        ) : (
          <>
            <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
                  placeholder="you@restaurant.com"
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                style={{
                  height: 46,
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.md,
                  background: colors.brand[600],
                  marginBottom: 16,
                }}
              >
                Send reset link
              </Button>
            </Form>
            <p
              style={{
                textAlign: 'center',
                margin: 0,
                color: colors.textSecondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              Remember your password?{' '}
              <Link
                href="/login"
                style={{
                  color: colors.brand[600],
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </AuthLayout>
    </div>
  );
}
