'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  Result,
  Row,
  Select,
  Space,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  LockOutlined,
  MailOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { colors, radii, shadows, typography } from '@reservations/ui';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const CONTACT_EMAILS = {
  general: 'hello@tablevera.online',
  privacy: 'privacy@tablevera.online',
  legal: 'legal@tablevera.online',
} as const;

const TOPIC_OPTIONS = [
  { value: 'general', label: 'General inquiry', email: CONTACT_EMAILS.general },
  { value: 'restaurant', label: 'Restaurant partnership', email: CONTACT_EMAILS.general },
  { value: 'support', label: 'Account & booking support', email: CONTACT_EMAILS.general },
  { value: 'privacy', label: 'Privacy & data requests', email: CONTACT_EMAILS.privacy },
  { value: 'legal', label: 'Legal & terms', email: CONTACT_EMAILS.legal },
] as const;

const CONTACT_CHANNELS = [
  {
    icon: <MailOutlined />,
    title: 'General inquiries',
    description: 'Reservations, accounts, and platform questions.',
    email: CONTACT_EMAILS.general,
  },
  {
    icon: <ShopOutlined />,
    title: 'Restaurant partners',
    description: 'List your restaurant or explore our plans.',
    email: CONTACT_EMAILS.general,
    link: { href: '/pricing', label: 'View pricing' },
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Privacy requests',
    description: 'Data access, correction, deletion, and rights.',
    email: CONTACT_EMAILS.privacy,
    link: { href: '/privacy', label: 'Privacy policy' },
  },
  {
    icon: <QuestionCircleOutlined />,
    title: 'Legal',
    description: 'Terms of service and legal matters.',
    email: CONTACT_EMAILS.legal,
    link: { href: '/terms', label: 'Terms of service' },
  },
] as const;

const FAQ_ITEMS = [
  {
    key: '1',
    label: 'How quickly will I hear back?',
    children:
      'We aim to respond to general and support inquiries within 1–2 business days. Privacy and legal requests may take up to 30 days as required by applicable law.',
  },
  {
    key: '2',
    label: 'Which email should I use?',
    children:
      'Use the form below and select the topic that best matches your question — we route each message to the right team automatically. You can also email us directly using the contact cards above.',
  },
  {
    key: '3',
    label: 'I represent a restaurant. How do I get started?',
    children: (
      <>
        Visit our{' '}
        <Link href="/pricing" style={{ color: colors.brand[600], fontWeight: 600 }}>
          pricing page
        </Link>{' '}
        to compare plans, or send us a message with the &quot;Restaurant partnership&quot; topic.
        Every plan includes a free 30-day trial.
      </>
    ),
  },
  {
    key: '4',
    label: 'How do I exercise my privacy rights?',
    children: (
      <>
        Email{' '}
        <a href={`mailto:${CONTACT_EMAILS.privacy}`} style={{ color: colors.brand[600] }}>
          {CONTACT_EMAILS.privacy}
        </a>{' '}
        or use the form with the &quot;Privacy & data requests&quot; topic. See our{' '}
        <Link href="/privacy" style={{ color: colors.brand[600] }}>
          privacy policy
        </Link>{' '}
        for full details.
      </>
    ),
  },
] as const;

const HERO_HIGHLIGHTS = [
  { icon: <ClockCircleOutlined />, label: '1–2 day response' },
  { icon: <CustomerServiceOutlined />, label: 'Dedicated support team' },
  { icon: <LockOutlined />, label: 'Secure & confidential' },
] as const;

type ContactFormValues = {
  name: string;
  email: string;
  topic: (typeof TOPIC_OPTIONS)[number]['value'];
  message: string;
};

function getTopicEmail(topic: ContactFormValues['topic']) {
  return TOPIC_OPTIONS.find((option) => option.value === topic)?.email ?? CONTACT_EMAILS.general;
}

function getTopicLabel(topic: ContactFormValues['topic']) {
  return TOPIC_OPTIONS.find((option) => option.value === topic)?.label ?? 'General inquiry';
}

