'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Typography,
  Card,
  Button,
  Space,
  Collapse,
  Row,
  Col,
  Segmented,
} from 'antd';
import { PLANS } from '@/lib/graphql';
import type { BillingPeriod } from '@reservations/ui';
import {
  annualBillingAppliesToPlan,
  formatPlanDollars,
  getAnnualSavingsPercentFromSettings,
  getPlanDiscountLabel,
  getPlanPriceDisplay,
  normalizeAnnualBillingSettings,
  planForBillingPeriod,
  type AnnualBillingSettings,
} from '@reservations/shared';
import {
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  MailOutlined,
  MobileOutlined,
  SafetyOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
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

const PLAN_ORDER = ['basic', 'core', 'pro'] as const;
const COMPARISON_PLAN_KEYS = ['basic', 'core', 'pro'] as const;
const VISIBLE_CATEGORY_COUNT = 2;

type PlanKey = (typeof PLAN_ORDER)[number];

const PLAN_HIGHLIGHTS: Record<PlanKey, string[]> = {
  basic: [
    'Tablevera listing & booking widget',
    'Deposits & no-show fees',
    'Review management',
    'Google Reserve integration',
  ],
  core: [
    'Floor plans & Smart Assign',
    'Free website reservations',
    'POS integration & waitlist',
    '360° guest profiles',
  ],
  pro: [
    'Automated email campaigns',
    'Premium SMS included',
    'Revenue forecasting',
    'Dedicated account manager',
  ],
};

const PLAN_BLURBS: Record<PlanKey, string> = {
  basic: 'Essential reservation management to get started with online bookings.',
  core: 'Best-in-class table management to maximize seatings, streamline operations, and more.',
  pro: 'Our most comprehensive plan with powerful relationship management and data tools to drive loyalty.',
};

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <CheckOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
  }
  if (value === false) {
    return <CloseOutlined style={{ color: '#d9d9d9', fontSize: 14 }} />;
  }
  return (
    <div component="FeatureValue" style={{ display: 'contents' }}>
      <Text style={{ fontSize: 13, color: '#0b3d2e', fontWeight: 500 }}>{value}</Text>
    </div>
  );
}

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

type ApiPlan = {
  key: string;
  name: string;
  description?: string | null;
  monthlyPriceCents: number;
  originalMonthlyPriceCents?: number | null;
  discountType?: string | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  annualFreeMonths?: number | null;
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
    description: PLAN_BLURBS.basic,
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
    description: PLAN_BLURBS.core,
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
    description: PLAN_BLURBS.pro,
    monthlyPriceCents: 19900,
    networkCoverFeeCents: 25,
    websiteCoverFeeCents: 0,
    trialDays: 30,
    visibleOnPricing: true,
    isCustom: false,
  },
];

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function sortPlans(plans: ApiPlan[]): ApiPlan[] {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.key as PlanKey);
    const bi = PLAN_ORDER.indexOf(b.key as PlanKey);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function isStandardPlanKey(key: string): key is PlanKey {
  return (PLAN_ORDER as readonly string[]).includes(key);
}

function getPlanDisplay(
  plan: ApiPlan,
  billingPeriod: BillingPeriod,
  annualBilling: AnnualBillingSettings,
) {
  return getPlanPriceDisplay(
    planForBillingPeriod(plan, billingPeriod, {
      annualBilling,
      planKey: plan.key,
    }),
  );
}

function getDiscountBadge(
  display: ReturnType<typeof getPlanPriceDisplay>,
  plan: ApiPlan,
  isCore: boolean,
  billingPeriod: BillingPeriod,
  annualBilling: AnnualBillingSettings,
): string | null {
  if (
    billingPeriod === 'annual' &&
    annualBilling.enabled &&
    annualBilling.discountType === 'percent_off' &&
    annualBillingAppliesToPlan(plan.key, annualBilling)
  ) {
    const percent = annualBilling.discountPercent;
    return isCore ? `Special offer · ${percent}% off` : `${percent}% off`;
  }

  if (display.annualSavingsPercent && display.annualSavingsPercent > 0 && billingPeriod === 'annual') {
    return isCore
      ? `Special offer · ${display.annualSavingsPercent}% off`
      : `${display.annualSavingsPercent}% off`;
  }
  const label = getPlanDiscountLabel(plan);
  if (label) return label;
  if (plan.trialDays > 0 && billingPeriod === 'monthly') {
    return `Free ${plan.trialDays}-day trial`;
  }
  return null;
}

