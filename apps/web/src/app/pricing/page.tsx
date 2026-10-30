'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AppStoreBadges, StarRating } from '@reservations/ui';
import {
  annualBillingAppliesToPlan,
  formatPlanDollars,
  formatPlanDuration,
  getAnnualSavingsPercentFromSettings,
  getPlanDiscountLabel,
  getPlanPriceDisplay,
  isStandardMonthlyDuration,
  normalizeAnnualBillingSettings,
  planForBillingPeriod,
  type AnnualBillingSettings,
} from '@reservations/shared';
import { getDashboardUrl } from '@/lib/urls';
import { PRICING_FAQ } from '@/lib/partnerMarketing';
import {
  CheckOutlined,
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
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface PlanFeature {
  name: string;
  basic: boolean | string;
  core: boolean | string;
  pro: boolean | string;
  /** Guest-facing listing tier. Defaults to false when omitted. */
  base?: boolean | string;
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
      { name: 'Tablevera profile and listing', base: true, basic: true, core: true, pro: true },
      { name: 'Booking widget for your website', base: true, basic: true, core: true, pro: true },
      { name: 'Review management', base: true, basic: true, core: true, pro: true },
      { name: 'Booking integrations (100+ sites & apps)', base: true, basic: true, core: true, pro: true },
      { name: "Google's 'Reserve a table' button", base: true, basic: true, core: true, pro: true },
      { name: 'Notify Me (waitlist for fully booked nights)', base: true, basic: true, core: true, pro: true },
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
      { name: 'Mobile app with floor plan', basic: false, core: true, pro: true },
      { name: 'Automated reservation messages', base: true, basic: true, core: true, pro: true },
    ],
  },
  {
    title: 'Build guest relationships',
    icon: <StarOutlined />,
    features: [
      { name: 'Guest database, tags and notes', base: true, basic: true, core: true, pro: true },
      { name: '360 guest profiles', basic: false, core: true, pro: true },
      { name: 'Real-time guest spend alerts', basic: false, core: true, pro: true },
      { name: 'Two-way messaging', basic: false, core: true, pro: true },
      { name: 'Pre-shift report', basic: false, core: false, pro: true },
      { name: 'Automated guest tags', basic: false, core: false, pro: true },
      { name: 'Custom post-dining surveys', basic: false, core: false, pro: true },
    ],
  },
  {
    title: 'Payments & security',
    icon: <SafetyOutlined />,
    features: [
      { name: 'Deposits and credit card holds', base: true, basic: true, core: true, pro: true },
      { name: 'No-show fees', base: true, basic: true, core: true, pro: true },
      { name: 'PCI-compliant payment processing', base: true, basic: true, core: true, pro: true },
      { name: 'Ticketed events & experiences', basic: false, core: true, pro: true },
    ],
  },
  {
    title: 'Reporting & analytics',
    icon: <BarChartOutlined />,
    features: [
      { name: 'Standard reporting', base: true, basic: true, core: true, pro: true },
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
      { name: 'Promotion & offer management', basic: false, core: false, pro: true },
    ],
  },
  {
    title: 'Support & onboarding',
    icon: <MobileOutlined />,
    features: [
      { name: 'Online help center', base: true, basic: true, core: true, pro: true },
      { name: 'Email support', base: true, basic: true, core: true, pro: true },
      { name: 'Phone support', basic: false, core: true, pro: true },
      { name: 'Dedicated account manager', basic: false, core: false, pro: true },
      { name: 'Priority onboarding', basic: false, core: false, pro: true },
    ],
  },
];

const faqItems = PRICING_FAQ.map((item, index) => ({
  key: String(index + 1),
  label: item.question,
  children: item.answer,
}));

const PLAN_ORDER = ['basic', 'core', 'pro'] as const;
const DEFAULT_MAX_VISIBLE_PLAN_CARDS = 3;
const MIN_MAX_VISIBLE_PLAN_CARDS = 1;
const MAX_MAX_VISIBLE_PLAN_CARDS = 6;

function normalizeMaxVisiblePlanCards(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_VISIBLE_PLAN_CARDS;
  return Math.min(
    MAX_MAX_VISIBLE_PLAN_CARDS,
    Math.max(MIN_MAX_VISIBLE_PLAN_CARDS, Math.round(n)),
  );
}

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
    'In-house and online waitlist',
    '360° guest profiles',
  ],
  pro: [
    'Advanced guest insights',
    'Revenue forecasting',
    'Custom report builder',
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
    return (
      <span aria-label="Not included" style={{ color: '#d0cbc2', fontSize: 16, lineHeight: 1 }}>
        —
      </span>
    );
  }
  return (
    <div component="FeatureValue" style={{ display: 'contents' }}>
      <Text style={{ fontSize: 13, color: '#0b3d2e', fontWeight: 500 }}>{value}</Text>
    </div>
  );
}