function buildMailtoUrl(values: ContactFormValues) {
  const recipient = getTopicEmail(values.topic);
  const subject = encodeURIComponent(`[Tablevera] ${getTopicLabel(values.topic)}`);
  const body = encodeURIComponent(
    `Name: ${values.name}\nEmail: ${values.email}\nTopic: ${getTopicLabel(values.topic)}\n\n${values.message}`,
  );
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

export default function ContactPage() {
  return (
    <div component="ContactPage" style={{ display: 'contents' }}>
      <Suspense>
        <ContactContent />
      </Suspense>
    </div>
  );
}

function ContactContent() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get('topic');
  const initialTopic =
    TOPIC_OPTIONS.some((option) => option.value === topicParam) && topicParam
      ? (topicParam as ContactFormValues['topic'])
      : 'general';

  const [submitted, setSubmitted] = useState(false);
  const [submittedValues, setSubmittedValues] = useState<ContactFormValues | null>(null);

  const onFinish = (values: ContactFormValues) => {
    window.location.href = buildMailtoUrl(values);
    setSubmittedValues(values);
    setSubmitted(true);
  };

  return (
    <div className="contact-page-content">
      <Space orientation="vertical" size={40} style={{ width: '100%' }}>
        {/* Hero */}
        <Card
          className="rt-fade-up contact-hero"
          style={{
            background: `linear-gradient(135deg, ${colors.brand[600]} 0%, ${colors.heroMid} 55%, #051c14 100%)`,
            border: 'none',
            borderRadius: radii.xl,
            overflow: 'hidden',
          }}
          styles={{ body: { padding: '52px 32px', position: 'relative' } }}
        >
          <div className="contact-hero__orb contact-hero__orb--1 rt-hero-orb" aria-hidden />
          <div className="contact-hero__orb contact-hero__orb--2 rt-hero-orb" aria-hidden />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <span className="contact-hero-badge">We&apos;re here to help</span>
            <Title
              style={{
                color: '#fff',
                marginTop: 0,
                marginBottom: 16,
                fontSize: typography.fontSize.display,
                lineHeight: typography.lineHeight.tight,
                letterSpacing: typography.letterSpacing.tight,
              }}
            >
              Get in touch
            </Title>
            <Paragraph
              style={{
                color: 'rgba(255,255,255,0.88)',
                fontSize: typography.fontSize.md,
                marginBottom: 28,
                lineHeight: typography.lineHeight.normal,
              }}
            >
              Whether you&apos;re a diner with a question, a restaurant exploring Tablevera, or need
              help with privacy — our team is ready to assist.
            </Paragraph>
            <Space size={[20, 12]} wrap style={{ justifyContent: 'center' }}>
              {HERO_HIGHLIGHTS.map((item) => (
                <span key={item.label} className="contact-hero-pill">
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </Space>
          </div>
        </Card>

        {/* Contact channels */}
        <Row gutter={[16, 16]}>
          {CONTACT_CHANNELS.map((channel) => (
            <Col key={channel.title} xs={24} sm={12} lg={6}>
              <div className="contact-channel-card">
                <div className="contact-channel-card__icon">{channel.icon}</div>
                <Title level={5} style={{ margin: '0 0 6px' }}>
                  {channel.title}
                </Title>
                <Text type="secondary" style={{ fontSize: typography.fontSize.sm, display: 'block', marginBottom: 10 }}>
                  {channel.description}
                </Text>
                <a href={`mailto:${channel.email}`} className="contact-channel-card__email">
                  {channel.email}
                </a>
                {'link' in channel && channel.link && (
                  <Link href={channel.link.href} className="contact-channel-card__link">
                    {channel.link.label}
                    <ArrowRightOutlined style={{ fontSize: 11 }} />
                  </Link>
                )}
              </div>
            </Col>
          ))}
        </Row>

        {/* Form + sidebar */}
        <Row gutter={[24, 24]} align="stretch">
          <Col xs={24} lg={15}>
            <Card
              className="contact-form-panel"
              style={{
                borderRadius: radii.xl,
                border: `1px solid ${colors.bordersubtle}`,
                boxShadow: shadows.md,
                height: '100%',
              }}
              styles={{ body: { padding: '32px 28px' } }}
            >
              {submitted && submittedValues ? (
                <Result
                  status="success"
                  title="Your message is ready"
                  subTitle={
                    <>
                      Your email client should open with your message addressed to{' '}
                      <Text copyable strong>
                        {getTopicEmail(submittedValues.topic)}
                      </Text>
                      . If it doesn&apos;t open, use the button below.
                    </>
                  }
                  extra={[
                    <Button
                      key="email"
                      type="primary"
                      size="large"
                      icon={<MailOutlined />}
                      href={buildMailtoUrl(submittedValues)}
                      style={{
                        height: 46,
                        fontWeight: typography.fontWeight.semibold,
                        background: colors.brand[600],
                      }}
                    >
                      Open in email client
                    </Button>,
                    <Button key="again" size="large" onClick={() => setSubmitted(false)}>
                      Send another message
                    </Button>,
                  ]}
                >
                  <div className="contact-message-preview">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: typography.fontSize.xs }}>
                      YOUR MESSAGE
                    </Text>
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: colors.textPrimary }}>
                      {submittedValues.message}
                    </Paragraph>
                  </div>
                </Result>
              ) : (
                <>
                  <div style={{ marginBottom: 28 }}>
                    <Title level={3} style={{ margin: '0 0 8px', letterSpacing: typography.letterSpacing.tight }}>
                      Send us a message
                    </Title>
                    <Text type="secondary">
                      Fill out the form and we&apos;ll route your inquiry to the right team.
                    </Text>
                  </div>

                  <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="name"
                          label="Full name"
                          rules={[{ required: true, message: 'Please enter your name' }]}
                        >
                          <Input
                            prefix={<UserOutlined style={{ color: colors.textTertiary }} />}
                            placeholder="Jane Smith"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Email address"
                          rules={[
                            { required: true, message: 'Please enter your email' },
                            { type: 'email', message: 'Please enter a valid email' },
                          ]}
                        >
                          <Input
                            prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
                            placeholder="you@example.com"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="topic"
                      label="Topic"
                      initialValue={initialTopic}
                      rules={[{ required: true, message: 'Please select a topic' }]}
                    >
                      <Select options={TOPIC_OPTIONS.map(({ value, label }) => ({ value, label }))} />
                    </Form.Item>

                    <Form.Item
                      name="message"
                      label="Message"
                      rules={[
                        { required: true, message: 'Please enter your message' },
                        { min: 10, message: 'Message must be at least 10 characters' },
                      ]}
                    >
                      <TextArea
                        rows={6}
                        placeholder="Tell us how we can help — the more detail, the better we can assist you."
                        style={{ resize: 'none' }}
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        icon={<SendOutlined />}
                        className="contact-submit-btn"
                      >
                        Send message
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={9}>
            <Space orientation="vertical" size={16} style={{ width: '100%', height: '100%' }}>
              <div className="contact-info-panel">
                <div className="contact-info-panel__icon">
                  <ClockCircleOutlined />
                </div>
                <Title level={5} style={{ margin: '0 0 8px', color: '#fff' }}>
                  Response time
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: typography.fontSize.sm, lineHeight: 1.6 }}>
                  We typically respond within 1–2 business days. For urgent booking issues, include
                  your reservation details in the message.
                </Text>
              </div>

              <div className="contact-info-card">
                <MessageOutlined style={{ fontSize: 20, color: colors.brand[600], marginBottom: 12 }} />
                <Title level={5} style={{ margin: '0 0 8px' }}>
                  Before you write
                </Title>
                <ul className="contact-tips-list">
                  <li>Include your reservation ID for booking questions</li>
                  <li>Restaurant partners: mention your venue name and city</li>
                  <li>Privacy requests: specify the data you&apos;d like accessed or deleted</li>
                </ul>
              </div>

              <div className="contact-info-card">
                <CustomerServiceOutlined style={{ fontSize: 20, color: colors.brand[600], marginBottom: 12 }} />
                <Title level={5} style={{ margin: '0 0 8px' }}>
                  Prefer email directly?
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: typography.fontSize.sm }}>
                  Reach us at any of the addresses shown above, or start with:
                </Text>
                <a href={`mailto:${CONTACT_EMAILS.general}`} className="contact-direct-email">
                  {CONTACT_EMAILS.general}
                </a>
              </div>

              <Alert
                type="info"
                showIcon
                message="Secure communication"
                description="We never ask for passwords or full payment card numbers by email."
                style={{ borderRadius: radii.lg }}
              />
            </Space>
          </Col>
        </Row>

        {/* FAQ */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Title level={3} style={{ margin: '0 0 8px' }}>
              Frequently asked questions
            </Title>
            <Text type="secondary">Quick answers before you reach out</Text>
          </div>
          <Collapse
            items={FAQ_ITEMS.map((item) => ({ ...item }))}
            bordered={false}
            className="contact-faq"
            expandIconPosition="end"
          />
        </div>
      </Space>
    </div>
  );
}
