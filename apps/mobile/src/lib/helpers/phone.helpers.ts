/** Strip everything except digits. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize to the 10-digit US national number.
 * Accepts E.164 (+1…), leading country code 1, or bare national digits.
 */
function toUsNationalDigits(value: string): string {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** Format as `(212) 555-1234`. */
function formatUsPhoneNational(value: string): string {
  const digits = toUsNationalDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Human-readable display, e.g. `+1 (212) 555-1234`. Falls back to raw value. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const national = formatUsPhoneNational(value);
  if (!national || toUsNationalDigits(value).length === 0) return value.trim();
  return `+1 ${national}`;
}
