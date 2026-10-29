'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@/lib/apollo-hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CrownOutlined,
  DesktopOutlined,
  DollarOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  MinusOutlined,
  PhoneOutlined,
  RightOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPlanDiscountLabel, type FailToPayStage } from '@reservations/shared';
import { BillingEnforcementBanner } from '@/components/BillingEnforcementBanner';
import {
  EmptyState,
  PageHeader,
  PlanPrice,
  StatCard,
  colors,
  radii,
  spacing,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageBilling } from '@/lib/roles';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  MY_RESTAURANTS,
  MY_SUBSCRIPTION,
  PLANS,
  COVER_FEE_SUMMARY,
  RESTAURANT_INVOICES,
  CREATE_SUBSCRIPTION,
  CANCEL_SUBSCRIPTION,
  DELETE_MY_RESTAURANT,
  REACTIVATE_SUBSCRIPTION,
  CHANGE_PLAN,
  PREVIEW_PLAN_CHANGE,
  CANCEL_PENDING_PLAN_CHANGE,
  SET_PREMIUM_SMS_ADDON,
  PLAN_CHANGE_PAYMENT,
  CONFIRM_PLAN_CHANGE_PAYMENT,
  PLATFORM_FEATURE_FLAGS,
  RESTAURANT_OPEN_INVOICE_COUNT,
} from '@/lib/graphql';
import { SignupPaymentForm, type SignupPaymentMode } from '@/components/SignupPaymentForm';
import { PartnerInvoiceDetail } from '@/components/PartnerInvoiceDetail';
import { VirtualRoomAddonCard } from '@/components/VirtualRoomAddonCard';

const { Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  trialing: 'blue',
  active: 'green',
  past_due: 'orange',
  cancelled: 'red',
  paused: 'default',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  upcoming: 'blue',
  pending: 'gold',
  overdue: 'red',
  paid: 'green',
  canceled: 'default',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  pending: 'Due',
  overdue: 'Overdue',
  paid: 'Paid',
  canceled: 'Canceled',
};

const FEATURE_LABELS: Record<string, string> = {
  floorPlans: 'Customizable floor plans',
  smartAssign: 'Smart Assign',
  waitlist: 'Waitlist',
  premiumSms: 'Premium SMS messaging',
  premiumSmsAddon: 'Premium SMS add-on',
  guestProfiles360: '360 guest profiles',
  emailCampaigns: 'Automated email campaigns',
  customWidget: 'Customizable booking widget',
  analytics: 'Advanced analytics',
  dedicatedSupport: 'Dedicated account manager',
  accessRules: 'Access Rules',
  posIntegration: 'POS integration',
  twoWayMessaging: 'Two-way messaging',
  spendAlerts: 'Guest spend alerts',
  ticketedEvents: 'Ticketed events & experiences',
  preShift: 'Pre-shift reports',
  autoTags: 'Automated guest tags',
  surveys: 'Custom post-dining surveys',
  revenueForecasting: 'Revenue forecasting',
  customReports: 'Custom report builder',
  multiLocationAnalytics: 'Multi-location analytics',
  promotions: 'Promotion & offer management',
  featuredPlacement: 'Featured placement',
  boostCampaigns: 'Boost campaigns',
  threeDView: '3D view',
};

const PLAN_BLURBS: Record<string, string> = {
  base: 'Stay listed with no monthly fee. A higher cover fee applies to each seated guest.',
  basic: 'Essential reservation management to get started with online bookings.',
  core: 'Best-in-class table management to maximize seatings and streamline operations.',
  pro: 'Our most comprehensive plan with relationship management and data tools.',
};

type PlanRecord = {
  key: string;
  name: string;
  description?: string | null;
  monthlyPriceCents: number;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  trialDays: number;
  visibleOnPricing?: boolean | null;
  isCustom?: boolean | null;
  features?: Record<string, boolean | null>;
  originalMonthlyPriceCents?: number | null;
  discountType?: string | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  annualFreeMonths?: number | null;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function featureLabel(key: string) {
  return (
    FEATURE_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
  );
}

function isPartnerSelectablePlan(plan: PlanRecord) {
  if (plan.key === 'free') return false;
  if (plan.visibleOnPricing === false) return false;
  return true;
}

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : status;
}

function enabledFeatureEntries(
  features: Record<string, boolean | null | undefined> | null | undefined,
  opts?: { hideAddonWhenIncluded?: boolean },
) {
  if (!features) return [];
  const premiumSms = Boolean(features.premiumSms);
  return Object.entries(features).filter(([key, enabled]) => {
    if (key === '__typename' || !enabled) return false;
    if (opts?.hideAddonWhenIncluded && key === 'premiumSmsAddon' && premiumSms) return false;
    return true;
  });
}

function PlanFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <div style={{ fontSize: 15, color: colors.textPrimary, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

function PlanPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: '100%',
        padding: spacing.md,
        borderRadius: radii.md,
        background: colors.neutral[50],
        border: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Space size={8} style={{ marginBottom: spacing.sm }}>
        {icon ? <span style={{ color: colors.brand[600] }}>{icon}</span> : null}
        <Text strong>{title}</Text>
      </Space>
      {children}
    </div>
  );
}

function UsageMetric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 110,
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: radii.md,
        background: colors.neutral[0],
        border: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.2,
          color: emphasize ? colors.brand[700] : colors.textPrimary,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SourceRow({
  icon,
  source,
  covers,
  feeCents,
}: {
  icon: ReactNode;
  source: string;
  covers: number;
  feeCents: number;
}) {
  const active = covers > 0 || feeCents > 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: `1px solid ${colors.bordersubtle}`,
        opacity: active ? 1 : 0.55,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? colors.brand[50] : colors.neutral[100],
          color: active ? colors.brand[600] : colors.neutral[500],
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Text style={{ flex: 1, minWidth: 0, fontWeight: active ? 600 : 400 }}>{source}</Text>
      <Text type="secondary" style={{ width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {covers}
      </Text>
      <Text
        strong={active}
        style={{
          width: 72,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: active ? colors.textPrimary : colors.textTertiary,
        }}
      >
        {formatCents(feeCents)}
      </Text>
    </div>
  );
}

type PartnerInvoice = {
  id: string;
  number: string;
  status: string;
  billingPeriod: string;
  currency?: string | null;
  subtotalCents?: number | null;
  totalCents: number;
  originalTotalCents?: number | null;
  isDiscounted?: boolean | null;
  dueDate: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  notes?: string | null;
  payUrl?: string | null;
  createdAt?: string | null;
  lines?: Array<{
    description: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
    originalAmountCents?: number | null;
  }> | null;
};

const INVOICE_LIST_PREVIEW = 3;
const PLAN_FEATURE_PREVIEW = 6;
const FEATURE_DELTA_PREVIEW = 8;

type PlanChangeDraft = {
  plan: string;
  planName: string;
  currentPlanName: string;
  isUpgrade: boolean;
  effective: string;
  proratedChargeCents: number;
  currentMonthlyPriceCents: number;
  nextMonthlyPriceCents: number;
  currentNetworkCoverFeeCents: number;
  nextNetworkCoverFeeCents: number;
  currentWebsiteCoverFeeCents: number;
  nextWebsiteCoverFeeCents: number;
  featuresGained: string[];
  featuresLost: string[];
  clearsCancel: boolean;
  showWebsiteCover: boolean;
};

function PlanPriceTile({
  eyebrow,
  name,
  monthlyCents,
  networkCents,
  websiteCents,
  emphasize,
}: {
  eyebrow: string;
  name: string;
  monthlyCents: number;
  networkCents: number;
  websiteCents: number | null;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: radii.md,
        background: emphasize ? colors.neutral[0] : colors.neutral[50],
        border: `1px solid ${emphasize ? colors.brand[200] : colors.bordersubtle}`,
      }}
    >
      <Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {eyebrow}
      </Text>
      <Text strong style={{ display: 'block', marginTop: 4 }}>
        {name}
      </Text>
      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: emphasize ? colors.brand[700] : colors.textPrimary,
        }}
      >
        {formatCents(monthlyCents)}
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>/mo</span>
      </div>
      <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
        Network cover {formatCents(networkCents)}
      </Text>
      {websiteCents != null ? (
        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
          Website cover {websiteCents === 0 ? 'Free' : formatCents(websiteCents)}
        </Text>
      ) : null}
    </div>
  );
}

