'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Typography,
  Card,
  Button,
  Space,
  Tag,
  Collapse,
  Row,
  Col,
  Divider,
} from 'antd';
import { PLANS } from '@/lib/graphql';
import {
  CheckOutlined,
  CloseOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  MailOutlined,
  MobileOutlined,
  SafetyOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface PlanFeature {
  name: string;
  basic: boolean | string;
  core: boolean | string;
  pro: boolean | string;
}

interface FeatureCategory {
  title: string;
  icon: React.ReactNode;
  features: PlanFeature[];
}

const featureCategories: FeatureCategory[] = [
  {
    title: 'Help land more guests',
    icon: <TeamOutlined />,
    features: [
      { name: 'Tablevera profile and listing', basic: true, core: true, pro: true },
      { name: 'Booking widget for your website', basic: true, core: true, pro: 'Fully customizable' },
      { name: 'Review management', basic: true, core: true, pro: true },
      { name: 'Booking integrations (100+ sites & apps)', basic: true, core: true, pro: true },
      { name: "Google's 'Reserve a table' button", basic: true, core: true, pro: true },
      { name: 'Notify Me (waitlist for fully booked nights)', basic: true, core: true, pro: true },
    ],
  },
  {
    title: 'Run a smooth restaurant operation',
    icon: <CalendarOutlined />,
    features: [
      { name: 'Customizable floor plans', basic: false, core: true, pro: true },
      { name: 'Smart Assign (table management)', basic: false, core: true, pro: true },
      { name: 'Advanced inventory controls', basic: false, core: true, pro: true },
      { name: 'Access Rules', basic: false, core: true, pro: true },
      { name: 'In-house and online waitlist', basic: false, core: true, pro: true },
      { name: 'POS integration', basic: false, core: true, pro: true },
      { name: 'Mobile app with floor plan', basic: false, core: true, pro: true },
      { name: 'Automated reservation messages', basic: true, core: true, pro: true },
      { name: 'Premium SMS Messaging', basic: false, core: '$15/mo add-on', pro: true },
    ],
  },
  {
    title: 'Build guest relationships',
    icon: <StarOutlined />,
    features: [
      { name: 'Guest database, tags and notes', basic: true, core: true, pro: true },
      { name: '360 guest profiles', basic: false, core: true, pro: 'Advanced insights' },
      { name: 'Real-time guest spend alerts', basic: false, core: true, pro: true },
      { name: 'Two-way messaging', basic: false, core: true, pro: true },
      { name: 'Pre-shift report', basic: false, core: false, pro: true },
      { name: 'Automated email campaigns', basic: false, core: false, pro: true },
      { name: 'Automated guest tags', basic: false, core: false, pro: true },
      { name: 'Custom post-dining surveys', basic: false, core: false, pro: true },
    ],
  },
  {
    title: 'Payments & security',
    icon: <SafetyOutlined />,
    features: [
      { name: 'Deposits and credit card holds', basic: true, core: true, pro: true },
      { name: 'No-show fees', basic: true, core: true, pro: true },
      { name: 'PCI-compliant payment processing', basic: true, core: true, pro: true },
      { name: 'Ticketed events & experiences', basic: false, core: true, pro: true },
    ],
  },
  {
    title: 'Reporting & analytics',
    icon: <BarChartOutlined />,
    features: [
      { name: 'Standard reporting', basic: true, core: true, pro: true },
      { name: 'Advanced analytics dashboard', basic: false, core: true, pro: true },
      { name: 'Revenue forecasting', basic: false, core: false, pro: true },
      { name: 'Custom report builder', basic: false, core: false, pro: true },
      { name: 'Multi-location analytics', basic: false, core: false, pro: true },
    ],
  },
  {
    title: 'Marketing tools',
    icon: <MailOutlined />,
    features: [
      { name: 'Boost campaigns (pay-per-cover)', basic: true, core: true, pro: true },
      { name: 'Featured placement on Tablevera', basic: false, core: true, pro: true },
      { name: 'Email marketing campaigns', basic: false, core: false, pro: true },
      { name: 'Promotion & offer management', basic: false, core: false, pro: true },
    ],
  },
  {
    title: 'Support & onboarding',
    icon: <MobileOutlined />,
    features: [
      { name: 'Online help center', basic: true, core: true, pro: true },
      { name: 'Email support', basic: true, core: true, pro: true },
      { name: 'Phone support', basic: false, core: true, pro: true },
      { name: 'Dedicated account manager', basic: false, core: false, pro: true },
      { name: 'Priority onboarding', basic: false, core: false, pro: true },
    ],
  },
];

const faqItems = [
  {
    key: '1',
    label: "What's the commitment?",
    children:
      "None. Every plan is month-to-month — cancel anytime. We're just getting started, so we keep things simple: no annual contracts, no lock-in.",
  },
  {
    key: '2',
    label: 'Does Tablevera charge cover fees for every reservation?',
    children:
      "On Core and Pro plans, we only charge cover fees for diners that discover your restaurant on Tablevera's website, app, or through our affiliate network. If a diner books directly through your website or by calling the restaurant, we don't take a cent.",
  },
  {
    key: '3',
    label: 'Do I pay for reservations through my website?',
    children:
      'On Core and Pro plans, all reservations from your website are free. On the Basic plan, website reservations are $0.10 per cover or you can opt for a $19/month flat fee for unlimited website bookings.',
  },
  {
    key: '4',
    label: 'Do I pay for phone reservations? Walk-ins?',
    children:
      "No. When a diner books by calling the restaurant or walks in, we don't charge you anything.",
  },
  {
    key: '5',
    label: 'Will I still be charged a cover fee for a no-show or cancellation?',
    children:
      "You only pay for seated diners, which means there's no need to worry about being charged a cover fee for cancellations or no-shows.",
  },
  {
    key: '6',
    label: 'Can I offer ticketed events?',
    children:
      "Yes. Whether it's a ticketed event like a class or wine tasting or a special menu, you can offer customized Experiences on Core and Pro plans. A 2% service fee applies to deposits and ticketed experiences.",
  },
  {
    key: '7',
    label: 'Is there a free trial?',
    children:
      'Yes — every plan includes a free 30-day trial. No credit card commitment required to explore the product; cancel anytime during the trial with no charge.',
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <CheckOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
  }
  if (value === false) {
    return <CloseOutlined style={{ color: '#d9d9d9', fontSize: 14 }} />;
  }
  return (
    <Text style={{ fontSize: 13, color: '#c4472f', fontWeight: 500 }}>
      {value}
    </Text>
  );
}

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

type ApiPlan = {
  key: string;
  name: string;
  description?: string | null;
  monthlyPriceCents: number;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  visibleOnPricing: boolean;
  isCustom: boolean;
};

const FALLBACK_PLANS: ApiPlan[] = [
  {
    key: 'basic',
    name: 'Basic',
    description: 'Essential reservation management to get started with online bookings.',
    monthlyPriceCents: 4900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 10,
    trialDays: 30,
    visibleOnPricing: true,
    isCustom: false,
  },
  {
    key: 'core',
    name: 'Core',
    description:
      'Best-in-class table management to maximize seatings, streamline operations, and more.',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 50,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    visibleOnPricing: true,
    isCustom: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    description:
      'Our most comprehensive plan with powerful relationship management and data tools to drive loyalty.',
    monthlyPriceCents: 19900,
    networkCoverFeeCents: 25,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    visibleOnPricing: true,
    isCustom: false,
  },
];

const PLAN_BLURBS: Record<string, string> = {
  basic: 'Essential reservation management to get started with online bookings.',
  core: 'Best-in-class table management to maximize seatings, streamline operations, and more.',
  pro: 'Our most comprehensive plan with powerful relationship management and data tools to drive loyalty.',
};

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function planIcon(key: string) {
  if (key === 'basic') return <ThunderboltOutlined style={{ fontSize: 24, color: '#c4472f' }} />;
  if (key === 'pro') return <RocketOutlined style={{ fontSize: 24, color: '#c4472f' }} />;
  return <CrownOutlined style={{ fontSize: 24, color: '#c4472f' }} />;
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('core');
  const { data: plansData } = useQuery(PLANS);

  const allPlans: ApiPlan[] =
    ((plansData as any)?.plans as ApiPlan[] | undefined)?.length
      ? ((plansData as any).plans as ApiPlan[])
      : FALLBACK_PLANS;

  const visiblePlans = allPlans.filter((p) => p.visibleOnPricing !== false);
  const colSpan = visiblePlans.length >= 4 ? 6 : visiblePlans.length === 1 ? 24 : 8;

  const startTrial = (plan: string = selectedPlan) => {
    window.open(`${DASHBOARD_URL}/register?plan=${plan}`, '_blank');
  };

  return (
    <Space orientation="vertical" size={48} style={{ width: '100%' }}>
      {/* Hero Section */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #c4472f 0%, #702c22 100%)',
          border: 'none',
          borderRadius: 16,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '48px 32px', textAlign: 'center' } }}
      >
        <Tag
          color="gold"
          style={{ marginBottom: 16, fontWeight: 600, border: 'none' }}
        >
          Launch pricing — limited early-partner rates
        </Tag>
        <Title style={{ color: '#fff', marginTop: 0, fontSize: 36 }}>
          Simple pricing for restaurants getting started
        </Title>
        <Paragraph
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 18,
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          We&apos;re a new platform building with our first partners. Month-to-month plans, optional
          free trials, and cover fees that won&apos;t eat your margins.
        </Paragraph>
      </Card>

      {/* Pricing Cards */}
      <Row gutter={[24, 24]} align="stretch">
        {visiblePlans.map((plan) => {
          const isSelected = selectedPlan === plan.key;
          const isCore = plan.key === 'core';
          const monthly = formatDollars(plan.monthlyPriceCents);
          const networkFee = formatDollars(plan.networkCoverFeeCents);
          const websiteFee =
            plan.websiteCoverFeeCents === 0 ? 'FREE' : formatDollars(plan.websiteCoverFeeCents);
          const description =
            plan.description?.trim() || PLAN_BLURBS[plan.key] || 'Custom package for your restaurant.';
          const ctaLabel = plan.trialDays > 0 ? 'Start free trial' : 'Get started';

          return (
            <Col xs={24} md={colSpan} key={plan.key}>
              <Card
                hoverable
                onClick={() => setSelectedPlan(plan.key)}
                style={{
                  height: '100%',
                  borderRadius: 12,
                  border: isSelected ? '2px solid #c4472f' : '1px solid #e8e8e8',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                styles={{
                  body: {
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  },
                }}
              >
                {isCore ? (
                  <Tag
                    color="#c4472f"
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: 16,
                      borderRadius: '0 0 6px 6px',
                      padding: '4px 12px',
                      fontWeight: 600,
                    }}
                  >
                    Most Popular
                  </Tag>
                ) : null}
                <Space orientation="vertical" size={16} style={{ width: '100%', flex: 1 }}>
                  <div>
                    <Space align="center">
                      {planIcon(plan.key)}
                      <Title level={3} style={{ margin: 0 }}>
                        {plan.name}
                      </Title>
                    </Space>
                    <Paragraph type="secondary" style={{ marginTop: 8 }}>
                      {description}
                    </Paragraph>
                  </div>
                  <div>
                    <Text style={{ fontSize: 36, fontWeight: 700 }}>{monthly}</Text>
                    <Text type="secondary"> / month</Text>
                  </div>
                  <div>
                    <Space size={8} wrap>
                      {plan.trialDays > 0 ? (
                        <Tag color="green">Free {plan.trialDays}-day trial</Tag>
                      ) : null}
                      {plan.key === 'core' ? <Tag color="blue">Free website covers</Tag> : null}
                      {plan.key === 'pro' ? (
                        <Tag color="purple">Everything in Core + more</Tag>
                      ) : null}
                      {plan.isCustom ? <Tag>Custom</Tag> : null}
                    </Space>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Space orientation="vertical" size={8} style={{ flex: 1 }}>
                    <Text strong>Cover fees:</Text>
                    <Text>• {networkFee} per network cover</Text>
                    {plan.key === 'basic' ? (
                      <>
                        <Text>• {websiteFee} per website cover</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (or $19/mo flat for unlimited)
                        </Text>
                      </>
                    ) : (
                      <Text>• Website reservations: {websiteFee}</Text>
                    )}
                    {plan.key === 'pro' ? <Text>• Premium SMS included</Text> : null}
                  </Space>
                  <Button
                    type={isSelected || isCore ? 'primary' : 'default'}
                    size="large"
                    block
                    style={
                      isSelected || isCore
                        ? { background: '#c4472f', borderColor: '#c4472f' }
                        : {}
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      startTrial(plan.key);
                    }}
                  >
                    {ctaLabel}
                  </Button>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Feature Comparison Table */}
      <div>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          Compare all features
        </Title>

        {/* Sticky plan headers on desktop */}
        <Card
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 120px',
              padding: '20px 24px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              borderRadius: '12px 12px 0 0',
            }}
          >
            <Text strong>Features</Text>
            <Text strong style={{ textAlign: 'center' }}>Basic</Text>
            <Text strong style={{ textAlign: 'center' }}>Core</Text>
            <Text strong style={{ textAlign: 'center' }}>Pro</Text>
          </div>

          {featureCategories.map((category, catIdx) => (
            <div key={catIdx}>
              {/* Category header */}
              <div
                style={{
                  padding: '16px 24px',
                  background: '#fdf6f4',
                  borderBottom: '1px solid #f0f0f0',
                  borderTop: catIdx > 0 ? '1px solid #f0f0f0' : undefined,
                }}
              >
                <Space>
                  <span style={{ color: '#c4472f' }}>{category.icon}</span>
                  <Text strong style={{ fontSize: 16 }}>
                    {category.title}
                  </Text>
                </Space>
              </div>

              {/* Feature rows */}
              {category.features.map((feature, featIdx) => (
                <div
                  key={featIdx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 120px',
                    padding: '14px 24px',
                    borderBottom:
                      featIdx < category.features.length - 1
                        ? '1px solid #f5f5f5'
                        : undefined,
                    alignItems: 'center',
                  }}
                >
                  <Text>{feature.name}</Text>
                  <div style={{ textAlign: 'center' }}>
                    <FeatureValue value={feature.basic} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <FeatureValue value={feature.core} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <FeatureValue value={feature.pro} />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Bottom CTA row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 120px',
              padding: '20px 24px',
              background: '#fafafa',
              borderTop: '1px solid #f0f0f0',
              borderRadius: '0 0 12px 12px',
            }}
          >
            <div />
            <div style={{ textAlign: 'center' }}>
              <Button
                size="small"
                style={{ borderColor: '#c4472f', color: '#c4472f' }}
                onClick={() => startTrial('basic')}
              >
                Get Basic
              </Button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                size="small"
                style={{ background: '#c4472f', borderColor: '#c4472f' }}
                onClick={() => startTrial('core')}
              >
                Get Core
              </Button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Button
                size="small"
                style={{ borderColor: '#c4472f', color: '#c4472f' }}
                onClick={() => startTrial('pro')}
              >
                Get Pro
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Solutions */}
      <div>
        <Title level={2} style={{ textAlign: 'center' }}>
          Additional solutions
        </Title>
        <Paragraph style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 32px' }}>
          Enhance your plan with powerful add-ons designed to drive more revenue and streamline
          operations.
        </Paragraph>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card
              style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
              styles={{ body: { padding: 32 } }}
            >
              <BarChartOutlined style={{ fontSize: 40, color: '#c4472f', marginBottom: 16 }} />
              <Title level={4}>Digital Marketing</Title>
              <Paragraph type="secondary">
                Get in front of a larger audience with digital marketing campaigns that attract
                diners at the moment they&apos;re searching to help drive more bookings.
              </Paragraph>
              <Button type="link" style={{ color: '#c4472f', padding: 0 }}>
                Learn more →
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
              styles={{ body: { padding: 32 } }}
            >
              <StarOutlined style={{ fontSize: 40, color: '#c4472f', marginBottom: 16 }} />
              <Title level={4}>Experiences</Title>
              <Paragraph type="secondary">
                Serve up, sell out, and manage a full range of customized dining experiences — from
                tastings and classes to special menus — all in one place.
              </Paragraph>
              <Button type="link" style={{ color: '#c4472f', padding: 0 }}>
                Learn more →
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
              styles={{ body: { padding: 32 } }}
            >
              <TeamOutlined style={{ fontSize: 40, color: '#c4472f', marginBottom: 16 }} />
              <Title level={4}>Private Dining</Title>
              <Paragraph type="secondary">
                Open your restaurant to more guests, help get more leads, and streamline operations
                for successful private events.
              </Paragraph>
              <Button type="link" style={{ color: '#c4472f', padding: 0 }}>
                Learn more →
              </Button>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Testimonial */}
      <Card
        style={{
          background: '#1a1a1a',
          border: 'none',
          borderRadius: 16,
        }}
        styles={{ body: { padding: '48px 32px', textAlign: 'center' } }}
      >
        <Title
          level={3}
          style={{ color: '#fff', fontStyle: 'italic', fontWeight: 400, maxWidth: 700, margin: '0 auto' }}
        >
          &ldquo;Tablevera offers an intuitive and powerful platform that makes it easy for our
          restaurants to be discovered by new guests while being able to service them with smart
          marketing tools and useful data.&rdquo;
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.7)', marginTop: 24, marginBottom: 0 }}>
          <Text style={{ color: '#fff', fontWeight: 600 }}>Sarah Chen</Text>
          <br />
          Director of Operations, Metropolitan Dining Group
        </Paragraph>
      </Card>

      {/* Enterprise CTA */}
      <Card
        style={{ borderRadius: 12, border: '2px solid #c4472f' }}
        styles={{ body: { padding: '32px', textAlign: 'center' } }}
      >
        <Title level={3} style={{ marginTop: 0 }}>
          Looking for an Enterprise solution?
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 500, margin: '0 auto 24px' }}>
          Multi-location restaurant groups get custom pricing, dedicated support, and advanced
          management tools.
        </Paragraph>
        <Button
          type="primary"
          size="large"
          style={{ background: '#c4472f', borderColor: '#c4472f' }}
        >
          Contact sales
        </Button>
      </Card>

      {/* FAQ */}
      <div>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          Frequently asked questions
        </Title>
        <Collapse
          items={faqItems}
          bordered={false}
          style={{ background: '#fff', borderRadius: 12, maxWidth: 800, margin: '0 auto' }}
          size="large"
        />
      </div>

      {/* Final CTA */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #c4472f 0%, #a33826 100%)',
          border: 'none',
          borderRadius: 16,
        }}
        styles={{ body: { padding: '48px 32px', textAlign: 'center' } }}
      >
        <Title level={2} style={{ color: '#fff', marginTop: 0 }}>
          Ready to grow your restaurant?
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 24 }}>
          Be one of our founding restaurant partners — lock in launch pricing and help shape the
          product as we grow.
        </Paragraph>
        <Space size={16}>
          <Button
            size="large"
            style={{
              background: '#fff',
              color: '#c4472f',
              borderColor: '#fff',
              fontWeight: 600,
            }}
            onClick={() => startTrial()}
          >
            Start free trial
          </Button>
          <Button
            size="large"
            ghost
            style={{ borderColor: '#fff', color: '#fff' }}
          >
            See a demo
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