function getFinePrint(
  display: ReturnType<typeof getPlanPriceDisplay>,
  plan: ApiPlan,
  billingPeriod: BillingPeriod,
): string {
  if (
    billingPeriod === 'annual' &&
    display.annualDiscountedCents != null &&
    display.annualFullCents != null
  ) {
    return `Get 12 months for ${formatPlanDollars(display.annualDiscountedCents)} (regular price ${formatPlanDollars(display.annualFullCents)}). Renews at ${formatPlanDollars(plan.monthlyPriceCents)}/mo.`;
  }
  if (plan.trialDays > 0) {
    const afterTrial =
      display.primarySuffix === ' / first month'
        ? formatPlanDollars(plan.monthlyPriceCents)
        : formatPlanDollars(display.primaryCents);
    return `${plan.trialDays}-day free trial, then ${afterTrial}/mo. Cancel anytime.`;
  }
  return 'Month-to-month billing. Cancel anytime.';
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('core');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const { data: plansData } = useQuery(PLANS);

  const annualBilling: AnnualBillingSettings = useMemo(
    () =>
      normalizeAnnualBillingSettings(
        (plansData as { annualBillingSettings?: AnnualBillingSettings })?.annualBillingSettings,
      ),
    [plansData],
  );

  const allPlans: ApiPlan[] =
    ((plansData as { plans?: ApiPlan[] })?.plans?.length
      ? (plansData as { plans: ApiPlan[] }).plans
      : FALLBACK_PLANS);

  const visiblePlans = useMemo(
    () =>
      sortPlans(
        allPlans.filter(
          (p) => p.visibleOnPricing !== false && !p.isCustom && isStandardPlanKey(p.key),
        ),
      ),
    [allPlans],
  );

  const comparisonPlans = COMPARISON_PLAN_KEYS.filter((key) =>
    visiblePlans.some((p) => p.key === key),
  );

  const selectedPlanData = visiblePlans.find((p) => p.key === selectedPlan) ?? visiblePlans[1];

  const selectedPlanDisplay = selectedPlanData
    ? getPlanPriceDisplay(
        planForBillingPeriod(selectedPlanData, billingPeriod, {
          annualBilling,
          planKey: selectedPlanData.key,
        }),
      )
    : null;

  const annualToggleLabel = useMemo(() => {
    if (!annualBilling.enabled) return 'Annual';
    if (annualBilling.discountType === 'percent_off') {
      return `Annual (${annualBilling.discountPercent}% off)`;
    }
    const savings = getAnnualSavingsPercentFromSettings(annualBilling);
    return savings > 0 ? `Annual (${savings}% off)` : 'Annual';
  }, [annualBilling]);

  const visibleCategories = showAllFeatures
    ? featureCategories
    : featureCategories.slice(0, VISIBLE_CATEGORY_COUNT);

  const gridColumns = `1fr repeat(${comparisonPlans.length}, minmax(100px, 120px))`;
  const coreColumnIndex = comparisonPlans.indexOf('core');

  const startTrial = (plan: string = selectedPlan) => {
    window.open(`${DASHBOARD_URL}/register?plan=${plan}`, '_blank');
  };

  return (
    <div component="PricingPage" className="pricing-page-content" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={48} style={{ width: '100%' }}>
        {/* Hero */}
        <Card
          className="rt-fade-up"
          style={{
            background: 'linear-gradient(135deg, #0b3d2e 0%, #051c14 100%)',
            border: 'none',
            borderRadius: 16,
            overflow: 'hidden',
          }}
          styles={{ body: { padding: '48px 32px', textAlign: 'center' } }}
        >
          <span className="pricing-hero-badge">
            Launch pricing — limited early-partner rates
          </span>
          <Title style={{ color: '#fff', marginTop: 0, fontSize: 36, lineHeight: 1.2 }}>
            Fill more tables. Pay less per cover.
          </Title>
          <Paragraph
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 18,
              maxWidth: 640,
              margin: '0 auto 24px',
            }}
          >
            30-day free trial · No contracts · Free website bookings on Core &amp; Pro
          </Paragraph>
          <Space size={[24, 12]} wrap style={{ justifyContent: 'center' }}>
            <Space size={8}>
              <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.85)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.9)' }}>30-day free trial</Text>
            </Space>
            <Space size={8}>
              <FileProtectOutlined style={{ color: 'rgba(255,255,255,0.85)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Cancel anytime</Text>
            </Space>
            <Space size={8}>
              <SafetyCertificateOutlined style={{ color: 'rgba(255,255,255,0.85)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.9)' }}>PCI compliant</Text>
            </Space>
          </Space>
        </Card>

        {/* Billing toggle */}
        <div style={{ textAlign: 'center' }}>
          <Segmented
            value={billingPeriod}
            onChange={(value) => setBillingPeriod(value as BillingPeriod)}
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: annualToggleLabel, value: 'annual' },
            ]}
            size="large"
          />
        </div>

        {/* Pricing cards */}
        <Row gutter={[20, 24]} align="stretch" justify="center">
          {visiblePlans.map((plan) => {
            const isCore = plan.key === 'core';
            const planKey = plan.key as PlanKey;
            const description =
              plan.description?.trim() || PLAN_BLURBS[planKey] || 'Built for your restaurant.';
            const ctaLabel = plan.trialDays > 0 ? 'Start free trial' : 'Choose plan';
            const highlights = PLAN_HIGHLIGHTS[planKey] ?? [];
            const display = getPlanDisplay(plan, billingPeriod, annualBilling);
            const badge = getDiscountBadge(display, plan, isCore, billingPeriod, annualBilling);
            const finePrint = getFinePrint(display, plan, billingPeriod);
            const showStrike =
              display.showStrikethrough && display.originalCents != null && display.originalCents > 0;
            const strikeLabel =
              display.primarySuffix === ' / first month'
                ? `${formatPlanDollars(display.originalCents!)}/mo`
                : billingPeriod === 'annual' || display.discountTag?.includes('annual')
                  ? `${formatPlanDollars(display.originalCents!)}/mo`
                  : formatPlanDollars(display.originalCents!);

            return (
              <Col xs={24} md={8} key={plan.key} style={{ display: 'flex' }}>
                <div
                  className={`pricing-plan-card${isCore ? ' pricing-plan-card--featured pricing-core-card' : ''}`}
                  onClick={() => setSelectedPlan(plan.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedPlan(plan.key);
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  {badge ? <span className="pricing-plan-card__badge">{badge}</span> : null}

                  <h3 className="pricing-plan-card__title">{plan.name}</h3>
                  <p className="pricing-plan-card__desc">{description}</p>

                  <div>
                    {showStrike ? (
                      <span className="pricing-plan-card__strike">{strikeLabel}</span>
                    ) : null}
                    <div className="pricing-plan-card__price">
                      {formatPlanDollars(display.primaryCents)}
                      <span className="pricing-plan-card__price-suffix">/mo</span>
                    </div>
                  </div>

                  <Button
                    type={isCore ? 'primary' : 'default'}
                    size="large"
                    block
                    className="pricing-plan-card__cta"
                    style={
                      isCore
                        ? {
                            background: '#fff',
                            color: '#0b3d2e',
                            borderColor: '#fff',
                          }
                        : {
                            borderColor: '#0b3d2e',
                            color: '#0b3d2e',
                            background: '#fff',
                          }
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      startTrial(plan.key);
                    }}
                  >
                    {ctaLabel}
                  </Button>

                  <Text className="pricing-plan-card__fine-print">{finePrint}</Text>

                  <hr className="pricing-plan-card__divider" />

                  <ul className="pricing-plan-card__features">
                    {highlights.map((item) => (
                      <li key={item} className="pricing-plan-card__feature">
                        <CheckOutlined className="pricing-plan-card__check" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Col>
            );
          })}
        </Row>

        {/* Cover fees footnote */}
        {visiblePlans.length > 0 ? (
          <Card
            style={{ borderRadius: 12, background: '#fafafa', border: '1px solid #f0f0f0' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              About cover fees
            </Text>
            <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 14 }}>
              Cover fees apply only when diners discover your restaurant on Tablevera&apos;s network
              (website, app, or affiliates). Phone, walk-in, and direct website bookings are never
              charged a network fee.{' '}
              {visiblePlans
                .map((p) => {
                  const web =
                    p.websiteCoverFeeCents === 0
                      ? 'website covers free'
                      : p.key === 'basic'
                        ? `${formatDollars(p.websiteCoverFeeCents)} per website cover (or $19/mo unlimited)`
                        : `${formatDollars(p.websiteCoverFeeCents)} per website cover`;
                  return `${p.name}: ${formatDollars(p.networkCoverFeeCents)} per network cover, ${web}`;
                })
                .join('. ')}
              . You only pay for seated diners — never for no-shows or cancellations.
            </Paragraph>
          </Card>
        ) : null}

        {/* Inline testimonial */}
        <Card
          style={{
            borderRadius: 12,
            border: '1px solid #e8e8e8',
            background: 'linear-gradient(135deg, #f0f7f4 0%, #fff 100%)',
          }}
          styles={{ body: { padding: '28px 32px' } }}
        >
          <Row align="middle" gutter={[24, 16]}>
            <Col xs={24} md={16}>
              <Text style={{ fontSize: 17, fontStyle: 'italic', color: '#1a1816', lineHeight: 1.6 }}>
                &ldquo;Tablevera makes it easy for our restaurants to be discovered by new guests
                while giving us smart marketing tools and useful data — without eating our
                margins.&rdquo;
              </Text>
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ display: 'block' }}>
                Sarah Chen
              </Text>
              <Text type="secondary">Director of Operations, Metropolitan Dining Group</Text>
              <div style={{ marginTop: 8 }}>
                <StarOutlined style={{ color: '#c5a059' }} />
                <StarOutlined style={{ color: '#c5a059' }} />
                <StarOutlined style={{ color: '#c5a059' }} />
                <StarOutlined style={{ color: '#c5a059' }} />
                <StarOutlined style={{ color: '#c5a059' }} />
              </div>
            </Col>
          </Row>
        </Card>

        {/* Feature comparison */}
        <div>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
            Compare all features
          </Title>
          <Paragraph style={{ textAlign: 'center', marginBottom: 32, color: '#5a554d' }}>
            {showAllFeatures
              ? 'Full feature breakdown across all plans'
              : `Showing top highlights — ${featureCategories.length - VISIBLE_CATEGORY_COUNT} more categories below`}
          </Paragraph>

          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
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
              {comparisonPlans.map((key, idx) => (
                <Text
                  key={key}
                  strong
                  style={{
                    textAlign: 'center',
                    color: key === 'core' ? '#0b3d2e' : undefined,
                    background: idx === coreColumnIndex ? '#f0f7f4' : undefined,
                    borderRadius: 6,
                    padding: '4px 0',
                  }}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              ))}
            </div>

            {visibleCategories.map((category, catIdx) => (
              <div key={category.title}>
                <div
                  style={{
                    padding: '16px 24px',
                    background: '#fdf6f4',
                    borderBottom: '1px solid #f0f0f0',
                    borderTop: catIdx > 0 ? '1px solid #f0f0f0' : undefined,
                  }}
                >
                  <Space>
                    <span style={{ color: '#0b3d2e' }}>{category.icon}</span>
                    <Text strong style={{ fontSize: 16 }}>
                      {category.title}
                    </Text>
                  </Space>
                </div>

                {category.features.map((feature, featIdx) => (
                  <div
                    key={feature.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridColumns,
                      padding: '14px 24px',
                      borderBottom:
                        featIdx < category.features.length - 1 ? '1px solid #f5f5f5' : undefined,
                      alignItems: 'center',
                    }}
                  >
                    <Text>{feature.name}</Text>
                    {comparisonPlans.map((key, idx) => (
                      <div
                        key={key}
                        style={{
                          textAlign: 'center',
                          background: idx === coreColumnIndex ? '#f0f7f4' : undefined,
                          borderRadius: 6,
                          padding: '4px 0',
                        }}
                      >
                        <FeatureValue value={feature[key]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {!showAllFeatures ? (
              <div style={{ padding: '20px 24px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                <Button type="link" onClick={() => setShowAllFeatures(true)} style={{ color: '#0b3d2e' }}>
                  Show all {featureCategories.length} feature categories →
                </Button>
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                padding: '20px 24px',
                background: '#fafafa',
                borderTop: '1px solid #f0f0f0',
                borderRadius: '0 0 12px 12px',
              }}
            >
              <div />
              {comparisonPlans.map((key, idx) => (
                <div
                  key={key}
                  style={{
                    textAlign: 'center',
                    background: idx === coreColumnIndex ? '#f0f7f4' : undefined,
                    borderRadius: 6,
                    padding: '4px 0',
                  }}
                >
                  <Button
                    type={key === 'core' ? 'primary' : 'default'}
                    size="small"
                    style={
                      key === 'core'
                        ? { background: '#0b3d2e', borderColor: '#0b3d2e' }
                        : { borderColor: '#0b3d2e', color: '#0b3d2e' }
                    }
                    onClick={() => startTrial(key)}
                  >
                    Get {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Additional solutions */}
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
                <BarChartOutlined style={{ fontSize: 40, color: '#0b3d2e', marginBottom: 16 }} />
                <Title level={4}>Digital Marketing</Title>
                <Paragraph type="secondary">
                  Get in front of a larger audience with digital marketing campaigns that attract
                  diners at the moment they&apos;re searching to help drive more bookings.
                </Paragraph>
                <Button type="link" style={{ color: '#0b3d2e', padding: 0 }}>
                  Learn more →
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
                styles={{ body: { padding: 32 } }}
              >
                <StarOutlined style={{ fontSize: 40, color: '#0b3d2e', marginBottom: 16 }} />
                <Title level={4}>Experiences</Title>
                <Paragraph type="secondary">
                  Serve up, sell out, and manage a full range of customized dining experiences — from
                  tastings and classes to special menus — all in one place.
                </Paragraph>
                <Button type="link" style={{ color: '#0b3d2e', padding: 0 }}>
                  Learn more →
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
                styles={{ body: { padding: 32 } }}
              >
                <TeamOutlined style={{ fontSize: 40, color: '#0b3d2e', marginBottom: 16 }} />
                <Title level={4}>Private Dining</Title>
                <Paragraph type="secondary">
                  Open your restaurant to more guests, help get more leads, and streamline operations
                  for successful private events.
                </Paragraph>
                <Button type="link" style={{ color: '#0b3d2e', padding: 0 }}>
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
            style={{
              color: '#fff',
              fontStyle: 'italic',
              fontWeight: 400,
              maxWidth: 700,
              margin: '0 auto',
            }}
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
          style={{ borderRadius: 12, border: '2px solid #0b3d2e' }}
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
            style={{ background: '#0b3d2e', borderColor: '#0b3d2e' }}
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
            background: 'linear-gradient(135deg, #0b3d2e 0%, #093224 100%)',
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
          <Space size={16} wrap style={{ justifyContent: 'center' }}>
            <Button
              size="large"
              style={{
                background: '#fff',
                color: '#0b3d2e',
                borderColor: '#fff',
                fontWeight: 600,
              }}
              onClick={() => startTrial()}
            >
              Start free trial
            </Button>
            <Button size="large" ghost style={{ borderColor: '#fff', color: '#fff' }}>
              See a demo
            </Button>
          </Space>
        </Card>
      </Space>

      {/* Sticky mobile CTA */}
      {selectedPlanData ? (
        <div className="pricing-sticky-cta">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ display: 'block', fontSize: 14 }}>
              {selectedPlanData.name} plan
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {selectedPlanDisplay
                ? `${formatPlanDollars(selectedPlanDisplay.primaryCents)}${selectedPlanDisplay.primarySuffix}`
                : ''}
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            style={{ background: '#0b3d2e', borderColor: '#0b3d2e', flexShrink: 0 }}
            onClick={() => startTrial(selectedPlanData.key)}
          >
            Start free trial
          </Button>
        </div>
      ) : null}
    </div>
  );
}
