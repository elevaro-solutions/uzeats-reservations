export const LEGAL_LAST_UPDATED = 'July 29, 2026';

export const LEGAL_CONTACT = {
  general: 'hello@tablevera.online',
  privacy: 'privacy@tablevera.online',
  legal: 'legal@tablevera.online',
} as const;

export const COMPANY_NAME = 'Tablevera';

export type LegalTocItem = {
  id: string;
  label: string;
};
