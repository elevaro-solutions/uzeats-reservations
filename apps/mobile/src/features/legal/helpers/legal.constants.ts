/** Mirrors apps/web/src/lib/legal.ts — keep in sync manually. */

export const LEGAL_LAST_UPDATED = "August 13, 2026";

export const COMPANY_NAME = "Tablevera";

export const SUPPORT_EMAIL = "support@tablevera.online";

export const LEGAL_CONTACT = {
  general: SUPPORT_EMAIL,
  privacy: SUPPORT_EMAIL,
  legal: SUPPORT_EMAIL,
} as const;

export const COMPANY_PHONE_E164 = "+16507707788";
export const COMPANY_PHONE_DISPLAY = "+1 (650) 770-7788";

export const COMPANY_ADDRESS = {
  line1: "20844 Waterbeach Place",
  city: "Sterling",
  state: "VA",
  zip: "20165",
  country: "USA",
} as const;

export const COMPANY_ADDRESS_DISPLAY =
  `${COMPANY_ADDRESS.line1}, ${COMPANY_ADDRESS.city}, ${COMPANY_ADDRESS.state} ${COMPANY_ADDRESS.zip}, ${COMPANY_ADDRESS.country}`;

export const LEGAL_WEB_BASE = "https://tablevera.online";
export const LEGAL_COOKIES_URL = `${LEGAL_WEB_BASE}/cookies`;
export const LEGAL_SMS_URL = `${LEGAL_WEB_BASE}/sms`;
