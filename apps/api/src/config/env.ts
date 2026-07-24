import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().optional().default(''),
  WEB_APP_URL: z.string().default('http://localhost:3000'),
  AUTH_DEV_OTP: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('false'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_CURRENCY: z.string().default('usd'),
  DO_SPACES_KEY: z.string().optional().default(''),
  DO_SPACES_SECRET: z.string().optional().default(''),
  DO_SPACES_ENDPOINT: z.string().optional().default('https://nyc3.digitaloceanspaces.com'),
  DO_SPACES_BUCKET: z.string().optional().default('reservations'),
  DO_SPACES_CDN: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  SENDGRID_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('noreply@reservations.local'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),
  API_PUBLIC_URL: z.string().optional().default(''),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().default('mailto:admin@reservations.local'),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production') {
  if (parsed.AUTH_DEV_OTP) {
    console.warn(
      '[env] WARNING: AUTH_DEV_OTP is enabled in production — forcing to false',
    );
    (parsed as { AUTH_DEV_OTP: boolean }).AUTH_DEV_OTP = false;
  }

  if (!parsed.STRIPE_SECRET_KEY) {
    throw new Error(
      '[env] STRIPE_SECRET_KEY is required in production — deposit-enabled restaurants cannot function without it',
    );
  }
}

export const env = parsed;