function FeatureDeltaList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'gain' | 'lose';
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, FEATURE_DELTA_PREVIEW);
  const iconColor = tone === 'gain' ? colors.success : colors.error;
  const Icon = tone === 'gain' ? CheckOutlined : MinusOutlined;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text strong>{title}</Text>
        <Tag color={tone === 'gain' ? 'success' : 'error'} style={{ marginInlineEnd: 0 }}>
          {items.length}
        </Tag>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          columnGap: 16,
          rowGap: 6,
          maxHeight: expanded ? 220 : undefined,
          overflowY: expanded ? 'auto' : undefined,
        }}
      >
        {visible.map((label, index) => (
          <div key={`${label}-${index}`} style={{ display: 'flex', gap: 8, minWidth: 0 }}>
            <Icon style={{ color: iconColor, marginTop: 4, fontSize: 12, flexShrink: 0 }} />
            <Text style={{ fontSize: 13, lineHeight: 1.45 }}>{label}</Text>
          </div>
        ))}
      </div>
      {items.length > FEATURE_DELTA_PREVIEW ? (
        <Button
          type="link"
          size="small"
          style={{ paddingInline: 0, marginTop: 4 }}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Show less' : `Show all ${items.length}`}
        </Button>
      ) : null}
    </div>
  );
}

function TimingOption({
  selected,
  title,
  detail,
  badge,
  tone,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  badge?: string;
  tone: 'safe' | 'now';
  onSelect: () => void;
}) {
  const activeBorder = tone === 'now' ? colors.warning : colors.brand[400];
  const activeBg = tone === 'now' ? colors.warningBg : colors.brand[50];
  const rail = tone === 'now' ? colors.warning : colors.brand[600];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: radii.md,
        border: `1px solid ${selected ? activeBorder : colors.border}`,
        background: selected ? activeBg : colors.neutral[0],
        boxShadow: selected ? `inset 3px 0 0 ${rail}` : undefined,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text strong>{title}</Text>
        {badge ? (
          <Tag color="green" style={{ marginInlineEnd: 0 }}>
            {badge}
          </Tag>
        ) : null}
      </div>
      <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13, lineHeight: 1.45 }}>
        {detail}
      </Text>
    </button>
  );
}

