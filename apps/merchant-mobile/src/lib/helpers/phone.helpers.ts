/** Default country for phone inputs. Only US national formatting is supported. */
export const US_PHONE_COUNTRY_CODE = "1";
export const US_PHONE_DIGIT_LENGTH = 10;
export const US_PHONE_PLACEHOLDER = "(212) 555-1234";

/** Strip everything except digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize to the 10-digit US national number.
 * Accepts E.164 (+1…), leading country code 1, or bare national digits.
 */
export function toUsNationalDigits(value: string): string {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith(US_PHONE_COUNTRY_CODE)) {
    digits = digits.slice(1);
  }
  return digits.slice(0, US_PHONE_DIGIT_LENGTH);
}

/** Format as `(212) 555-1234` while typing. */
export function formatUsPhoneNational(value: string): string {
  const digits = toUsNationalDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Convert any US phone input to E.164 (`+12125551234`), or '' when empty/incomplete. */
export function toE164Us(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const digits = toUsNationalDigits(value);
  if (digits.length !== US_PHONE_DIGIT_LENGTH) return "";
  return `+${US_PHONE_COUNTRY_CODE}${digits}`;
}

export function isValidUsPhone(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return toUsNationalDigits(value).length === US_PHONE_DIGIT_LENGTH;
}

/** Human-readable display, e.g. `+1 (212) 555-1234`. Falls back to raw value. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const national = formatUsPhoneNational(value);
  if (!national || toUsNationalDigits(value).length === 0) return value.trim();
  return `+${US_PHONE_COUNTRY_CODE} ${national}`;
}
