import { z } from 'zod';

/** Default per-message rate when restaurants use prepaid top-ups ($0.05). */
export const SMS_DEFAULT_PRICE_CENTS_PER_MESSAGE = 5;

/** Default top-up presets shown on partner Billing ($20 / $50 / $100). */
export const SMS_DEFAULT_TOP_UP_PRESETS_CENTS = [2000, 5000, 10000] as const;

export const SMS_MIN_CUSTOM_TOP_UP_CENTS = 1000; // $10
export const SMS_MAX_CUSTOM_TOP_UP_CENTS = 50_000; // $500
export const SMS_MAX_PRICE_CENTS_PER_MESSAGE = 500; // $5
export const SMS_MAX_PACKAGE_PRICE_CENTS = 1_000_000;
export const SMS_MAX_PACKAGE_MESSAGES = 1_000_000;
export const SMS_MAX_PACKAGES = 20;

export type SmsBillingPackage = {
  id: string;
  name: string;
  description?: string | null;
  messageCount: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
};

export type SmsPerMessageBilling = {
  enabled: boolean;
  priceCentsPerMessage: number;
  topUpPresetsCents: number[];
  allowCustomTopUp: boolean;
  minCustomTopUpCents: number;
  maxCustomTopUpCents: number;
};

export type SmsBillingConfig = {
  packages: SmsBillingPackage[];
  perMessage: SmsPerMessageBilling;
};

export const DEFAULT_SMS_BILLING_PACKAGES: SmsBillingPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: '100 guest SMS credits',
    messageCount: 100,
    priceCents: 1500,
    active: true,
    sortOrder: 0,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: '500 guest SMS credits',
    messageCount: 500,
    priceCents: 5000,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: '1,500 guest SMS credits',
    messageCount: 1500,
    priceCents: 12000,
    active: true,
    sortOrder: 2,
  },
];

export const DEFAULT_SMS_PER_MESSAGE_BILLING: SmsPerMessageBilling = {
  enabled: true,
  priceCentsPerMessage: SMS_DEFAULT_PRICE_CENTS_PER_MESSAGE,
  topUpPresetsCents: [...SMS_DEFAULT_TOP_UP_PRESETS_CENTS],
  allowCustomTopUp: true,
  minCustomTopUpCents: SMS_MIN_CUSTOM_TOP_UP_CENTS,
  maxCustomTopUpCents: SMS_MAX_CUSTOM_TOP_UP_CENTS,
};

export const DEFAULT_SMS_BILLING_CONFIG: SmsBillingConfig = {
  packages: DEFAULT_SMS_BILLING_PACKAGES,
  perMessage: DEFAULT_SMS_PER_MESSAGE_BILLING,
};

/** How many SMS credits a top-up amount buys at the given per-message rate. */
export function smsMessagesForTopUpAmount(
  amountCents: number,
  priceCentsPerMessage: number,
): number {
  const amount = Math.round(Number(amountCents));
  const rate = Math.round(Number(priceCentsPerMessage));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.floor(amount / rate);
}

