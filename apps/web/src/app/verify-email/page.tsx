'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, Form, Input, Space, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { AuthLayout } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { RESEND_VERIFICATION_EMAIL, VERIFY_EMAIL } from '@/lib/graphql';
import { getGraphQLErrorMessage } from '@/lib/errors';
import { isSafeInternalPath } from '@reservations/shared';

const { Text, Paragraph } = Typography;

export default function VerifyEmailPage() {
  return (
    <div component="VerifyEmailPage" style={{ display: 'contents' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

function VerifyEmailContent() {
  const { user, loading: authLoading, refreshMe, logout } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next');
  const [verifyEmail, { loading: verifying }] = useMutation(VERIFY_EMAIL);
  const [resendEmail, { loading: resending }] = useMutation(RESEND_VERIFICATION_EMAIL);
  const [verified, setVerified] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [form] = Form.useForm<{ code: string }>();

  const goNext = () => {
    router.replace(isSafeInternalPath(next) ? next : '/');
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.needsEmailVerification) {
      goNext();
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user?.needsEmailVerification || verified) return;
    const stored = sessionStorage.getItem('tv_verify_dev_code');
    if (stored) {
      setDevCode(stored);
      form.setFieldsValue({ code: stored });
    }
  }, [authLoading, user?.needsEmailVerification, verified, form]);

  const onVerify = async (values: { code: string }) => {
    try {
      const { data } = await verifyEmail({ variables: { code: values.code.trim() } });
      const payload = (data as { verifyEmail?: { success?: boolean; message?: string } } | undefined)
        ?.verifyEmail;
      if (!payload?.success) {
        message.error(payload?.message || 'Verification failed');
        return;
      }
      setVerified(true);
      await refreshMe();
      sessionStorage.removeItem('tv_verify_dev_code');
      message.success('Email verified');
      setTimeout(goNext, 800);
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Verification failed'));
    }
  };

  const onResend = async () => {
    try {
      const { data } = await resendEmail();
      const payload = (
        data as {
          resendVerificationEmail?: {
            success?: boolean;
            message?: string;
            devCode?: string | null;
          };
        } | undefined
      )?.resendVerificationEmail;
      if (payload?.devCode) {
        setDevCode(payload.devCode);
        sessionStorage.setItem('tv_verify_dev_code', payload.devCode);
        form.setFieldsValue({ code: payload.devCode });
      }
      message.success(payload?.message || 'Verification code sent');
      if (payload && !payload.success) {
        message.error(payload.message || 'Could not resend verification code');
      }
    } catch (err) {
      message.error(getGraphQLErrorMessage(err, 'Could not resend verification code'));
    }
  };

  if (authLoading || !user) {
    return (
      <AuthLayout heading="Verify your email">
        <Paragraph type="secondary">Loading…</Paragraph>
      </AuthLayout>
    );
  }

  if (verified) {
    return (
      <AuthLayout heading="Email verified">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="You're all set"
            description="Your email is verified. Continuing…"
            showIcon
          />
          <Button
            type="primary"
            block
            size="large"
            onClick={goNext}
            style={{
              height: 46,
              fontWeight: typography.fontWeight.semibold,
              background: colors.brand[600],
            }}
          >
            Continue
          </Button>
        </Space>
      </AuthLayout>
    );
  }

  return (
    <div component="VerifyEmailContent" style={{ display: 'contents' }}>
      <AuthLayout
        heading="Verify your email"
        subheading={
          user.email
            ? `Enter the 6-digit code we sent to ${user.email}.`
            : 'Enter the 6-digit code from your email.'
        }
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            message="Check your inbox"
            description="The code expires in 10 minutes. Didn't get it? Resend below."
            showIcon
            icon={<MailOutlined />}
          />

          {devCode ? (
            <Alert
              type="warning"
              message="Local development code"
              description={
                <span>
                  Email delivery is not configured. Use code{' '}
                  <Text code strong>
                    {devCode}
                  </Text>
                  .
                </span>
              }
              showIcon
            />
          ) : null}

          <Form form={form} layout="vertical" requiredMark={false} onFinish={onVerify}>
            <Form.Item
              name="code"
              label="Verification code"
              rules={[
                { required: true, message: 'Enter the 6-digit code' },
                { pattern: /^\d{6}$/, message: 'Code must be 6 digits' },
              ]}
            >
              <Input
                size="large"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                style={{ letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={verifying}
              style={{
                height: 46,
                fontWeight: typography.fontWeight.semibold,
                background: colors.brand[600],
              }}
            >
              Verify email
            </Button>
          </Form>

          <Button type="link" block loading={resending} onClick={() => void onResend()}>
            Resend code
          </Button>

          <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
            Wrong account?{' '}
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                border: 0,
                background: 'none',
                padding: 0,
                color: colors.brand[600],
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
            {' · '}
            <Link
              href="/login"
              style={{ color: colors.brand[600], fontWeight: typography.fontWeight.semibold }}
            >
              Sign in
            </Link>
          </Text>
        </Space>
      </AuthLayout>
    </div>
  );
}