function InvoiceListRow({
  invoice,
  selected,
  onSelect,
}: {
  invoice: PartnerInvoice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 14px',
        border: `1px solid ${selected ? colors.brand[300] : colors.bordersubtle}`,
        borderRadius: radii.md,
        background: selected ? colors.brand[50] : colors.neutral[0],
        boxShadow: selected ? `inset 3px 0 0 ${colors.brand[600]}` : undefined,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text strong style={{ color: colors.textPrimary }}>
            {dayjs(invoice.billingPeriod).format('MMM YYYY')}
          </Text>
          <Tag
            color={INVOICE_STATUS_COLORS[invoice.status] ?? 'default'}
            style={{ marginInlineEnd: 0 }}
          >
            {INVOICE_STATUS_LABELS[invoice.status] ?? statusLabel(invoice.status)}
          </Tag>
        </div>
        <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>
          {invoice.number}
          {' · '}
          {invoice.status === 'paid' && invoice.paidAt
            ? `Paid ${dayjs(invoice.paidAt).format('MMM D, YYYY · h:mm A')}`
            : invoice.status === 'overdue'
              ? `Overdue · was due ${dayjs(invoice.dueDate).format('MMM D, YYYY')}`
              : `Due ${dayjs(invoice.dueDate).format('MMM D, YYYY')}`}
        </Text>
      </div>
      <Text
        strong
        style={{
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          color:
            invoice.status === 'overdue'
              ? colors.error
              : invoice.status === 'paid'
                ? colors.success
                : colors.textPrimary,
        }}
      >
        {formatCents(invoice.totalCents)}
      </Text>
      <RightOutlined style={{ color: colors.neutral[400], fontSize: 12, flexShrink: 0 }} />
    </button>
  );
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(() => dayjs().format('YYYY-MM'));
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const { data: restData, refetch: refetchRestaurants } = useQuery(MY_RESTAURANTS, {
    skip: !user,
  });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, setRestaurantId, restaurantSelectProps } =
    usePartnerRestaurant(restaurants);
  const activeRestaurant = restaurants.find(
    (r: { id: string; name?: string }) => r.id === activeRestaurantId,
  ) as { id: string; name?: string } | undefined;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const { data: subData, loading: subLoading, refetch: refetchSub } = useQuery(
    MY_SUBSCRIPTION,
    { variables: { restaurantId: activeRestaurantId }, skip: !activeRestaurantId },
  );
  const { data: plansData } = useQuery(PLANS);
  const { data: featureFlagsData } = useQuery(PLATFORM_FEATURE_FLAGS);
  const smsEnabled = featureFlagsData?.platformFeatureFlags?.sms !== false;
  const { data: feesData, loading: feesLoading } = useQuery(COVER_FEE_SUMMARY, {
    variables: { restaurantId: activeRestaurantId, period },
    skip: !activeRestaurantId,
  });
  const { data: invoiceData, loading: invoiceLoading } = useQuery(RESTAURANT_INVOICES, {
    variables: { restaurantId: activeRestaurantId, limit: 24, offset: 0 },
    skip: !activeRestaurantId,
  });
  const { data: openInvoiceCountData } = useQuery(RESTAURANT_OPEN_INVOICE_COUNT, {
    variables: { restaurantId: activeRestaurantId },
    skip: !activeRestaurantId,
  });

  const [createSubscription, { loading: creating }] = useMutation(CREATE_SUBSCRIPTION);
  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION);
  const [deleteMyRestaurant, { loading: deletingRestaurant }] = useMutation(
    DELETE_MY_RESTAURANT,
  );
  const [reactivateSubscription, { loading: reactivating }] = useMutation(REACTIVATE_SUBSCRIPTION);
  const [changePlan, { loading: changing }] = useMutation(CHANGE_PLAN);
  const [cancelPendingPlan, { loading: cancellingPending }] = useMutation(CANCEL_PENDING_PLAN_CHANGE);
  const [previewPlanChange] = useLazyQuery(PREVIEW_PLAN_CHANGE);
  const [loadPlanChangePayment] = useLazyQuery(PLAN_CHANGE_PAYMENT);
  const [confirmPlanPayment] = useMutation(CONFIRM_PLAN_CHANGE_PAYMENT);
  const [setPremiumSmsAddon, { loading: togglingSms }] = useMutation(SET_PREMIUM_SMS_ADDON);
  const [upgradePayment, setUpgradePayment] = useState<{
    clientSecret: string;
    paymentMode: SignupPaymentMode;
    planName: string;
    monthlyLabel: string;
    amountDueCents: number;
  } | null>(null);
  const [planChange, setPlanChange] = useState<PlanChangeDraft | null>(null);
  const [planChangeTiming, setPlanChangeTiming] = useState<'period_end' | 'now'>('period_end');

  const subscription = subData?.mySubscription;
  const plans = useMemo(
    () => ((plansData?.plans ?? []) as PlanRecord[]).filter(isPartnerSelectablePlan),
    [plansData?.plans],
  );
  const summary = feesData?.coverFeeSummary;
  const invoices = useMemo(
    () => (invoiceData?.restaurantInvoices?.items ?? []) as PartnerInvoice[],
    [invoiceData?.restaurantInvoices?.items],
  );
  const visibleInvoices = showAllInvoices
    ? invoices
    : invoices.slice(0, INVOICE_LIST_PREVIEW);
  const selectedInvoice =
    invoices.find((inv) => inv.id === selectedInvoiceId) ?? null;
  const currentPlanMeta = plans.find((p) => p.key === subscription?.plan);

  useEffect(() => {
    setShowAllInvoices(false);
    setSelectedInvoiceId(null);
  }, [activeRestaurantId]);

  useEffect(() => {
    const fromUrl = searchParams.get('invoice');
    if (!fromUrl || invoices.length === 0) return;
    if (invoices.some((inv) => inv.id === fromUrl)) {
      setSelectedInvoiceId(fromUrl);
      const match = invoices.find((inv) => inv.id === fromUrl);
      if (match?.billingPeriod) setPeriod(match.billingPeriod);
    }
  }, [searchParams, invoices]);

  const openInvoice = (invoice: PartnerInvoice) => {
    setSelectedInvoiceId(invoice.id);
    setPeriod(invoice.billingPeriod);
    const params = new URLSearchParams(searchParams.toString());
    params.set('invoice', invoice.id);
    router.replace(`/billing?${params.toString()}`, { scroll: false });
  };

  const closeInvoice = () => {
    setSelectedInvoiceId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('invoice');
    const qs = params.toString();
    router.replace(qs ? `/billing?${qs}` : '/billing', { scroll: false });
  };

  const handleSubscribe = async (plan: string) => {
    if (!activeRestaurantId) return;
    try {
      const { data } = await createSubscription({
        variables: { restaurantId: activeRestaurantId, plan },
      });
      const payload = data?.createSubscription;
      await refetchSub();
      const target = plans.find((p) => p.key === plan);
      if (payload?.clientSecret) {
        setUpgradePayment({
          clientSecret: payload.clientSecret,
          paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
          planName: target?.name ?? plan,
          monthlyLabel: formatCents(payload.monthlyPriceCents ?? target?.monthlyPriceCents ?? 0),
          amountDueCents: 0,
        });
        return;
      }
      message.success(
        target?.trialDays
          ? `${target.name} started with a ${target.trialDays}-day trial`
          : `Subscribed to ${target?.name ?? plan}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not start subscription');
    }
  };

  const handleCancel = () => {
    const paidThrough = subscription?.currentPeriodEnd
      ? dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')
      : 'the end of this billing period';
    const planName =
      currentPlanMeta?.name ??
      String(subscription?.plan ?? 'your current plan').replace(/^./, (s: string) => s.toUpperCase());
    const basePlan = plans.find((p) => p.key === 'base');
    const baseName = basePlan?.name ?? 'Base';
    const baseMonthly = formatCents(basePlan?.monthlyPriceCents ?? 0);
    const baseCover = formatCents(basePlan?.networkCoverFeeCents ?? 350);
    const modal = Modal.confirm({
      title: 'Cancel at the end of this period?',
      width: 520,
      content: (
        <div>
          <Paragraph>
            You keep {planName} and your public listing through {paidThrough} (already paid). It will
            not renew after that. You can resume before then.
          </Paragraph>
          <Paragraph>
            After {paidThrough} this location becomes inactive. It is removed from public search and
            diners cannot book it until you choose a plan again.
          </Paragraph>
          <Paragraph type="secondary">
            To stay listed with no monthly fee, switch to {baseName} ({baseMonthly}/mo, {baseCover}{' '}
            cover fee) instead of cancelling.
          </Paragraph>
          {subscription?.plan !== 'base' ? (
            <Button
              onClick={() => {
                modal.destroy();
                void handleChangePlan('base');
              }}
            >
              Switch to {baseName}
            </Button>
          ) : null}
        </div>
      ),
      okText: 'Cancel at period end',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!activeRestaurantId) return;
        await cancelSubscription({
          variables: { restaurantId: activeRestaurantId, immediate: false },
        });
        message.success(
          `Cancellation scheduled. You stay listed through ${paidThrough}. After that this location is inactive and hidden from the public.`,
        );
        refetchSub();
      },
    });
  };

  const openDeleteRestaurant = () => {
    setDeleteConfirmName('');
    setDeleteConfirmOpen(true);
  };

  const handleDeleteRestaurant = async () => {
    if (!activeRestaurantId || !deleteNameMatches || hasPlatformDebt) return;
    try {
      const deletedId = activeRestaurantId;
      const res = await deleteMyRestaurant({ variables: { restaurantId: deletedId } });
      if (!res.data?.deleteMyRestaurant?.success) {
        message.error(res.data?.deleteMyRestaurant?.message ?? 'Could not delete restaurant');
        return;
      }
      setDeleteConfirmOpen(false);
      message.success('Restaurant deleted');
      const refreshed = await refetchRestaurants();
      const remaining = (refreshed.data?.myRestaurants ?? []) as { id: string }[];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('activeRestaurantId');
        if (saved === deletedId) localStorage.removeItem('activeRestaurantId');
      }
      if (remaining.length > 0) {
        setRestaurantId(remaining[0].id);
        router.replace('/billing');
      } else {
        router.replace('/onboarding');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete restaurant';
      message.error(msg);
    }
  };

  const handleCancelImmediately = () => {
    const basePlan = plans.find((p) => p.key === 'base');
    const baseName = basePlan?.name ?? 'Base';
    const baseCover = formatCents(basePlan?.networkCoverFeeCents ?? 350);
    const modal = Modal.confirm({
      title: 'Cancel immediately?',
      width: 520,
      content: (
        <div>
          <Paragraph>
            This location becomes inactive right away. It is removed from public search and diners
            cannot book it until you choose a plan again.
          </Paragraph>
          <Paragraph>
            The current period is not refunded. {baseName} keeps you listed at $0/mo with a {baseCover}{' '}
            cover fee.
          </Paragraph>
          {subscription?.plan !== 'base' ? (
            <Button
              onClick={() => {
                modal.destroy();
                void handleChangePlan('base');
              }}
            >
              Switch to {baseName}
            </Button>
          ) : null}
        </div>
      ),
      okText: 'Cancel now',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!activeRestaurantId) return;
        await cancelSubscription({
          variables: { restaurantId: activeRestaurantId, immediate: true },
        });
        message.success(
          'Subscription cancelled. This location is inactive and hidden from the public until you choose a plan.',
        );
        refetchSub();
      },
    });
  };

  const handleResume = async () => {
    if (!activeRestaurantId) return;
    try {
      await reactivateSubscription({ variables: { restaurantId: activeRestaurantId } });
      message.success('Subscription will renew again');
      refetchSub();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not resume subscription');
    }
  };

  const handleChangePlan = async (plan: string) => {
    if (!activeRestaurantId) return;
    try {
      const { data } = await previewPlanChange({
        variables: { restaurantId: activeRestaurantId, plan },
        fetchPolicy: 'network-only',
      });
      const preview = data?.previewPlanChange;
      if (!preview) {
        message.error('Could not load plan change details');
        return;
      }
      if (!preview.allowed) {
        Modal.warning({
          title: 'This plan change is not available',
          content: preview.blockedReason ?? 'You cannot switch to this plan right now.',
        });
        return;
      }

      const target = plans.find((p) => p.key === plan);
      const isUpgrade = preview.direction === 'upgrade';
      const effective = subscription?.currentPeriodEnd
        ? dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')
        : preview.effectiveAt
          ? dayjs(preview.effectiveAt).format('MMM D, YYYY')
          : 'the next billing date';
      setPlanChangeTiming(isUpgrade ? 'now' : 'period_end');
      setPlanChange({
        plan,
        planName: target?.name ?? plan,
        currentPlanName:
          currentPlanMeta?.name ??
          String(subscription?.plan ?? plan).replace(/^./, (s: string) => s.toUpperCase()),
        isUpgrade,
        effective,
        proratedChargeCents: preview.nextMonthlyPriceCents ?? 0,
        currentMonthlyPriceCents: preview.currentMonthlyPriceCents ?? 0,
        nextMonthlyPriceCents: preview.nextMonthlyPriceCents ?? 0,
        currentNetworkCoverFeeCents: preview.currentNetworkCoverFeeCents ?? 0,
        nextNetworkCoverFeeCents: preview.nextNetworkCoverFeeCents ?? 0,
        currentWebsiteCoverFeeCents: preview.currentWebsiteCoverFeeCents ?? 0,
        nextWebsiteCoverFeeCents: preview.nextWebsiteCoverFeeCents ?? 0,
        featuresGained: preview.featuresGained ?? [],
        featuresLost: preview.featuresLost ?? [],
        clearsCancel: Boolean(subscription?.cancelAtPeriodEnd),
        showWebsiteCover:
          preview.currentWebsiteCoverFeeCents !== preview.nextWebsiteCoverFeeCents,
      });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not change plan');
    }
  };

  const confirmPlanChange = async () => {
    if (!activeRestaurantId || !planChange) return;
    const immediate = planChangeTiming === 'now';
    try {
      const { data: changeData } = await changePlan({
        variables: { restaurantId: activeRestaurantId, plan: planChange.plan, immediate },
      });
      const payload = changeData?.changePlan;
      setPlanChange(null);
      refetchSub();
      if (payload?.clientSecret) {
        setUpgradePayment({
          clientSecret: payload.clientSecret,
          paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
          planName: planChange.planName,
          monthlyLabel: formatCents(planChange.nextMonthlyPriceCents),
          amountDueCents:
            payload.amountDueCents ||
            (immediate ? planChange.nextMonthlyPriceCents : 0),
        });
        return;
      }
      message.success(
        immediate
          ? `${planChange.planName} starts now`
          : `Switch to ${planChange.planName} scheduled for ${planChange.effective}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Could not change plan');
    }
  };

  const handleCancelPending = () => {
    if (!activeRestaurantId) return;
    Modal.confirm({
      title: 'Keep your current plan?',
      content: 'This cancels the scheduled downgrade. Nothing changes until you pick a new plan.',
      okText: 'Keep current plan',
      onOk: async () => {
        await cancelPendingPlan({ variables: { restaurantId: activeRestaurantId } });
        message.success('Scheduled plan change cancelled');
        refetchSub();
      },
    });
  };

  const handleTogglePremiumSms = async (enabled: boolean) => {
    if (!activeRestaurantId) return;
    try {
      await setPremiumSmsAddon({ variables: { restaurantId: activeRestaurantId, enabled } });
      message.success(`Premium SMS ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update Premium SMS add-on');
    } finally {
      refetchSub();
    }
  };

  const periodOptions = useMemo(() => {
    const months = new Set(
      Array.from({ length: 6 }, (_, i) => dayjs().subtract(i, 'month').format('YYYY-MM')),
    );
    for (const inv of invoices) {
      if (inv.billingPeriod) months.add(inv.billingPeriod);
    }
    months.add(period);
    return [...months]
      .sort((a, b) => b.localeCompare(a))
      .map((m) => ({ value: m, label: dayjs(m).format('MMMM YYYY') }));
  }, [invoices, period]);

  const coverBreakdown = summary
    ? [
        {
          source: 'Network',
          covers: summary.networkCovers,
          feeCents: summary.networkFeeCents ?? 0,
          icon: <GlobalOutlined />,
        },
        {
          source: 'Website',
          covers: summary.websiteCovers,
          feeCents: summary.websiteFeeCents ?? 0,
          icon: <DesktopOutlined />,
        },
        {
          source: 'Widget',
          covers: summary.widgetCovers,
          feeCents: summary.widgetFeeCents ?? 0,
          icon: <AppstoreOutlined />,
        },
        {
          source: 'Phone',
          covers: summary.phoneCovers,
          feeCents: summary.phoneFeeCents ?? 0,
          icon: <PhoneOutlined />,
        },
        {
          source: 'Walk-in',
          covers: summary.walkinCovers,
          feeCents: summary.walkinFeeCents ?? 0,
          icon: <TeamOutlined />,
        },
      ]
    : [];

  const smsIncludedInPlan = Boolean(subscription?.features?.premiumSms);
  const smsAddonEnabled = Boolean(subscription?.features?.premiumSmsAddon);
  const canEditBilling = Boolean(user && canManageBilling(user.role));
  const amountDueNow = Number(subscription?.amountDueCents ?? 0);
  const openInvoiceCount = Number(openInvoiceCountData?.restaurantOpenInvoiceCount ?? 0);
  const hasPlatformDebt =
    openInvoiceCount > 0 ||
    amountDueNow > 0 ||
    subscription?.status === 'past_due';
  const venueName = (activeRestaurant?.name ?? '').trim();
  const deleteNameMatches =
    Boolean(venueName) &&
    deleteConfirmName.trim().toLowerCase() === venueName.toLowerCase();
  const isCancelled = subscription?.status === 'cancelled';
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd) && !isCancelled;
  const showActiveSubscription = Boolean(subscription && !isCancelled);
  const isTrialing = subscription?.status === 'trialing' && amountDueNow <= 0;
  const isFreePlan = Boolean(subscription && subscription.monthlyPriceCents === 0 && amountDueNow <= 0);
  const upgradedThisPeriod = Boolean(
    subscription?.lastPaidPlanChangeAt &&
      subscription?.currentPeriodStart &&
      !dayjs(subscription.lastPaidPlanChangeAt).isBefore(dayjs(subscription.currentPeriodStart), 'day'),
  );
  const planDisplayName = currentPlanMeta?.name ?? String(subscription?.plan ?? '').replace(/^./, (s) => s.toUpperCase());
  const includedFeatures = enabledFeatureEntries(subscription?.features, {
    hideAddonWhenIncluded: true,
  }).filter(([key]) => smsEnabled || (key !== 'premiumSms' && key !== 'premiumSmsAddon'));
  const pendingPlanName = subscription?.pendingPlan
    ? (plans.find((p) => p.key === subscription.pendingPlan)?.name ?? subscription.pendingPlan)
    : null;
  const switchablePlans = plans.filter((p) => p.key !== subscription?.plan);
  const monthlyPriceLabel = formatCents(subscription?.monthlyPriceCents ?? 0);

  let planStory: string | null = null;
  if (subscription) {
    if (isTrialing && subscription.trialEndsAt) {
      planStory = `Free trial through ${dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}. First charge is ${monthlyPriceLabel} on that date.`;
    } else if (isFreePlan) {
      planStory = 'This location is on a free plan — there is no recurring subscription charge.';
    } else if (amountDueNow > 0) {
      planStory = `${formatCents(amountDueNow)} is due now for switching plans. After that, renewals are ${monthlyPriceLabel}/mo.`;
    } else if (cancelAtPeriodEnd && subscription.currentPeriodEnd) {
      planStory = `Cancels on ${dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}. You keep ${planDisplayName} until then. Resume to renew, or upgrade to start a new plan right away.`;
    } else if (subscription.pendingPlan && pendingPlanName) {
      const when = subscription.pendingPlanEffectiveAt
        ? dayjs(subscription.pendingPlanEffectiveAt).format('MMM D, YYYY')
        : 'the next renewal';
      planStory = `Switching to ${pendingPlanName} on ${when}. You keep ${planDisplayName} features until then.`;
    } else if (subscription.currentPeriodEnd) {
      planStory = `Next renewal ${dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')} for ${monthlyPriceLabel}.`;
      if (upgradedThisPeriod) {
        planStory += ' Today’s full-price charge already started this billing period.';
      }
    }
  }

  const openDuePayment = async () => {
    if (!activeRestaurantId || !subscription) return;
    const { data } = await loadPlanChangePayment({
      variables: { restaurantId: activeRestaurantId },
      fetchPolicy: 'network-only',
    });
    const payload = data?.planChangePayment;
    if (!payload?.clientSecret) {
      message.error('Could not start payment');
      return;
    }
    setUpgradePayment({
      clientSecret: payload.clientSecret,
      paymentMode: payload.paymentMode === 'setup' ? 'setup' : 'payment',
      planName: planDisplayName,
      monthlyLabel: formatCents(subscription.monthlyPriceCents),
      amountDueCents: payload.amountDueCents || amountDueNow,
    });
  };

  const periodToolbar = (
    <Select
      value={period}
      onChange={setPeriod}
      options={periodOptions}
      style={{ width: 180 }}
      aria-label="Billing period"
    />
  );

  return (
    <div component="BillingPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Billing"
          subtitle={
            activeRestaurant
              ? `Plan, invoices, and cover fees for ${activeRestaurant.name}`
              : 'Plan, invoices, and cover fees for this location'
          }
          extra={
            <Select
              style={{ width: 280 }}
              placeholder="Select restaurant"
              {...restaurantSelectProps}
            />
          }
        />

        {!activeRestaurantId ? (
          <EmptyState
            icon={<DollarOutlined />}
            title="Select a restaurant"
            description="Choose a location to view its subscription, invoices, and cover fees."
          />
        ) : subLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <Spin size="large" />
          </div>
        ) : showActiveSubscription ? (
          <>
            <BillingEnforcementBanner
              info={
                subscription?.billingEnforcement
                  ? {
                      stage: subscription.billingEnforcement.stage as FailToPayStage,
                      daysPastDue: subscription.billingEnforcement.daysPastDue,
                      outstandingCents: subscription.billingEnforcement.outstandingCents,
                      paused: subscription.billingEnforcement.paused,
                      publiclyListed: subscription.billingEnforcement.publiclyListed,
                    }
                  : null
              }
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label="Current plan"
                  value={planDisplayName}
                  hint={`${statusLabel(subscription.status)} · ${
                    isTrialing || isFreePlan
                      ? formatCents(0)
                      : formatCents(subscription.monthlyPriceCents)
                  }/mo`}
                  hintTone={
                    subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'positive'
                      : subscription.status === 'past_due'
                        ? 'negative'
                        : 'neutral'
                  }
                  icon={<CrownOutlined />}
                />
              </Col>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label={isTrialing ? 'Trial ends' : 'Next charge'}
                  value={
                    isFreePlan
                      ? 'None'
                      : subscription.currentPeriodEnd
                        ? dayjs(
                            isTrialing && subscription.trialEndsAt
                              ? subscription.trialEndsAt
                              : subscription.currentPeriodEnd,
                          ).format('MMM D')
                        : '—'
                  }
                  hint={
                    isFreePlan
                      ? 'Free plan — no recurring charge'
                      : isTrialing
                        ? `Then ${formatCents(subscription.monthlyPriceCents)}/mo`
                        : subscription.currentPeriodEnd
                          ? `${formatCents(subscription.monthlyPriceCents)} on ${dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}`
                          : 'No billing period on file'
                  }
                />
              </Col>
              <Col xs={24} sm={8} style={{ display: 'flex' }}>
                <StatCard
                  label={dayjs(period).format('MMM YYYY') + ' covers'}
                  value={summary?.totalCovers ?? '—'}
                  hint={
                    summary
                      ? `${formatCents(summary.totalFeeCents)} in cover fees`
                      : 'Loading cover fees…'
                  }
                  icon={<TeamOutlined />}
                />
              </Col>
            </Row>

            {amountDueNow > 0 ? (
              <Alert
                type="warning"
                showIcon
                message={`${formatCents(amountDueNow)} due now`}
                description="Full monthly price for switching plans — pay to keep this plan for the new billing period."
                action={
                  canEditBilling ? (
                    <Button type="primary" onClick={() => void openDuePayment()}>
                      Pay now
                    </Button>
                  ) : null
                }
              />
            ) : null}

            <Card title="Your subscription">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                  marginBottom: spacing.md,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Space size={10} wrap>
                    <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
                      {planDisplayName}
                    </Text>
                    <Tag color={STATUS_COLORS[subscription.status] ?? 'default'}>
                      {String(subscription.status).replace(/_/g, ' ').toUpperCase()}
                    </Tag>
                  </Space>
                  <div style={{ marginTop: 6 }}>
                    {isTrialing ? (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary }}>
                          $0.00
                        </Text>{' '}
                        during trial · then {monthlyPriceLabel}/mo
                      </Text>
                    ) : isFreePlan ? (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary }}>
                          $0.00
                        </Text>
                        /mo · free plan
                      </Text>
                    ) : (
                      <Text type="secondary">
                        <Text strong style={{ color: colors.textPrimary, fontSize: 16 }}>
                          {monthlyPriceLabel}
                        </Text>
                        /mo
                      </Text>
                    )}
                  </div>
                </div>
                {canEditBilling && subscription.status !== 'cancelled' ? (
                  <Space wrap>
                    {amountDueNow > 0 ? (
                      <Button type="primary" onClick={() => void openDuePayment()}>
                        Pay {formatCents(amountDueNow)} now
                      </Button>
                    ) : null}
                    {switchablePlans.length > 0 ? (
                      <Dropdown
                        menu={{
                          items: switchablePlans.map((p) => ({
                            key: p.key,
                            label: `${p.name} — ${formatCents(p.monthlyPriceCents)}/mo`,
                            onClick: () => void handleChangePlan(p.key),
                          })),
                        }}
                        trigger={['click']}
                        disabled={changing}
                      >
                        <Button icon={<SwapOutlined />} loading={changing}>
                          Change plan <DownOutlined />
                        </Button>
                      </Dropdown>
                    ) : null}
                    {cancelAtPeriodEnd ? (
                      <Button onClick={() => void handleResume()} loading={reactivating}>
                        Resume subscription
                      </Button>
                    ) : null}
                    {subscription.pendingPlan ? (
                      <Button onClick={handleCancelPending} loading={cancellingPending}>
                        Keep current plan
                      </Button>
                    ) : null}
                    {cancelAtPeriodEnd ? (
                      <Button danger type="text" onClick={handleCancelImmediately} loading={cancelling}>
                        Cancel now
                      </Button>
                    ) : (
                      <Button danger type="text" onClick={handleCancel} loading={cancelling}>
                        Cancel subscription
                      </Button>
                    )}
                  </Space>
                ) : !canEditBilling ? (
                  <Text type="secondary" style={{ maxWidth: 260 }}>
                    Only the restaurant owner can change or cancel this plan.
                  </Text>
                ) : null}
              </div>

              {planStory ? (
                <Alert
                  type={
                    amountDueNow > 0 || subscription.status === 'past_due'
                      ? 'warning'
                      : subscription.pendingPlan || cancelAtPeriodEnd
                        ? 'info'
                        : 'success'
                  }
                  showIcon
                  icon={
                    isTrialing || subscription.pendingPlan ? (
                      <CalendarOutlined />
                    ) : (
                      <CheckCircleOutlined />
                    )
                  }
                  message={planStory}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <PlanPanel title="Cover fees on this plan" icon={<DollarOutlined />}>
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      <PlanFact label="Network reservations">
                        {formatCents(subscription.networkCoverFeeCents)} per cover
                      </PlanFact>
                      <PlanFact label="Website reservations">
                        {subscription.websiteCoverFeeCents === 0
                          ? 'Free'
                          : `${formatCents(subscription.websiteCoverFeeCents)} per cover`}
                      </PlanFact>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Charged when a reservation is completed, then rolled into the monthly invoice
                        below — not into Stripe renewals.
                      </Text>
                    </Space>
                  </PlanPanel>
                </Col>
                <Col xs={24} md={12}>
                  <PlanPanel title="Billing timeline" icon={<CalendarOutlined />}>
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                        <PlanFact label={isTrialing ? 'Trial window' : 'Current period'}>
                          {dayjs(subscription.currentPeriodStart).format('MMM D')} –{' '}
                          {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')}
                        </PlanFact>
                      ) : null}
                      {isTrialing && subscription.trialEndsAt ? (
                        <PlanFact label="First charge">
                          {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')} · {monthlyPriceLabel}
                        </PlanFact>
                      ) : isFreePlan ? (
                        <PlanFact label="Next charge">None</PlanFact>
                      ) : subscription.currentPeriodEnd ? (
                        <PlanFact label="Next renewal">
                          {dayjs(subscription.currentPeriodEnd).format('MMM D, YYYY')} ·{' '}
                          {monthlyPriceLabel}
                        </PlanFact>
                      ) : null}
                      {subscription.status !== 'trialing' && subscription.trialEndsAt ? (
                        <PlanFact label="Trial ended">
                          {dayjs(subscription.trialEndsAt).format('MMM D, YYYY')}
                        </PlanFact>
                      ) : null}
                      {pendingPlanName ? (
                        <PlanFact label="Scheduled change">
                          {pendingPlanName}
                          {subscription.pendingPlanEffectiveAt
                            ? ` on ${dayjs(subscription.pendingPlanEffectiveAt).format('MMM D, YYYY')}`
                            : ' at next renewal'}
                        </PlanFact>
                      ) : null}
                    </Space>
                  </PlanPanel>
                </Col>
              </Row>
            </Card>

            <Card
              title="Usage & invoices"
              extra={periodToolbar}
              styles={{ body: { paddingTop: spacing.md } }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: spacing.lg }}>
                Cover fees accrue when reservations are completed and appear as line items on the
                period invoice — not as a separate charge. Open an invoice for the full breakdown,
                pay link, and PDF.
              </Text>

              <PlanPanel title="Cover usage" icon={<TeamOutlined />}>
                {feesLoading ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
                    <Spin />
                  </div>
                ) : summary ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                        marginBottom: spacing.md,
                      }}
                    >
                      <UsageMetric label="Covers" value={summary.totalCovers} />
                      <UsageMetric
                        label="Cover fees"
                        value={formatCents(summary.totalFeeCents)}
                        emphasize={summary.totalFeeCents > 0}
                      />
                      <UsageMetric
                        label="Avg / cover"
                        value={
                          summary.totalCovers > 0
                            ? formatCents(Math.round(summary.totalFeeCents / summary.totalCovers))
                            : '$0.00'
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '0 0 6px',
                        borderBottom: `1px solid ${colors.bordersubtle}`,
                      }}
                    >
                      <span style={{ width: 32 }} />
                      <Text
                        type="secondary"
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Source
                      </Text>
                      <Text
                        type="secondary"
                        style={{
                          width: 64,
                          textAlign: 'right',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Covers
                      </Text>
                      <Text
                        type="secondary"
                        style={{
                          width: 72,
                          textAlign: 'right',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Fees
                      </Text>
                    </div>
                    {coverBreakdown.map((row) => (
                      <SourceRow key={row.source} {...row} />
                    ))}
                  </>
                ) : (
                  <Text type="secondary">No cover fee data for this period.</Text>
                )}
              </PlanPanel>

              <div style={{ marginTop: spacing.lg }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                    marginBottom: spacing.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text strong>Invoices</Text>
                  {invoices.length > 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {showAllInvoices
                        ? `${invoices.length} total`
                        : `Showing ${Math.min(INVOICE_LIST_PREVIEW, invoices.length)} of ${invoices.length}`}
                    </Text>
                  ) : null}
                </div>
                {invoiceLoading && invoices.length === 0 ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
                    <Spin />
                  </div>
                ) : invoices.length === 0 ? (
                  <Text type="secondary">No invoices yet for this restaurant.</Text>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {visibleInvoices.map((invoice) => (
                        <InvoiceListRow
                          key={invoice.id}
                          invoice={invoice}
                          selected={invoice.id === selectedInvoiceId}
                          onSelect={() => openInvoice(invoice)}
                        />
                      ))}
                    </div>
                    {invoices.length > INVOICE_LIST_PREVIEW ? (
                      <Button
                        type="link"
                        onClick={() => setShowAllInvoices((v) => !v)}
                        style={{ paddingInline: 0, marginTop: spacing.sm }}
                      >
                        {showAllInvoices
                          ? 'Show less'
                          : `Show all (${invoices.length})`}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </Card>

            <Drawer
              title={
                selectedInvoice
                  ? `Invoice ${selectedInvoice.number}`
                  : 'Invoice'
              }
              placement="right"
              width={520}
              open={Boolean(selectedInvoiceId)}
              onClose={closeInvoice}
              destroyOnHidden
            >
              <PartnerInvoiceDetail
                invoice={selectedInvoice}
                showOpenPageLink
                restaurantQuery={activeRestaurantId}
              />
            </Drawer>

            {smsEnabled ? (
            <Card title="Premium SMS">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ maxWidth: 560 }}>
                  <Text strong>Premium SMS notifications</Text>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                    Send branded SMS confirmations, reminders, and waitlist notifications to your
                    guests.
                    {subscription.plan === 'basic' ? (
                      <>
                        {' '}
                        <Text type="warning">Available on Core (add-on) or Pro (included).</Text>
                      </>
                    ) : null}
                  </Paragraph>
                </div>
                {smsIncludedInPlan ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Included in {planDisplayName}
                  </Tag>
                ) : (
                  <Switch
                    checked={smsAddonEnabled}
                    disabled={
                      !canEditBilling ||
                      subscription.plan === 'basic' ||
                      subscription.status === 'cancelled' ||
                      subscription.status === 'paused'
                    }
                    loading={togglingSms}
                    onChange={(checked) => void handleTogglePremiumSms(checked)}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                  />
                )}
              </div>
              {subscription.status === 'cancelled' || subscription.status === 'paused' ? (
                <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                  SMS sending requires an active subscription. Re-subscribe to enable Premium SMS.
                </Paragraph>
              ) : null}
            </Card>
            ) : null}

            {activeRestaurantId ? (
              <VirtualRoomAddonCard
                key={`${activeRestaurantId}-${subscription?.plan ?? ''}`}
                restaurantId={activeRestaurantId}
                canEditBilling={canEditBilling}
              />
            ) : null}

            <Card title="Included features">
              {includedFeatures.length === 0 ? (
                <Text type="secondary">No premium features on this plan.</Text>
              ) : (
                <Row gutter={[12, 8]}>
                  {includedFeatures.map(([key]) => (
                    <Col key={key} xs={24} sm={12} md={8} lg={6}>
                      <Badge
                        status="success"
                        text={<Text>{featureLabel(key)}</Text>}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </>
        ) : (
          <>
            {isCancelled ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 8 }}
                message="Subscription cancelled"
                description={`Your previous ${planDisplayName} plan has ended. This location is inactive and hidden from public search and booking until you choose a plan below. Re-subscribing replaces the cancelled subscription.`}
              />
            ) : (
              <EmptyState
                icon={<ExclamationCircleOutlined />}
                title="No active subscription"
                description="Choose a plan to be listed publicly and accept reservations. Base is $0/mo with a higher cover fee."
              />
            )}

            <Row gutter={[16, 16]}>
              {plans.map((plan) => {
                const isRecommended = plan.key === 'core';
                const blurb =
                  plan.description?.trim() ||
                  PLAN_BLURBS[plan.key] ||
                  'Built for your restaurant.';
                const planFeatures = enabledFeatureEntries(plan.features).filter(
                  ([key]) => smsEnabled || (key !== 'premiumSms' && key !== 'premiumSmsAddon'),
                );
                return (
                  <Col key={plan.key} xs={24} md={12} xl={6}>
                    <Card
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: radii.lg,
                        borderColor: isRecommended ? colors.brand[500] : colors.border,
                        borderWidth: isRecommended ? 2 : 1,
                      }}
                      styles={{
                        body: {
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                        },
                      }}
                      title={
                        <Space>
                          <CrownOutlined />
                          <span>{plan.name}</span>
                          {isRecommended ? <Tag color="green">Recommended</Tag> : null}
                        </Space>
                      }
                      extra={<PlanPrice plan={plan} size="small" showSecondaryNote={false} />}
                      actions={[
                        <Button
                          key="subscribe"
                          type="primary"
                          onClick={() => void handleSubscribe(plan.key)}
                          loading={creating}
                          disabled={!canEditBilling}
                          block
                        >
                          {!canEditBilling
                            ? 'Owner only'
                            : plan.trialDays > 0
                              ? `Start ${plan.trialDays}-day trial`
                              : 'Subscribe'}
                        </Button>,
                      ]}
                    >
                      <Space
                        orientation="vertical"
                        size={8}
                        style={{ width: '100%', flex: 1 }}
                      >
                        {getPlanDiscountLabel(plan) ? (
                          <Tag color="gold">{getPlanDiscountLabel(plan)}</Tag>
                        ) : null}
                        <Paragraph type="secondary" style={{ marginBottom: 0, minHeight: 44 }}>
                          {blurb}
                        </Paragraph>
                        <div>
                          <Text type="secondary">Network cover: </Text>
                          <Text strong>{formatCents(plan.networkCoverFeeCents)}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Website cover: </Text>
                          <Text strong>
                            {plan.websiteCoverFeeCents === 0
                              ? 'Free'
                              : formatCents(plan.websiteCoverFeeCents)}
                          </Text>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {planFeatures.length === 0 ? (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Core booking tools
                            </Text>
                          ) : (
                            (expandedPlans[plan.key]
                              ? planFeatures
                              : planFeatures.slice(0, PLAN_FEATURE_PREVIEW)
                            ).map(([key]) => (
                              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <CheckOutlined style={{ color: colors.success, marginTop: 3 }} />
                                <Text style={{ fontSize: 13 }}>{featureLabel(key)}</Text>
                              </div>
                            ))
                          )}
                          {planFeatures.length > PLAN_FEATURE_PREVIEW ? (
                            <Button
                              type="link"
                              size="small"
                              style={{ paddingInline: 0, fontSize: 12 }}
                              onClick={() =>
                                setExpandedPlans((prev) => ({
                                  ...prev,
                                  [plan.key]: !prev[plan.key],
                                }))
                              }
                            >
                              {expandedPlans[plan.key]
                                ? 'Show less'
                                : `+${planFeatures.length - PLAN_FEATURE_PREVIEW} more`}
                            </Button>
                          ) : null}
                        </div>
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        {canEditBilling && activeRestaurantId ? (
          <Card
            title="Danger zone"
            styles={{
              header: { color: colors.error },
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {hasPlatformDebt ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Outstanding platform balance"
                  description={
                    <>
                      Pay all open invoices and any subscription balance before deleting this
                      restaurant.
                      {openInvoiceCount > 0 ? (
                        <>
                          {' '}
                          You have {openInvoiceCount} unpaid invoice
                          {openInvoiceCount === 1 ? '' : 's'}
                          {amountDueNow > 0
                            ? ` and ${formatCents(amountDueNow)} due on the subscription`
                            : ''}
                          .
                        </>
                      ) : amountDueNow > 0 ? (
                        <> Subscription balance due: {formatCents(amountDueNow)}.</>
                      ) : null}
                    </>
                  }
                />
              ) : null}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ maxWidth: 480 }}>
                  <Text strong>Delete this restaurant</Text>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Permanently removes this venue, bookings, menus, floor plans, and billing
                    history. Your login stays. This cannot be undone.
                  </Paragraph>
                </div>
                <Button
                  danger
                  disabled={hasPlatformDebt}
                  onClick={openDeleteRestaurant}
                >
                  Delete restaurant
                </Button>
              </div>
            </Space>
          </Card>
        ) : null}

        <Modal
          title={
            planChange
              ? planChange.isUpgrade
                ? `Upgrade to ${planChange.planName}`
                : `Switch to ${planChange.planName}`
              : 'Change plan'
          }
          open={Boolean(planChange)}
          width={560}
          destroyOnHidden
          onCancel={() => setPlanChange(null)}
          okText={
            !planChange
              ? 'Confirm'
              : planChangeTiming === 'now'
                ? `Start ${planChange.planName} now`
                : `Switch on ${planChange.effective}`
          }
          okButtonProps={{
            danger: Boolean(planChange && !planChange.isUpgrade && planChangeTiming === 'now'),
            loading: changing,
          }}
          onOk={() => void confirmPlanChange()}
          cancelText="Cancel"
        >
          {planChange ? (
            <Space orientation="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
                <PlanPriceTile
                  eyebrow="Current"
                  name={planChange.currentPlanName}
                  monthlyCents={planChange.currentMonthlyPriceCents}
                  networkCents={planChange.currentNetworkCoverFeeCents}
                  websiteCents={
                    planChange.showWebsiteCover ? planChange.currentWebsiteCoverFeeCents : null
                  }
                />
                <span
                  aria-hidden
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: colors.neutral[400],
                    flexShrink: 0,
                  }}
                >
                  <RightOutlined />
                </span>
                <PlanPriceTile
                  eyebrow="New plan"
                  name={planChange.planName}
                  monthlyCents={planChange.nextMonthlyPriceCents}
                  networkCents={planChange.nextNetworkCoverFeeCents}
                  websiteCents={
                    planChange.showWebsiteCover ? planChange.nextWebsiteCoverFeeCents : null
                  }
                  emphasize
                />
              </div>

              <div role="radiogroup" aria-label="When should this plan start">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  When should this start?
                </Text>
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <TimingOption
                    tone="safe"
                    selected={planChangeTiming === 'period_end'}
                    badge={planChange.isUpgrade ? undefined : 'Recommended'}
                    title={`Keep ${planChange.currentPlanName} until ${planChange.effective}`}
                    detail={`Then ${planChange.planName} starts. Nothing is charged today.`}
                    onSelect={() => setPlanChangeTiming('period_end')}
                  />
                  <TimingOption
                    tone="now"
                    selected={planChangeTiming === 'now'}
                    badge={planChange.isUpgrade ? 'Recommended' : undefined}
                    title={`Start ${planChange.planName} right away`}
                    detail={
                      planChange.nextMonthlyPriceCents > 0
                        ? `Pay ${formatCents(planChange.nextMonthlyPriceCents)} today (full monthly price). Unused time on ${planChange.currentPlanName} is not credited.`
                        : 'Features change today. Unused time on the current plan is not credited.'
                    }
                    onSelect={() => setPlanChangeTiming('now')}
                  />
                </Space>
              </div>
              {planChangeTiming === 'now' && planChange.nextMonthlyPriceCents > 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message={`Charged ${formatCents(planChange.nextMonthlyPriceCents)} today`}
                  description={
                    planChange.clearsCancel
                      ? `Full monthly price for ${planChange.planName}. A new billing period starts today. This also clears the scheduled cancellation.`
                      : `Full monthly price for ${planChange.planName}. A new billing period starts today.`
                  }
                />
              ) : null}

              <FeatureDeltaList title="You will gain" items={planChange.featuresGained} tone="gain" />
              <FeatureDeltaList
                title={
                  planChange.isUpgrade || planChangeTiming === 'now'
                    ? 'Lost today'
                    : `Lost after ${planChange.effective}`
                }
                items={planChange.featuresLost}
                tone="lose"
              />
            </Space>
          ) : null}
        </Modal>

        <Modal
          title="Complete your plan switch"
          open={Boolean(upgradePayment)}
          footer={null}
          destroyOnHidden
          onCancel={() => setUpgradePayment(null)}
        >
          {upgradePayment ? (
            <SignupPaymentForm
              clientSecret={upgradePayment.clientSecret}
              paymentMode={upgradePayment.paymentMode}
              planName={upgradePayment.planName}
              monthlyLabel={upgradePayment.monthlyLabel}
              trialDays={0}
              description={`Pay ${formatCents(upgradePayment.amountDueCents)} now (full monthly price). Recurring ${upgradePayment.monthlyLabel}/mo starts a new billing period today.`}
              onSuccess={() => {
                if (activeRestaurantId) {
                  void confirmPlanPayment({ variables: { restaurantId: activeRestaurantId } });
                }
                setUpgradePayment(null);
                message.success('Payment received');
                refetchSub();
              }}
            />
          ) : null}
        </Modal>

        <Modal
          title="Delete restaurant permanently?"
          open={deleteConfirmOpen}
          okText="Delete restaurant"
          okButtonProps={{
            danger: true,
            disabled: !deleteNameMatches || hasPlatformDebt,
            loading: deletingRestaurant,
          }}
          onOk={() => void handleDeleteRestaurant()}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDeleteConfirmName('');
          }}
          destroyOnHidden
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph style={{ marginBottom: 0 }}>
              This permanently deletes <Text strong>{venueName || 'this restaurant'}</Text> and
              all related records. Type the restaurant name to confirm.
            </Paragraph>
            <Input
              placeholder={venueName || 'Restaurant name'}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              autoFocus
            />
          </Space>
        </Modal>
      </Space>
    </div>
  );
}
