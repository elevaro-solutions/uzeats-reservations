'use client';

import { PhoneOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import type { InputProps, InputRef } from 'antd';
import { forwardRef, useMemo } from 'react';
import { colors, typography } from './tokens';
import {
  DEFAULT_PHONE_COUNTRY,
  US_PHONE_COUNTRY_CODE,
  US_PHONE_PLACEHOLDER,
  formatUsPhoneNational,
  toE164Us,
  toUsNationalDigits,
} from './phone';

export type PhoneInputProps = Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  /** Controlled value — E.164 (`+12125551234`) or national digits / formatted. */
  value?: string;
  /**
   * Emits E.164 when the number is complete (`+12125551234`),
   * otherwise the partial national digits so Form state stays in sync while typing.
   * Empty string when cleared.
   */
  onChange?: (value: string) => void;
  /** ISO country. Currently only `'US'` is supported. */
  country?: typeof DEFAULT_PHONE_COUNTRY;
  /** Show `+1` (or country code) beside the phone icon. Default true. */
  showCountryPrefix?: boolean;
};

/**
 * Reusable US phone input with live `(xxx) xxx-xxxx` formatting.
 *
 * Designed for antd `Form.Item`: stores E.164 when complete so API payloads
 * need no extra conversion. Pair with `usPhoneRules()` for validation.
 */
export const PhoneInput = forwardRef<InputRef, PhoneInputProps>(function PhoneInput(
  {
    value = '',
    onChange,
    country = DEFAULT_PHONE_COUNTRY,
    showCountryPrefix = true,
    placeholder = US_PHONE_PLACEHOLDER,
    prefix,
    inputMode = 'tel',
    autoComplete = 'tel',
    ...rest
  },
  ref,
) {
  void country; // reserved for future multi-country support

  const displayValue = useMemo(() => formatUsPhoneNational(value), [value]);

  const handleChange: InputProps['onChange'] = (e) => {
    const national = toUsNationalDigits(e.target.value);
    if (!national) {
      onChange?.('');
      return;
    }
    const e164 = toE164Us(national);
    onChange?.(e164 || national);
  };

  const defaultPrefix = showCountryPrefix ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: colors.textTertiary,
      }}
    >
      <PhoneOutlined />
      <span
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.textSecondary,
        }}
      >
        +{US_PHONE_COUNTRY_CODE}
      </span>
    </span>
  ) : (
    <PhoneOutlined style={{ color: colors.textTertiary }} />
  );

  return (
    <Input
      ref={ref}
      {...rest}
      type="tel"
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      prefix={prefix ?? defaultPrefix}
      value={displayValue}
      onChange={handleChange}
    />
  );
});