export function newSmsPackageId(): string {
  return `pkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const smsPackageSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).nullish(),
  messageCount: z.number().int().min(1).max(SMS_MAX_PACKAGE_MESSAGES),
  priceCents: z.number().int().min(0).max(SMS_MAX_PACKAGE_PRICE_CENTS),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const smsPerMessageSchema = z.object({
  enabled: z.boolean().optional(),
  priceCentsPerMessage: z
    .number()
    .int()
    .min(1)
    .max(SMS_MAX_PRICE_CENTS_PER_MESSAGE)
    .optional(),
  topUpPresetsCents: z
    .array(z.number().int().min(SMS_MIN_CUSTOM_TOP_UP_CENTS).max(SMS_MAX_CUSTOM_TOP_UP_CENTS))
    .max(8)
    .optional(),
  allowCustomTopUp: z.boolean().optional(),
  minCustomTopUpCents: z
    .number()
    .int()
    .min(100)
    .max(SMS_MAX_CUSTOM_TOP_UP_CENTS)
    .optional(),
  maxCustomTopUpCents: z
    .number()
    .int()
    .min(SMS_MIN_CUSTOM_TOP_UP_CENTS)
    .max(SMS_MAX_CUSTOM_TOP_UP_CENTS)
    .optional(),
});

export const smsBillingInputSchema = z.object({
  packages: z.array(smsPackageSchema).max(SMS_MAX_PACKAGES).optional(),
  perMessage: smsPerMessageSchema.optional(),
});

export type SmsBillingInput = z.infer<typeof smsBillingInputSchema>;

function normalizePresets(presets: number[] | undefined, fallback: number[]): number[] {
  if (!presets?.length) return [...fallback];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of presets) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < SMS_MIN_CUSTOM_TOP_UP_CENTS) continue;
    if (n > SMS_MAX_CUSTOM_TOP_UP_CENTS) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= 8) break;
  }
  return out.length ? out.sort((a, b) => a - b) : [...fallback];
}

/** Merge platform-stored SMS billing with defaults. */
export function normalizeSmsBillingConfig(raw: unknown): SmsBillingConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as {
    packages?: unknown;
    perMessage?: Partial<SmsPerMessageBilling>;
  };

  const packages: SmsBillingPackage[] = [];
  if (Array.isArray(input.packages)) {
    input.packages.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const p = item as Partial<SmsBillingPackage>;
      const messageCount = Math.round(Number(p.messageCount));
      const priceCents = Math.round(Number(p.priceCents));
      const name = String(p.name ?? '').trim();
      if (!name || !Number.isFinite(messageCount) || messageCount < 1) return;
      if (!Number.isFinite(priceCents) || priceCents < 0) return;
      packages.push({
        id: String(p.id ?? '').trim() || newSmsPackageId(),
        name: name.slice(0, 80),
        description: p.description != null ? String(p.description).trim().slice(0, 280) : null,
        messageCount: Math.min(SMS_MAX_PACKAGE_MESSAGES, messageCount),
        priceCents: Math.min(SMS_MAX_PACKAGE_PRICE_CENTS, priceCents),
        active: p.active !== false,
        sortOrder:
          typeof p.sortOrder === 'number' && Number.isFinite(p.sortOrder)
            ? Math.max(0, Math.round(p.sortOrder))
            : index,
      });
    });
  }

  const sortedPackages = (packages.length ? packages : DEFAULT_SMS_BILLING_PACKAGES)
    .slice(0, SMS_MAX_PACKAGES)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const pm = input.perMessage ?? {};
  const priceCentsPerMessage = Math.round(
    Number(pm.priceCentsPerMessage ?? DEFAULT_SMS_PER_MESSAGE_BILLING.priceCentsPerMessage),
  );
  let minCustom = Math.round(
    Number(pm.minCustomTopUpCents ?? DEFAULT_SMS_PER_MESSAGE_BILLING.minCustomTopUpCents),
  );
  let maxCustom = Math.round(
    Number(pm.maxCustomTopUpCents ?? DEFAULT_SMS_PER_MESSAGE_BILLING.maxCustomTopUpCents),
  );
  if (!Number.isFinite(minCustom) || minCustom < 100) minCustom = SMS_MIN_CUSTOM_TOP_UP_CENTS;
  if (!Number.isFinite(maxCustom) || maxCustom < minCustom) {
    maxCustom = Math.max(minCustom, SMS_MAX_CUSTOM_TOP_UP_CENTS);
  }

  return {
    packages: sortedPackages,
    perMessage: {
      enabled: pm.enabled !== false,
      priceCentsPerMessage:
        Number.isFinite(priceCentsPerMessage) && priceCentsPerMessage >= 1
          ? Math.min(SMS_MAX_PRICE_CENTS_PER_MESSAGE, priceCentsPerMessage)
          : SMS_DEFAULT_PRICE_CENTS_PER_MESSAGE,
      topUpPresetsCents: normalizePresets(
        pm.topUpPresetsCents,
        [...SMS_DEFAULT_TOP_UP_PRESETS_CENTS],
      ),
      allowCustomTopUp: pm.allowCustomTopUp !== false,
      minCustomTopUpCents: Math.min(maxCustom, Math.max(100, minCustom)),
      maxCustomTopUpCents: Math.min(SMS_MAX_CUSTOM_TOP_UP_CENTS, Math.max(minCustom, maxCustom)),
    },
  };
}
