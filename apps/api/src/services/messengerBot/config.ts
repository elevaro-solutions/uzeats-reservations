import { env } from '../../config/env.js';
import { PlatformConfig } from '../../models/index.js';

export type BotBillingMethod = 'MONTHLY_INVOICE';
export type BotFeePricingMode = 'PER_RESTAURANT' | 'PER_ACCOUNT';

export type BotPlatformConfig = {
  enabled: boolean;
  availability: 'ALL' | 'SELECTED';
  telegramToken: string | null;
  telegramUsername: string | null;
  telegramWebhookSecret: string | null;
  feeMonthlyCents: number;
  feePricingMode: BotFeePricingMode;
  billingMethod: BotBillingMethod;
};

export type BotRestaurantAccessFields = {
  messengerBotAccess?: string | null;
  messengerBotEnabled?: boolean | null;
  messengerBotFeeCentsOverride?: number | null;
};

const CACHE_MS = 15_000;
let cached: { value: BotPlatformConfig; at: number } | null = null;

export function invalidateBotPlatformConfig(): void {
  cached = null;
}

export function toBotPlatformConfig(doc: Record<string, unknown> | null | undefined): BotPlatformConfig {
  const token = typeof doc?.telegramBotToken === 'string' ? doc.telegramBotToken.trim() : '';
  const username =
    typeof doc?.telegramBotUsername === 'string' ? doc.telegramBotUsername.trim() : '';
  return {
    enabled: doc?.messengerBotEnabled === true,
    availability: doc?.messengerBotAvailability === 'ALL' ? 'ALL' : 'SELECTED',
    telegramToken: token && username ? token : null,
    telegramUsername: username || null,
    telegramWebhookSecret:
      typeof doc?.telegramWebhookSecret === 'string' && doc.telegramWebhookSecret
        ? doc.telegramWebhookSecret
        : null,
    feeMonthlyCents: Math.max(0, Math.round(Number(doc?.messengerBotFeeMonthlyCents) || 0)),
    feePricingMode:
      doc?.messengerBotFeePricingMode === 'PER_ACCOUNT' ? 'PER_ACCOUNT' : 'PER_RESTAURANT',
    billingMethod: 'MONTHLY_INVOICE',
  };
}

export async function getBotPlatformConfig(force = false): Promise<BotPlatformConfig> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const doc = await PlatformConfig.findOne({ key: 'default' })
    .select(
      'telegramBotToken telegramBotUsername telegramWebhookSecret messengerBotEnabled messengerBotAvailability messengerBotFeeMonthlyCents messengerBotFeePricingMode messengerBotFeeBillingMethod',
    )
    .lean();
  const value = toBotPlatformConfig(doc as Record<string, unknown> | null);
  cached = { value, at: Date.now() };
  return value;
}

export function restaurantBotAvailable(
  cfg: BotPlatformConfig,
  restaurant: BotRestaurantAccessFields | null | undefined,
): boolean {
  if (!cfg.enabled || !cfg.telegramToken || !restaurant) return false;
  const access = restaurant.messengerBotAccess ?? 'DEFAULT';
  if (access === 'DISABLED') return false;
  if (access === 'ENABLED') return true;
  return cfg.availability === 'ALL';
}

export function restaurantBotActive(
  cfg: BotPlatformConfig,
  restaurant: BotRestaurantAccessFields | null | undefined,
): boolean {
  return restaurantBotAvailable(cfg, restaurant) && restaurant?.messengerBotEnabled === true;
}

export function restaurantBotFeeCents(
  cfg: BotPlatformConfig,
  restaurant: BotRestaurantAccessFields | null | undefined,
): number {
  const override = restaurant?.messengerBotFeeCentsOverride;
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return Math.round(override);
  }
  return cfg.feeMonthlyCents;
}

export function restaurantBotChargeCents(
  cfg: BotPlatformConfig,
  restaurant: BotRestaurantAccessFields | null | undefined,
  linkedAccountCount: number,
): number {
  const unit = restaurantBotFeeCents(cfg, restaurant);
  if (unit <= 0) return 0;
  if (cfg.feePricingMode === 'PER_ACCOUNT') {
    return unit * Math.max(0, Math.floor(linkedAccountCount));
  }
  return unit;
}

/** Public base URL Telegram should call (`<base>/webhooks/messenger-bot`); unset → long polling. */
export function messengerWebhookBaseUrl(): string | null {
  const raw = (env.MESSENGER_BOT_WEBHOOK_BASE_URL ?? '').replace(/^["']|["']$/g, '').trim();
  return raw.startsWith('https://') ? raw.replace(/\/$/, '') : null;
}