const DASHBOARD_URL = getDashboardUrl();

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
  durationUnit?: string | null;
  durationCount?: number | null;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  visibleOnPricing: boolean;
  isCustom: boolean;
  highlights?: string[] | null;
};

function featureValueForPlan(feature: PlanFeature, plan: ApiPlan): boolean | string {
  if (plan.key === 'basic') return feature.basic;
  if (plan.key === 'core') return feature.core;
  if (plan.key === 'pro') return feature.pro;
  if (plan.key === 'base') return feature.base ?? false;
  // Custom packages (Unlimited, etc.) include everything in Pro.
  return feature.pro;
}

const FALLBACK_PLANS: ApiPlan[] = [
  {
    key: 'base',
    name: 'Base',
    description: 'Stay listed with no monthly fee. A higher cover fee applies to each seated guest.',
    monthlyPriceCents: 0,
    networkCoverFeeCents: 350,
    websiteCoverFeeCents: 350,
    trialDays: 0,
    visibleOnPricing: true,
    isCustom: false,
    highlights: [
      'Public Tablevera listing',
      'Online reservations',
      '$0 monthly subscription',
    ],
  },
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
    highlights: [...PLAN_HIGHLIGHTS.basic],
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
    highlights: [...PLAN_HIGHLIGHTS.core],
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
    highlights: [...PLAN_HIGHLIGHTS.pro],
  },
];

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function compactPriceLabel(
  plan: ApiPlan,
  billingPeriod: BillingPeriod,
  annualBilling: AnnualBillingSettings,
): string {
  const display = getPlanDisplay(plan, billingPeriod, annualBilling);
  const suffix = display.primarySuffix.includes('year') ? '/yr' : '/mo';
  return `${formatPlanDollars(display.primaryCents)}${suffix}`;
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

function getPlanCoverFees(plan: ApiPlan): { network: string; website: string } {
  const network = `${formatDollars(plan.networkCoverFeeCents)} per network cover`;
  let website: string;
  if (plan.websiteCoverFeeCents === 0) {
    website = 'Website reservations: FREE';
  } else if (plan.key === 'basic') {
    website = `${formatDollars(plan.websiteCoverFeeCents)} per website cover (or $19/mo unlimited)`;
  } else {
    website = `${formatDollars(plan.websiteCoverFeeCents)} per website cover`;
  }
  return { network, website };
}

function getFinePrint(
  display: ReturnType<typeof getPlanPriceDisplay>,
  plan: ApiPlan,
  billingPeriod: BillingPeriod,
): string {
  const durationLabel = formatPlanDuration(plan.durationUnit, plan.durationCount);
  const standardMonthly = isStandardMonthlyDuration(plan.durationUnit, plan.durationCount);
  if (
    billingPeriod === 'annual' &&
    standardMonthly &&
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
    const suffix = standardMonthly ? '/mo' : ` per ${durationLabel}`;
    return `${plan.trialDays}-day free trial, then ${afterTrial}${suffix}. Cancel anytime.`;
  }
  if (!standardMonthly) {
    return `Billed every ${durationLabel}. Cancel anytime.`;
  }
  return 'Month-to-month billing. Cancel anytime.';
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('core');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: plansData } = useQuery(PLANS);

  const annualBilling: AnnualBillingSettings = useMemo(
    () =>
      normalizeAnnualBillingSettings(
        (plansData as { annualBillingSettings?: AnnualBillingSettings })?.annualBillingSettings,
      ),
    [plansData],
  );
  const showPricingComparisonTable =
    (plansData as { showPricingComparisonTable?: boolean })?.showPricingComparisonTable === true;
  const maxVisiblePlanCards = normalizeMaxVisiblePlanCards(
    (plansData as { maxVisiblePricingPackages?: number })?.maxVisiblePricingPackages,
  );

  const allPlans: ApiPlan[] =
    ((plansData as { plans?: ApiPlan[] })?.plans?.length
      ? (plansData as { plans: ApiPlan[] }).plans
      : FALLBACK_PLANS);

  const visiblePlans = useMemo(
    () => allPlans.filter((p) => p.visibleOnPricing !== false),
    [allPlans],
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

  const gridColumns = `minmax(200px, 1.5fr) repeat(${visiblePlans.length}, minmax(110px, 1fr))`;
  const coreColumnIndex = visiblePlans.findIndex((plan) => plan.key === 'core');

  const updateCarouselOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(maxScroll > 8 && el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    updateCarouselOverflow();
    const onScroll = () => updateCarouselOverflow();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [updateCarouselOverflow, visiblePlans.length]);

  const scrollPlans = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>('.pricing-plan-carousel__item');
    const delta = item
      ? item.getBoundingClientRect().width + 20
      : el.clientWidth / maxVisiblePlanCards;
    el.scrollBy({ left: direction * delta, behavior: 'smooth' });
  };

  const showCarouselNav =
    visiblePlans.length > maxVisiblePlanCards || canScrollLeft || canScrollRight;
  const visibleCardCount = Math.max(1, Math.min(maxVisiblePlanCards, visiblePlans.length));

  const startTrial = (plan: string = selectedPlan) => {
    window.open(
      `${DASHBOARD_URL}/register?plan=${encodeURIComponent(plan)}&billing=${billingPeriod}`,
      '_blank',
    );
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
            30-day free trial on paid plans · No contracts · Free website bookings on Core &amp; Pro
          </Paragraph>
          <Space size={[24, 12]} wrap style={{ justifyContent: 'center' }}>
            <Space size={8}>
              <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.85)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.9)' }}>30-day trial on paid plans</Text>
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
        <div className="pricing-toolbar">
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

        {/* Pricing cards — extra packages scroll when more than the admin cap */}
        <div>
          <div className="pricing-plan-carousel">
            {showCarouselNav ? (
              <Button
                className="pricing-plan-carousel__btn pricing-plan-carousel__btn--prev"
                shape="circle"
                aria-label="Show previous packages"
                icon={<LeftOutlined />}
                disabled={!canScrollLeft}
                onClick={() => scrollPlans(-1)}
              />
            ) : null}
            <div
              ref={scrollerRef}
              className="pricing-plan-carousel__scroller"
              data-count={visiblePlans.length}
              style={{ ['--pricing-visible-cards' as string]: String(visibleCardCount) }}
              role="list"
            >
              {visiblePlans.map((plan) => {
            const isCore = plan.key === 'core';
            const planKey = plan.key as PlanKey;
            const description =
              plan.description?.trim() || PLAN_BLURBS[planKey] || 'Built for your restaurant.';
            const ctaLabel = plan.trialDays > 0 ? 'Start free trial' : 'Choose plan';
            const highlights = Array.isArray(plan.highlights)
              ? plan.highlights
              : (PLAN_HIGHLIGHTS[planKey] ?? []);
            const display = getPlanDisplay(plan, billingPeriod, annualBilling);
            const badge = getDiscountBadge(display, plan, isCore, billingPeriod, annualBilling);
            const finePrint = getFinePrint(display, plan, billingPeriod);
            const coverFees = getPlanCoverFees(plan);
            const showStrike =
              display.showStrikethrough && display.originalCents != null && display.originalCents > 0;
            const strikeLabel =
              display.primarySuffix === ' / first month'
                ? `${formatPlanDollars(display.originalCents!)}/mo`
                : billingPeriod === 'annual' || display.primarySuffix.includes('year')
                  ? `${formatPlanDollars(display.originalCents!)}/yr`
                  : formatPlanDollars(display.originalCents!);
            const priceSuffix = display.primarySuffix.includes('year')
              ? '/yr'
              : display.primarySuffix === ' / first month'
                ? '/first mo'
                : '/mo';

            return (
              <div key={plan.key} className="pricing-plan-carousel__item" role="listitem">
                <div
                  className={`pricing-plan-card${isCore ? ' pricing-plan-card--featured pricing-core-card' : ''}${selectedPlan === plan.key ? ' is-selected' : ''}`}
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
                      <span className="pricing-plan-card__price-suffix">{priceSuffix}</span>
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

                  <p className="pricing-plan-card__section-label">Cover fees</p>
                  <ul className="pricing-plan-card__features pricing-plan-card__cover-fees">
                    <li className="pricing-plan-card__feature">
                      <CheckOutlined className="pricing-plan-card__check" />
                      <span>{coverFees.network}</span>
                    </li>
                    <li className="pricing-plan-card__feature">
                      <CheckOutlined className="pricing-plan-card__check" />
                      <span>{coverFees.website}</span>
                    </li>
                  </ul>

                  {highlights.length > 0 ? (
                    <>
                      <p className="pricing-plan-card__section-label">Includes</p>
                      <ul className="pricing-plan-card__features">
                        {highlights.map((item) => (
                          <li key={item} className="pricing-plan-card__feature">
                            <CheckOutlined className="pricing-plan-card__check" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
            </div>
            {showCarouselNav ? (
              <Button
                className="pricing-plan-carousel__btn pricing-plan-carousel__btn--next"
                shape="circle"
                aria-label="Show next packages"
                icon={<RightOutlined />}
                disabled={!canScrollRight}
                onClick={() => scrollPlans(1)}
              />
            ) : null}
          </div>
        </div>

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
              Network cover fees apply only when diners discover your restaurant on Tablevera&apos;s
              network (website, app, or affiliates). Phone and walk-in bookings are never charged.
              Website-widget covers are free on Core and Pro; Base and Basic list a per-cover
              website fee below.{' '}
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
                <StarRating value={5} size={16} aria-label="Rated 5 out of 5" />
              </div>
            </Col>
          </Row>
        </Card>

        {/* Feature comparison — admin-gated; default off */}
        {showPricingComparisonTable ? (
        <div>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
            Compare all features
          </Title>
          <Paragraph style={{ textAlign: 'center', marginBottom: 32, color: '#5a554d' }}>
            Included or not — every plan, side by side.
          </Paragraph>

          <Card className="pricing-compare-desktop" styles={{ body: { padding: 0 } }}>
            <div className="pricing-compare-scroll">
            <div
              className="pricing-compare-grid pricing-compare__head"
              style={{ gridTemplateColumns: gridColumns }}
            >
              <Text strong className="pricing-compare__feature">
                Features
              </Text>
              {visiblePlans.map((plan, idx) => (
                <div
                  key={plan.key}
                  className={`pricing-compare__plan${idx === coreColumnIndex ? ' is-core' : ''}`}
                >
                  <span className="pricing-compare__plan-name">{plan.name}</span>
                  <span className="pricing-compare__plan-price">
                    {compactPriceLabel(plan, billingPeriod, annualBilling)}
                  </span>
                </div>
              ))}
            </div>

            {featureCategories.map((category) => (
              <div key={category.title}>
                <div className="pricing-compare__cat">
                  <Space>
                    <span>{category.icon}</span>
                    <span>{category.title}</span>
                  </Space>
                </div>

                {category.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="pricing-compare-grid pricing-compare__row"
                    style={{ gridTemplateColumns: gridColumns }}
                  >
                    <Text className="pricing-compare__feature">{feature.name}</Text>
                    {visiblePlans.map((plan, idx) => (
                      <div
                        key={plan.key}
                        className={`pricing-compare__cell${idx === coreColumnIndex ? ' is-core' : ''}`}
                      >
                        <FeatureValue value={featureValueForPlan(feature, plan)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            <div
              className="pricing-compare-grid pricing-compare__foot"
              style={{ gridTemplateColumns: gridColumns }}
            >
              <div className="pricing-compare__feature" />
              {visiblePlans.map((plan, idx) => (
                <div
                  key={plan.key}
                  className={`pricing-compare__cell${idx === coreColumnIndex ? ' is-core' : ''}`}
                >
                  <Button
                    type={plan.key === 'core' ? 'primary' : 'default'}
                    size="small"
                    style={
                      plan.key === 'core'
                        ? { background: '#0b3d2e', borderColor: '#0b3d2e' }
                        : { borderColor: '#0b3d2e', color: '#0b3d2e' }
                    }
                    onClick={() => startTrial(plan.key)}
                  >
                    Get {plan.name}
                  </Button>
                </div>
              ))}
            </div>
            </div>
          </Card>

          <div className="pricing-compare-mobile">
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              {visiblePlans.map((plan) => (
                <Card key={plan.key} style={{ borderRadius: 12 }} title={`${plan.name} plan`}>
                  {featureCategories.map((category) => (
                    <div key={category.title} style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {category.title}
                      </Text>
                      {category.features.map((feature) => (
                        <div
                          key={feature.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '8px 0',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        >
                          <Text style={{ flex: 1 }}>{feature.name}</Text>
                          <FeatureValue value={featureValueForPlan(feature, plan)} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <Button
                    type={plan.key === 'core' ? 'primary' : 'default'}
                    block
                    style={
                      plan.key === 'core'
                        ? { background: '#0b3d2e', borderColor: '#0b3d2e' }
                        : { borderColor: '#0b3d2e', color: '#0b3d2e' }
                    }
                    onClick={() => startTrial(plan.key)}
                  >
                    Get {plan.name}
                  </Button>
                </Card>
              ))}
            </Space>
          </div>
        </div>
        ) : null}

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
          <Link href="/contact?topic=restaurant">
            <Button
              type="primary"
              size="large"
              style={{ background: '#0b3d2e', borderColor: '#0b3d2e' }}
            >
              Contact sales
            </Button>
          </Link>
        </Card>

        {/* FAQ */}
        <div className="pricing-faq">
          <Title level={2} className="pricing-faq__title">
            Frequently asked questions
          </Title>
          <Paragraph className="pricing-faq__lede">
            Trials, billing, and what each plan includes.
          </Paragraph>
          <Collapse
            className="pricing-faq__list"
            items={faqItems}
            bordered={false}
            expandIconPlacement="end"
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
          <div style={{ marginTop: 28 }}>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>
              Partner app — Android is live. iPhone is coming soon.
            </Paragraph>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <AppStoreBadges app="partner" tone="dark" size="sm" />
            </div>
          </div>
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
