export const LEGAL_LAST_UPDATED = 'August 13, 2026';

/** Single support inbox for all contact topics (general, privacy, legal). */
export const SUPPORT_EMAIL = 'support@tablevera.online';

export const LEGAL_CONTACT = {
  general: SUPPORT_EMAIL,
  privacy: SUPPORT_EMAIL,
  legal: SUPPORT_EMAIL,
} as const;

export const COMPANY_PHONE = '+16507707788';
export const COMPANY_PHONE_DISPLAY = '+1 (650) 770-7788';

export const COMPANY_ADDRESS = {
  line1: '20844 Waterbeach Place',
  city: 'Sterling',
  state: 'VA',
  zip: '20165',
  country: 'USA',
} as const;

export const COMPANY_ADDRESS_DISPLAY =
  `${COMPANY_ADDRESS.line1}, ${COMPANY_ADDRESS.city}, ${COMPANY_ADDRESS.state} ${COMPANY_ADDRESS.zip}, ${COMPANY_ADDRESS.country}`;

export const COMPANY_NAME = 'Tablevera';

export type LegalTocItem = {
  id: string;
  label: string;
};
